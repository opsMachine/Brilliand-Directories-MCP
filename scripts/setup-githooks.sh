#!/usr/bin/env bash
# Point this repo at tracked hooks under .githooks/ (gitleaks pre-commit).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

chmod +x .githooks/pre-commit
git config core.hooksPath .githooks

echo "Git hooks enabled: core.hooksPath=.githooks"
echo "Pre-commit runs: gitleaks protect --staged --config .gitleaks.toml"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "Warning: gitleaks not found on PATH." >&2
  echo "Install: npm run install:gitleaks   (or bash scripts/install-gitleaks.sh)" >&2
else
  echo "gitleaks $(gitleaks version)"
fi
