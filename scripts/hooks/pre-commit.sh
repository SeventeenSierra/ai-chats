#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC
#
# Fast pre-commit hook: Linting and Type Checking only
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

echo "🔍 Running pre-commit verification (Lint, Typecheck, Branch Naming)..."
echo ""

# 0. Branch Name Check
pause_between_scans "🌿 Branch Naming Convention"
echo "🌿 Checking branch name..."
current_branch=$(git rev-parse --abbrev-ref HEAD)
# Skip check if we are on main/develop/staging or in detached HEAD
if [[ "$current_branch" == "main" ]] || [[ "$current_branch" == "develop" ]] || [[ "$current_branch" == "HEAD" ]]; then
    echo "✅ On main/develop branch (skipped convention check)"
else
    # Regex: type/discription, e.g., feat/add-login, fix/bug-123
    if [[ ! "$current_branch" =~ ^(feat|fix|chore|docs|style|refactor|perf|test|ci|build|revert|infra)/ ]]; then
        echo "❌ Invalid branch name: $current_branch"
        echo "   Branch names must start with a conventional commit type followed by a slash."
        echo "   Allowed prefixes: feat, fix, chore, docs, style, refactor, perf, test, ci, build, revert, infra"
        echo "   Example: feat/user-authentication"
        exit 1
    fi
    echo "✅ Branch naming valid: $current_branch"
fi

# 1. Formatting & Linting (Biome)
pause_between_scans "🧹 Linting & Formatting"
echo "🧹 Running Biome check..."
if command -v pnpm &> /dev/null; then
  if pnpm lint; then
      echo "✅ Lint checks passed"
  else
      echo "❌ Lint checks failed. Run 'pnpm biome check --write .' to fix."
      exit 1
  fi
else
  echo "❌ pnpm not found. Run inside 'nix develop'."
  exit 1
fi

# 2. Type Checking
pause_between_scans "typescript Type Checking"
echo "typescript Running type checks..."
if pnpm typecheck; then
    echo "✅ Type checks passed"
else
    echo "❌ Type checks failed"
    exit 1
fi

echo ""
echo "✅ Pre-commit verification complete!"
