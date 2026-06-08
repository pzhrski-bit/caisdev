import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";

const router = Router();

router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username and password required" });
  if (username.length < 3) return res.status(400).json({ error: "username must be at least 3 characters" });
  if (password.length < 6) return res.status(400).json({ error: "password must be at least 6 characters" });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username.trim(), hash]
    );
    const token = jwt.sign({ id: rows[0].id, username: rows[0].username }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, username: rows[0].username });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Username already taken" });
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username and password required" });

  try {
    const { rows } = await db.query("SELECT * FROM users WHERE username = $1", [username.trim()]);
    if (!rows.length) return res.status(401).json({ error: "Invalid username or password" });

    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid username or password" });

    await db.query("UPDATE users SET last_login = now() WHERE id = $1", [rows[0].id]);
    const token = jwt.sign({ id: rows[0].id, username: rows[0].username }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, username: rows[0].username });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
