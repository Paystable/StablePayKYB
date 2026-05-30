const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const router = express.Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post("/", async (req, res) => {
  try {
    const { messages, system, model, max_tokens } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    const response = await anthropic.messages.create({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: max_tokens || 1000,
      system: system || "You are a compliance assistant.",
      messages,
    });

    res.json(response);
  } catch (err) {
    console.error("[Chat] Error:", err.message);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

module.exports = router;
