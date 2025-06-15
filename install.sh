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

download_and_install() {
  INPUT="${1:-latest}"
  VERSION="${INPUT#v}"
  PLATFORM=$(detect_platform)
  ZIP_NAME="${CMD_NAME}-${PLATFORM}.zip"
  TMP_DIR=$(mktemp -d)

  if [ "$INPUT" == "latest" ]; then
    URL="https://github.com/$REPO/releases/latest/download/$ZIP_NAME"
  else
    URL="https://github.com/$REPO/releases/download/v$VERSION/$ZIP_NAME"
  fi

  echo "⬇️  Downloading $URL..."
  curl -L --fail "$URL" -o "$TMP_DIR/$ZIP_NAME"

  echo "📦 Unzipping..."
  unzip -q "$TMP_DIR/$ZIP_NAME" -d "$TMP_DIR"

  # Match only actual executable files, not .zip etc
  BINARY_PATH=$(find "$TMP_DIR" -type f -perm +111 -name "${CMD_NAME}*" | head -n 1)

  if [ ! -f "$BINARY_PATH" ]; then
    echo "❌ Could not find an executable binary inside the zip archive."
    ls -l "$TMP_DIR"
    exit 1
  fi

  echo "🔍 Binary info:"
  file "$BINARY_PATH"

  echo "📦 Installing to $INSTALL_DIR/$CMD_NAME"
  chmod +x "$BINARY_PATH"
  sudo mv "$BINARY_PATH" "$INSTALL_DIR/$CMD_NAME"
  rm -rf "$TMP_DIR"
}

verify_installation() {
  echo "✅ $CMD_NAME installed at: $(command -v $CMD_NAME || echo 'not found')"
  $CMD_NAME --help || echo "⚠️  Installed, but failed to run."
}

main() {
  download_and_install "$1"
  verify_installation
}

main "$@"
