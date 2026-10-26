"""Run a public NCM ONNX export on its fixtures.json and compare outputs. Also checks our Sudoku encoding.

    python tools/selftest.py sudoku-easy

Downloads the full model (weights included) once into .models/<task>/.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
from huggingface_hub import hf_hub_download

SEP, EDGE = 10, 11


def encode_board(cells):
    out = [EDGE]
    for r in range(9):
        if r:
            out.append(SEP)
        out.extend(cells[r * 9 : (r + 1) * 9])
    out.append(EDGE)
    return out


def decode_prefix(prefix):
    return [t for t in prefix if t not in (SEP, EDGE)]


def check_solution(tokens89, puzzle):
    cells = [t for t in tokens89 if t not in (SEP, EDGE)]
    grid = np.array(cells).reshape(9, 9)
    ok_rows = all(len(set(r)) == 9 for r in grid)
    ok_cols = all(len(set(c)) == 9 for c in grid.T)
    ok_box = all(len(set(grid[r : r + 3, c : c + 3].flatten())) == 9 for r in (0, 3, 6) for c in (0, 3, 6))
    ok_clues = all(p == 0 or p == g for p, g in zip(puzzle, cells))
    return ok_rows and ok_cols and ok_box and ok_clues


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("task")
    ap.add_argument("--repo", default="mrfakename/ncm-webgpu-weights")
    a = ap.parse_args()

    meta = json.load(open(hf_hub_download(a.repo, f"{a.task}/meta.json")))
    fixtures = json.load(open(hf_hub_download(a.repo, f"{a.task}/fixtures.json")))
    # onnxruntime rejects external data reached through the HF cache symlinks, so keep real files in .models/.
    local = Path(__file__).resolve().parent.parent / ".models"
    model = hf_hub_download(a.repo, f"{a.task}/model.onnx", local_dir=local)
    hf_hub_download(a.repo, f"{a.task}/model.onnx.data", local_dir=local)
    sess = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
    print("inputs:", [(i.name, i.type, i.shape) for i in sess.get_inputs()])
    print("outputs:", [(o.name, o.type, o.shape) for o in sess.get_outputs()])

    fixtures = fixtures if isinstance(fixtures, list) else fixtures.get("fixtures", [fixtures])
    all_ok = True
    for n, fx in enumerate(fixtures):
        feeds = {}
        for inp in sess.get_inputs():
            if inp.name not in fx:
                raise SystemExit(f"fixture has no input {inp.name}; keys: {list(fx)}")
            arr = np.array(fx[inp.name])
            arr = arr.astype(np.float32 if "float" in inp.type else np.int64)
            if len(inp.shape) == arr.ndim + 1:
                arr = arr[None]
            feeds[inp.name] = arr
        outs = dict(zip([o.name for o in sess.get_outputs()], sess.run(None, feeds)))
        for key in ("tokens", "codes"):
            if key in fx and key in outs:
                got = outs[key].reshape(-1)
                ref = np.array(fx[key]).reshape(-1)
                match = got.shape == ref.shape and (got == ref).mean()
                print(f"fixture {n} {key}: shape {outs[key].shape}, match {match}")
                all_ok &= bool(match == 1.0)

        if a.task.startswith("sudoku"):
            prefix = fx["prefix"]
            puzzle = decode_prefix(prefix)
            assert encode_board(puzzle) == list(prefix), "our encodeBoard does not match the fixture prefix"
            final = outs["tokens"].reshape(-1)[-89:].tolist()
            print(f"fixture {n}: encoding OK, final level solves the puzzle: {check_solution(final, puzzle)}")
            print(f"fixture {n}: levels in output = {outs['tokens'].size // 89} (meta says {len(meta['levels'])})")

    print("SELFTEST OK" if all_ok else "SELFTEST MISMATCH")


if __name__ == "__main__":
    main()
