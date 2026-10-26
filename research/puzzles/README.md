# Puzzle solvers

Each puzzle gets a small NCM like the Sudoku checkpoint (25M generator, about 12 levels). Data is free: generate puzzles in code, solve them in code, and check every answer in code.

| Puzzle | Encoding idea | Checker |
|---|---|---|
| Nonogram 10x10 | Prefix: row and column clues as numbers with separators. Target: 100 cells (0/1) + row separators | Row and column runs match clues |
| KenKen 6x6 | Prefix: cage map + cage targets and operators. Target: 36 cells | Latin square + cage arithmetic |
| Mini timetable | Prefix: classes, teachers, rooms, constraints. Target: grid of slot assignments | Hard constraints in code |

## Steps per puzzle

1. Generator and checker in Python (`research/puzzles/<name>/gen.py`) with tests.
2. Mirror the checker in JS for the browser (`site/puzzles/`).
3. Train with the same recipe as Sudoku (research/upstream for the modules).
4. Export to ONNX with the same `meta.json` contract as the Sudoku exports so `site/shared/lab.js` loads it unchanged.
5. Report solve rate by difficulty and phone speed.
