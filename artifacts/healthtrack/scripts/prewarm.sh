#!/usr/bin/env bash
# Pre-warm Metro's web bundle so the user never hits a 12-second cold-compile
# on first page load. Polls the dev server until ready, extracts the bundle URL
# from the rendered HTML, then fetches it in the background to trigger compilation.

PORT="${PORT:-8081}"
BASE="http://localhost:${PORT}"

# Wait up to 60s for the Expo dev server to respond.
for i in $(seq 1 60); do
  if curl -sf "${BASE}/" -o /tmp/prewarm_index.html 2>/dev/null; then
    break
  fi
  sleep 1
done

if [ ! -s /tmp/prewarm_index.html ]; then
  echo "[prewarm] dev server never responded — skipping"
  exit 0
fi

# Pull the first .bundle script src out of the HTML.
BUNDLE_PATH=$(grep -oE 'src="[^"]*\.bundle[^"]*"' /tmp/prewarm_index.html | head -1 | sed 's/src="//;s/"$//')

if [ -z "$BUNDLE_PATH" ]; then
  echo "[prewarm] could not locate bundle URL in HTML — skipping"
  exit 0
fi

echo "[prewarm] compiling web bundle..."
START=$(date +%s)
curl -sf "${BASE}${BUNDLE_PATH}" -o /dev/null
END=$(date +%s)
echo "[prewarm] web bundle ready in $((END - START))s — first page load will be fast"
