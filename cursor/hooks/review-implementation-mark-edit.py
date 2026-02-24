#!/usr/bin/env python3
import json
import sys

from review_implementation_helpers import extract_session_id, extract_turn_id, mark_edited, noop


def main() -> int:
    raw = sys.stdin.read().strip()
    if not raw:
        return noop()

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return noop()

    if not isinstance(payload, dict):
        return noop()

    session_id = extract_session_id(payload=payload)
    if not session_id:
        return noop()

    turn_id = extract_turn_id(payload=payload)
    if not turn_id:
        return noop()

    mark_edited(session_id=session_id, turn_id=turn_id)
    return noop()


if __name__ == "__main__":
    raise SystemExit(main())
