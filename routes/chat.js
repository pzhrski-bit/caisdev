import { Router } from "express";
import https from "https";

const router = Router();

const MODEL = process.env.AI_MODEL || "google/gemini-2.5-flash";
const MAX_TOKENS = 1500;

async function callOpenRouter(messages, temperature) {
  const payload = {
    model: MODEL,
    messages,
    max_tokens: MAX_TOKENS,
    ...(temperature !== undefined ? { temperature } : {}),
  };
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname: "openrouter.ai",
      path: "/api/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

router.post("/", async (req, res) => {
  const { messages, temperature } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "messages must be an array" });
  }

  try {
    let result = await callOpenRouter(messages, temperature);

    if (result.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      result = await callOpenRouter(messages, temperature);
    }

    console.log(`[OpenRouter] model=${MODEL} status=${result.status}`);
    res.status(result.status).json(JSON.parse(result.body));
  } catch (e) {
    console.error("[OpenRouter] error:", e.message);
    res.status(502).json({ error: e.message });
  }
});

export default router;
