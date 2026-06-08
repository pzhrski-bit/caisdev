import { Router } from "express";
import crypto from "crypto";
import { db } from "../db/index.js";

const router = Router();

router.post("/", async (req, res) => {
  const { phase, title, persona_set = "hrm" } = req.body;
  try {
    const { rows } = await db.query(
      "INSERT INTO sessions (user_id, phase, title, persona_set) VALUES ($1, $2, $3, $4) RETURNING id",
      [req.user.id, phase, title || "Новая сессия", persona_set]
    );
    res.json({ id: rows[0].id });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, phase, title, persona_set, created_at FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows: sessions } = await db.query(
      "SELECT * FROM sessions WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (!sessions.length) return res.status(404).json({ error: "Session not found" });

    const { rows: messages } = await db.query(
      "SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC",
      [req.params.id]
    );
    res.json({ ...sessions[0], messages });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/messages", async (req, res) => {
  const { persona_id, content } = req.body;
  if (!persona_id || !content) return res.status(400).json({ error: "persona_id and content required" });

  try {
    const { rows: sessions } = await db.query(
      "SELECT id FROM sessions WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (!sessions.length) return res.status(404).json({ error: "Session not found" });

    const { rows } = await db.query(
      "INSERT INTO messages (session_id, persona_id, content) VALUES ($1, $2, $3) RETURNING id",
      [req.params.id, persona_id, content]
    );
    res.json({ id: rows[0].id });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/share", async (req, res) => {
  try {
    const { rows: sessions } = await db.query(
      "SELECT id FROM sessions WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (!sessions.length) return res.status(404).json({ error: "Session not found" });

    const token = crypto.randomBytes(24).toString("hex");
    await db.query("INSERT INTO shares (session_id, token) VALUES ($1, $2)", [req.params.id, token]);
    res.json({ url: `?share=${token}` });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Public share route — no auth required (mounted separately in server.js)
export async function getSharedSession(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT s.*, array_agg(row_to_json(m) ORDER BY m.created_at) AS messages
       FROM shares sh
       JOIN sessions s ON s.id = sh.session_id
       LEFT JOIN messages m ON m.session_id = s.id
       WHERE sh.token = $1
       GROUP BY s.id`,
      [req.params.token]
    );
    if (!rows.length) return res.status(404).json({ error: "Share not found" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}

export default router;
