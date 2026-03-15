import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { scrypt, randomBytes, timingSafeEqual, randomUUID } from "crypto";
import { promisify } from "util";
import { jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";
import { checkAchievements } from "./achievement-checker";

const scryptAsync = promisify(scrypt);

/**
 * Hash a password using Node.js crypto.scrypt with a random salt.
 * Returns a string in the format: salt:hash (both hex-encoded).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Compare a plain-text password against a stored hash.
 * Uses timingSafeEqual to prevent timing attacks.
 * Returns false for OAuth users (empty passwordHash).
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(hash, "hex");

  if (derivedKey.length !== storedKey.length) return false;
  return timingSafeEqual(derivedKey, storedKey);
}

// Store emailVerified status temporarily during the authorize -> jwt callback cycle.
// This is needed because NextAuth's User type expects emailVerified as Date | null,
// but we store it as a boolean. We pass it through this map to the JWT callback.
const emailVerifiedCache = new Map<string, boolean>();

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        autoSignInToken: { label: "Auto Sign-In Token", type: "text" },
      },
      async authorize(credentials) {
        // Auto sign-in flow (post email verification)
        const autoSignInToken = credentials?.autoSignInToken as string | undefined;
        if (autoSignInToken) {
          try {
            const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
            const { payload } = await jwtVerify(autoSignInToken, secret);
            if (payload.purpose !== "autologin" || !payload.sub) return null;
            const user = await db.query.users.findFirst({
              where: eq(users.id, payload.sub),
            });
            if (!user) return null;
            emailVerifiedCache.set(user.id, user.emailVerified);
            return { id: user.id, name: user.name, email: user.email };
          } catch {
            return null;
          }
        }

        const email = (credentials?.email as string)?.trim()?.toLowerCase();
        const password = credentials?.password as string;

        if (!email || !password) return null;

        // Login only — look up user in DB and verify password
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!user) return null;

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) return null;

        // Cache emailVerified status for the JWT callback
        emailVerifiedCache.set(user.id, user.emailVerified);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.trim()?.toLowerCase();
        if (!email) return false;

        const now = new Date().toISOString();
        const existing = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        let dbUserId: string;
        if (!existing) {
          // New Google user — create account (emailVerified: true, no password)
          dbUserId = randomUUID();
          await db.insert(users).values({
            id: dbUserId,
            name: user.name ?? email.split("@")[0],
            email,
            passwordHash: "", // OAuth users have no password
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          dbUserId = existing.id;
          // Mark existing account as verified if not already (Google verifies emails)
          if (!existing.emailVerified) {
            await db.update(users)
              .set({ emailVerified: true, updatedAt: now })
              .where(eq(users.id, existing.id));
          }
        }

        checkAchievements({ event: "login", userId: dbUserId }).catch(() => {});
        return true;
      }

      // Credentials provider
      if (user?.id) {
        checkAchievements({ event: "login", userId: user.id as string }).catch(() => {});
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user && account) {
        if (account.provider === "google") {
          // Resolve our DB user ID via email — user.id here is Google's sub, not ours
          const email = user.email?.trim()?.toLowerCase();
          if (email) {
            const dbUser = await db.query.users.findFirst({
              where: eq(users.email, email),
              columns: { id: true, emailVerified: true },
            });
            if (dbUser) {
              token.id = dbUser.id;
              token.emailVerified = dbUser.emailVerified;
            }
          }
          token.isAdmin = !!process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL;
          return token;
        }

        // Credentials flow
        token.id = user.id as string;
        // Retrieve emailVerified from cache (set during authorize)
        token.emailVerified = emailVerifiedCache.get(user.id as string) ?? false;
        emailVerifiedCache.delete(user.id as string);
        // isAdmin is computed server-side only — email never sent to client
        token.isAdmin = !!process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL;
      }

      // Re-check emailVerified from DB on every token refresh so it updates
      // after the user clicks the verification link without needing to re-login
      if (token.id && !token.emailVerified) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
          columns: { emailVerified: true },
        });
        if (dbUser) {
          token.emailVerified = dbUser.emailVerified;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        Object.assign(session.user, {
          emailVerified: (token.emailVerified as boolean) ?? false,
          isAdmin: (token.isAdmin as boolean) ?? false,
        });
      }
      return session;
    },
  },
});
