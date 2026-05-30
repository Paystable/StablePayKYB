function otpEmailTemplate(otp, email) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">

  <!-- Main Card -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:linear-gradient(180deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 100%);border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

    <!-- Header with Logo -->
    <tr><td align="center" style="padding:40px 40px 24px;">
      <img src="https://kyb.stablepay.global/TP-logo.png" alt="Stable Pay" height="60" style="display:block;margin:0 auto 8px;" />
    </td></tr>

    <!-- Divider -->
    <tr><td style="padding:0 40px;">
      <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(102,103,171,0.3),transparent);"></div>
    </td></tr>

    <!-- Icon -->
    <tr><td align="center" style="padding:28px 40px 0;">
      <div style="width:56px;height:56px;border-radius:16px;background:rgba(102,103,171,0.15);display:inline-block;line-height:56px;text-align:center;">
        <span style="font-size:24px;">&#128274;</span>
      </div>
    </td></tr>

    <!-- Title -->
    <tr><td align="center" style="padding:20px 40px 8px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Verification Code</h1>
    </td></tr>

    <!-- Description -->
    <tr><td align="center" style="padding:0 40px 28px;">
      <p style="margin:0;font-size:14px;color:#8b8ca0;line-height:1.6;">
        Enter this code to sign in to your Stable Pay account. This code expires in <strong style="color:#c4c5d6;">10 minutes</strong>.
      </p>
    </td></tr>

    <!-- OTP Code Box -->
    <tr><td align="center" style="padding:0 40px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="background:#141420;border:2px solid rgba(102,103,171,0.4);border-radius:14px;box-shadow:0 0 30px rgba(102,103,171,0.1);">
        <tr><td style="padding:20px 48px;">
          <div style="font-size:36px;font-weight:800;letter-spacing:12px;color:#ffffff;font-family:'Courier New',monospace;text-align:center;">${otp}</div>
        </td></tr>
      </table>
    </td></tr>

    <!-- Info Box -->
    <tr><td style="padding:0 40px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(102,103,171,0.08);border-radius:10px;border:1px solid rgba(102,103,171,0.15);">
        <tr><td style="padding:14px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:12px;color:#8b8ca0;">Account</td>
              <td align="right" style="font-size:12px;color:#c4c5d6;font-weight:500;">${email}</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>

    <!-- Security Notice -->
    <tr><td style="padding:0 40px 36px;">
      <p style="margin:0;font-size:11.5px;color:#5a5b70;line-height:1.6;text-align:center;">
        If you didn't request this code, you can safely ignore this email. Never share your verification code with anyone.
      </p>
    </td></tr>
  </table>

  <!-- Footer -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
    <tr><td align="center" style="padding:24px 40px 8px;">
      <p style="margin:0;font-size:11px;color:#3a3b50;">
        &copy; ${new Date().getFullYear()} Stable Pay &middot; All rights reserved
      </p>
    </td></tr>
    <tr><td align="center" style="padding:0 40px 16px;">
      <p style="margin:0;font-size:11px;color:#3a3b50;">
        <a href="https://stablepay.global" style="color:#6667AB;text-decoration:none;">stablepay.global</a>
      </p>
    </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;
}

