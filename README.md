# Codex Native Scheduler

Run unattended Codex CLI jobs through the scheduler already built into the
operating system:

- macOS: `launchd`
- Linux: transient `systemd --user` timers created by `systemd-run`
- Windows: Task Scheduler 2.0 XML registered with `schtasks`

The project deliberately has no resident daemon, database, cron fallback, or
extra approval policy. Codex profiles and arbitrary repeated `-c key=value`
overrides go directly to `codex exec --strict-config`; Codex remains the
authority for configuration, authentication, approvals, sandboxing, and
organization requirements.

If Codex does not support an override key, the run fails before
`turn.started`; the scheduler preserves Codex's stderr and does not retry that
deterministic configuration error.

## Install

Python 3.11+ and an authenticated Codex CLI are required.

With npm on macOS, Linux, or Windows:

```console
npm install --global codex-native-scheduler
codex-schedule install
codex-schedule init
```

Before an npm-registry release, install the same package directly from GitHub:

```console
npx --yes github:wufei-png/codex-native-scheduler install
# Or keep the command globally:
npm install --global github:wufei-png/codex-native-scheduler
codex-schedule install
```

Without npm on macOS or Linux:

```console
curl -fsSL https://raw.githubusercontent.com/wufei-png/codex-native-scheduler/main/install.sh | sh
python3 ~/.agents/skills/codex-native-scheduler/scripts/codex-schedule init
```

Pin or select an installer ref:

```console
curl -fsSL https://raw.githubusercontent.com/wufei-png/codex-native-scheduler/main/install.sh |
  sh -s -- --ref v0.1.0 --existing backup
```

`--existing` accepts `backup` (default), `skip`, or `overwrite`. Installation
only installs code. `init` creates private scheduler state under
`$CODEX_HOME/codex-native-scheduler`.

## State directory

The default state root is `$CODEX_HOME/codex-native-scheduler`, normally
`~/.codex/codex-native-scheduler`. `--state-dir` is a global override intended
for isolated tests, CI, and live canaries; place it before the subcommand:

```console
codex-schedule \
  --state-dir /tmp/scheduler-canary/codex-native-scheduler \
  init
```

`CODEX_SCHEDULER_STATE_DIR` provides the same override through the environment.
Native jobs retain the absolute state path used when they are registered, so
use the same path for later inspection and management.

For deletion safety, `purge --yes` accepts an overridden root only when its
final path component is exactly `codex-native-scheduler`. Keep that suffix for
temporary roots; arbitrary directory names can be used for non-destructive
commands but cannot be purged by the CLI.

## Quick start

Create a one-shot job:

```console
codex-schedule create \
  --name dependency-audit \
  --cwd "$PWD" \
  --at 2h \
  --prompt "Audit dependencies and write a concise report. Do not change files."
```

Create a recurring isolated-worktree job:

```console
codex-schedule create \
  --name nightly-maintenance \
  --cwd "$PWD" \
  --daily-at 02:30 \
  --workspace worktree \
  --session-mode new_each_run \
  --overlap skip \
  --profile automation \
  -c 'sandbox_mode="danger-full-access"' \
  -c 'approval_policy="never"' \
  --prompt-file ./automation/nightly.md
```

Send a later prompt to an existing Codex session:

```console
codex-schedule create \
  --name follow-up \
  --cwd "$PWD" \
  --at 5h \
  --workspace direct \
  --session-mode resume_fixed \
  --session-id 019f8ad6-436d-7d43-b980-2ce65da33755 \
  --prompt-file ./automation/follow-up.md
```

Seeded sessions require a UUID and do not inherit the scheduler's default
profile. They reject `--profile` and `-c` until `update --reset-session` starts
a new session generation, so the job cannot override the existing session's
model and reasoning settings.

Inspect and control it:

```console
codex-schedule list
codex-schedule status nightly-maintenance
codex-schedule runs nightly-maintenance
codex-schedule run-now nightly-maintenance
codex-schedule pause nightly-maintenance
codex-schedule resume nightly-maintenance
```

See [docs/semantics.md](docs/semantics.md) for precise scheduling, session,
retry, overlap, retention, and workspace semantics.

## Platform boundaries

The native scheduler must be available; backend failure is reported without
falling back to another mechanism. Linux uses the user systemd manager and
never enables lingering automatically. Without linger, jobs are not guaranteed
after logout. macOS jobs are bootstrapped privately into `gui/<uid>` and do not
write to `~/Library/LaunchAgents`. Windows support is slightly less mature and
is validated in Windows CI.

Jobs using the same direct directory are not coordinated with each other.
Choose worktrees for write-heavy tasks or explicitly design read-only jobs for
safe parallel execution.

## Development

```console
python3 -m unittest discover -s tests -t . -v
python3 scripts/validate_skill.py
npm pack --dry-run
```

Live release gates additionally require a macOS launchd canary, an Ubuntu
systemd user-timer canary, and green Windows CI. The legacy local prototype is
not removed by installation or release.

MIT licensed.
