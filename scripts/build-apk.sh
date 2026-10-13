#!/usr/bin/env bash
# Builds a debug APK of the client app.
# Usage: ./scripts/build-apk.sh [API_URL]
#   API_URL defaults to the machine's LAN IP on port 3001 (works on the same Wi-Fi).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"

API_URL="${1:-http://$(hostname -I | awk '{print $1}'):3001}"
echo "==> API URL baked into app: $API_URL"

echo "==> Building web assets"
VITE_API_URL="$API_URL" npm --prefix "$ROOT/client" run build

echo "==> Syncing Capacitor"
(cd "$ROOT/client" && npx cap sync android)

echo "==> Gradle assembleDebug"
(cd "$ROOT/client/android" && ./gradlew assembleDebug --no-daemon)

APK="$ROOT/client/android/app/build/outputs/apk/debug/app-debug.apk"
echo "==> APK ready: $APK"
ls -lh "$APK"
