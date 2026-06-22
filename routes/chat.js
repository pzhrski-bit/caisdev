import { Router } from "express";
import https from "https";
import http from "http";

const router = Router();

const MODEL = process.env.AI_MODEL || "gemini-2.5-flash";
const MAX_TOKENS = 1500;

// CF Worker URL proxies to Gemini outside RF
const API_URL = process.env.AI_API_URL || "https://caisdev-gemini-proxy.pzhrski.workers.dev";

async function callAI(messages, temperature) {
  const payload = {
    model: MODEL,
    messages,
    max_tokens: MAX_TOKENS,
    ...(temperature !== undefined ? { temperature } : {}),
  };
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL(API_URL);
    const lib = url.protocol === "https:" ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = lib.request(options, (res) => {
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
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      result = await callAI(messages, temperature);
      if (result.status !== 429) break;
      await new Promise(r => setTimeout(r, (attempt + 1) * 3000));
    }

    console.log(`[AI] model=${MODEL} status=${result.status}`);
    res.status(result.status).json(JSON.parse(result.body));
  } catch (e) {
    console.error("[AI] error:", e.message);
    res.status(502).json({ error: e.message });
  }
});

export default router;
