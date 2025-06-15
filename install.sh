#!/bin/bash

set -e

REPO="Hillyon-Labs/opsctrl_cli"
CMD_NAME="opsctrl"
INSTALL_DIR="/usr/local/bin"

detect_platform() {
  OS=$(uname | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)

  case "$ARCH" in
    x86_64) ARCH="x64" ;;
    arm64|aarch64|armv8) ARCH="arm64" ;;
    *) echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
  esac

  case "$OS" in
    darwin) OS="macos" ;;
    linux)  OS="linux" ;;
    mingw*|msys*|cygwin*|MINGW*|MSYS*|CYGWIN*) OS="win" ;;
    *) echo "❌ Unsupported OS: $OS"; exit 1 ;;
  esac

  echo "${OS}-${ARCH}"
}

download_binary() {
  INPUT="${1:-latest}"
  VERSION="${INPUT#v}"
  PLATFORM=$(detect_platform)
  EXT=""
  [ "$OS" = "win" ] && EXT=".exe"

  if [ "$INPUT" == "latest" ]; then
    URL="https://github.com/$REPO/releases/latest/download/${CMD_NAME}-${PLATFORM}${EXT}"
  else
    URL="https://github.com/$REPO/releases/download/${VERSION}/${CMD_NAME}-${PLATFORM}${EXT}"
  fi

  DEST="$INSTALL_DIR/$CMD_NAME$EXT"
  echo "⬇️  Downloading $URL to $DEST..."

  sudo curl -L --fail "$URL" -o "$DEST"
  sudo chmod +x "$DEST"
}

verify_installation() {
  echo "✅ $CMD_NAME installed at: $(command -v $CMD_NAME || echo 'not found')"
  $CMD_NAME --version || echo "⚠️  Version check failed — binary may not be compatible."
}

main() {
  download_binary "$1"
  verify_installation
}

main "$@"
