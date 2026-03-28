---
name: retro
description: Post-task retrospective — captures what worked, what went wrong, writes lessons to auto-memory
---

Run a retrospective on the work just completed.

## When to Use

- After completing a non-trivial task (new tool, bug fix, refactor)
- After a task that required rework or user corrections
- After the self-correction protocol fired
- When the user explicitly asks

## Workflow

### 1. Review What Happened

- Check `git diff` for what changed
- Scan conversation for user corrections, stops, or direction changes
- Count: how many times was the approach adjusted?

### 2. Categorize

| Outcome       | Meaning                           |
| ------------- | --------------------------------- |
| **Clean**     | Worked first time, no rework      |
| **Corrected** | User stepped in with a correction |
| **Reworked**  | Had to redo — approach was wrong  |

### 3. Write Lessons (for Corrected/Reworked only)

Write to auto-memory (feedback type) with:

- **name:** Short descriptive title
- **description:** One-line summary for future relevance matching
- **Content:**
  - **Trigger:** What happened
  - **Wrong:** What I did and why it was wrong
  - **Right:** What should have been done instead
  - **Rule:** The general principle (one sentence, reusable)
  - **Area:** Which part of the project this applies to (tools, endpoints, docs, publishing, or "all")

### 4. Check for Promotions

Review existing auto-memory feedback entries. If the same lesson pattern appears 3+ times:

1. Propose adding as a permanent rule to the Known Patterns & Pitfalls table in `CLAUDE.md`
2. Get user approval before modifying CLAUDE.md
3. Once promoted, note the promotion in the auto-memory entry

### 5. Check if Skills Need Updates

If a lesson reveals a gap in a skill workflow (e.g., `/add-tool` missed a step, `/verify` should check something extra):

1. Identify which skill file needs updating
2. Propose the specific change
3. Get user approval before modifying

## Output Format

```
## Retrospective

**Task:** [what was done]
**Outcome:** Clean / Corrected / Reworked
**Adjustments:** [N times the approach was changed]

### Lessons Learned
[If Corrected/Reworked — list each lesson with the rule]

### Promotions
[If any feedback pattern hit 3+ occurrences — propose CLAUDE.md update]

### Skill Updates
[If any skill workflow gap was identified — propose the fix]
```

## Rules

- Be honest about mistakes — the point is improvement, not ego preservation
- Every lesson must have a concrete, actionable Rule
- Don't write lessons for things that went smoothly — noise drowns signal
- Focus on lessons that are **reusable** across future tasks, not one-off fixes
- If the same mistake happened because a CLAUDE.md rule wasn't followed, note that — the rule exists, the issue is compliance
