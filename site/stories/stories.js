import { fetchJson, loadTask, modelUrl, toNumbers } from "/shared/lab.js";
import { player } from "/shared/player.js";
import { LEVELS, decode, diffWords, mentions, sample, splitLevels } from "./stories-core.js";

const TEMPS = { low: 0.6, medium: 0.8, high: 1 };
// Each appears in 10 to 22% of random stories (40 sampled), so 10 drafts find it 65 to 92% of the time.
const TOPICS = ["dog", "ball", "toy", "tree", "car", "park"];
const DRAFTS = 10;
// Phones kill tabs well below the ~2.5 GB this model needs while loading.
const PHONE = navigator.userAgentData?.mobile ?? (/iPhone|iPad|Android/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent)));
const WARN = "This model needs about 2.5 GB of memory while it loads. Phone browsers usually close the page. Try it on a desktop.";
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const seg = (name, label, opts, on, shown = true, extra = "") =>
  `<div class="seg" role="group" aria-label="${label}">${shown ? label : ""}${opts.map((o) => `<button aria-pressed="${o === on}" data-${name}="${o}">${o}</button>`).join("")}${extra}</div>`;

export function mountStories(root) {
  root.innerHTML = `
    <div class="stack">
    <div class="panel">
      <h2 class="step"><b>1</b> Start a story</h2>
      <div class="opts">
        <span>Topic</span>${seg("topic", "topic", ["anything", ...TOPICS], "anything", false)}
        <span>Randomness</span>${seg("temp", "randomness", Object.keys(TEMPS), "medium", false)}
      </div>
      <p class="hint" data-why hidden>The model can't take a prompt, so it writes up to ${DRAFTS} drafts and keeps the first that uses your word.</p>
      <div class="row" style="margin-top:16px"><button class="primary" data-go>Write a story</button><span class="hint${PHONE ? " warn" : ""}" data-hint>${PHONE ? WARN : "first run downloads 570 MB, best on a desktop"}</span></div>
      <div class="bar" hidden><i data-bar></i></div>
      <div class="status" data-status></div>
    </div>
    <div class="panel" data-result>
      <h2 class="step"><b>2</b> Watch it take shape</h2>
      <div class="levels">
        <button class="ghost" data-play disabled>play</button>
        <input type="range" min="1" max="12" value="12" data-slider aria-label="Pass" disabled>
        <span class="lvl" data-lvl>pass - of 12</span>
      </div>
      <div class="story empty" data-text></div>
      <div class="legend"><span><i class="changed"></i>new this pass</span><span data-key hidden><u data-word></u>your topic</span></div>
      ${seg("speed", "speed", ["real", "slow"], "real", true, '<button class="snd" data-sound>sound off</button>')}
    </div>
    </div>`;

  const $ = (s) => root.querySelector(`[data-${s}]`);
  const opt = { temp: "medium", topic: "anything" };
  let texts = [];
  let shown = "anything";
  let task, vocab, unigram;

  const playback = player(root, (k) => {
    $("text").classList.remove("empty");
    $("text").innerHTML = diffWords(texts[k], k ? texts[k - 1] : "").map(({ w, fresh }) => {
      const h = shown !== "anything" && mentions(w, shown) ? `<u>${esc(w)}</u>` : esc(w);
      return fresh ? `<span class="new">${h}</span>` : h;
    }).join("");
  }, 700);

  function progress(stage, got, total, cached) {
    if (cached) return;
    $("bar").hidden = false;
    $("bar").style.width = total ? `${Math.round((got / total) * 100)}%` : "50%";
    $("status").textContent = `downloading the model ${stage}, ${(got / 1e6).toFixed(0)} of ${(total / 1e6).toFixed(0)} MB`;
  }

  async function draft(s, bytes, probs) {
    const T = (type, data, dims) => new s.ort.Tensor(type, data, dims);
    const t0 = performance.now();
    const out = await s.session.run({
      prefix: T("int64", new BigInt64Array(1), [1, 1]),
      l0: T("int64", BigInt64Array.of(BigInt(sample(probs, Math.random()))), [1, 1]),
      u: T("float32", Float32Array.from({ length: 640 }, Math.random), [1, 640]),
      temperature: T("float32", Float32Array.of(TEMPS[opt.temp]), [1]),
    });
    return { ms: performance.now() - t0, texts: splitLevels(toNumbers(out.tokens)).map((ids) => decode(ids, bytes)) };
  }

  let warned = false;

  async function run() {
    if (PHONE && !task && !warned) {
      if (!confirm(`${WARN}\n\nDownload 570 MB and try anyway?`)) return;
      warned = true;
    }
    $("go").disabled = true;
    $("status").textContent = "loading the model";
    try {
      task ??= loadTask("tinystories", progress).catch((e) => { task = null; throw e; });
      vocab ??= fetchJson(modelUrl("tinystories", "vocab.json"));
      unigram ??= fetchJson(modelUrl("tinystories", "level0_unigram.json"));
      const [s, { bytes }, probs] = await Promise.all([task, vocab, unigram]);
      $("bar").hidden = true;
      $("hint").hidden = true;
      const topic = opt.topic;
      const tries = topic === "anything" ? 1 : DRAFTS;
      const t0 = performance.now();
      let d, n = 0;
      while (n < tries) {
        if (tries > 1) {
          $("status").textContent = `writing draft ${n + 1} of ${tries}, looking for "${topic}"`;
          $("bar").hidden = false;
          $("bar").style.width = `${(n / tries) * 100}%`;
        }
        d = await draft(s, bytes, probs);
        n++;
        if (topic === "anything" || mentions(d.texts.at(-1), topic)) break;
      }
      const secs = ((performance.now() - t0) / 1000).toFixed(1);
      const on = s.backend === "webgpu" ? "GPU" : "CPU";
      const found = topic === "anything" || mentions(d.texts.at(-1), topic);
      $("status").textContent = topic === "anything" ? `done in ${secs} s on your ${on}`
        : found ? `found "${topic}" in draft ${n} of ${tries}, ${secs} s on your ${on}`
        : `no draft mentioned "${topic}" in ${tries} tries, showing the last one`;
      $("bar").hidden = true;
      texts = d.texts;
      shown = topic;
      $("key").hidden = topic === "anything" || !found;
      $("word").textContent = topic;
      playback.start(LEVELS.length, d.ms);
      const r = $("result").getBoundingClientRect();
      if (r.top > innerHeight - 120) $("result").scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      console.error(e);
      vocab = unigram = null;
      $("status").textContent = `something went wrong: ${e.message}`;
    } finally {
      $("go").disabled = false;
    }
  }

  $("go").addEventListener("click", run);
  for (const name of ["temp", "topic"]) {
    root.querySelectorAll(`[data-${name}]`).forEach((b) => b.addEventListener("click", () => {
      opt[name] = b.dataset[name];
      $("why").hidden = opt.topic === "anything";
      root.querySelectorAll(`[data-${name}]`).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
  }
}
