# Upstream checkpoints

Official code: https://github.com/HazyResearch/ncm (MIT). Evaluation code only, no training loops.
Official weights: `hazyresearch/ncm-checkpoints` on Hugging Face (tokenizer.pt + generator.pt + config.yaml per task).

## Run the official evaluation

```bash
git clone https://github.com/HazyResearch/ncm.git research/upstream/ncm
cd research/upstream/ncm
uv pip install -r requirements.txt
hf download hazyresearch/ncm-checkpoints --local-dir artifacts
hf download hazyresearch/ncm-datasets --repo-type dataset --local-dir data
uv run python evaluate.py --config config/eval/sudoku-easy.yaml --checkpoint-dir artifacts/sudoku/easy --data-dir data/sudoku
```

`research/upstream/ncm/` is git-ignored. Do not commit upstream code or weights.

## Export new ONNX graphs (for the playground)

Needed for:
1. **WMT14** live translation. No public ONNX export yet.
2. **Tokenizer encoder** for the story blender: text -> level codes, so two stories' coarse codes can be mixed.

Approach, following the existing exports (opset 17, interpolation rewritten as constant matrix products, full generation loop unrolled into one graph):

1. Load tokenizer and generator from the upstream `models/` and `tokenization/` modules with each task's `config.yaml`.
2. Wrap generation in an `nn.Module` whose `forward` runs all K levels and returns the decoded tokens per level.
3. Replace any `F.interpolate` or adaptive pooling with fixed matrices built at init (`torch.onnx` and WebGPU both handle matmul well).
4. `torch.onnx.export(..., opset_version=17, dynamo=False)`, external data for weights.
5. Write `meta.json` in the same format as the existing exports, plus `fixtures.json` from a few PyTorch runs.
6. `make selftest T=<task>` against your fixtures before using it in the browser.

For WMT14 the prefix is the German source tokenised with the Qwen3-0.6B tokenizer (96 tokens). The browser needs that tokenizer too: use transformers.js `AutoTokenizer` or ship `tokenizer.json` and a small BPE encoder.
