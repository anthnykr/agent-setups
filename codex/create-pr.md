---
description: "Create PR using repo's PR template"
---

# Create PR from Repository Template

Create a pull request using the repository's PR template.

## Workflow

1. **Verify Prerequisites**
   - Run `git status` to check for uncommitted changes
   - Run `git branch --show-current` to get current branch
   - Ensure not on main/master branch
   - Check if remote tracking exists: `git rev-parse --abbrev-ref @{upstream}`

2. **Determine Base Branch**
   - Try `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`
   - Fallback to main or master

3. **Find PR Template**

   Search these locations in order using Glob/Read:
   - `.github/pull_request_template.md`
   - `.github/PULL_REQUEST_TEMPLATE.md`
   - `docs/pull_request_template.md`
   - `pull_request_template.md`

   Also check for multiple templates in `.github/PULL_REQUEST_TEMPLATE/` directory.

   If no template found, use default format:
   ```markdown
   ## Summary
   <1-3 bullet points>

   ## Test plan
   [Checklist of testing steps]
   ```

4. **Analyze Changes**
   - Run `git log <base>..HEAD --oneline` to see commits
   - Run `git diff <base>...HEAD --stat` to see changed files
   - Run `git diff <base>...HEAD` for detailed changes if needed

5. **Draft PR Content**
   - Generate a concise title from the changes
   - Fill in the template sections based on actual changes
   - Keep descriptions brief and focused

6. **Push and Create PR**
   - Push branch if needed: `git push -u origin <branch>`
   - Create PR using:
   ```bash
   gh pr create --title "title" --body "$(cat <<'EOF'
   <filled template content>
   EOF
   )"
   ```

7. **Return PR URL**
   - Show the created PR URL to the user

## Important Notes
- Do NOT push to main/master directly
- Do NOT skip the template - always use it or the default
- Keep PR descriptions concise
- Ensure all template sections are filled appropriately
- Do NOT add "Co-Authored-By: Claude" or any Claude attribution
- Do NOT mention "Generated with Claude Code" or similar in PR body or commits
- Do NOT add yourself as an author in any form
