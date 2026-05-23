#!/usr/bin/env bash
set -euo pipefail

detect_pm() {
  if command -v apt-get >/dev/null 2>&1; then
    echo "apt"
    return
  fi
  if command -v dnf >/dev/null 2>&1; then
    echo "dnf"
    return
  fi
  echo "fallback"
}

pm="$(detect_pm)"

case "$pm" in
  apt)
    sudo apt-get update
    sudo apt-get install -y prompt-sage
    ;;
  dnf)
    sudo dnf install -y prompt-sage
    ;;
  fallback)
    echo "No apt/dnf found. Downloading release binary..."
    curl -fsSL "https://example.com/prompt-sage/latest/prompt-sage-linux-x64.tar.gz" -o /tmp/prompt-sage.tar.gz
    tar -xzf /tmp/prompt-sage.tar.gz -C /tmp
    sudo install /tmp/prompt-sage /usr/local/bin/prompt-sage
    ;;
esac

echo "Installed prompt-sage"

