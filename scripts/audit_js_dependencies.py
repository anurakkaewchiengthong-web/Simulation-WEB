#!/usr/bin/env python3
"""Static JavaScript dependency inventory for Radio Coverage Lab.
Run: python scripts/audit_js_dependencies.py
Read-only; standard library only. Reports are printed to stdout.
Limitations: dynamic references, iframe access and indirect callbacks need manual review.
"""
from pathlib import Path
from collections import defaultdict
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PAGES = ["single.html", "index.html", "microwave.html", "wifi.html"]
SCRIPT = re.compile(r'<script\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\']', re.I)
API = re.compile(r'\b(?:window|globalThis|root)\.([A-Za-z_$][\w$]*)\s*=')
GLOBALS = re.compile(r'\b(?:window|globalThis|root)\.([A-Za-z_$][\w$]*)\b')
IFRAME = re.compile(r'<iframe\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\']', re.I)

def read(path):
    return path.read_text(encoding="utf-8", errors="replace")

def main():
    sources = sorted(DIST.rglob("*.js"))
    providers = defaultdict(set)
    for path in sources:
        for name in API.findall(read(path)):
            providers[name].add(path.relative_to(DIST).as_posix())
    missing = 0
    print("# Radio Coverage Lab: static JavaScript dependency inventory\n")
    for page in PAGES:
        path = DIST / page
        if not path.exists():
            print(f"WARNING: missing page {page}")
            missing += 1
            continue
        html = read(path)
        scripts = SCRIPT.findall(html)
        print(f"## {page} ({len(scripts)} external scripts)")
        for index, src in enumerate(scripts, 1):
            local = src.split("?", 1)[0]
            if local.startswith(("http://", "https://", "//")):
                status = "external"
            else:
                status = "OK" if (path.parent / local).exists() else "MISSING"
                if status == "MISSING":
                    missing += 1
            print(f"{index:2}. {src} [{status}]")
        for src in IFRAME.findall(html):
            print(f"iframe: {src}")
        print()
    print("## Global API providers and direct explicit consumers")
    for api, paths in sorted(providers.items()):
        consumers = []
        pattern = re.compile(r'\b(?:window|globalThis|root)\.' + re.escape(api) + r'\b')
        for path in sources:
            name = path.relative_to(DIST).as_posix()
            if name not in paths and pattern.search(read(path)):
                consumers.append(name)
        print(f"{api}: providers={', '.join(sorted(paths))}; explicit-consumers={', '.join(consumers) or '(none detected)'}")
    print("\nNOTE: bare identifiers (e.g. MWMath) and cross-iframe properties require manual tracing.")
    if missing:
        print(f"\nFAIL: {missing} missing local entrypoints/assets")
    else:
        print("\nPASS: all referenced local entrypoint scripts exist")
    return 1 if missing else 0

if __name__ == "__main__":
    sys.exit(main())
