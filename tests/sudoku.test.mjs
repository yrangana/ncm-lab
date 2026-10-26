import test from "node:test";
import assert from "node:assert/strict";
import { conflicts, countSolutions, decodeLevel, decodeLevels, encodeBoard, generate, isSolved, solve } from "../site/sudoku/sudoku-core.js";
import { mulberry32 } from "../site/shared/lab.js";

// Fixture 1 prefix from mrfakename/ncm-webgpu-weights sudoku-easy/fixtures.json
const FIXTURE_PREFIX = [11, 9, 2, 1, 6, 0, 7, 0, 8, 5, 10, 7, 6, 0, 0, 3, 0, 2, 0, 1, 10, 5, 0, 3, 9, 0, 2, 7, 0, 0, 10, 0, 5, 2, 3, 0, 0, 0, 0, 0, 10, 0, 0, 0, 4, 0, 0, 6, 0, 0, 10, 8, 3, 6, 7, 0, 0, 0, 0, 0, 10, 2, 1, 0, 0, 8, 4, 9, 3, 6, 10, 6, 0, 8, 1, 0, 0, 4, 0, 0, 10, 0, 4, 0, 0, 9, 0, 0, 0, 7, 11];

test("encodeBoard matches the fixture layout", () => {
  const cells = FIXTURE_PREFIX.filter((t) => t !== 10 && t !== 11);
  assert.equal(cells.length, 81);
  assert.deepEqual(encodeBoard(cells), FIXTURE_PREFIX);
  assert.equal(FIXTURE_PREFIX.length, 91);
});

test("decodeLevels splits 12 x 89", () => {
  const level = encodeBoard(Array(81).fill(5)).slice(1, -1); // 89 tokens
  assert.equal(level.length, 89);
  const flat = Array(12).fill(level).flat();
  const levels = decodeLevels(flat);
  assert.equal(levels.length, 12);
  assert.ok(levels.every((l) => l.length === 81 && l.every((v) => v === 5)));
  assert.deepEqual(decodeLevel(level), Array(81).fill(5));
});

test("solver solves the fixture puzzle and the checker agrees", () => {
  const puzzle = FIXTURE_PREFIX.filter((t) => t !== 10 && t !== 11);
  const sol = solve(puzzle, mulberry32(1));
  assert.ok(sol);
  assert.ok(isSolved(sol, puzzle));
  assert.equal(conflicts(sol).size, 0);
});

test("generator respects clue counts and solutions are valid", () => {
  const rand = mulberry32(42);
  for (const clues of [40, 35, 30]) {
    const { puzzle, solution } = generate(clues, rand);
    assert.equal(puzzle.filter(Boolean).length, clues);
    assert.ok(isSolved(solution, puzzle));
    assert.equal(countSolutions(puzzle), 1);
  }
});

test("conflicts finds duplicates", () => {
  const b = Array(81).fill(0);
  b[0] = 3; b[1] = 3;
  assert.deepEqual([...conflicts(b)].sort(), [0, 1]);
});
