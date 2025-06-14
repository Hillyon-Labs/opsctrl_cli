#!/bin/bash

set -e

REPO="Hillyon-Labs/opsctrl_cli"
CMD_NAME="opsctrl"
INSTALL_DIR="/usr/local/bin"

# Detect OS and Architecture
detect_platform() {
  OS=$(uname | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)

  case "$ARCH" in
    x86_64) ARCH="x64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
  esac

  case "$OS" in
    darwin) OS="macos" ;;
    linux)  OS="linux" ;;
    msys*|mingw*|cygwin*) OS="win" ;;  # For Git Bash / Windows support
    *) echo "Unsupported OS: $OS"; exit 1 ;;
  esac

  echo "${OS}-${ARCH}"
}



# Download correct binary from GitHub
download_binary() {
  VERSION="${1:-latest}"
  PLATFORM=$(detect_platform)

  if [ "$VERSION" == "latest" ]; then
    URL="https://github.com/$REPO/releases/latest/download/${CMD_NAME}-${PLATFORM}"
  else
    URL="https://github.com/$REPO/releases/download/${VERSION}/${CMD_NAME}-${PLATFORM}"
  fi

  DEST="$INSTALL_DIR/$CMD_NAME"

  echo "Downloading $URL..."
  sudo curl -L --fail "$URL" -o "$DEST"
  sudo chmod +x "$DEST"
}

# Post-install check
verify_installation() {
  echo "$CMD_NAME installed at $(command -v $CMD_NAME)"
  $CMD_NAME --version || echo "Installation succeeded, but version check failed."
}

main() {
  download_binary "$1"
  verify_installation
}

main "$@"
