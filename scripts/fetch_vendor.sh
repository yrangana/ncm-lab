#!/usr/bin/env bash
# onnxruntime-web into site/vendor/ort for local serving. The live site loads it from jsDelivr.
set -euo pipefail
ORT_VERSION="${ORT_VERSION:-1.23.0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
cd "$TMP"
npm pack "onnxruntime-web@${ORT_VERSION}" >/dev/null
tar -xzf "onnxruntime-web-${ORT_VERSION}.tgz"
mkdir -p "$ROOT/site/vendor/ort"
cp package/dist/*.mjs package/dist/*.wasm "$ROOT/site/vendor/ort/"
echo "onnxruntime-web ${ORT_VERSION} -> site/vendor/ort"
