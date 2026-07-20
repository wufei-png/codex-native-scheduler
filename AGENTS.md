# Repository Guidelines

## Scope

This repository contains one installable Codex skill. Keep maintainer
documentation, tests, and release tooling at the repository root. Keep the
installed runtime payload under `skills/codex-native-scheduler/`.

The runtime is Python 3.11+ standard library only. Do not add a daemon,
database, scheduler fallback, Codex configuration whitelist, or implicit
permission policy.

## Structure

- `skills/codex-native-scheduler/SKILL.md`: concise agent workflow.
- `skills/codex-native-scheduler/scripts/codex-schedule`: CLI entry point.
- `skills/codex-native-scheduler/scripts/codex_scheduler/`: runtime modules.
- `skills/codex-native-scheduler/references/`: detailed CLI reference.
- `install.sh`: macOS/Linux curl installer.
- `tests/`: cross-platform unit and integration tests.

## Commands

Run tests from the repository root:

```bash
python3 -m unittest discover -s tests -t . -v
python3 skills/codex-native-scheduler/scripts/codex-schedule --help
python3 /Users/wufei2/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  skills/codex-native-scheduler
```

Use `python3 -m compileall` for a syntax check. Tests must not register real
native jobs unless they are explicitly marked as live canaries.

## Safety

Never modify or import the legacy files under `~/.codex/codex-schedule`,
`~/.codex/CODEX_SCHEDULE.md`, or `~/.codex/scheduled-codex`.

Keep prompts, captured environment values, job files, and run artifacts
private. Do not print environment values from `show`, `list`, or `doctor`.
