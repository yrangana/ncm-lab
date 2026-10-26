const ORT_VERSION = "1.23.0";
const CDN = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const CACHE = "ncm-lab-v1";
// Smaller builds live in our own repo; the rest are the public exports.
const REPOS = { "tinystories-q4": "yrangana/ncm-lab-models" };

async function detectDevice() {
  let webgpu = false;
  try {
    const a = await navigator.gpu?.requestAdapter();
    // SwiftShader runs these graphs ~70x slower than wasm.
    webgpu = !!a && !a.isFallbackAdapter && !/swiftshader/i.test(a.info?.architecture);
  } catch {}
  const threads = crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1;
  return { webgpu, threads };
}

// Writes the download into one buffer when the size is known, so it is not held twice while joining chunks.
// caches is missing outside secure contexts, so the cache is optional.
async function fetchCached(url, onProgress) {
  const cache = await globalThis.caches?.open(CACHE).catch(() => null);
  const hit = await cache?.match(url);
  if (hit) {
    const buf = new Uint8Array(await hit.arrayBuffer());
    onProgress?.(buf.length, buf.length, true);
    return buf;
  }
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`download failed (${res.status}) for ${url}`);
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body.getReader();
  let buf = total ? new Uint8Array(total) : null;
  let chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    // content-length can be wrong (compressed bodies); fall back to collecting chunks.
    if (buf && got + value.length > total) { chunks = [buf.subarray(0, got)]; buf = null; }
    if (buf) buf.set(value, got);
    else chunks.push(value);
    got += value.length;
    onProgress?.(got, total, false);
  }
  if (!buf) {
    buf = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { buf.set(c, o); o += c.length; }
  } else if (got < total) buf = buf.slice(0, got);
  await cache?.put(url, new Response(buf)).catch(() => {});
  return buf;
}

let ortPromise = null;
function loadOrt() {
  ortPromise ??= (async () => {
    // site/vendor (make vendor) only exists locally. wasmPaths must be absolute: ORT resolves it against its own URL.
    const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    for (const base of local ? [`${location.origin}/vendor/ort/`, CDN] : [CDN]) {
      try {
        const ort = await import(`${base}ort.webgpu.bundle.min.mjs`);
        ort.env.wasm.wasmPaths = base;
        ort.env.logLevel = "error";
        return ort;
      } catch (e) { console.warn(`ORT not at ${base}`, e); }
    }
    throw new Error("could not load onnxruntime-web, run `make vendor`");
  })();
  return ortPromise;
}

export const modelUrl = (task, file) => `https://huggingface.co/${REPOS[task] || "mrfakename/ncm-webgpu-weights"}/resolve/main/${task}/${file}`;

export const fetchJson = async (url) => JSON.parse(new TextDecoder().decode(await fetchCached(url)));

export async function loadTask(task, onProgress) {
  const graph = await fetchCached(modelUrl(task, "model.onnx"), (g, t, c) => onProgress?.("graph", g, t, c));
  const data = await fetchCached(modelUrl(task, "model.onnx.data"), (g, t, c) => onProgress?.("weights", g, t, c));
  const ort = await loadOrt();
  const dev = await detectDevice();
  ort.env.wasm.numThreads = dev.threads;
  let err;
  for (const ep of dev.webgpu ? ["webgpu", "wasm"] : ["wasm"]) {
    try {
      const session = await ort.InferenceSession.create(graph, {
        executionProviders: [ep],
        externalData: [{ path: "model.onnx.data", data }],
        graphOptimizationLevel: "all",
      });
      return { ort, session, backend: ep };
    } catch (e) { console.warn(`${ep} failed`, e); err = e; }
  }
  throw err;
}

export const toNumbers = (t) => Array.from(t.data, Number);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mountHeader(el, path = "") {
  el.innerHTML = `<div class="top"><a class="brand" href="/">ncm-lab</a>${path ? `<span class="path">/${path}</span>` : ""}</div>`;
}
