#!/usr/bin/env bash
# One-time preparation of a fresh Ubuntu server (AWS Lightsail or EC2) to run the site:
# Docker, a swap file (the website build needs more memory than a small server has),
# and automatic security updates. Run as a user with sudo:  bash setup-server.sh
set -euo pipefail

if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
fi

if ! command -v docker > /dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

sudo apt-get update -q
sudo DEBIAN_FRONTEND=noninteractive apt-get install -yq unattended-upgrades git
sudo systemctl enable --now docker

echo "Server ready. Log out and back in once so the docker group applies."
