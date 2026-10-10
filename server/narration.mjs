import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { stages } from "../src/analysis.js";

export function createNarrationServer({
  apiKey = process.env.OPENAI_API_KEY,
  origins = (process.env.ALLOWED_ORIGINS || "http://127.0.0.1:5173,http://localhost:5173,https://gregorytrent.github.io").split(","),
  fetchImpl = fetch,
  maxGenerations = 12,
  now = Date.now
} = {}) {
  const cache = new Map();
  const pending = new Map();
  let generations = 0;
  let windowStart = now();
  let requests = 0;
  async function generate(stage) {
    if (cache.has(stage.id)) return cache.get(stage.id);
    if (pending.has(stage.id)) return pending.get(stage.id);
    if (generations >= maxGenerations) throw new Error("limit");
    generations += 1;
    const job = (async () => {
      const response = await fetchImpl("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts", voice: "marin", response_format: "mp3",
          input: `${stage.narration} ${stage.prompt}`,
          instructions: "Speak like a warm, thoughtful research coach in a natural conversation. Use a relaxed, clear pace, gentle pauses, and varied intonation. Avoid an announcer or robotic delivery."
        }),
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) throw new Error("provider");
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error("audio");
      cache.set(stage.id, bytes);
      return bytes;
    })();
    pending.set(stage.id, job);
    try { return await job; } finally { pending.delete(stage.id); }
  }
  return createServer(async (req, res) => {
    const origin = req.headers.origin;
    res.setHeader("Vary", "Origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const fail = (status, message) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: message }));
    };
    if (!origins.includes(origin)) return fail(403, "Origin not allowed.");
    res.setHeader("Access-Control-Allow-Origin", origin);
    if (req.url !== "/speech") return fail(404, "Not found.");
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600" });
      return res.end();
    }
    if (req.method !== "POST") return fail(405, "Use POST.");
    if (now() - windowStart >= 60000) { windowStart = now(); requests = 0; }
    if (++requests > 120) return fail(429, "Please wait before replaying.");
    if (!apiKey) return fail(503, "Narration is not connected yet.");
    if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) return fail(415, "Use JSON.");
    try {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024) { fail(413, "Request too large."); return; }
        chunks.push(chunk);
      }
      let data;
      try { data = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch { return fail(400, "Invalid request."); }
      const stage = stages.find((item) => item.id === data?.stageId);
      if (!stage || Object.keys(data).some((key) => key !== "stageId")) return fail(400, "Select a preset stage.");
      const bytes = await generate(stage);
      res.writeHead(200, { "Content-Type": "audio/mpeg", "Content-Length": bytes.length, "Cache-Control": "private, max-age=86400" });
      res.end(bytes);
    } catch (error) {
      fail(error.message === "limit" ? 429 : 502, "Narration temporarily unavailable.");
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 8787);
  const host = process.env.HOST || "127.0.0.1";
  const server = createNarrationServer();
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.listen(port, host, () => console.log(`Narration service listening on ${host}:${port}. API key ${process.env.OPENAI_API_KEY ? "configured" : "not configured"}.`));
}
