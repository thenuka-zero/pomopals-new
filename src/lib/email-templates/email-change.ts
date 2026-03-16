export function buildEmailChangeHtml(name: string, verifyUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your new PomoPals email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDF6EC; font-family: 'Nunito', 'Segoe UI', Roboto, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF6EC;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #FFFFFF; border-radius: 16px; border: 2px solid #F0E6D3; overflow: hidden;">

          <tr>
            <td align="center" style="padding: 36px 32px 20px; background-color: #FFFFFF;">
              <div style="width: 56px; height: 56px; background-color: #E54B4B; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; line-height: 56px; text-align: center;">
                &#128231;
              </div>
              <h1 style="margin: 16px 0 0; font-size: 22px; font-weight: 800; color: #3D2C2C;">
                Confirm your new email
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 28px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #5C4033;">
                Hey ${firstName}! You requested to change your email address on Pomo<span style="color: #E54B4B;">Pals</span>.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #5C4033;">
                Click the button below to confirm this is your new email. This link expires in <strong>1 hour</strong>.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}"
                       style="display: inline-block; padding: 14px 36px; background-color: #E54B4B; color: #FFFFFF; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 50px; box-shadow: 0 4px 12px rgba(229, 75, 75, 0.25);">
                      Confirm New Email &#127813;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #8B7355; text-align: center;">
                If you didn't request this change, you can safely ignore this email.
                Your current email address will remain unchanged.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px;">
              <div style="border-top: 2px solid #F0E6D3;"></div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 20px 32px 28px;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #8B7355;">
                Made with &#127813; by the PomoPals team
              </p>
              <p style="margin: 0; font-size: 12px; color: #C4B098;">
                If the button doesn't work, paste this link into your browser:<br/>
                <a href="${verifyUrl}" style="color: #E54B4B; word-break: break-all;">${verifyUrl}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
