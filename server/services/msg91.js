const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_EMAIL = process.env.MSG91_SENDER_EMAIL || "hello@stablepay.global";
const MSG91_SENDER_NAME = process.env.MSG91_SENDER_NAME || "Stable Pay";
const MSG91_DOMAIN = process.env.MSG91_DOMAIN || "stablepay.global";

// MSG91 template slugs
const TEMPLATE_OTP = "stable_pay_kyb_otp";
const TEMPLATE_OTP_OTC = "stable_pay_otc_desk_otp";
const TEMPLATE_KYB_SUBMITTED = "stable_pay_kyb_submitted";

async function sendTemplateEmail({ to, toName, templateSlug, variables }) {
  if (!MSG91_AUTH_KEY) {
    console.error("[MSG91] Auth key not configured");
    throw new Error("Email service not configured");
  }

  const payload = {
    recipients: [
      {
        to: [{ email: to, name: toName || to }],
        variables: variables || {},
      },
    ],
    from: { email: MSG91_SENDER_EMAIL, name: MSG91_SENDER_NAME },
    domain: MSG91_DOMAIN,
    template_id: templateSlug,
  };

  const res = await fetch("https://control.msg91.com/api/v5/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      authkey: MSG91_AUTH_KEY,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("[MSG91] Email send failed:", JSON.stringify(data));
    throw new Error(data.message || "Failed to send email");
  }

  console.log("[MSG91] Email sent to", to, "— template:", templateSlug);
  return data;
}

async function sendOTPEmail(email, otp, source) {
  const template = source === "otc" ? TEMPLATE_OTP_OTC : TEMPLATE_OTP;
  return sendTemplateEmail({
    to: email,
    templateSlug: template,
    variables: { otp, email },
  });
}

async function sendKYBSubmittedEmail({ to, refCode, companyName, email }) {
  return sendTemplateEmail({
    to,
    templateSlug: TEMPLATE_KYB_SUBMITTED,
    variables: {
      ref_code: refCode || "—",
      company_name: companyName || "—",
      email: email || to,
    },
  });
}

module.exports = { sendTemplateEmail, sendOTPEmail, sendKYBSubmittedEmail };
