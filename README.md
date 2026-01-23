# Agent Setups

This repository contains small setups and helpers that I use with coding agents. These are tuned for my workflows, so you may need to adapt paths or assumptions for your setup.

## PI Coding Agent Extensions

Custom extensions for the PI Coding Agent live in the [`pi-extensions`](pi-extensions) folder:

* [`study-commits.ts`](pi-extensions/study-commits.ts) - Interactive commit picker (`/study-commits`) that injects selected commit diffs plus current workspace file snapshots into the session.

### Usage

```
/study-commits
```

Controls: ↑/↓ move, Space toggle, Enter confirm, Esc cancel.