function kybSubmittedEmailTemplate({ refCode, companyName, email, submittedAt }) {
  const dateStr = new Date(submittedAt || Date.now()).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KYB Application Submitted</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">

  <!-- Main Card -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:linear-gradient(180deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 100%);border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

    <!-- Header with Logo -->
    <tr><td align="center" style="padding:40px 40px 24px;">
      <img src="https://kyb.stablepay.global/TP-logo.png" alt="Stable Pay" height="60" style="display:block;margin:0 auto 8px;" />
    </td></tr>

    <!-- Divider -->
    <tr><td style="padding:0 40px;">
      <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(102,103,171,0.3),transparent);"></div>
    </td></tr>

    <!-- Success Icon -->
    <tr><td align="center" style="padding:28px 40px 0;">
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,rgba(34,197,94,0.2),rgba(34,197,94,0.05));border:2px solid rgba(34,197,94,0.4);display:inline-block;line-height:64px;text-align:center;">
        <span style="font-size:28px;color:#22c55e;">&#10003;</span>
      </div>
    </td></tr>

    <!-- Title -->
    <tr><td align="center" style="padding:20px 40px 8px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Application Submitted</h1>
    </td></tr>

    <!-- Description -->
    <tr><td align="center" style="padding:0 40px 28px;">
      <p style="margin:0;font-size:14px;color:#8b8ca0;line-height:1.7;">
        Your KYB application has been successfully submitted. Our compliance team will review it within <strong style="color:#c4c5d6;">2-5 business days</strong>.
      </p>
    </td></tr>

    <!-- Application Details Box -->
    <tr><td style="padding:0 40px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;border-radius:12px;border:1px solid rgba(102,103,171,0.2);overflow:hidden;">

        <!-- Reference -->
        <tr><td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:12px;color:#5a5b70;letter-spacing:0.03em;">REFERENCE</td>
              <td align="right" style="font-size:13px;color:#6667AB;font-weight:700;font-family:'Courier New',monospace;letter-spacing:0.5px;">${refCode || "—"}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Entity Name -->
        <tr><td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:12px;color:#5a5b70;letter-spacing:0.03em;">ENTITY NAME</td>
              <td align="right" style="font-size:13px;color:#c4c5d6;font-weight:500;">${companyName || "—"}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Email -->
        <tr><td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:12px;color:#5a5b70;letter-spacing:0.03em;">EMAIL</td>
              <td align="right" style="font-size:13px;color:#c4c5d6;">${email || "—"}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Submitted -->
        <tr><td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:12px;color:#5a5b70;letter-spacing:0.03em;">SUBMITTED</td>
              <td align="right" style="font-size:13px;color:#c4c5d6;">${dateStr}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Status -->
        <tr><td style="padding:14px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:12px;color:#5a5b70;letter-spacing:0.03em;">STATUS</td>
              <td align="right">
                <span style="display:inline-block;padding:3px 12px;border-radius:20px;background:rgba(234,179,8,0.15);color:#eab308;font-size:11px;font-weight:600;letter-spacing:0.03em;">UNDER REVIEW</span>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>

    <!-- Timeline -->
    <tr><td style="padding:0 40px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(102,103,171,0.08);border-radius:10px;border:1px solid rgba(102,103,171,0.15);">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 8px;font-size:12px;color:#6667AB;font-weight:600;letter-spacing:0.04em;">WHAT HAPPENS NEXT</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:top;padding-right:10px;padding-bottom:6px;">
                <div style="width:6px;height:6px;border-radius:50%;background:#6667AB;margin-top:5px;"></div>
              </td>
              <td style="font-size:12.5px;color:#8b8ca0;line-height:1.5;padding-bottom:6px;">Our compliance team reviews your application</td>
            </tr>
            <tr>
              <td style="vertical-align:top;padding-right:10px;padding-bottom:6px;">
                <div style="width:6px;height:6px;border-radius:50%;background:#6667AB;margin-top:5px;"></div>
              </td>
              <td style="font-size:12.5px;color:#8b8ca0;line-height:1.5;padding-bottom:6px;">We may reach out if additional documents are needed</td>
            </tr>
            <tr>
              <td style="vertical-align:top;padding-right:10px;">
                <div style="width:6px;height:6px;border-radius:50%;background:#6667AB;margin-top:5px;"></div>
              </td>
              <td style="font-size:12.5px;color:#8b8ca0;line-height:1.5;">You'll receive an email with the final decision</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>

    <!-- CTA Button -->
    <tr><td align="center" style="padding:0 40px 32px;">
      <a href="https://kyb.stablepay.global" style="display:inline-block;padding:13px 36px;background:linear-gradient(135deg,#6667AB 0%,#8889C0 100%);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;box-shadow:0 4px 20px rgba(102,103,171,0.3);">
        View Application Status
      </a>
    </td></tr>

    <!-- Support -->
    <tr><td style="padding:0 40px 36px;">
      <p style="margin:0;font-size:12px;color:#5a5b70;line-height:1.6;text-align:center;">
        Questions? Contact us at <a href="mailto:compliance@stablepay.global" style="color:#6667AB;text-decoration:none;">compliance@stablepay.global</a>
      </p>
    </td></tr>
  </table>

  <!-- Footer -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
    <tr><td align="center" style="padding:24px 40px 8px;">
      <p style="margin:0;font-size:11px;color:#3a3b50;">
        &copy; ${new Date().getFullYear()} Stable Pay &middot; All rights reserved
      </p>
    </td></tr>
    <tr><td align="center" style="padding:0 40px 16px;">
      <p style="margin:0;font-size:11px;color:#3a3b50;">
        <a href="https://stablepay.global" style="color:#6667AB;text-decoration:none;">stablepay.global</a>
      </p>
    </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;
}

module.exports = { otpEmailTemplate, kybSubmittedEmailTemplate };
