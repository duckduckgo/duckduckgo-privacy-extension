#!/bin/bash
# Run a cookie analysis session for a single site.
# Usage: run-site.sh <url> <workdir>
# Starts the session, waits for phase1_done, and exits.
# The session continues running in the background waiting for command.json.

URL="$1"
WORKDIR="$2"

if [ -z "$URL" ] || [ -z "$WORKDIR" ]; then
    echo "Usage: run-site.sh <url> <workdir>"
    exit 1
fi

# Clean previous run
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"

export DISPLAY=:99

# Start session in background
cd /workspace
node scripts/cookie-analysis/session.mjs "$URL" "$WORKDIR" &
SESSION_PID=$!
echo "$SESSION_PID" > "$WORKDIR/session.pid"

# Wait for phase1_done (up to 60s)
for i in $(seq 1 120); do
    if [ -f "$WORKDIR/phase1_done" ]; then
        echo "PHASE1_READY"
        exit 0
    fi
    if ! kill -0 "$SESSION_PID" 2>/dev/null; then
        echo "SESSION_DIED"
        cat "$WORKDIR/error.json" 2>/dev/null || echo "No error file"
        exit 1
    fi
    sleep 0.5
done

echo "TIMEOUT"
kill "$SESSION_PID" 2>/dev/null
exit 1
