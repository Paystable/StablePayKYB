const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const router = express.Router();

let sharp, exifr, fileTypeFromBuffer, Anthropic;
try { sharp = require("sharp"); } catch { sharp = null; }
try { exifr = require("exifr"); } catch { exifr = null; }
try { fileTypeFromBuffer = require("file-type").fileTypeFromBuffer; } catch { fileTypeFromBuffer = null; }
try { Anthropic = require("@anthropic-ai/sdk"); } catch { Anthropic = null; }

const EDIT_SOFTWARE = ["photoshop","gimp","affinity","canva","pixlr","paint.net","illustrator","inkscape","corel","lightroom","snapseed","fotor","befunky","picsart","adobe"];

// Check file integrity via magic bytes
async function checkIntegrity(buffer, originalName) {
  const findings = [];
  if (!fileTypeFromBuffer) return { findings, detectedType: "unknown" };

  const detected = await fileTypeFromBuffer(buffer);
  const ext = path.extname(originalName).toLowerCase().replace(".", "");
  const extMap = { jpg: "jpg", jpeg: "jpg", png: "png", pdf: "pdf", tif: "tiff", tiff: "tiff" };

  if (detected && extMap[ext] && detected.ext !== extMap[ext] && detected.ext !== ext) {
    findings.push({ severity: "critical", area: "File Integrity", desc: `Extension .${ext} does not match detected type ${detected.ext}. Possible file masquerading.` });
  }

  if (buffer.length < 1000) {
    findings.push({ severity: "warning", area: "File Size", desc: "File is suspiciously small (under 1KB). May be placeholder or corrupt." });
  }

  return { findings, detectedType: detected?.ext || "unknown", mime: detected?.mime };
}

// Parse EXIF metadata
async function parseExif(buffer) {
  const findings = [];
  if (!exifr) return { findings, hasExif: false };

  try {
    const data = await exifr.parse(buffer, { pick: ["Software", "DateTime", "DateTimeOriginal", "Make", "Model", "GPSLatitude", "GPSLongitude"] });
    if (!data) return { findings, hasExif: false };

    const software = data.Software || "";
    if (software && EDIT_SOFTWARE.some(s => software.toLowerCase().includes(s))) {
      findings.push({ severity: "warning", area: "EXIF Software", desc: `Editing software detected: "${software}". Document may have been modified.` });
    }

    if (data.DateTime && data.DateTimeOriginal) {
      const dt = new Date(data.DateTime).getTime();
      const dto = new Date(data.DateTimeOriginal).getTime();
      if (Math.abs(dt - dto) > 86400000) {
        findings.push({ severity: "warning", area: "EXIF Dates", desc: "DateTime and DateTimeOriginal differ by more than 24h. Possible modification." });
      }
    }

    return {
      findings,
      hasExif: true,
      software: data.Software,
      dateTime: data.DateTime,
      dateTimeOriginal: data.DateTimeOriginal,
      hasGPS: !!(data.GPSLatitude && data.GPSLongitude),
      make: data.Make,
      model: data.Model,
    };
  } catch {
    return { findings, hasExif: false };
  }
}

