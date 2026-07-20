#!/usr/bin/env python3
"""Small dependency-free repository validator for the packaged skill."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "codex-native-scheduler"


def main() -> int:
    required = [
        SKILL / "SKILL.md",
        SKILL / "agents" / "openai.yaml",
        SKILL / "scripts" / "codex-schedule",
        SKILL / "references" / "semantics.md",
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.is_file()]
    if missing:
        print(f"missing skill files: {', '.join(missing)}", file=sys.stderr)
        return 1
    text = required[0].read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n", text, flags=re.DOTALL)
    if not match:
        print("SKILL.md frontmatter is missing", file=sys.stderr)
        return 1
    frontmatter = match.group(1)
    if "name: codex-native-scheduler" not in frontmatter:
        print("SKILL.md name is invalid", file=sys.stderr)
        return 1
    if "description:" not in frontmatter or "TODO" in text:
        print("SKILL.md description is incomplete", file=sys.stderr)
        return 1
    print("skill package is valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
