#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC
#
# Validate DCO (Developer Certificate of Origin) sign-off in commits

set -e

echo "🔍 Validating DCO sign-off in PR commits..."

# Get PR commits range from arguments or environment
BASE_SHA="${1:-${PR_BASE_SHA}}"
HEAD_SHA="${2:-${PR_HEAD_SHA}}"
PR_AUTHOR="${3:-${PR_AUTHOR}}"
GITHUB_TOKEN="${4:-${GITHUB_TOKEN}}"

if [ -z "$BASE_SHA" ] || [ -z "$HEAD_SHA" ]; then
  echo "❌ Error: BASE_SHA and HEAD_SHA are required"
  echo "Usage: $0 <base_sha> <head_sha> [pr_author] [github_token]"
  exit 1
fi

# Get all commits in the PR
commits=$(git rev-list ${BASE_SHA}..${HEAD_SHA})
commit_count=$(echo "$commits" | wc -l | tr -d ' ')

echo "📋 Checking $commit_count commit(s)..."
echo ""

missing_signoff=()
invalid_format=()
unverified_email=()

for commit in $commits; do
  commit_short=$(echo $commit | cut -c1-7)
  commit_subject=$(git show --format="%s" -s $commit)
  echo "Checking: $commit_short - $commit_subject"
  
  # Check if commit has Signed-off-by line
  if ! git show --format="%B" -s $commit | grep -q "^Signed-off-by: "; then
    missing_signoff+=("$commit_short: $commit_subject")
    echo "  ❌ Missing Signed-off-by"
    continue
  fi
  
  # Extract the Signed-off-by line
  signoff=$(git show --format="%B" -s $commit | grep "^Signed-off-by: " | head -1)
  echo "  Found: $signoff"
  
  # Validate email format
  if ! echo "$signoff" | grep -qE "Signed-off-by: .+ <.+@.+\..+>$"; then
    invalid_format+=("$commit_short: Invalid format - $signoff")
    echo "  ❌ Invalid Signed-off-by format"
    continue
  fi
  
  # If GitHub token and PR author provided, verify email
  if [ -n "$GITHUB_TOKEN" ] && [ -n "$PR_AUTHOR" ]; then
    signoff_email=$(echo "$signoff" | sed -n 's/.*<\(.*\)>.*/\1/p')
    
    # Check GitHub noreply pattern
    noreply_pattern="${PR_AUTHOR}@users.noreply.github.com"
    if [ "$signoff_email" = "$noreply_pattern" ]; then
      echo "  ✅ Valid (GitHub noreply email)"
      continue
    fi
    
    # Could add more GitHub email validation here if needed
    echo "  ✅ Valid format"
  else
    echo "  ✅ Valid format"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Report results
has_errors=false

if [ ${#missing_signoff[@]} -gt 0 ]; then
  has_errors=true
  echo "❌ ${#missing_signoff[@]} commit(s) missing Signed-off-by:"
  for item in "${missing_signoff[@]}"; do
    echo "  • $item"
  done
  echo ""
fi

if [ ${#invalid_format[@]} -gt 0 ]; then
  has_errors=true
  echo "❌ ${#invalid_format[@]} commit(s) with invalid format:"
  for item in "${invalid_format[@]}"; do
    echo "  • $item"
  done
  echo ""
fi

if [ "$has_errors" = true ]; then
  echo "To fix commits missing DCO sign-off:"
  echo ""
  echo "  # For the most recent commit:"
  echo "  git commit --amend --signoff --no-edit"
  echo "  git push --force-with-lease"
  echo ""
  echo "  # For multiple commits (where N = number of commits):"
  echo "  git rebase HEAD~N --signoff"
  echo "  git push --force-with-lease"
  echo ""
  echo "Learn more: https://developercertificate.org/"
  exit 1
fi

echo "✅ All $commit_count commit(s) have valid DCO sign-off!"
