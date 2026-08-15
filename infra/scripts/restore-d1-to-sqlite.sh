#!/bin/sh
set -eu
# Usage: restore-d1-to-sqlite.sh <d1-export.sql> <out.sqlite>
SQL="${1:?usage: restore-d1-to-sqlite.sh <sql> <out-sqlite>}"
OUT="${2:?usage: restore-d1-to-sqlite.sh <sql> <out-sqlite>}"

if [ ! -f "$SQL" ]; then
  echo "sql dump not found: $SQL" >&2
  exit 1
fi

if [ -e "$OUT" ]; then
  echo "refusing to overwrite existing db: $OUT" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
# create empty db, then apply the D1 export
: > "$OUT"
sqlite3 "$OUT" < "$SQL"

check="$(sqlite3 "$OUT" "PRAGMA integrity_check;")"
echo "$check"
if [ "$check" != "ok" ]; then
  echo "integrity_check failed" >&2
  exit 1
fi
