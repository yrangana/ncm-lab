"""Print the inputs and outputs of a public NCM ONNX export, plus its meta.json.

    python tools/inspect_onnx.py sudoku-easy
    python tools/inspect_onnx.py tinystories --repo mrfakename/ncm-webgpu-weights

Downloads only model.onnx (the graph) and meta.json, not the weights.
"""

import argparse
import json

import onnx
from huggingface_hub import hf_hub_download


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("task")
    ap.add_argument("--repo", default="mrfakename/ncm-webgpu-weights")
    a = ap.parse_args()

    meta = json.load(open(hf_hub_download(a.repo, f"{a.task}/meta.json")))
    print("meta.json:")
    for k, v in meta.items():
        print(f"  {k}: {v}")

    graph = onnx.load(hf_hub_download(a.repo, f"{a.task}/model.onnx"), load_external_data=False)
    dt = {v: k for k, v in onnx.TensorProto.DataType.items()}

    def show(vals):
        for v in vals:
            t = v.type.tensor_type
            dims = [d.dim_param or d.dim_value for d in t.shape.dim]
            print(f"  {v.name}: {dt.get(t.elem_type, t.elem_type)} {dims}")

    print("inputs:")
    show(graph.graph.input)
    print("outputs:")
    show(graph.graph.output)
    print(f"opset: {[o.version for o in graph.opset_import]}, nodes: {len(graph.graph.node)}")


if __name__ == "__main__":
    main()
