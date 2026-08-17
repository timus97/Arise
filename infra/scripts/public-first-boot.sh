#!/usr/bin/env bash
# First boot on the public host (Oracle / Hetzner / home Linux).
# Run as ubuntu (sudo). Does not write secrets.
set -euo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run as ubuntu with sudo available, not as root."
  exit 1
fi

sudo apt-get update
sudo apt-get install -y --no-install-recommends ca-certificates curl git

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER"

APP_DIR="${ARISE_DIR:-$HOME/arise}"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone --branch "${ARISE_BRANCH:-feat/public-ff-host}" \
    https://github.com/timus97/Arise.git "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "${ARISE_BRANCH:-feat/public-ff-host}"
  git -C "$APP_DIR" pull --ff-only
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "Created $APP_DIR/.env — fill BETTER_AUTH_SECRET, REGISTER_INVITE_CODE,"
  echo "ARISE_HOST, APP_ORIGIN, BETTER_AUTH_URL, then:"
  echo "  cd $APP_DIR && docker compose -f docker-compose.public.yml up --build -d"
else
  echo "$APP_DIR/.env already exists; not overwritten."
fi

echo
echo "Log out and back in (or: newgrp docker) so docker works without sudo."
echo "DuckDNS must resolve to THIS machine public IPv4 before Caddy can get a cert."
