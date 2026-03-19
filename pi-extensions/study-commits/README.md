# @anthnykr/pi-study-commits

Pi package for studying recent git commits from inside pi.

## Install

```bash
pi install npm:@anthnykr/pi-study-commits
```

Or test locally:

```bash
pi -e ./study-commits.ts
```

## Commands

### `/study-commits`

Open a picker for recent commits, then inject selected diffs into the conversation.

Examples:

```text
/study-commits
/study-commits 10
```

### `/study-commits-max`

Show or set the default commit count used by `/study-commits`.

Examples:

```text
/study-commits-max
/study-commits-max 50
/study-commits-max clear
```

Precedence:

1. `/study-commits 10`
2. `/study-commits-max 50`
3. built-in default `20`

## What it does

- checks current directory is a git repo
- loads recent commits with `git log`
- shows an interactive multi-select picker
- fetches selected diffs with `git show --stat --patch --no-color`
- caps total diff context at 4000 lines
- sends the assembled context back into the session as a user message

## Publish

```bash
npm publish --access public
```

Dry run first:

```bash
npm run pack:check
```
