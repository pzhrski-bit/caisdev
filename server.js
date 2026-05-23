import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const server = http.createServer(async (req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  if (req.url === "/api/chat" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;

    let parsed;
    try { parsed = JSON.parse(body); } catch {
      res.writeHead(400, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify({ error: "Bad JSON" }));
      return;
    }

    const { apiKey, ...payload } = parsed;
    if (!apiKey) {
      res.writeHead(401, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify({ error: "No API key" }));
      return;
    }
    console.log(`[Auth] key="${apiKey.slice(0,12)}..." len=${apiKey.length}`);

    const upstream = JSON.stringify(payload);
    const options = {
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
        "Content-Length": Buffer.byteLength(upstream),
      },
    };

    const proxy = https.request(options, (upRes) => {
      let data = "";
      upRes.on("data", c => data += c);
      upRes.on("end", () => {
        console.log(`[DeepSeek] status=${upRes.statusCode} body=${data.slice(0, 300)}`);
        res.writeHead(upRes.statusCode, { "Content-Type": "application/json", ...cors });
        res.end(data);
      });
    });

    proxy.on("error", (err) => {
      console.error(`[DeepSeek] network error: ${err.message}`);
      res.writeHead(502, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify({ error: err.message }));
    });

    proxy.write(upstream);
    proxy.end();
    return;
  }

  // Serve static files
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
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