// Error Level Analysis using sharp
async function runELA(buffer) {
  const findings = [];
  if (!sharp) return { findings, elaScore: 0 };

  try {
    const img = sharp(buffer);
    const metadata = await img.metadata();
    if (!metadata.width || metadata.format === "pdf") return { findings, elaScore: 0 };

    // Recompress at 85% quality
    const recompressed = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
    const origPixels = await sharp(buffer).raw().toBuffer();
    const recompPixels = await sharp(recompressed).resize(metadata.width, metadata.height).raw().toBuffer();

    // Compute pixel difference variance
    let totalDiff = 0, maxDiff = 0;
    const blockSize = 16;
    const blockDiffs = [];
    const pixelCount = Math.min(origPixels.length, recompPixels.length);

    for (let i = 0; i < pixelCount; i += 3) {
      const diff = Math.abs(origPixels[i] - recompPixels[i]) + Math.abs(origPixels[i + 1] - recompPixels[i + 1]) + Math.abs(origPixels[i + 2] - recompPixels[i + 2]);
      totalDiff += diff;
      if (diff > maxDiff) maxDiff = diff;
    }

    const avgDiff = totalDiff / (pixelCount / 3);
    // Normalize to 0-100 score
    const elaScore = Math.min(100, Math.round(avgDiff * 2));

    if (elaScore > 40) {
      findings.push({ severity: "warning", area: "ELA Analysis", desc: `High compression variance detected (score: ${elaScore}). Regions may have been edited at different compression levels.` });
    }
    if (elaScore > 70) {
      findings.push({ severity: "critical", area: "ELA Analysis", desc: `Very high ELA score (${elaScore}). Strong indicator of localized image manipulation.` });
    }

    return { findings, elaScore };
  } catch {
    return { findings, elaScore: 0 };
  }
}

// Claude Vision AI analysis
async function analyzeWithAI(buffer, mimeType, docLabel) {
  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) return { findings: [], riskScore: 0 };
  if (mimeType === "application/pdf") return { findings: [], riskScore: 0, skipped: "PDF — vision analysis not applicable" };

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const base64 = buffer.toString("base64");
    const mediaType = mimeType || "image/jpeg";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: `You are a document fraud analyst reviewing a "${docLabel}" submitted for KYB verification. Analyze this document for signs of forgery, tampering, or inconsistency. Return JSON only: {"riskScore":0-100,"riskLevel":"low|medium|high|critical","summary":"one sentence","findings":[{"severity":"info|warning|critical","area":"string","desc":"string"}],"documentTypeMatch":true/false}` },
        ],
      }],
    });

    const text = response.content[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { findings: [], riskScore: 0 };

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("[Analysis] AI error:", err.message);
    return { findings: [], riskScore: 0 };
  }
}

// Analyze a document (admin only)
router.post("/:docId", authenticate, requireRole("admin", "reviewer", "senior_reviewer"), async (req, res) => {
  try {
    const docResult = await pool.query("SELECT * FROM documents WHERE id = $1", [req.params.docId]);
    if (docResult.rows.length === 0) return res.status(404).json({ error: "Document not found" });

    const doc = docResult.rows[0];
    if (!fs.existsSync(doc.file_path)) return res.status(404).json({ error: "File not found on disk" });

    // Read file
    const buffer = fs.readFileSync(doc.file_path);
    const docLabel = req.body.label || doc.field_key;

    // Run all checks in parallel
    const [integrity, exifData, ela, ai] = await Promise.all([
      checkIntegrity(buffer, doc.original_name),
      parseExif(buffer),
      runELA(buffer),
      analyzeWithAI(buffer, doc.mime_type, docLabel),
    ]);

    // Combine findings
    const allFindings = [...integrity.findings, ...exifData.findings, ...ela.findings, ...(ai.findings || [])];

    // Composite score: 30% technical + 70% AI
    const techScore = Math.min(100, (integrity.findings.filter(f => f.severity === "critical").length * 30) +
      (exifData.findings.length * 15) + (ela.elaScore || 0));
    const compositeScore = Math.round(techScore * 0.3 + (ai.riskScore || 0) * 0.7);
    const compositeLevel = compositeScore >= 70 ? "critical" : compositeScore >= 45 ? "high" : compositeScore >= 20 ? "medium" : "low";

    // Store result
    const analysisResult = await pool.query(
      `INSERT INTO document_analyses (document_id, composite_score, composite_level, integrity_data, exif_data, ela_data, ai_data, findings, document_type_match)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [doc.id, compositeScore, compositeLevel, JSON.stringify(integrity), JSON.stringify(exifData), JSON.stringify(ela), JSON.stringify(ai), JSON.stringify(allFindings), ai.documentTypeMatch !== false]
    );

    res.json(analysisResult.rows[0]);
  } catch (err) {
    console.error("[Analysis] Error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

module.exports = router;
