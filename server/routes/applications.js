const express = require("express");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { sendKYBSubmittedEmail } = require("../services/msg91");
const router = express.Router();

function genRef() {
  return "SP-OTC-" + Date.now().toString(36).toUpperCase().slice(-8);
}

// Extract applicant from token (optional — won't fail if no token)
function optionalApplicant(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    return decoded.type === "applicant" ? decoded.id : null;
  } catch { return null; }
}

// Create new draft application (requires applicant auth)
router.post("/", async (req, res) => {
  try {
    const applicantId = optionalApplicant(req);
    if (!applicantId) return res.status(401).json({ error: "Login required to create an application" });

    const ref = genRef();
    const result = await pool.query(
      "INSERT INTO applications (ref_code, status, form_data, applicant_id) VALUES ($1, 'draft', $2, $3) RETURNING id, ref_code, status, created_at",
      [ref, JSON.stringify(req.body.formData || {}), applicantId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[App] Create error:", err);
    res.status(500).json({ error: "Failed to create application" });
  }
});

// Get own application (applicant — for loading drafts)
router.get("/mine/:id", async (req, res) => {
  try {
    const applicantId = optionalApplicant(req);
    if (!applicantId) return res.status(401).json({ error: "Login required" });

    const result = await pool.query(
      "SELECT id, ref_code, status, form_data, created_at, updated_at, submitted_at FROM applications WHERE id = $1 AND applicant_id = $2",
      [req.params.id, applicantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Application not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[App] Get own error:", err);
    res.status(500).json({ error: "Failed to load application" });
  }
});

// Save draft (applicant owned)
router.patch("/:id", async (req, res) => {
  try {
    const applicantId = optionalApplicant(req);
    if (!applicantId) return res.status(401).json({ error: "Login required" });

    const { formData } = req.body;
    if (!formData) return res.status(400).json({ error: "formData required" });

    const result = await pool.query(
      "UPDATE applications SET form_data = $1, updated_at = now() WHERE id = $2 AND status = 'draft' AND applicant_id = $3 RETURNING id, ref_code, updated_at",
      [JSON.stringify(formData), req.params.id, applicantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Draft not found or already submitted" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[App] Save error:", err);
    res.status(500).json({ error: "Failed to save" });
  }
});

// Submit application (applicant owned)
router.post("/:id/submit", async (req, res) => {
  try {
    const applicantId = optionalApplicant(req);
    if (!applicantId) return res.status(401).json({ error: "Login required" });

    const { submissionMeta } = req.body;
    const result = await pool.query(
      `UPDATE applications SET status = 'pending_review', submission_meta = $1, submitted_at = now(), updated_at = now()
       WHERE id = $2 AND status = 'draft' AND applicant_id = $3 RETURNING id, ref_code, status, submitted_at, form_data`,
      [JSON.stringify(submissionMeta || {}), req.params.id, applicantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Draft not found or already submitted" });

    // Send KYB submitted confirmation email
    const app = result.rows[0];
    const formData = typeof app.form_data === "string" ? JSON.parse(app.form_data) : (app.form_data || {});
    const applicant = await pool.query("SELECT email FROM applicant_users WHERE id = $1", [applicantId]);
    if (applicant.rows[0]?.email) {
      sendKYBSubmittedEmail({
        to: applicant.rows[0].email,
        refCode: app.ref_code,
        companyName: formData.co_name,
        email: applicant.rows[0].email,
      }).catch(err => console.error("[App] Submission email failed:", err));
    }

    res.json({ id: app.id, ref_code: app.ref_code, status: app.status, submitted_at: app.submitted_at });
  } catch (err) {
    console.error("[App] Submit error:", err);
    res.status(500).json({ error: "Failed to submit" });
  }
});

// List all applications (admin only)
router.get("/", authenticate, requireRole("admin", "reviewer", "senior_reviewer"), async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let query = "SELECT id, ref_code, status, risk_tier, form_data->>'co_name' as co_name, form_data->>'appName' as app_name, form_data->>'co_country' as country, submitted_at, created_at, updated_at FROM applications";
    const params = [];

    if (status) {
      query += " WHERE status = $1";
      params.push(status);
    } else {
      query += " WHERE status != 'draft'";
    }

    query += ` ORDER BY submitted_at DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    const countResult = await pool.query("SELECT count(*) FROM applications WHERE status != 'draft'");

    res.json({ applications: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error("[App] List error:", err);
    res.status(500).json({ error: "Failed to list applications" });
  }
});

// Live drafts — admin real-time view of saved drafts (admin only)
router.get("/drafts", authenticate, requireRole("admin", "reviewer", "senior_reviewer"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.ref_code, a.status, a.form_data->>'co_name' as co_name, a.form_data->>'appName' as app_name,
              a.form_data->>'appEmail' as app_email, a.form_data->>'co_country' as country,
              a.form_data->>'co_type' as entity_type, a.created_at, a.updated_at,
              u.email as applicant_email,
              CASE WHEN a.updated_at > a.created_at THEN true ELSE false END as has_saved
       FROM applications a
       LEFT JOIN applicant_users u ON a.applicant_id = u.id
       WHERE a.status = 'draft'
       ORDER BY a.updated_at DESC`
    );
    res.json({ drafts: result.rows, total: result.rows.length });
  } catch (err) {
    console.error("[App] Drafts error:", err);
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

// Get single application (admin only)
router.get("/:id", authenticate, requireRole("admin", "reviewer", "senior_reviewer"), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM applications WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Application not found" });

    const docs = await pool.query("SELECT * FROM documents WHERE application_id = $1 ORDER BY uploaded_at", [req.params.id]);
    const analyses = await pool.query(
      "SELECT da.* FROM document_analyses da JOIN documents d ON da.document_id = d.id WHERE d.application_id = $1",
      [req.params.id]
    );
    const notes = await pool.query(
      "SELECT n.*, u.name as author_name FROM application_notes n LEFT JOIN admin_users u ON n.author_id = u.id WHERE n.application_id = $1 ORDER BY n.created_at DESC",
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      documents: docs.rows,
      analyses: analyses.rows,
      notes: notes.rows,
    });
  } catch (err) {
    console.error("[App] Get error:", err);
    res.status(500).json({ error: "Failed to get application" });
  }
});

// Update status (admin only)
router.patch("/:id/status", authenticate, requireRole("admin", "senior_reviewer"), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["pending_review", "in_review", "flagged", "approved", "rejected"];
    if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });

    const result = await pool.query(
      "UPDATE applications SET status = $1, reviewed_by = $2, reviewed_at = now(), updated_at = now() WHERE id = $3 RETURNING id, ref_code, status",
      [status, req.user.id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Application not found" });

    await pool.query(
      `INSERT INTO audit_log (actor_type, actor_id, action, target_type, target_id, detail, ip_address) VALUES ('admin', $1, 'status.changed', 'application', $2, $3, $4)`,
      [req.user.id, req.params.id, JSON.stringify({ newStatus: status }), req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("[App] Status update error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Add note (admin only)
router.post("/:id/notes", authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content required" });

    const result = await pool.query(
      "INSERT INTO application_notes (application_id, author_id, content) VALUES ($1, $2, $3) RETURNING *",
      [req.params.id, req.user.id, content.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[App] Note error:", err);
    res.status(500).json({ error: "Failed to add note" });
  }
});

module.exports = router;
