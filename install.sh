#!/bin/sh
set -eu

repository="wufei-png/codex-native-scheduler"
ref="main"
existing="backup"
target="${HOME}/.agents/skills/codex-native-scheduler"

usage() {
  echo "usage: install.sh [--ref REF] [--existing backup|skip|overwrite] [--target PATH]"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --ref)
      [ "$#" -ge 2 ] || { usage >&2; exit 2; }
      ref="$2"
      shift 2
      ;;
    --existing)
      [ "$#" -ge 2 ] || { usage >&2; exit 2; }
      existing="$2"
      shift 2
      ;;
    --target)
      [ "$#" -ge 2 ] || { usage >&2; exit 2; }
      target="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
done

case "$existing" in
  backup|skip|overwrite) ;;
  *)
    echo "--existing must be backup, skip, or overwrite" >&2
    exit 2
    ;;
esac

case "${target##*/}" in
  codex-native-scheduler) ;;
  *)
    echo "install target must end with codex-native-scheduler" >&2
    exit 2
    ;;
esac

temporary="$(mktemp -d "${TMPDIR:-/tmp}/codex-native-scheduler.XXXXXX")"
cleanup() {
  rm -rf "$temporary"
}
trap cleanup EXIT HUP INT TERM

if [ "$ref" = "main" ]; then
  installer="$temporary/install-codex-native-scheduler.sh"
  curl -fsSL https://raw.githubusercontent.com/wufei-png/skills/main/scripts/install-codex-native-scheduler.sh -o "$installer"
  sh "$installer" --existing "$existing" --target "$target"
  exit
fi

if ! command -v python3 >/dev/null 2>&1 ||
  ! python3 -c 'import sys; raise SystemExit(sys.version_info < (3, 11))'
then
  echo "Python 3.11 or newer is required" >&2
  exit 1
fi

archive="$temporary/source.tar.gz"
url="https://github.com/${repository}/archive/${ref}.tar.gz"
curl -fsSL "$url" -o "$archive"
mkdir "$temporary/source"
tar -xzf "$archive" -C "$temporary/source" --strip-components=1
source_skill="$temporary/source/skills/codex-native-scheduler"

if [ ! -f "$source_skill/SKILL.md" ]; then
  echo "downloaded ref does not contain the skill: $ref" >&2
  exit 1
fi

if [ -e "$target" ]; then
  case "$existing" in
    skip)
      echo "Existing skill left unchanged: $target"
      exit 0
      ;;
    backup)
      stamp="$(date -u +%Y%m%dT%H%M%SZ)"
      backup="${target}.backup-${stamp}"
      mv "$target" "$backup"
      echo "Backed up existing skill to $backup"
      ;;
    overwrite)
      rm -rf "$target"
      ;;
  esac
fi

mkdir -p "$(dirname "$target")"
cp -R "$source_skill" "$target"
chmod 755 "$target/scripts/codex-schedule"

echo "Installed codex-native-scheduler to $target"
echo "Run: python3 $target/scripts/codex-schedule init"
