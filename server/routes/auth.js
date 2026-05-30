const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const result = await pool.query("SELECT * FROM admin_users WHERE email = $1", [email.toLowerCase().trim()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    await pool.query(
      `INSERT INTO audit_log (actor_type, actor_id, action, ip_address) VALUES ('admin', $1, 'auth.login', $2)`,
      [user.id, req.ip]
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/register-admin", async (req, res) => {
  // Only allow if no admin users exist (initial setup) or if caller is admin
  try {
    const count = await pool.query("SELECT count(*) FROM admin_users");
    if (parseInt(count.rows[0].count) > 0) {
      return res.status(403).json({ error: "Admin registration is closed. Contact existing admin." });
    }

    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "All fields required" });
    if (password.length < 12) return res.status(400).json({ error: "Password must be at least 12 characters" });

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO admin_users (email, password_hash, name, role) VALUES ($1, $2, $3, 'admin') RETURNING id, email, name, role",
      [email.toLowerCase().trim(), hash, name]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered" });
    console.error("[Auth] Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
