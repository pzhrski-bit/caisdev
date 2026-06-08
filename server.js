import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routes/auth.js";
import chatRouter from "./routes/chat.js";
import sessionsRouter from "./routes/sessions.js";
import { getSharedSession } from "./routes/sessions.js";
import uploadRouter from "./routes/upload.js";
import { requireAuth } from "./middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

if (!process.env.OPENROUTER_API_KEY) {
  console.error("OPENROUTER_API_KEY is not set");
  process.exit(1);
}
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

app.use("/api/auth", authRouter);
app.use("/api/chat", requireAuth, chatRouter);
app.use("/api/sessions", requireAuth, sessionsRouter);
app.use("/api/upload", requireAuth, uploadRouter);
app.get("/api/share/:token", getSharedSession);

app.use(express.static(__dirname));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "hrm_review.html")));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
