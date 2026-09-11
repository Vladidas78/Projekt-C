#!/bin/sh
# Beide Stufen aus dem Handover: Logik in Node, dann echter Browser.
set -e
cd "$(dirname "$0")/.."
for t in test/outlook.test.js test/sync.test.js test/browser.test.js test/mobile.test.js test/import.test.js; do
  echo "=== $t ==="
  node "$t" | tail -2 | head -1
done
node build-artifact.js
