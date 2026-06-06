import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error("OPENROUTER_API_KEY is not set. Create a .env file or set the env variable.");
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  if (req.url === "/api/chat" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;

    let payload;
    try { payload = JSON.parse(body); } catch {
      res.writeHead(400, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify({ error: "Bad JSON" }));
      return;
    }

    const upstream = JSON.stringify(payload);
    const options = {
      hostname: "openrouter.ai",
      path: "/api/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OPENROUTER_API_KEY,
        "HTTP-Referer": "https://caisdev.app",
        "X-Title": "cAIsdev",
        "Content-Length": Buffer.byteLength(upstream),
      },
    };

    const proxy = https.request(options, (upRes) => {
      let data = "";
      upRes.on("data", c => data += c);
      upRes.on("end", () => {
        console.log(`[OpenRouter] status=${upRes.statusCode}`);
        res.writeHead(upRes.statusCode, { "Content-Type": "application/json", ...cors });
        res.end(data);
      });
    });

    proxy.on("error", (err) => {
      console.error(`[OpenRouter] network error: ${err.message}`);
      res.writeHead(502, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify({ error: err.message }));
    });

    proxy.write(upstream);
    proxy.end();
    return;
  }

  // Static files
  let filePath = req.url === "/" ? "/hrm_review.html" : req.url;
  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const mime = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript" }[ext] || "text/plain";
    res.writeHead(200, { "Content-Type": mime, ...cors });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
