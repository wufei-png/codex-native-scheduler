# Operational reference

The authoritative detailed reference is the repository's
`docs/semantics.md`. Installed copies use these rules:

- Native timers only wake the runner; semantic occurrence claims deduplicate
  wakes and coalesce missed occurrences.
- `skipped_overlap`, duplicate wakes, `run-now`, and manual retry do not consume
  schedule count.
- `parallel` is limited to `new_each_run`; fixed sessions serialize.
- Launch retries happen only before `turn.started`, with three total attempts.
- Three consecutive failed, timed-out, or abandoned runs pause recurrence.
- Retention defaults to forever; pruning leaves run tombstones.
- There is no cross-job lock, no implicit Linux linger, and no native-backend
  fallback.
- Codex profiles and repeated `-c key=value` values are forwarded under
  `--strict-config` without a scheduler-maintained key allowlist.
