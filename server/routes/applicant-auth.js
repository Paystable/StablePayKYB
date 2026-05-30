const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { sendOTPEmail } = require("../services/msg91");
const router = express.Router();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP to email
router.post("/send-otp", async (req, res) => {
  try {
    const { email, source } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const cleanEmail = email.toLowerCase().trim();

    // Rate limit: max 5 OTPs per email per hour
    const recentCount = await pool.query(
      "SELECT count(*) FROM otp_codes WHERE email = $1 AND created_at > now() - interval '1 hour'",
      [cleanEmail]
    );
    if (parseInt(recentCount.rows[0].count) >= 5) {
      return res.status(429).json({ error: "Too many OTP requests. Please try again later." });
    }

    // Invalidate previous unused OTPs for this email
    await pool.query(
      "UPDATE otp_codes SET verified = true WHERE email = $1 AND verified = false",
      [cleanEmail]
    );

    // Generate and store OTP
    const otp = generateOTP();
    await pool.query(
      "INSERT INTO otp_codes (email, otp_code, expires_at) VALUES ($1, $2, now() + interval '10 minutes')",
      [cleanEmail, otp]
    );

    // Send OTP email via MSG91 (source: "otc" uses OTC template)
    await sendOTPEmail(cleanEmail, otp, source);

    await pool.query(
      `INSERT INTO audit_log (actor_type, actor_id, action, detail, ip_address) VALUES ('applicant', $1, 'otp.sent', $2, $3)`,
      [cleanEmail, JSON.stringify({ email: cleanEmail }), req.ip]
    );

    res.json({ message: "OTP sent to your email", email: cleanEmail });
  } catch (err) {
    console.error("[ApplicantAuth] Send OTP error:", err);
    res.status(500).json({ error: "Failed to send verification code. Please try again." });
  }
});

// Verify OTP and login/register
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    const cleanEmail = email.toLowerCase().trim();

    // Find valid OTP
    const otpResult = await pool.query(
      "SELECT * FROM otp_codes WHERE email = $1 AND otp_code = $2 AND verified = false AND expires_at > now() ORDER BY created_at DESC LIMIT 1",
      [cleanEmail, otp.trim()]
    );

    if (otpResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired verification code" });
    }

    // Mark OTP as used
    await pool.query("UPDATE otp_codes SET verified = true WHERE id = $1", [otpResult.rows[0].id]);

    // Find or create applicant user
    let userResult = await pool.query("SELECT * FROM applicant_users WHERE email = $1", [cleanEmail]);

    if (userResult.rows.length === 0) {
      // Auto-register new user
      userResult = await pool.query(
        "INSERT INTO applicant_users (email) VALUES ($1) RETURNING *",
        [cleanEmail]
      );
      await pool.query(
        `INSERT INTO audit_log (actor_type, actor_id, action, ip_address) VALUES ('applicant', $1, 'applicant.register', $2)`,
        [userResult.rows[0].id, req.ip]
      );
    }

    const user = userResult.rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, type: "applicant" },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    await pool.query(
      `INSERT INTO audit_log (actor_type, actor_id, action, ip_address) VALUES ('applicant', $1, 'applicant.login', $2)`,
      [user.id, req.ip]
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error("[ApplicantAuth] Verify OTP error:", err);
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// Resend OTP
router.post("/resend-otp", async (req, res) => {
  try {
    const { email, source } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const cleanEmail = email.toLowerCase().trim();

    // Rate limit: max 5 per hour
    const recentCount = await pool.query(
      "SELECT count(*) FROM otp_codes WHERE email = $1 AND created_at > now() - interval '1 hour'",
      [cleanEmail]
    );
    if (parseInt(recentCount.rows[0].count) >= 5) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    // Invalidate old OTPs
    await pool.query(
      "UPDATE otp_codes SET verified = true WHERE email = $1 AND verified = false",
      [cleanEmail]
    );

    const otp = generateOTP();
    await pool.query(
      "INSERT INTO otp_codes (email, otp_code, expires_at) VALUES ($1, $2, now() + interval '10 minutes')",
      [cleanEmail, otp]
    );

    await sendOTPEmail(cleanEmail, otp, source);

    res.json({ message: "New OTP sent to your email" });
  } catch (err) {
    console.error("[ApplicantAuth] Resend OTP error:", err);
    res.status(500).json({ error: "Failed to resend code. Please try again." });
  }
});

// Get current applicant profile + their applications
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Auth required" });

    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    if (decoded.type !== "applicant") return res.status(403).json({ error: "Not an applicant token" });

    const user = await pool.query("SELECT id, email, name, created_at FROM applicant_users WHERE id = $1", [decoded.id]);
    if (user.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const apps = await pool.query(
      "SELECT id, ref_code, status, form_data->>'co_name' as company_name, created_at, updated_at, submitted_at FROM applications WHERE applicant_id = $1 ORDER BY updated_at DESC",
      [decoded.id]
    );

    res.json({ user: user.rows[0], applications: apps.rows });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") return res.status(401).json({ error: "Invalid or expired token" });
    console.error("[ApplicantAuth] Me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
