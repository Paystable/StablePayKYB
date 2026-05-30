const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const { authenticate } = require("../middleware/auth");
const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/var/data/kyb-uploads";

// Ensure upload directory exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const appDir = path.join(UPLOAD_DIR, req.params.appId || "unknown");
    fs.mkdirSync(appDir, { recursive: true });
    cb(null, appDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${req.body.fieldKey || "doc"}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error("File type not allowed. Accepted: PDF, JPG, PNG, TIFF"));
    }
    cb(null, true);
  },
});

// Upload document
router.post("/upload/:appId", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Compute SHA-256 checksum
    const fileBuffer = fs.readFileSync(req.file.path);
    const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const result = await pool.query(
      `INSERT INTO documents (application_id, field_key, original_name, file_path, mime_type, size_bytes, checksum_sha256)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, field_key, original_name, size_bytes, checksum_sha256`,
      [req.params.appId, req.body.fieldKey, req.file.originalname, req.file.path, req.file.mimetype, req.file.size, checksum]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[Doc] Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Download document (admin only)
router.get("/:id/download", authenticate, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM documents WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Document not found" });

    const doc = result.rows[0];
    if (!fs.existsSync(doc.file_path)) return res.status(404).json({ error: "File not found on disk" });

    res.download(doc.file_path, doc.original_name);
  } catch (err) {
    console.error("[Doc] Download error:", err);
    res.status(500).json({ error: "Download failed" });
  }
});

// List documents for an application (admin only)
router.get("/app/:appId", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT d.*, da.composite_score, da.composite_level, da.findings FROM documents d LEFT JOIN document_analyses da ON da.document_id = d.id WHERE d.application_id = $1 ORDER BY d.uploaded_at",
      [req.params.appId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[Doc] List error:", err);
    res.status(500).json({ error: "Failed to list documents" });
  }
});

module.exports = router;
