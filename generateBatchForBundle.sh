#!/usr/bin/env bash
set -euo pipefail

# Determine the directory where this script resides (FrameMyApp checkout directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Remember the caller's working directory so relative --in and --out paths resolve properly
CALLER_PWD="$(pwd)"

# 1. Install npm dependencies if node_modules is missing
if [ ! -d "${SCRIPT_DIR}/node_modules" ]; then
  echo "📥 Installation des dépendances NPM dans ${SCRIPT_DIR}..."
  (cd "${SCRIPT_DIR}" && npm ci --no-audit --no-fund || npm install --no-audit --no-fund)
fi

# 2. Ensure Playwright & Chromium headless browser are installed
if ! (cd "${SCRIPT_DIR}" && node -e "import('playwright').then(() => process.exit(0)).catch(() => process.exit(1))" 2>/dev/null); then
  echo "📥 Installation de Playwright dans ${SCRIPT_DIR}..."
  (cd "${SCRIPT_DIR}" && npm install --no-save playwright --no-audit --no-fund)
fi

# Check if Playwright's chromium binary is available (unless CHROME_PATH is already provided)
if [ -z "${CHROME_PATH:-}" ] && [ -z "${PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:-}" ]; then
  if ! (cd "${SCRIPT_DIR}" && node -e "import('playwright').then(pw => { const fs = require('fs'); process.exit(fs.existsSync(pw.chromium.executablePath()) ? 0 : 1); }).catch(() => process.exit(1))" 2>/dev/null); then
    echo "🌐 Installation du binaire Chromium pour Playwright..."
    (cd "${SCRIPT_DIR}" && npx playwright install chromium)
  fi
fi

# 3. Execute the CLI batch generator from CALLER_PWD so relative paths work intuitively
cd "${CALLER_PWD}"
exec node "${SCRIPT_DIR}/scripts/generate-batch-cli.mjs" "$@"
