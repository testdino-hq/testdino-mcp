#!/bin/bash
# Pre-compaction hook — captures session summary before context is lost
# Runs on: PreCompact

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "=== Pre-Compaction Summary ==="
echo ""
echo "Saving session state before compaction..."
echo ""

# Capture what changed in this session
DIRTY=$(cd "$PROJECT_DIR" && git status --porcelain 2>/dev/null | head -20)
if [ -n "$DIRTY" ]; then
  echo "## Uncommitted Changes"
  echo "$DIRTY"
  echo ""
fi

BRANCH=$(cd "$PROJECT_DIR" && git branch --show-current 2>/dev/null || echo "unknown")
echo "## Branch: $BRANCH"
echo ""

# Reminder to save lessons before compaction
echo "## Action Required"
echo "If any lessons were learned in this session (corrections, rework, new patterns),"
echo "save them to auto-memory NOW before context is compacted."
echo ""
echo "=== End Pre-Compaction ==="
