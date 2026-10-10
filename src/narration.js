export function createCloudNarrator({ endpoint, fetchImpl = fetch, createAudio = () => new Audio(), makeUrl = URL.createObjectURL, revokeUrl = URL.revokeObjectURL }) {
  let generation = 0;
  let controller;
  let audio;
  let url;
  const cache = new Map();
  function stop() {
    generation += 1;
    controller?.abort();
    controller = null;
    if (audio) { audio.pause(); audio.onended = null; audio.onerror = null; }
    audio = null;
    if (url) revokeUrl(url);
    url = null;
  }
  async function play(stageId, rate, onEnded) {
    stop();
    const current = generation;
    const requestController = new AbortController();
    controller = requestController;
    const timeout = setTimeout(() => requestController.abort(), 35000);
    try {
      let blob = cache.get(stageId);
      if (!blob) {
        const response = await fetchImpl(endpoint, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stageId }), signal: requestController.signal
        });
        if (!response.ok || !response.headers.get("content-type")?.startsWith("audio/")) throw new Error("unavailable");
        blob = await response.blob();
        if (!blob.size) throw new Error("unavailable");
        cache.set(stageId, blob);
      }
      if (generation !== current) return "cancelled";
      url = makeUrl(blob);
      audio = createAudio();
      audio.src = url;
      audio.playbackRate = rate;
      audio.onended = () => { if (generation === current) { stop(); onEnded(); } };
      audio.onerror = () => { if (generation === current) { stop(); onEnded("error"); } };
      await audio.play();
      return generation === current ? "playing" : "cancelled";
    } catch (error) {
      if (generation !== current) return "cancelled";
      stop();
      return error.name === "NotAllowedError" ? "blocked" : "unavailable";
    } finally { clearTimeout(timeout); }
  }
  return { play, stop };
}
