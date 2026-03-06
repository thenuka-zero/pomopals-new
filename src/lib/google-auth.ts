/**
 * Server-only Google API authentication helper.
 * Uses a service account with JWT authentication.
 * Never import this file from client components.
 */
import { google } from "googleapis";

export function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !rawKey) {
    return null;
  }

  // Private keys stored in env vars have literal \n — replace with actual newlines
  const key = rawKey.replace(/\\n/g, "\n");

  return new google.auth.JWT({
    email,
    key,
    scopes: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/analytics.readonly",
    ],
  });
}
