# Scheduler semantics

## Scheduling

Each job selects exactly one semantic schedule:

- `--at`: one future ISO 8601 timestamp or relative duration.
- `--every`: an interval anchored when the job is created.
- `--daily-at`: a local `HH:MM` wall-clock occurrence.
- `--weekly-at`: a local occurrence such as `mon@09:30`.

Schedules use minute precision. Native timers are wake-up mechanisms, not the
source of truth. At every wake, the runner computes the latest due semantic
occurrence and atomically claims its occurrence key. Duplicate native wakes do
nothing. Multiple missed occurrences coalesce into one catch-up run without
shifting an interval's anchor.

A nonexistent local time during the spring DST gap is skipped. A repeated wall
time during the autumn transition has one occurrence key and runs at most once.

`--count` counts scheduled occurrences that actually start. A failed,
timed-out, or stopped run counts after it starts. Duplicate wakes,
`skipped_overlap`, `run-now`, and manual retry do not count. Recurring schedules
are indefinite unless `--count` or `--until` is configured.

## Overlap and failure

`--overlap skip` is the default. A wake that finds another run of the same job
active is recorded as `skipped_overlap`, with no queue and no count increment.
`--overlap parallel` permits concurrent runs, but only with `new_each_run`.
`resume_fixed` always serializes.

There is no cross-job lock or global concurrency cap. Two jobs pointed at the
same direct directory may write concurrently.

Each Codex launch gets at most three attempts, with delays of 5 and 30 seconds.
An attempt is retried only if it failed before `turn.started`, and deterministic
local configuration, argument, profile, authentication, and permission errors
are not retried. The scheduler forwards profiles and arbitrary `-c key=value`
values to `codex exec --strict-config` without maintaining a key allowlist.

Three consecutive failed, timed-out, or abandoned runs pause a recurring job.
A success resets the counter. It does not automatically resume a job that is
already paused. Cancellation and `skipped_overlap` are not failures.

## Sessions and workspaces

`new_each_run` starts a new Codex session by default. With worktree mode it also
creates a branch and worktree per run.

`resume_fixed` reuses one Codex session. With worktree mode it uses one
persistent branch and worktree per job generation. Changing prompt, schedule,
profile, or `-c` values keeps the session. Changing the working directory or
workspace mode requires `--reset-session`, which creates a new generation.

Worktree base policy defaults to `latest`: the local source branch is resolved
at run time without fetch or pull. Detached HEAD uses the captured commit.
`snapshot` always uses the captured commit. `--base-ref` selects the initial
local ref. The scheduler does not commit, merge, push, or automatically remove
dirty/unmerged worktrees.

Direct mode refuses a dirty Git directory unless `--allow-dirty` is explicit.
Worktree mode requires Git; direct mode can run outside Git.

## Runs, retry, and retention

Every run has immutable snapshots of its job and prompt plus `run.json`, raw
Codex JSONL, stderr, final reply, and attempt records. Manual retry creates a new
run linked by `retry_of` and resumes the captured session when its workspace is
still available. If a `new_each_run` session is unavailable, retry starts a new
session. A missing fixed session fails and requires an explicit session reset.

Retention defaults to forever. Bounded retention can use days, retained run
count, or both. `prune --dry-run` previews candidates. Pruning removes detailed
artifacts while retaining a tombstone with run identity, status, timestamps,
job revision, and retry link.

`pause` affects future wakes and lets the active run finish. `stop` terminates
an active Codex process. `cancel` applies to a pending one-shot. `delete` is
permanent, requires confirmation, and refuses active runs unless `--stop` is
given. Delete and purge refuse worktrees with uncommitted changes or commits
not merged into the configured source ref. `decommission` unregisters all
native jobs while preserving state; `purge --yes` is only allowed after
decommissioning.

## State and security

State lives at `$CODEX_HOME/codex-native-scheduler` (or the documented state
override), separate from the earlier `scheduled-codex` prototype. Directories
and files are private on POSIX; Windows uses best-effort user-local protection.
Values captured from the environment are redacted from ordinary job output but
are not encrypted on disk.

The base Codex configuration and selected profile are read by Codex at every
run. Explicit job `-c` overrides are frozen in the job revision. The scheduler
adds no separate acknowledgement for `danger-full-access` plus
`approval_policy=never`, no organization-requirements preflight, and no custom
filter layer. Native Codex errors are retained in the run artifacts.
