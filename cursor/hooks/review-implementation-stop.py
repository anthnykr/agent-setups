#!/usr/bin/env python3
import json
import sys

from review_implementation_helpers import (
    consume_edit_marker,
    extract_session_id,
    extract_turn_id,
    noop,
)


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

    status = payload.get("status")
    loop_count_raw = payload.get("loop_count", 0)
    try:
        loop_count = int(loop_count_raw)
    except (TypeError, ValueError):
        loop_count = 1

    if status != "completed" or loop_count != 0:
        return noop()

    session_id = extract_session_id(payload=payload)
    if not session_id:
        return noop()

    turn_id = extract_turn_id(payload=payload)
    if not turn_id:
        return noop()

    if not consume_edit_marker(session_id=session_id, turn_id=turn_id):
        return noop()

    print(
        json.dumps(
            {
                "followup_message": (
                    "Review your implementation before stopping. Check whether there is a better or simpler approach, "
                    "whether any redundant code remains, whether duplicate logic was introduced, and whether any dead or unused "
                    "code was left behind. If you find issues, fix them now; if not, briefly confirm the implementation is clean."
                )
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
