#!/usr/bin/env node

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const skillName = "codex-native-scheduler";
const bundledSkill = path.resolve(__dirname, "..", "skills", skillName);
const defaultTarget = path.join(os.homedir(), ".agents", "skills", skillName);

function fail(message) {
  console.error(`codex-native-scheduler: ${message}`);
  process.exit(2);
}

function installSkill(argv) {
  let target = defaultTarget;
  let existing = "backup";
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--target") {
      index += 1;
      if (!argv[index]) fail("--target requires a path");
      target = path.resolve(argv[index]);
    } else if (value === "--existing") {
      index += 1;
      if (!argv[index]) fail("--existing requires a value");
      existing = argv[index];
    } else {
      fail(`unknown install argument: ${value}`);
    }
  }
  if (!["backup", "skip", "overwrite"].includes(existing)) {
    fail("--existing must be backup, skip, or overwrite");
  }
  if (path.basename(target) !== skillName) {
    fail(`install target must end with ${skillName}`);
  }
  if (fs.existsSync(target)) {
    if (existing === "skip") {
      console.log(`Existing skill left unchanged: ${target}`);
      return;
    }
    if (existing === "backup") {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backup = `${target}.backup-${stamp}`;
      fs.renameSync(target, backup);
      console.log(`Backed up existing skill to ${backup}`);
    } else {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(bundledSkill, target, { recursive: true });
  if (process.platform !== "win32") {
    fs.chmodSync(path.join(target, "scripts", "codex-schedule"), 0o755);
  }
  console.log(`Installed ${skillName} to ${target}`);
}

function pythonCommand() {
  if (process.env.PYTHON) {
    return [process.env.PYTHON, []];
  }
  const candidates =
    process.platform === "win32"
      ? [["py", ["-3.11"]], ["python", []]]
      : [["python3", []], ["python", []]];
  for (const [command, prefix] of candidates) {
    const result = spawnSync(
      command,
      [
        ...prefix,
        "-c",
        "import sys; raise SystemExit(sys.version_info < (3, 11))",
      ],
      {
      stdio: "ignore",
      },
    );
    if (result.status === 0) {
      return [command, prefix];
    }
  }
  fail("Python 3.11 or newer was not found");
}

const args = process.argv.slice(2);
if (args[0] === "install") {
  installSkill(args.slice(1));
  process.exit(0);
}

const installedEntrypoint = path.join(
  defaultTarget,
  "scripts",
  "codex-schedule",
);
const bundledEntrypoint = path.join(bundledSkill, "scripts", "codex-schedule");
const entrypoint = fs.existsSync(installedEntrypoint)
  ? installedEntrypoint
  : bundledEntrypoint;
const [python, prefix] = pythonCommand();
const result = spawnSync(python, [...prefix, entrypoint, ...args], {
  stdio: "inherit",
});
if (result.error) {
  fail(result.error.message);
}
process.exit(result.status === null ? 1 : result.status);
