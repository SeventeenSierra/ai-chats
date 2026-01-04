#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC
#
# Comprehensive pre-push hook: Build, Security Audit, SBOM
#

set -e

# Interactive pause between checks
pause_between_scans() {
    local scan_name="$1"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Next: $scan_name"
    echo "  Press ENTER to continue, 'q' to stop, or wait 15s..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Read with 15-second timeout
    read -t 15 -r response || response=""
    
    # Check if user wants to stop
    if [[ "$response" == "q" ]] || [[ "$response" == "quit" ]] || [[ "$response" == "stop" ]]; then
      echo ""
      echo "🛑 Verification stopped by user"
      echo ""
      exit 0
    fi
}

echo "🔍 Running pre-push verification (Build & Security)..."
echo ""

# 1. Build Verification
pause_between_scans "🏗️  Build Verification"
echo "🏗️  Running build..."
if pnpm build; then
    echo "✅ Build passed"
else
    echo "❌ Build failed"
    exit 1
fi

# 2. Security Audit (Unified)
# We re-use logic from the unified script effectively by inlining calls or running commands directly.
# For simplicity in this split, we'll run commands directly with pauses.

# npm Security Audit
pause_between_scans "📦 npm/pnpm Security Audit"
echo "📦 Running npm security audit..."
if pnpm audit --audit-level=moderate; then
    echo "✅ npm audit passed"
else
    echo "❌ npm audit found moderate+ vulnerabilities"
    exit 1
fi

# Semgrep
pause_between_scans "🔬 Semgrep SAST Scan"
echo "🔬 Running Semgrep..."
if command -v semgrep >/dev/null 2>&1; then
    semgrep --config=p/security-audit \
      --config=p/javascript \
      --config=p/typescript \
      --config=p/nodejs \
      --config=p/react \
      --config=p/nextjs \
      --config=p/dockerfile \
      --error \
      --severity=ERROR . || { echo "❌ Semgrep found issues"; exit 1; }
    echo "✅ Semgrep passed"
else
    echo "⚠️  Semgrep not installed"
fi

# Trivy
pause_between_scans "🛡️  Trivy Security Scan"
echo "🛡️  Running Trivy..."
if command -v trivy >/dev/null 2>&1; then
    # Skip non-prod dirs
    TRIVY_SKIP="--skip-dirs seed-data --skip-dirs node_modules --skip-dirs .venv --skip-dirs .next --skip-files apps/ai-chats/.env.local"
    
    trivy fs \
      --severity HIGH,CRITICAL \
      --scanners vuln \
      $TRIVY_SKIP \
      --ignorefile .trivyignore \
      --exit-code 1 . || { echo "❌ Trivy found vulnerabilities"; exit 1; }

    trivy config \
      --severity HIGH,CRITICAL \
      --misconfig-scanners dockerfile,kubernetes,terraform,helm,yaml \
      --include-non-failures \
      $TRIVY_SKIP \
      --ignorefile .trivyignore \
      --exit-code 1 . || { echo "❌ Trivy found misconfigurations"; exit 1; }
      
    trivy fs \
      --scanners secret \
      $TRIVY_SKIP \
      --ignorefile .trivyignore \
      --exit-code 1 . || { echo "❌ Trivy found secrets"; exit 1; }
      
    echo "✅ Trivy passed"
else
    echo "⚠️  Trivy not installed"
fi

# Gitleaks
pause_between_scans "🔑 Gitleaks (Git History)"
echo "🔑 Running Gitleaks..."
if command -v gitleaks >/dev/null 2>&1; then
    if [ -f ".gitleaks.toml" ]; then
        gitleaks detect --config .gitleaks.toml --verbose --redact --exit-code 1 || { echo "❌ Gitleaks found secrets"; exit 1; }
    else
        gitleaks detect --verbose --exit-code 1 || { echo "❌ Gitleaks found secrets"; exit 1; }
    fi
    echo "✅ Gitleaks passed"
else
    echo "⚠️  Gitleaks not installed"
fi

# Hadolint
pause_between_scans "🐳 Hadolint"
echo "🐳 Running Hadolint..."
if command -v hadolint >/dev/null 2>&1; then
    DOCKERFILES=$(find . -name "Dockerfile" -o -name "*.dockerfile" -o -name "*.Containerfile" 2>/dev/null)
    if [ -n "$DOCKERFILES" ]; then
        echo "$DOCKERFILES" | xargs hadolint || { echo "❌ Hadolint issues"; exit 1; }
        echo "✅ Hadolint passed"
    else
        echo "⏭️  No Dockerfiles found, skipping Hadolint"
    fi
else
    echo "⚠️  Hadolint not installed"
fi

echo ""
echo "✅ Pre-push verification complete!"
