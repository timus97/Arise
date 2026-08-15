#!/bin/sh
set -eu
mkdir -p /data/backups
chown -R 10001:10001 /data
exec gosu arise "$@"
