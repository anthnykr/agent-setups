import hashlib
from pathlib import Path

MARKERS_DIR = Path.home() / ".cursor/hooks/state/review-implementation-edits"


def noop() -> int:
    print("{}")
    return 0


def extract_session_id(payload: dict[str, object]) -> str | None:
    for key in ("session_id", "conversation_id"):
        value = payload.get(key)
        if isinstance(value, str) and value:
            return value
    return None


def extract_turn_id(payload: dict[str, object]) -> str | None:
    # generation_id is the most stable per-response identifier in Cursor hooks.
    for key in ("generation_id", "request_id", "prompt_id"):
        value = payload.get(key)
        if isinstance(value, str) and value:
            return value
    return None


def marker_path(session_id: str, turn_id: str) -> Path:
    digest_input = f"{session_id}:{turn_id}"
    digest = hashlib.sha256(digest_input.encode("utf-8")).hexdigest()
    return MARKERS_DIR / f"{digest}.marker"


def mark_edited(session_id: str, turn_id: str) -> None:
    marker = marker_path(session_id=session_id, turn_id=turn_id)
    try:
        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.touch(exist_ok=True)
    except OSError:
        return


def consume_edit_marker(session_id: str, turn_id: str) -> bool:
    marker = marker_path(session_id=session_id, turn_id=turn_id)
    try:
        marker.unlink()
        return True
    except FileNotFoundError:
        return False
    except OSError:
        return False
