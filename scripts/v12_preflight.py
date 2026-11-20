#!/usr/bin/env python3
"""Offline release gate. Does not compile, run or security-audit the application."""
from pathlib import Path
import json, re, sys
root=Path(__file__).resolve().parents[1]
checks=[]
def check(label, passed):
    checks.append((label, bool(passed)))
backend=root/'backend'; mobile=root/'mobile'; admin=root/'admin'
for path in [backend/'package.json', backend/'prisma/schema.prisma', mobile/'pubspec.yaml', mobile/'lib/main.dart', admin/'package.json']:
    check(f'Present: {path.relative_to(root)}',path.is_file())
for path in [backend/'package.json',admin/'package.json']:
    try: json.loads(path.read_text()); check(f'Valid JSON: {path.relative_to(root)}',True)
    except (ValueError,OSError): check(f'Valid JSON: {path.relative_to(root)}',False)
main=(mobile/'lib/main.dart').read_text()
server=(backend/'src/module.ts').read_text()
check('Default API URL is for emulator only', '10.0.2.2' in main)
check('Microphone defaults off in basic voice screen', 'connecting=true, muted=true' in main)
check('LiveKit token uses server seat grant', 'canPublish:!!seat' in server)
check('No local secrets included',not any((root/x).exists() for x in ['.env','backend/.env','admin/.env']))
check('Flutter Android project generated', (mobile/'android/app/build.gradle').exists() or (mobile/'android/app/build.gradle.kts').exists())
for label,passed in checks:print(('PASS' if passed else 'BLOCK'),label)
print(f'{sum(v for _,v in checks)}/{len(checks)} checks passed')
sys.exit(0 if all(v for _,v in checks) else 1)
