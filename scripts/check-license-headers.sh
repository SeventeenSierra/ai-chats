#!/bin/bash
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking license headers..."

current_year=$(date +%Y)
failed=0

# Function to check headers
check_header() {
    local file=$1
    local expected_license=$2
    local expected_copyright="SPDX-FileCopyrightText: .* Seventeen Sierra LLC"

    if [ ! -f "$file" ]; then
        return
    fi

    # Read first 5 lines
    header=$(head -n 5 "$file")

    if ! echo "$header" | grep -q "$expected_license"; then
        echo -e "${RED}❌ $file missing or incorrect license header${NC}"
        echo -e "   Expected: $expected_license"
        failed=1
    fi

    if ! echo "$header" | grep -q "$expected_copyright"; then
        echo -e "${RED}❌ $file missing copyright header${NC}"
        failed=1
    fi
}

# 1. Check AGPL packages (Web & Shared)
echo "Checking AGPL-3.0-or-later packages..."
find apps/ai-chats/src shared/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.yaml" -o -name "*.yml" -o -name "*.sh" \) | while read -r file; do
    check_header "$file" "SPDX-License-Identifier: AGPL-3.0-or-later"
done

# 2. Check PolyForm Strict packages (Backend, AI, Infra, Tests)
echo "Checking PolyForm-Strict-1.0.0 packages..."
find backend/src ai/src infra tests -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.yaml" -o -name "*.yml" -o -name "*.sh" \) 2>/dev/null | while read -r file; do
    check_header "$file" "SPDX-License-Identifier: PolyForm-Strict-1.0.0"
done

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✅ All license headers correct!${NC}"
    exit 0
else
    echo -e "${RED}❌ License header check failed${NC}"
    exit 1
fi
