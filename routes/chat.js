import { Router } from "express";
import https from "https";

const router = Router();

async function callOpenRouter(payload) {
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
  try {
    let result = await callOpenRouter(req.body);

    if (result.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      result = await callOpenRouter(req.body);
    }

    console.log(`[OpenRouter] status=${result.status}`);
    res.status(result.status).json(JSON.parse(result.body));
  } catch (e) {
    console.error("[OpenRouter] error:", e.message);
    res.status(502).json({ error: e.message });
  }
});

export default router;
