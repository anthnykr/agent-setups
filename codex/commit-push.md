---
description: "Commit only your changes, then push"
---

# Commit and Push

Commit ONLY the changes I made in this conversation, then push.

## Workflow

1. Check current state
   - `git status` for modified/untracked files
   - For each file I edited: `git diff <file>`

2. Classify each file
   - Agent-only: all changes are mine (including formatting/prettier)
   - Mixed: includes substantive changes I did NOT make (ignore whitespace)
   - New file: I created it (untracked)

3. Mixed files
   - Ask: "These files have changes I didn't make: [list]. Options: (a) skip, (b) commit entire files, (c) abort"
   - Follow user's choice

4. Stage files
   - Agent-only files: `git add <file>`
   - New files I created: `git add <file>`
   - Mixed files: per user's choice

5. Commit
   - Generate a concise message summarizing my changes
   - `git commit -m "<summary>"`

6. Push
   - `git push`
   - If no upstream: `git push -u origin $(git branch --show-current)`

## Rules

- NEVER commit changes I didn't make without approval
- If unsure, treat as mixed
- Do NOT add AI attribution
