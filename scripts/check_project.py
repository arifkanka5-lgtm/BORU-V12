#!/usr/bin/env python3
"""Static structural checks; NOT a compile or security audit."""
from pathlib import Path
import json,sys
root=Path(__file__).resolve().parents[1]
required=['backend/package.json','backend/prisma/schema.prisma','backend/src/main.ts','mobile/pubspec.yaml','mobile/lib/main.dart','admin/package.json','docker-compose.yml','scripts/smoke_api.py']
issues=[]
for f in required:
    if not (root/f).is_file():issues.append('Missing: '+f)
for f in ['backend/package.json','admin/package.json']:
    try: json.loads((root/f).read_text())
    except Exception as e: issues.append(f+' invalid JSON: '+str(e))
for f in ['backend/.env','admin/.env','mobile/.env']:
    if (root/f).exists():issues.append('Sensitive local env file must not be distributed: '+f)
print('Static project check:', 'PASS' if not issues else 'FAIL')
for issue in issues:print('-',issue)
sys.exit(bool(issues))
