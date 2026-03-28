#!/bin/bash
# Session context loader — injects project state into Claude's context
# Runs on: SessionStart (startup, resume, compact)

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
INPUT=$(cat)
SOURCE=$(echo "$INPUT" | jq -r '.source // "startup"')

echo "=== TestDino MCP — Session Context ==="
echo ""

# 1. Git state
BRANCH=$(cd "$PROJECT_DIR" && git branch --show-current 2>/dev/null || echo "unknown")
DIRTY=$(cd "$PROJECT_DIR" && git status --porcelain 2>/dev/null | head -5)
LAST_COMMITS=$(cd "$PROJECT_DIR" && git log --oneline -5 2>/dev/null || echo "no git history")

echo "## Git State"
echo "Branch: $BRANCH"
if [ -n "$DIRTY" ]; then
  echo "Working tree: DIRTY"
  echo "$DIRTY"
else
  echo "Working tree: clean"
fi
echo ""
echo "Recent commits:"
echo "$LAST_COMMITS"
echo ""

# 2. Version check
if [ -f "$PROJECT_DIR/package.json" ]; then
  PKG_VERSION=$(jq -r '.version' "$PROJECT_DIR/package.json" 2>/dev/null || echo "?")
  SRV_VERSION=$(jq -r '.version' "$PROJECT_DIR/server.json" 2>/dev/null || echo "?")
  IDX_VERSION=$(grep 'version:' "$PROJECT_DIR/src/index.ts" 2>/dev/null | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "?")

  echo "## Version"
  if [ "$PKG_VERSION" = "$SRV_VERSION" ] && [ "$PKG_VERSION" = "$IDX_VERSION" ]; then
    echo "Consistent: $PKG_VERSION"
  else
    echo "MISMATCH — package.json: $PKG_VERSION, server.json: $SRV_VERSION, index.ts: $IDX_VERSION"
  fi
  echo ""
fi

# 3. Auto-memory summary (if exists)
MEMORY_DIR="$HOME/.claude/projects/-Users-${USER}-Desktop-testdino-mcp/memory"
if [ -d "$MEMORY_DIR" ] && [ "$(ls -A "$MEMORY_DIR" 2>/dev/null)" ]; then
  MEMORY_INDEX="$MEMORY_DIR/MEMORY.md"
  if [ -f "$MEMORY_INDEX" ]; then
    LESSON_COUNT=$(grep -c '^\- ' "$MEMORY_INDEX" 2>/dev/null || echo "0")
    echo "## Auto-Memory"
    echo "Loaded: $LESSON_COUNT entries in MEMORY.md"
    echo "Review memory before starting work — past lessons may apply."
    echo ""
  fi
fi

# 4. Source-specific reminders
case "$SOURCE" in
  compact)
    echo "## Post-Compaction Reminder"
    echo "Context was compacted. Key rules to re-anchor:"
    echo "- Check CLAUDE.md protocols before continuing work"
    echo "- Check auto-memory for lessons relevant to current task"
    echo "- All tool patterns follow the same convention — read src/tools/testruns/list-testruns.ts as reference"
    echo "- Run 'npm run typecheck && npm run lint' after every code change"
    echo "- Version lives in 3 places: package.json, server.json, src/index.ts"
    echo "- Never use console.log — it corrupts stdio. Use console.error"
    echo ""
    ;;
  resume)
    echo "## Session Resumed"
    echo "Check git diff for any changes since last session."
    echo ""
    ;;
  startup)
    echo "## New Session"
    echo "Ready to work. Check auto-memory for relevant past lessons before starting."
    echo ""
    ;;
esac

echo "=== End Context ==="
