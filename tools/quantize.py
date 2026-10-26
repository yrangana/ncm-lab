"""Store MatMul (and optionally Gather) weights in 4 or 8 bits with MatMulNBits.

    uv run --group quant python tools/quantize.py sudoku-easy --bits 4
    uv run --group quant python tools/quantize.py tinystories --bits 8 --gather

Reads .models/<task>/ (run selftest first), writes .models/<task>-q<bits>[g]/ (g = Gathers too).
"""

import argparse
import shutil
from pathlib import Path

import onnx
from onnxruntime.quantization.matmul_nbits_quantizer import MatMulNBitsQuantizer

MODELS = Path(__file__).resolve().parent.parent / ".models"


def bypass_identities(graph):
    # The exports route shared weights through Identity nodes; the quantizer only sees MatMuls fed
    # straight from an initializer, so point consumers at the initializer itself.
    inits = {i.name for i in graph.initializer}
    alias = {n.output[0]: n.input[0] for n in graph.node if n.op_type == "Identity" and n.input[0] in inits}
    outputs = {o.name for o in graph.output}
    for n in graph.node:
        for k, x in enumerate(n.input):
            if x in alias and x not in outputs:
                n.input[k] = alias[x]
    keep = [n for n in graph.node if not (n.op_type == "Identity" and n.output[0] in alias and n.output[0] not in outputs)]
    del graph.node[:]
    graph.node.extend(keep)
    return len(alias)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("task")
    ap.add_argument("--bits", type=int, default=4, choices=[4, 8])
    ap.add_argument("--block", type=int, default=32)
    ap.add_argument("--gather", action="store_true", help="also quantize embedding Gathers")
    a = ap.parse_args()

    src, dst = MODELS / a.task, MODELS / f"{a.task}-q{a.bits}{'g' if a.gather else ''}"
    model = onnx.load(src / "model.onnx", load_external_data=True)
    print("identities bypassed:", bypass_identities(model.graph))

    ops = ("MatMul", "Gather") if a.gather else ("MatMul",)
    # Quantizing Gather bumps the default opset; the original nodes are written for the source opset.
    src_opset = next(o.version for o in model.opset_import if o.domain in ("", "ai.onnx"))
    q = MatMulNBitsQuantizer(model, bits=a.bits, block_size=a.block, is_symmetric=True, op_types_to_quantize=ops)
    q.process()
    for o in q.model.model.opset_import:
        if o.domain in ("", "ai.onnx"):
            o.version = src_opset

    shutil.rmtree(dst, ignore_errors=True)
    dst.mkdir(parents=True)
    onnx.save_model(q.model.model, dst / "model.onnx", save_as_external_data=True, all_tensors_to_one_file=True,
                    location="model.onnx.data", size_threshold=1024)
    for f in ("meta.json", "fixtures.json", "vocab.json", "level0_unigram.json"):
        if (src / f).exists():
            shutil.copy(src / f, dst / f)
    size = sum(p.stat().st_size for p in dst.glob("model.onnx*")) / 1e6
    print(f"{dst.name}: {size:.0f} MB (was {sum(p.stat().st_size for p in src.glob('model.onnx*')) / 1e6:.0f} MB)")


if __name__ == "__main__":
    main()
