import { Resend } from "resend";
import { buildWelcomeEmailHtml } from "./email-templates/welcome";

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "development"
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS = "PomoPals <noreply@pomopals.app>";

export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationToken: string
): Promise<void> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/auth/verify?token=${verificationToken}`;

  if (!resend) {
    console.log(`\n[PomoPals Email] Verification link for ${to}:\n  ${verifyUrl}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Let's ketchup! Verify your PomoPals account 🍅",
    html: buildWelcomeEmailHtml(name, verifyUrl),
  });
}
