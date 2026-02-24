# Agent Setups

This repository contains small setups and helpers that I use with coding agents. These are tuned for my workflows, so you may need to adapt paths or assumptions for your setup.

## What's In This Repo

| Folder | Purpose |
| --- | --- |
| [`cursor/hooks`](cursor/hooks) | Cursor hook scripts for a "review implementation before stopping" reminder flow. |
| [`codex`](codex) | Reusable Codex prompt files for common workflows (commit, push, PR creation, React effect cleanup). |
| [`pi-extensions`](pi-extensions) | PI Coding Agent extension(s), including an interactive commit-study command. |

## Cursor Hooks

Core files in [`cursor/hooks`](cursor/hooks):

| File | Purpose |
| --- | --- |
| [`review-implementation-mark-edit.py`](cursor/hooks/review-implementation-mark-edit.py) | Marks the current response turn when an edit occurs. |
| [`review-implementation-stop.py`](cursor/hooks/review-implementation-stop.py) | On completion, prompts for a quick implementation self-review if an edit marker exists. |
| [`review_implementation_helpers.py`](cursor/hooks/review_implementation_helpers.py) | Shared helper logic (session/turn extraction and marker management). |

Quick copy command:

```bash
mkdir -p ~/.cursor/hooks
cp cursor/hooks/* ~/.cursor/hooks/
```

## Codex Prompt Files

Reusable prompt files in [`codex`](codex):

| File | Use Case |
| --- | --- |
| [`commit-chunks.md`](codex/commit-chunks.md) | Commit only agent-made changes in small logical chunks, then push. |
| [`commit-push.md`](codex/commit-push.md) | Commit only agent-made changes and push with upstream handling. |
| [`create-pr.md`](codex/create-pr.md) | Create a PR using the repository template (or default fallback format). |
| [`you-might-not-need-an-effect.md`](codex/you-might-not-need-an-effect.md) | Find and fix React `useEffect` anti-patterns. |

## PI Coding Agent Extensions

Custom extensions for the PI Coding Agent live in the [`pi-extensions`](pi-extensions) folder:

| Extension | Command | Description | Controls |
| --- | --- | --- | --- |
| [`study-commits.ts`](pi-extensions/study-commits.ts) | `/study-commits` | Interactive commit picker that injects selected commit diffs into the session (4k line cap total). | Up/Down move, Space toggle, Enter confirm, Esc cancel. |
