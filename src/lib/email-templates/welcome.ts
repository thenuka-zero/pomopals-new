export function buildWelcomeEmailHtml(name: string, verifyUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to PomoPals</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDF6EC; font-family: 'Nunito', 'Segoe UI', Roboto, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF6EC;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #FFFFFF; border-radius: 16px; border: 2px solid #F0E6D3; overflow: hidden;">

          <!-- Header with PomoPals mascot -->
          <tr>
            <td align="center" style="padding: 36px 32px 20px; background-color: #FFFFFF;">
              <div style="text-align: center;">
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <!-- Body - round tomato shape -->
                  <ellipse cx="100" cy="115" rx="72" ry="68" fill="#E54B4B" />
                  <!-- Body highlight/shine -->
                  <ellipse cx="80" cy="95" rx="30" ry="22" fill="#F06060" opacity="0.5" />
                  <ellipse cx="75" cy="88" rx="12" ry="8" fill="#F28080" opacity="0.4" />

                  <!-- Stem -->
                  <rect x="95" y="42" width="10" height="18" rx="5" fill="#5B8C3E" />

                  <!-- Leaves -->
                  <ellipse cx="82" cy="52" rx="18" ry="8" fill="#6EAE3E" transform="rotate(-25 82 52)" />
                  <ellipse cx="118" cy="52" rx="18" ry="8" fill="#6EAE3E" transform="rotate(25 118 52)" />
                  <ellipse cx="72" cy="56" rx="14" ry="6" fill="#5B9E35" transform="rotate(-40 72 56)" />
                  <ellipse cx="128" cy="56" rx="14" ry="6" fill="#5B9E35" transform="rotate(40 128 56)" />

                  <!-- Face - Eyes -->
                  <ellipse cx="80" cy="112" rx="8" ry="9" fill="#3D2417" />
                  <ellipse cx="120" cy="112" rx="8" ry="9" fill="#3D2417" />
                  <!-- Eye highlights -->
                  <circle cx="83" cy="108" r="3.5" fill="white" />
                  <circle cx="123" cy="108" r="3.5" fill="white" />
                  <circle cx="78" cy="114" r="1.5" fill="white" />
                  <circle cx="118" cy="114" r="1.5" fill="white" />

                  <!-- Cute smile -->
                  <path
                    d="M88 126 Q100 138 112 126"
                    stroke="#3D2417"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    fill="none"
                  />

                  <!-- Blush cheeks -->
                  <ellipse cx="66" cy="124" rx="10" ry="7" fill="#F5A0A0" opacity="0.6" />
                  <ellipse cx="134" cy="124" rx="10" ry="7" fill="#F5A0A0" opacity="0.6" />

                  <!-- Left arm -->
                  <path
                    d="M32 120 Q25 115 28 108"
                    stroke="#E54B4B"
                    stroke-width="8"
                    stroke-linecap="round"
                    fill="none"
                  />
                  <circle cx="27" cy="106" r="5" fill="#E54B4B" />
                  <!-- Right arm -->
                  <path
                    d="M168 120 Q175 115 172 108"
                    stroke="#E54B4B"
                    stroke-width="8"
                    stroke-linecap="round"
                    fill="none"
                  />
                  <circle cx="173" cy="106" r="5" fill="#E54B4B" />

                  <!-- Little feet -->
                  <ellipse cx="80" cy="180" rx="14" ry="6" fill="#D43D3D" />
                  <ellipse cx="120" cy="180" rx="14" ry="6" fill="#D43D3D" />
                </svg>
              </div>
              <h1 style="margin: 16px 0 0; font-size: 24px; font-weight: 800; color: #3D2C2C;">
                Welcome to Pomo<span style="color: #E54B4B;">Pals</span>!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 32px 28px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #5C4033;">
                Hey ${firstName}! We're so glad you're here.
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #5C4033;">
                PomoPals is your cozy corner for staying focused. Use the Pomodoro technique
                solo or team up with friends in shared timer rooms. Track your progress,
                build streaks, and watch your productivity grow.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #5C4033;">
                Just one thing -- tap the button below to verify your email so we can
                save your pomodoro stats:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}"
                       style="display: inline-block; padding: 14px 36px; background-color: #E54B4B; color: #FFFFFF; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 50px; box-shadow: 0 4px 12px rgba(229, 75, 75, 0.25);">
                      Verify My Email &#127813;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #8B7355; text-align: center;">
                This link expires in 24 hours. If you didn't create a PomoPals account,
                you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="border-top: 2px solid #F0E6D3;"></div>
            </td>
          </tr>

          <!-- Footer -->
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
