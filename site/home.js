import { mountHeader } from "/shared/lab.js";
import { cellClass, conflicts } from "/sudoku/sudoku-core.js";
import { diffWords } from "/stories/stories-core.js";

// Replays one recorded run of each model (home.json), so the home page downloads no model.
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const $ = (s) => document.querySelector(`[data-${s}]`);

mountHeader($("hdr"));
const { puzzle, boards, story } = await (await fetch("/home.json")).json();

function show(k) {
  const b = boards[k], prev = k ? boards[k - 1] : null, bad = conflicts(b);
  $("board").innerHTML = `<div class="board">${b.map((v, i) =>
    `<div class="${[cellClass(i), puzzle[i] ? "clue" : "gen", bad.has(i) ? "bad" : "", prev && prev[i] !== v ? "changed" : ""].join(" ")}">${v || ""}</div>`).join("")}</div>`;
  $("story").innerHTML = diffWords(story[k], k ? story[k - 1] : "").map(({ w, fresh }) => (fresh ? `<span class="new">${esc(w)}</span>` : esc(w))).join("");
  $("pass").textContent = `pass ${k + 1} of 12`;
}

if (matchMedia("(prefers-reduced-motion: reduce)").matches) show(11);
else {
  let k = 0;
  const tick = () => { show(k); setTimeout(tick, k === 11 ? 3000 : 650); k = (k + 1) % 12; };
  tick();
}
