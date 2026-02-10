---
description: "Commit changes in small, logical chunks"
---

# Commit in Chunks

Commit ONLY the changes I made in this conversation, split into small logical commits. Then push.

## Workflow

1. Check current state
   - `git status` for modified/untracked files
   - `git log --oneline -5` for commit style
   - For each file I edited: `git diff <file>`

2. Classify each file
   - Agent-only: all changes are mine
   - Mixed: includes changes I did NOT make
   - New file: I created it (untracked)

3. Mixed files
   - Ask: "These files have changes I didn't make: [list]. Options: (a) skip, (b) commit entire files, (c) abort"
   - Follow user's choice

4. Group related changes
   - Keep commits small and logically related
   - Separate config/build changes from source changes
   - Separate cleanup/deletes from additions

5. Commit each group
   - `git add <files>`
   - `git commit -m "<concise message>"` (match repo style)

6. Push
   - `git push` (or `git push -u origin <branch>` if needed)

7. Report
   - Show `git log --oneline -N` with new commits

## Rules

- NEVER commit changes I didn't make without approval
- If unsure, treat as mixed
- Do NOT commit secrets
- Do NOT add AI attribution
