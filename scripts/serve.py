"""Local server for site/ with the same isolation headers as production. Standard library only.

    python scripts/serve.py [--port 8080]
"""

import argparse
import functools
import http.server
import mimetypes
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for ext, typ in ((".wasm", "application/wasm"), (".mjs", "application/javascript"), (".js", "application/javascript")):
    mimetypes.add_type(typ, ext)


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8080)
    a = ap.parse_args()
    handler = functools.partial(Handler, directory=str(ROOT / "site"))
    with http.server.ThreadingHTTPServer(("0.0.0.0", a.port), handler) as httpd:
        print(f"http://localhost:{a.port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
