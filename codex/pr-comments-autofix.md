---
description: "End-to-end PR review comment workflow: classify, auto-fix, verify with one subagent, then resolve"
argument-hint: PR_URL="<optional https://github.com/owner/repo/pull/123>"
---

# PR Comments Autofix

Run one end-to-end flow for unresolved PR review threads.

## Rules

1. Main agent owns all code changes and fixes.
2. Use exactly one verifier subagent, read-only, for classification/fix validation.
3. Do not use extra worker subagents.
4. Dead code / valid maintainability feedback should usually be `Should Fix? Yes`.

## Workflow

1. Determine PR URL
   - Resolve `PR_URL` from `$ARGUMENTS`:
     - If it contains `https://github.com/<owner>/<repo>/pull/<number>`, use that URL.
     - If empty (or no valid PR URL found), try current branch PR:
     ```bash
     PR_URL=$(gh pr view --json url --jq .url 2>/dev/null || true)
     ```
   - If still empty, stop and ask user for PR URL.

2. Parse PR URL into owner/repo/number.
   - Example:
     ```bash
     owner=$(echo "$PR_URL" | sed -E 's#https?://github.com/([^/]+)/([^/]+)/pull/([0-9]+).*#\1#')
     repo=$(echo "$PR_URL" | sed -E 's#https?://github.com/([^/]+)/([^/]+)/pull/([0-9]+).*#\2#')
     pr_number=$(echo "$PR_URL" | sed -E 's#https?://github.com/([^/]+)/([^/]+)/pull/([0-9]+).*#\3#')
     ```

3. Fetch unresolved review threads via GraphQL:

   ```bash
   gh api graphql -f query='
     query($owner:String!, $repo:String!, $pr:Int!) {
       repository(owner:$owner, name:$repo) {
         pullRequest(number:$pr) {
           reviewThreads(first:100) {
             nodes {
               id
               isResolved
               path
               line
               comments(first:10) {
                 nodes {
                   body
                   author { login }
                 }
               }
             }
           }
         }
       }
     }
   ' -f owner="$owner" -f repo="$repo" -F pr="$pr_number"
   ```

   - Filter to `isResolved=false`.

4. Early exit gate
   - If unresolved thread count is `0`:
     - Do **not** spawn verifier subagent.
     - Do **not** run fix pass, loop, or resolve mutations.
     - Return final output immediately with zero counts and stop.

5. Build initial classification table:

   | Thread ID | Comment (summarized) | Should Fix? | Auto-fixable? | Likely Files | Acceptance Check | Reason |
   | --------- | -------------------- | ----------- | ------------- | ------------ | ---------------- | ------ |
   | PRT_xxx   | ...                  | Yes/No      | Yes/No        | ...          | ...              | ...    |

6. Main-agent fix pass
   - Fix all rows with `Should Fix? Yes` and `Auto-fixable? Yes`.
   - Keep fixes scoped to the thread intent.
   - Add/adjust tests when appropriate.
   - Run checks on edited files and repo gate when available.

7. Verifier subagent pass (read-only)
   - Provide: full classification table + current diff.
   - Subagent validates each row against code and changes.
   - Required output per row: `Correct`/`Misclassified` and `Fixed`/`Partial`/`Not fixed` with short reason.

8. Main-agent decision loop
   - If any row is `Misclassified`, `Partial`, or `Not fixed`: main agent updates code or classification, then repeat steps 5-6.
   - Continue until all rows are either:
     - `Should Fix? Yes` + `Fixed`, or
     - `Should Fix? No` + classification verified `Correct`.

9. Resolve threads (main agent)
   - Resolve all threads in the two final-safe categories above:
     ```bash
     gh api graphql -f query='
       mutation($threadId: ID!) {
         resolveReviewThread(input: {threadId: $threadId}) {
           thread { isResolved }
         }
       }
     ' -f threadId="PRT_xxx"
     ```

10. Final output

- Final table with thread statuses.
- Summary counts:
  - resolved fixed comments
  - resolved not-fix-needed comments
  - remaining unresolved (if any) and why
