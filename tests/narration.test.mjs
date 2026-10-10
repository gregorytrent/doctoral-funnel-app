import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createNarrationServer } from "../server/narration.mjs";
import { createCloudNarrator } from "../src/narration.js";

async function withServer(options, run) {
  const server = createNarrationServer({ apiKey: "test-only", origins: ["https://example.org"], ...options });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const endpoint = `http://127.0.0.1:${server.address().port}/speech`;
  const request = (data, origin = "https://example.org") => fetch(endpoint, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(data)
  });
  try { await run(request); } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
}

test("private service restricts prompts and caches Marin audio", async () => {
  let calls = 0;
  await withServer({ fetchImpl: async (_url, options) => {
    calls++;
    const body = JSON.parse(options.body);
    assert.equal(body.voice, "marin");
    assert.equal(body.model, "gpt-4o-mini-tts");
    assert.match(body.input, /scholarly territory/);
    assert.equal(options.headers.Authorization, "Bearer test-only");
    return new Response("test-mp3", { headers: { "Content-Type": "audio/mpeg" } });
  } }, async (request) => {
    assert.equal((await request({ stageId: "domain" }, "https://wrong.org")).status, 403);
    assert.equal((await request({ stageId: "wrong" })).status, 400);
    assert.equal((await request({ stageId: "domain", text: "private answer" })).status, 400);
    for (let i = 0; i < 2; i++) {
      const response = await request({ stageId: "domain" });
      assert.equal(response.status, 200);
      assert.equal(await response.text(), "test-mp3");
      assert.equal(response.headers.get("access-control-allow-origin"), "https://example.org");
    }
    assert.equal(calls, 1);
  });
});

test("missing key, provider failure, and spend cap fail safely", async () => {
  await withServer({ apiKey: "" }, async (request) => assert.equal((await request({ stageId: "domain" })).status, 503));
  await withServer({ maxGenerations: 1, fetchImpl: async () => new Response("secret provider diagnostic", { status: 401 }) }, async (request) => {
    const response = await request({ stageId: "domain" });
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /secret/);
    assert.equal((await request({ stageId: "domain" })).status, 429);
  });
});

function clientHarness(fetchImpl) {
  const audios = [];
  const revoked = [];
  const narrator = createCloudNarrator({ endpoint: "https://example.org/speech", fetchImpl,
    createAudio: () => { const audio = { play: async () => {}, pause: () => { audio.paused = true; } }; audios.push(audio); return audio; },
    makeUrl: () => "blob:test", revokeUrl: (url) => revoked.push(url)
  });
  return { narrator, audios, revoked };
}
const audioResponse = () => new Response("audio", { headers: { "Content-Type": "audio/mpeg" } });

test("client sends no answers; replay caches; stop releases audio", async () => {
  let calls = 0;
  const { narrator, audios, revoked } = clientHarness(async (_url, options) => {
    calls++;
    assert.deepEqual(JSON.parse(options.body), { stageId: "domain" });
    return audioResponse();
  });
  assert.equal(await narrator.play("domain", 0.9, () => {}), "playing");
  assert.equal(audios[0].playbackRate, 0.9);
  assert.equal(await narrator.play("domain", 1, () => {}), "playing");
  assert.equal(calls, 1);
  assert.equal(audios[0].paused, true);
  narrator.stop();
  assert.equal(audios[1].paused, true);
  assert.equal(revoked.length, 2);
});

test("cancelled requests never begin playback", async () => {
  let complete;
  const { narrator, audios } = clientHarness(() => new Promise((resolve) => { complete = resolve; }));
  const pending = narrator.play("domain", 1, () => {});
  narrator.stop();
  complete(audioResponse());
  assert.equal(await pending, "cancelled");
  assert.equal(audios.length, 0);
});

test("client distinguishes service and autoplay failures", async () => {
  const { narrator } = clientHarness(async () => new Response("unavailable", { status: 503 }));
  assert.equal(await narrator.play("domain", 1, () => {}), "unavailable");
  const blocked = createCloudNarrator({ endpoint: "test", fetchImpl: async () => audioResponse(), makeUrl: () => "blob:test", revokeUrl: () => {},
    createAudio: () => ({ pause() {}, async play() { throw Object.assign(new Error(), { name: "NotAllowedError" }); } })
  });
  assert.equal(await blocked.play("domain", 1, () => {}), "blocked");
});
