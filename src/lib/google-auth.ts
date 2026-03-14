/**
 * Server-only Google API authentication helper.
 * Uses a service account with JWT authentication.
 * Never import this file from client components.
 */
import { google } from "googleapis";

export function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !rawKey) {
    return null;
  }

  // Private key is stored as base64 to avoid newline mangling in Vercel env vars
  const key = Buffer.from(rawKey, "base64").toString("utf8");

  return new google.auth.JWT({
    email,
    key,
    scopes: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/analytics.readonly",
    ],
  });
}
