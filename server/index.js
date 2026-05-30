require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const pool = require("./db");

const authRoutes = require("./routes/auth");
const applicantAuthRoutes = require("./routes/applicant-auth");
const appRoutes = require("./routes/applications");
const docRoutes = require("./routes/documents");
const chatRoutes = require("./routes/chat");
const analysisRoutes = require("./routes/analysis");
const demoRoutes = require("./routes/demo");

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet({ contentSecurityPolicy: false }));
const ALLOWED_ORIGINS = ["https://kyb.stablepay.global", "https://stablepay.global", "https://www.stablepay.global", "https://otc.stablepay.global", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"];
app.use(cors({ origin: function(origin, cb) { if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) return cb(null, true); cb(null, false); }, credentials: true }));
app.use(express.json({ limit: "2mb" }));

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: "Too many requests" } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: "Too many auth attempts" } });
app.use("/api/", apiLimiter);
app.use("/api/auth/", authLimiter);

// Audit logging middleware
app.use("/api/", (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.method !== "GET" && req.method !== "OPTIONS") {
      pool.query(
        `INSERT INTO audit_log (actor_type, actor_id, action, detail, ip_address) VALUES ($1, $2, $3, $4, $5)`,
        [req.user ? "admin" : "applicant", req.user?.id || null, `${req.method} ${req.path}`, JSON.stringify({ status: res.statusCode, ms: Date.now() - start }), req.ip]
      ).catch(() => {});
    }
  });
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/applicant", applicantAuthRoutes);
app.use("/api/applications", appRoutes);
app.use("/api/documents", docRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/demo-requests", demoRoutes);

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected", uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] Stable Pay KYB API running on port ${PORT}`);
});
