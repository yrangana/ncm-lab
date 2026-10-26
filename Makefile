PY ?= uv run python
PORT ?= 8080
T ?= sudoku-easy

.PHONY: setup vendor serve check inspect selftest vercel clean

setup:
	uv sync

vendor:           ## onnxruntime-web into site/vendor/ort for local serving
	bash scripts/fetch_vendor.sh

serve:
	$(PY) scripts/serve.py --port $(PORT)

check:
	@for f in $$(find site -name '*.js' -not -path 'site/vendor/*'); do node --check $$f || exit 1; done
	node --test tests/*.test.mjs

inspect:          ## make inspect T=tinystories
	$(PY) tools/inspect_onnx.py $(T)

selftest:         ## make selftest T=sudoku-easy
	$(PY) tools/selftest.py $(T)

vercel:           ## production deploy to https://ncmlab.vercel.app
	npx --yes vercel@65.2.0 deploy --prod

clean:
	rm -rf site/vendor research/upstream/ncm .models
