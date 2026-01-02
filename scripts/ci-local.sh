#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

# Local CI Validation Script
# Mirrors the GitHub Actions CI workflow checks
# Run this before pushing to catch issues early

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Running Local CI Checks${NC}"
echo "================================"

# Function to run a check
run_check() {
    local name=$1
    local command=$2
    
    echo -e "\n${YELLOW}▶ ${name}${NC}"
    if eval "$command"; then
        echo -e "${GREEN}✓ ${name} passed${NC}"
        return 0
    else
        echo -e "${RED}✗ ${name} failed${NC}"
        return 1
    fi
}

# Track failures
FAILED=0

# 1. Lint
run_check "Lint" "pnpm run lint" || FAILED=$((FAILED + 1))

# 2. Typecheck
run_check "Typecheck" "pnpm -r run typecheck" || FAILED=$((FAILED + 1))

# 3. Build (verify build works)
run_check "Build Verification" "pnpm --filter @ai-chat/ai-chats run build" || FAILED=$((FAILED + 1))

# 4. Commit Message Validation (if there are commits)
if git rev-parse HEAD >/dev/null 2>&1; then
    run_check "Commit Message" "pnpm exec commitlint --from HEAD~1 --to HEAD --verbose" || FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo -e "${GREEN}Ready to push${NC}"
    exit 0
else
    echo -e "${RED}✗ ${FAILED} check(s) failed${NC}"
    echo -e "${RED}Please fix the issues before pushing${NC}"
    exit 1
fi
