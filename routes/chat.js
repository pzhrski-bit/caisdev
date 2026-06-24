import { Router } from "express";
import https from "https";

const router = Router();

const MODEL = process.env.AI_MODEL || "gemini-2.5-flash";
const MAX_TOKENS = 3000;
const API_URL = process.env.AI_API_URL;
const PROXY_KEY = process.env.AI_PROXY_KEY;

if (!API_URL) { console.error("AI_API_URL is not set"); process.exit(1); }
if (!PROXY_KEY) { console.error("AI_PROXY_KEY is not set"); process.exit(1); }

const parsedUrl = new URL(API_URL);
if (parsedUrl.protocol !== "https:") {
  console.error("AI_API_URL must use https://");
  process.exit(1);
}

async function callAI(messages, temperature, max_tokens = MAX_TOKENS) {
  const payload = {
    model: MODEL,
    messages,
    max_tokens,
    ...(temperature !== undefined ? { temperature } : {}),
  };
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Authorization": "Bearer " + PROXY_KEY,
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
  const { messages, temperature, maxTokens } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "messages must be an array" });
  }
  const tokenLimit = maxTokens ? Math.min(Number(maxTokens), 8000) : MAX_TOKENS;

  try {
    let result;
    for (let attempt = 0; attempt < 5; attempt++) {
      result = await callAI(messages, temperature, tokenLimit);
      if (result.status !== 429 && result.status !== 503) break;
      await new Promise(r => setTimeout(r, (attempt + 1) * 6000));
    }

    console.log(`[AI] model=${MODEL} status=${result.status}`);
    res.status(result.status).json(JSON.parse(result.body));
  } catch (e) {
    console.error("[AI] error:", e.message);
    res.status(502).json({ error: e.message });
  }
});

export default router;
