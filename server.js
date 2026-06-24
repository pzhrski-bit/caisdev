import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routes/auth.js";
import chatRouter from "./routes/chat.js";
import sessionsRouter from "./routes/sessions.js";
import { getSharedSession } from "./routes/sessions.js";
import uploadRouter from "./routes/upload.js";
import promptsRouter from "./routes/prompts.js";
import { requireAuth } from "./middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// AI key stored in CF Worker secret — no key needed on VPS side
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set");
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/model', (req, res) => {
  res.json({ model: process.env.AI_MODEL || 'unknown' });
});

app.use("/api/auth", authRouter);
app.use("/api/chat", requireAuth, chatRouter);
app.use("/api/sessions", requireAuth, sessionsRouter);
app.use("/api/upload", requireAuth, uploadRouter);
app.use("/api/prompts", requireAuth, promptsRouter);
app.get("/api/share/:token", getSharedSession);

app.use(express.static(__dirname));
app.get("/prompts", (req, res) => res.sendFile(path.join(__dirname, "prompts.html")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "hrm_review.html")));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
