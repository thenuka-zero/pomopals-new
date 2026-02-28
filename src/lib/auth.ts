import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// In-memory user store (for demo purposes - replace with DB in production)
const users: Map<string, { id: string; name: string; email: string; password: string }> = new Map();

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        action: { label: "Action", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        const name = credentials?.name as string;
        const action = credentials?.action as string;

        if (!email || !password) return null;

        if (action === "register") {
          if (users.has(email)) return null;
          const user = { id: crypto.randomUUID(), name: name || email.split("@")[0], email, password };
          users.set(email, user);
          return { id: user.id, name: user.name, email: user.email };
        }

        // Login
        const user = users.get(email);
        if (!user || user.password !== password) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
