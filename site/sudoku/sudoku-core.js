// Boards are 81 numbers, 0 = empty.

const SEP = 10;
const EDGE = 11;
export const CLUES = { easy: 40, medium: 35, hard: 30 };

// 11, rows joined by 10, 11 (91 tokens)
export function encodeBoard(board) {
  if (board.length !== 81) throw new Error("board must have 81 cells");
  const out = [EDGE];
  for (let r = 0; r < 9; r++) {
    if (r) out.push(SEP);
    for (let c = 0; c < 9; c++) out.push(board[r * 9 + c]);
  }
  out.push(EDGE);
  return out;
}

export function decodeLevel(tokens89) {
  const cells = [];
  for (const t of tokens89) {
    if (t === SEP || t === EDGE) continue;
    cells.push(t >= 1 && t <= 9 ? t : 0);
  }
  while (cells.length < 81) cells.push(0);
  return cells.slice(0, 81);
}

export function decodeLevels(flat, width = 89) {
  const levels = [];
  for (let i = 0; i + width <= flat.length; i += width) levels.push(decodeLevel(flat.slice(i, i + width)));
  return levels;
}

export function conflicts(board) {
  const bad = new Set();
  const groups = [];
  for (let i = 0; i < 9; i++) {
    groups.push([...Array(9)].map((_, j) => i * 9 + j));
    groups.push([...Array(9)].map((_, j) => j * 9 + i));
    const br = Math.floor(i / 3) * 3, bc = (i % 3) * 3;
    groups.push([...Array(9)].map((_, j) => (br + Math.floor(j / 3)) * 9 + bc + (j % 3)));
  }
  for (const g of groups) {
    const seen = new Map();
    for (const idx of g) {
      const v = board[idx];
      if (!v) continue;
      if (seen.has(v)) { bad.add(idx); bad.add(seen.get(v)); } else seen.set(v, idx);
    }
  }
  return bad;
}

export function isSolved(board, puzzle) {
  if (board.some((v) => !v)) return false;
  if (conflicts(board).size) return false;
  return puzzle.every((v, i) => !v || board[i] === v);
}

function canPlace(b, idx, v) {
  const r = Math.floor(idx / 9), c = idx % 9;
  for (let j = 0; j < 9; j++) if (b[r * 9 + j] === v || b[j * 9 + c] === v) return false;
  const br = r - (r % 3), bc = c - (c % 3);
  for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) if (b[(br + dr) * 9 + bc + dc] === v) return false;
  return true;
}

export function solve(board, rand = Math.random) {
  const b = board.slice();
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const step = () => {
    const idx = b.indexOf(0);
    if (idx < 0) return true;
    const vals = order.slice().sort(() => rand() - 0.5);
    for (const v of vals) {
      if (canPlace(b, idx, v)) { b[idx] = v; if (step()) return true; b[idx] = 0; }
    }
    return false;
  };
  return step() ? b : null;
}

// Stops at `limit`; picks the cell with the fewest candidates first.
export function countSolutions(board, limit = 2) {
  const b = board.slice();
  let n = 0;
  const step = () => {
    let best = -1, vals = null;
    for (let i = 0; i < 81; i++) {
      if (b[i]) continue;
      const vs = [];
      for (let v = 1; v <= 9; v++) if (canPlace(b, i, v)) vs.push(v);
      if (!vs.length) return;
      if (!vals || vs.length < vals.length) { best = i; vals = vs; if (vs.length === 1) break; }
    }
    if (best < 0) { n++; return; }
    for (const v of vals) { b[best] = v; step(); b[best] = 0; if (n >= limit) return; }
  };
  step();
  return n;
}

// Removes cells only while the answer stays unique; the checkpoints were trained on unique puzzles.
export function generate(clues = 40, rand = Math.random) {
  const solution = solve(Array(81).fill(0), rand);
  const puzzle = solution.slice();
  let left = 81;
  for (const i of [...Array(81).keys()].sort(() => rand() - 0.5)) {
    if (left <= clues) break;
    puzzle[i] = 0;
    if (countSolutions(puzzle) === 1) left--;
    else puzzle[i] = solution[i];
  }
  return { puzzle, solution };
}

export function countClues(board) {
  return board.filter(Boolean).length;
}
