#!/bin/bash
# Send a command to a running session and wait for phase2_done.
# Usage: send-command.sh <workdir> <command_json>
# Example: send-command.sh ./output/example.com '{"action":"click","x":500,"y":400}'

WORKDIR="$1"
CMD="$2"

if [ -z "$WORKDIR" ] || [ -z "$CMD" ]; then
    echo "Usage: send-command.sh <workdir> <command_json>"
    exit 1
fi

# Write command
echo "$CMD" > "$WORKDIR/command.json"

# Wait for phase2_done (up to 30s)
for i in $(seq 1 60); do
    if [ -f "$WORKDIR/phase2_done" ]; then
        echo "PHASE2_DONE"
        cat "$WORKDIR/result.json" 2>/dev/null
        exit 0
    fi
    sleep 0.5
done

echo "TIMEOUT"
exit 1
