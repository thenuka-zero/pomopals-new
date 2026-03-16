import { Resend } from "resend";
import { buildWelcomeEmailHtml } from "./email-templates/welcome";
import { buildEmailChangeHtml } from "./email-templates/email-change";

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "development"
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS = "PomoPals <noreply@pomopals.app>";

export async function sendEmailChangeVerification(
  to: string,
  name: string,
  token: string
): Promise<void> {
  if (!resend) {
    const devUrl = process.env.APP_URL || "http://localhost:3000";
    console.log(`\n[PomoPals Email] Email change link for ${to}:\n  ${devUrl}/api/profile/verify-email-change?token=${token}\n`);
    return;
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl || !appUrl.startsWith("https://")) {
    throw new Error(
      `APP_URL must be set to an https:// URL to send emails (current value: ${appUrl ?? "(not set)"})`
    );
  }

  const verifyUrl = `${appUrl}/api/profile/verify-email-change?token=${token}`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Confirm your new PomoPals email address 🍅",
    html: buildEmailChangeHtml(name, verifyUrl),
  });
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationToken: string
): Promise<void> {
  if (!resend) {
    const devUrl = process.env.APP_URL || "http://localhost:3000";
    console.log(`\n[PomoPals Email] Verification link for ${to}:\n  ${devUrl}/api/auth/verify?token=${verificationToken}\n`);
    return;
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl || !appUrl.startsWith("https://")) {
    throw new Error(
      `APP_URL must be set to an https:// URL to send verification emails (current value: ${appUrl ?? "(not set)"})`
    );
  }

  const verifyUrl = `${appUrl}/api/auth/verify?token=${verificationToken}`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Let's ketchup! Verify your PomoPals account 🍅",
    html: buildWelcomeEmailHtml(name, verifyUrl),
  });
}
