#!/bin/bash
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

# Apply AGPL headers (Web & Shared)
AGPL_HEADER="// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC
"

POLYFORM_HEADER="// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC
"

# Function to applying header if missing
apply_header() {
    local file=$1
    local header=$2

    if ! grep -q "SPDX-License-Identifier" "$file"; then
        echo "Adding header to $file"
        temp_file=$(mktemp)
        echo -e "$header" > "$temp_file"
        cat "$file" >> "$temp_file"
        mv "$temp_file" "$file"
    fi
}

echo "Applying AGPL headers..."
find apps/ai-chats/src shared/src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
    apply_header "$file" "$AGPL_HEADER"
done

echo "Applying PolyForm headers..."
find backend/src ai/src infra tests -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read -r file; do
    apply_header "$file" "$POLYFORM_HEADER"
done

echo "Done!"
