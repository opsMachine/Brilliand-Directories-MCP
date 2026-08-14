#!/usr/bin/env bash
# Install gitleaks binary to ~/.local/bin (user PATH). Idempotent.
set -euo pipefail

VERSION="${GITLEAKS_VERSION:-8.30.1}"
INSTALL_DIR="${GITLEAKS_INSTALL_DIR:-$HOME/.local/bin}"

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)  ARCH=linux_x64 ;;
  Linux-aarch64) ARCH=linux_arm64 ;;
  Darwin-arm64)  ARCH=darwin_arm64 ;;
  Darwin-x86_64) ARCH=darwin_x64 ;;
  *)
    echo "Unsupported platform: $(uname -s) $(uname -m)" >&2
    echo "Install manually: https://github.com/gitleaks/gitleaks/releases" >&2
    exit 1
    ;;
esac

mkdir -p "$INSTALL_DIR"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

URL="https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}/gitleaks_${VERSION}_${ARCH}.tar.gz"
echo "Downloading gitleaks v${VERSION} (${ARCH})..."
curl -fsSL "$URL" -o "$TMPDIR/gitleaks.tar.gz"
tar -xzf "$TMPDIR/gitleaks.tar.gz" -C "$TMPDIR"
install -m 0755 "$TMPDIR/gitleaks" "$INSTALL_DIR/gitleaks"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "Installed to $INSTALL_DIR/gitleaks — add to PATH if needed:" >&2
  echo "  export PATH=\"$INSTALL_DIR:\$PATH\"" >&2
else
  echo "gitleaks $(gitleaks version) at $(command -v gitleaks)"
fi
