#!/bin/sh
set -eu
DB="${DATABASE_PATH:-/data/arise.sqlite}"
DIR="$(dirname "$DB")/backups"
mkdir -p "$DIR"
OUT="$DIR/arise-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
# Online backup API; does not require exclusive lock for long
sqlite3 "$DB" ".timeout 5000" ".backup '$OUT'"
# 14-day retain
find "$DIR" -name 'arise-*.sqlite' -mtime +14 -delete
