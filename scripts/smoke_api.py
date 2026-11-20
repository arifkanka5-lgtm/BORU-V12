#!/usr/bin/env python3
"""Non-destructive API connectivity checks. No real account or purchases."""
import json, os, sys, urllib.error, urllib.request
base=os.getenv("BORU_API_URL", "http://127.0.0.1:3001/api/v1").rstrip("/")
checks=[("GET", "/rooms", (200, 401, 403)), ("GET", "/wallet", (401, 403))]
failed=0
for method,path,expected in checks:
    req=urllib.request.Request(base+path, method=method)
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            status=resp.status
    except urllib.error.HTTPError as err:
        status=err.code
    except Exception as err:
        print(f"FAIL {method} {path}: connection error {err}")
        failed+=1
        continue
    ok=status in expected
    print(f"{'PASS' if ok else 'FAIL'} {method} {path}: HTTP {status} (expected {expected})")
    failed+=not ok
sys.exit(1 if failed else 0)
