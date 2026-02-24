#!/usr/bin/env python3
import json
import sys
from pathlib import Path

from review_implementation_helpers import (
    extract_session_id,
    extract_turn_id,
    mark_edited,
    noop,
)


def _is_path_inside_workspace(file_path: str, workspace_roots: list[str]) -> bool:
    try:
        file = Path(file_path).resolve(strict=False)
    except (OSError, RuntimeError):
        return False

    for root in workspace_roots:
        try:
            root_path = Path(root).resolve(strict=False)
        except (OSError, RuntimeError):
            continue
        if file.is_relative_to(root_path):
            return True
    return False


def _is_effective_edit_payload(payload: dict[str, object]) -> bool:
    edits = payload.get("edits")
    if isinstance(edits, list) and edits:
        all_empty = True
        for edit in edits:
            if not isinstance(edit, dict):
                all_empty = False
                break
            old = edit.get("old_string")
            new = edit.get("new_string")
            if old not in ("", None) or new not in ("", None):
                all_empty = False
                break
        if all_empty:
            return False

    file_path = payload.get("file_path")
    workspace_roots_raw = payload.get("workspace_roots")
    if isinstance(file_path, str) and file_path and isinstance(workspace_roots_raw, list):
        workspace_roots = [root for root in workspace_roots_raw if isinstance(root, str) and root]
        if workspace_roots and not _is_path_inside_workspace(file_path=file_path, workspace_roots=workspace_roots):
            return False

    return True


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

    if not _is_effective_edit_payload(payload):
        return noop()

    mark_edited(session_id=session_id, turn_id=turn_id)
    return noop()


if __name__ == "__main__":
    raise SystemExit(main())
