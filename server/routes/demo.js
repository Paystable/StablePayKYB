const express = require("express");
const pool = require("../db");
const router = express.Router();

// Submit demo request (public — from landing page)
router.post("/", async (req, res) => {
  try {
    const { name, email, company, useCase, message } = req.body;
    if (!name || !email || !company) return res.status(400).json({ error: "Name, email, and company are required" });

    const result = await pool.query(
      "INSERT INTO demo_requests (name, email, company, use_case, message, ip_address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at",
      [name.trim(), email.toLowerCase().trim(), company.trim(), useCase || null, message || null, req.ip]
    );

    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("[Demo] Submit error:", err);
    res.status(500).json({ error: "Failed to submit request" });
  }
});

// List demo requests (admin only)
router.get("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Auth required" });

    const result = await pool.query("SELECT * FROM demo_requests ORDER BY created_at DESC LIMIT 100");
    res.json({ requests: result.rows, total: result.rows.length });
  } catch (err) {
    console.error("[Demo] List error:", err);
    res.status(500).json({ error: "Failed to list requests" });
  }
});

module.exports = router;
