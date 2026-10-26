# ncm-lab

Browser demos of Next-Concept Modeling ([paper](https://arxiv.org/abs/2610.14162), [code](https://github.com/HazyResearch/ncm)): small models that draft the whole answer at once, then refine it. Live at https://ncmlab.vercel.app.

By Yasiru Rangana ([yrangana](https://github.com/yrangana)).

## Demos

| Demo | Status |
|---|---|
| [Sudoku in 12 passes](https://ncmlab.vercel.app/playground/) | Live. On puzzles with one solution the public checkpoints solve 49/50 easy, 49/50 medium, 42/50 hard. |
| Stories (TinyStories) | Next |
| Sinhala to English translator | Planned, `research/sinhala/` |
| Nonograms, KenKen, timetables | Planned, `research/puzzles/` |

Everything runs in the browser with onnxruntime-web, on WebGPU or wasm.

## Run locally

```bash
make vendor   # onnxruntime-web into site/vendor/ort (needs npm)
make serve    # http://localhost:8080 with COOP/COEP headers
make check    # JS syntax and Sudoku tests (node)
```

Python checks against the model fixtures:

```bash
uv sync
make selftest T=sudoku-easy
```

Deploy: `make vercel` (Vercel CLI, serves `site/` with COOP/COEP headers from `vercel.json`).

## Credits

- NCM: Kumbong, Khare, Mlauzi, Woen, Ding, Buchanan, Arora, Mirhoseini, Ré (2026). MIT.
- ONNX exports: [mrfakename/ncm-webgpu-weights](https://huggingface.co/mrfakename/ncm-webgpu-weights). MIT.
