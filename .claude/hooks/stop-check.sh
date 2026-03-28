#!/bin/bash
# Stop hook — reminds about retro after non-trivial work
# Runs on: Stop event

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Check if files were modified in this session (dirty working tree)
CHANGED_FILES=$(cd "$PROJECT_DIR" && git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
STAGED_FILES=$(cd "$PROJECT_DIR" && git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
TOTAL=$((CHANGED_FILES + STAGED_FILES))

if [ "$TOTAL" -gt 2 ]; then
  echo ""
  echo "[Reinforcement] Non-trivial changes detected ($TOTAL files modified)."
  echo "If any rework or corrections occurred, consider running /retro to capture lessons."
fi

exit 0
