#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../mobile"
: "${API_BASE_URL:?Set API_BASE_URL to a reachable HTTPS API URL}"
if [[ "$API_BASE_URL" != https://* ]]; then echo 'Only HTTPS test endpoints are accepted' >&2; exit 2; fi
command -v flutter >/dev/null || { echo 'Flutter SDK is required' >&2; exit 2; }
if [[ ! -d android ]]; then flutter create . --platforms android; fi
flutter pub get
flutter analyze
flutter build apk --debug --dart-define="API_BASE_URL=$API_BASE_URL"
echo 'Debug APK: mobile/build/app/outputs/flutter-apk/app-debug.apk'
