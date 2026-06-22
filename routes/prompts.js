import { Router } from "express";
import { db } from "../db/index.js";

const router = Router();

router.get("/", async (req, res) => {
  const [overrides, defaults] = await Promise.all([
    db.query("SELECT persona_id, prompt FROM prompt_overrides WHERE user_id = $1", [req.user.id]),
    db.query("SELECT persona_id, prompt FROM prompt_defaults"),
  ]);
  res.json({
    overrides: Object.fromEntries(overrides.rows.map(r => [r.persona_id, { prompt: r.prompt, source: "personal" }])),
    defaults: Object.fromEntries(defaults.rows.map(r => [r.persona_id, { prompt: r.prompt, source: "global" }])),
  });
});

router.put("/:persona_id", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: "prompt required" });
  await db.query(
    `INSERT INTO prompt_overrides (user_id, persona_id, prompt, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, persona_id) DO UPDATE SET prompt = EXCLUDED.prompt, updated_at = NOW()`,
    [req.user.id, req.params.persona_id, prompt.trim()]
  );
  res.json({ ok: true });
});

router.delete("/:persona_id", async (req, res) => {
  await db.query(
    "DELETE FROM prompt_overrides WHERE user_id = $1 AND persona_id = $2",
    [req.user.id, req.params.persona_id]
  );
  res.json({ ok: true });
});

router.post("/publish", async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  const { persona_ids } = req.body;
  const params = [req.user.id];
  let q = "SELECT persona_id, prompt FROM prompt_overrides WHERE user_id = $1";
  if (Array.isArray(persona_ids) && persona_ids.length) { q += " AND persona_id = ANY($2)"; params.push(persona_ids); }
  const { rows } = await db.query(q, params);
  for (const row of rows) {
    await db.query(
      `INSERT INTO prompt_defaults (persona_id, prompt, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (persona_id) DO UPDATE SET prompt = EXCLUDED.prompt, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [row.persona_id, row.prompt, req.user.id]
    );
  }
  res.json({ ok: true, published: rows.length });
});

export default router;
