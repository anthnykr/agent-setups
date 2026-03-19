# @anthnykr/pi-codex-fast-mode

Pi extension package for toggling OpenAI Codex fast mode on supported models.

- npm: https://www.npmjs.com/package/@anthnykr/pi-codex-fast-mode
- repo: https://github.com/anthnykr/pi-codex-fast-mode

## What it does

- adds a `/fast` command in Pi
- persists the fast-mode toggle across sessions
- marks the footer when fast mode is enabled
- injects `service_tier: "priority"` for supported `openai-codex` `gpt-5.4*` models

## Install

```bash
pi install npm:@anthnykr/pi-codex-fast-mode
```

## Usage

Start Pi, switch to a supported OpenAI Codex GPT-5.4 model, then run:

```text
/fast
```

Run `/fast` again to turn it off.

When fast mode is enabled on a supported model, Pi keeps its normal footer and shows a small `fast` status badge.

## Supported models

The extension currently enables fast mode only when all of these are true:

- provider is `openai-codex`
- model id starts with `gpt-5.4`
- fast mode has been toggled on

If those conditions do not match, the extension leaves provider requests unchanged.

## Security

Pi extensions run with your full user permissions. Only install packages you trust.
