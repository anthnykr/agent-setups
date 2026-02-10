---
description: "Find useEffect anti-patterns; fix"
---

Goal: remove useEffect anti-patterns using React guidance.

Inputs:

- scope: what to analyze (default: current changes). Examples: "diff to main", "PR #123", "src/components/", "whole codebase".

Process:

1. Read https://react.dev/learn/you-might-not-need-an-effect
2. Scan scope for useEffect anti-patterns
3. Apply fixes.

Output:

- changes + short summary
