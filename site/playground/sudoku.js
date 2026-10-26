import { loadTask, mulberry32, toNumbers } from "/shared/lab.js";
import { CLUES, conflicts, countClues, decodeLevels, encodeBoard, generate, isSolved } from "./sudoku-core.js";

export function mountSudoku(root) {
  root.innerHTML = `
    <div class="cols">
      <div class="panel">
        <div class="head">
          <h2 class="step"><b>1</b> Pick a puzzle, or type one</h2>
          <div class="row">
            <select data-diff aria-label="Difficulty"><option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option></select>
            <button class="ghost" data-new>new puzzle</button>
            <button class="ghost" data-clear>clear</button>
          </div>
        </div>
        <div data-input></div>
        <div>
          <div class="row" style="margin-top:14px"><button class="primary" data-solve>Solve</button><span class="hint" data-hint>first run downloads 150 MB</span></div>
          <div class="bar" hidden><i data-bar></i></div>
          <div class="status" data-status></div>
        </div>
      </div>
      <div class="panel" data-result>
        <div class="head">
          <h2 class="step"><b>2</b> Watch it fix its own mistakes</h2>
          <div class="levels">
            <button class="ghost" data-play disabled>play</button>
            <input type="range" min="1" max="12" value="12" data-slider aria-label="Pass" disabled>
            <span class="lvl" data-lvl>pass - of 12</span>
          </div>
        </div>
        <div data-output></div>
        <div>
          <div class="stats" data-stats></div>
          <div class="legend"><span><i class="clue">4</i>given</span><span><i class="gen">4</i>model</span><span><i class="bad">4</i>breaks a rule</span><span><i class="changed"></i>just changed</span></div>
          <div class="seg" role="group" aria-label="Playback speed">speed<button aria-pressed="true" data-speed="real">real</button><button aria-pressed="false" data-speed="slow">slow</button></div>
        </div>
      </div>
    </div>`;

  const $ = (s) => root.querySelector(`[data-${s}]`);
  let puzzle = Array(81).fill(0);
  let levels = [];
  let timer = null;
  let runMs = 0;
  let cur = -1;
  let speed = "real";
  const sessions = {};
  let seed = 7;

  const cellClass = (i) => `cell${i % 9 === 2 || i % 9 === 5 ? " bx" : ""}${Math.floor(i / 9) === 2 || Math.floor(i / 9) === 5 ? " by" : ""}`;

  function drawInput() {
    const el = $("input");
    el.innerHTML = `<div class="board">${puzzle.map((v, i) => `<div class="${cellClass(i)}${v ? " clue" : ""}"><input inputmode="numeric" maxlength="1" data-i="${i}" value="${v || ""}" aria-label="cell ${i + 1}"></div>`).join("")}</div>`;
    el.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("input", () => {
        const v = parseInt(inp.value, 10);
        puzzle[+inp.dataset.i] = v >= 1 && v <= 9 ? v : 0;
        inp.value = puzzle[+inp.dataset.i] || "";
        inp.parentElement.classList.toggle("clue", !!puzzle[+inp.dataset.i]);
      });
    });
  }

  function drawLevel(k) {
    if (!levels.length) return;
    cur = k;
    const b = levels[k];
    const prev = k ? levels[k - 1] : null;
    const bad = conflicts(b);
    $("slider").value = String(k + 1);
    $("lvl").textContent = `pass ${k + 1} of ${levels.length}`;
    $("output").innerHTML = `<div class="board">${b.map((v, i) => {
      const cls = [cellClass(i), puzzle[i] ? "clue" : "gen", bad.has(i) ? "bad" : "", prev && prev[i] !== v ? "changed" : ""].join(" ");
      return `<div class="${cls}">${v || ""}</div>`;
    }).join("")}</div>`;
    const last = k === levels.length - 1;
    const verdict = isSolved(b, puzzle) ? "<b class='ok'>solved</b>" : "<b class='no'>not solved</b>";
    const n = bad.size;
    $("stats").innerHTML = `${n ? `${n} ${n === 1 ? "cell breaks" : "cells break"} a rule` : "no rule breaks"}${last ? ` · ${verdict}` : ""}`;
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    $("play").textContent = "play";
  }

  function play() {
    stop();
    let k = cur < 0 || cur >= levels.length - 1 ? 0 : cur;
    drawLevel(k);
    $("play").textContent = "pause";
    // The graph only reports the total time, so real speed splits it evenly.
    const step = speed === "real" ? runMs / levels.length : 420;
    timer = setInterval(() => { if (++k >= levels.length) return stop(); drawLevel(k); }, step);
  }

  function newPuzzle() {
    const diff = $("diff").value;
    puzzle = generate(CLUES[diff], mulberry32(seed++)).puzzle;
    drawInput();
  }

  async function session(diff) {
    if (!sessions[diff]) {
      sessions[diff] = loadTask(`sudoku-${diff}`, (stage, g, t, cached) => {
        if (stage !== "weights" || cached) return;
        $("bar").hidden = false;
        $("bar").style.width = t ? `${Math.round((g / t) * 100)}%` : "50%";
        $("status").textContent = `downloading the ${diff} model, ${(g / 1e6).toFixed(0)} of ${(t / 1e6).toFixed(0)} MB`;
      });
      sessions[diff].catch(() => { delete sessions[diff]; });
    }
    return sessions[diff];
  }

  async function run() {
    const n = countClues(puzzle);
    if (n < 17) { $("status").textContent = `needs at least 17 numbers, has ${n}`; return; }
    if (conflicts(puzzle).size) { $("status").textContent = "the puzzle has a repeated number in a row, column or box"; return; }
    $("solve").disabled = true;
    $("status").textContent = "loading the model";
    try {
      const diff = $("diff").value;
      const s = await session(diff);
      const prefix = encodeBoard(puzzle);
      const input = new s.ort.Tensor("int64", BigInt64Array.from(prefix, BigInt), [1, prefix.length]);
      const t0 = performance.now();
      const out = await s.session.run({ prefix: input });
      const ms = (runMs = performance.now() - t0);
      levels = decodeLevels(toNumbers(out.tokens));
      if (levels.length !== 12) throw new Error(`unexpected output shape ${out.tokens.dims}`);
      $("slider").max = String(levels.length);
      $("slider").disabled = $("play").disabled = false;
      cur = -1;
      $("bar").hidden = true;
      $("hint").hidden = true;
      $("status").textContent = `done in ${(ms / 1000).toFixed(1)} s on your ${s.backend === "webgpu" ? "GPU" : "CPU"}`;
      play();
      const r = $("result").getBoundingClientRect();
      if (r.top > innerHeight - 120) $("result").scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      console.error(e);
      $("status").textContent = `something went wrong: ${e.message}`;
    } finally {
      $("solve").disabled = false;
    }
  }

  $("new").addEventListener("click", newPuzzle);
  $("clear").addEventListener("click", () => { puzzle = Array(81).fill(0); drawInput(); });
  $("diff").addEventListener("change", newPuzzle);
  $("solve").addEventListener("click", run);
  $("play").addEventListener("click", () => (timer ? stop() : play()));
  root.querySelectorAll("[data-speed]").forEach((b) => b.addEventListener("click", () => {
    speed = b.dataset.speed;
    root.querySelectorAll("[data-speed]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    if (levels.length) { cur = -1; play(); }
  }));
  $("slider").addEventListener("input", () => { stop(); drawLevel(+$("slider").value - 1); });
  newPuzzle();
  $("output").innerHTML = `<div class="board empty">${puzzle.map((_, i) => `<div class="${cellClass(i)}"></div>`).join("")}</div>`;
}
