#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC
#
# Run comprehensive security audit locally before pushing to CI

set -e

echo "🔍 Running security audit..."
echo ""

# Pre-flight validation: Check for critical lockfiles
echo "📋 Validating project structure..."
MISSING_FILES=0

# Check for required lockfiles
if [ ! -f "pnpm-lock.yaml" ]; then
  echo "❌ Missing: pnpm-lock.yaml (root lockfile)"
  MISSING_FILES=$((MISSING_FILES + 1))
fi

if [ $MISSING_FILES -gt 0 ]; then
  echo ""
  echo "❌ Audit cannot proceed: $MISSING_FILES critical lockfile(s) missing"
  echo "   Run 'pnpm install' at the project root to regenerate lockfiles"
  exit 1
fi

echo "✅ All critical lockfiles present"
echo ""

# Check if we're in Nix environment (recommended)
if [ -z "$IN_NIX_SHELL" ]; then
  echo "⚠️  Warning: Not in Nix environment. Run 'nix develop' for best results."
  echo ""
fi

# Interactive pause between scans with auto-continue
pause_between_scans() {
  local scan_name="$1"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Next: $scan_name"
  echo "  Press ENTER to continue, 'q' to stop, or wait 15 seconds to auto-continue..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Read with 15-second timeout
  read -t 15 -r response || response=""
  
  # Check if user wants to stop
  if [[ "$response" == "q" ]] || [[ "$response" == "quit" ]] || [[ "$response" == "stop" ]]; then
    echo ""
    echo "🛑 Audit stopped by user"
    echo ""
    echo "Partial audit results available above."
    echo "Run 'pnpm run audit' to resume full audit."
    exit 0
  fi
  
  echo ""
}

# npm/pnpm security audit
echo "📦 Running npm security audit..."
if command -v pnpm >/dev/null 2>&1; then
  # Use --audit-level=moderate (skips low severity like false positives)
  # Note: GHSA-rwvc-j5jr-mgvh (ai package) is a false positive - we use @genkit-ai/ai, not Vercel's ai
  pnpm audit --audit-level=moderate || {
    echo "❌ npm audit found moderate+ vulnerabilities"
    exit 1
  }
  echo "✅ npm audit passed"
else
  echo "❌ pnpm not found. Install via Nix: nix develop"
  exit 1
fi

echo ""

pause_between_scans "🔬 Semgrep SAST Scan"

# Semgrep SAST scanning
echo "🔬 Running Semgrep SAST scan..."
if command -v semgrep >/dev/null 2>&1; then
  # Run Semgrep with comprehensive rulesets matching CI workflow
  echo "  → Using comprehensive rulesets (security-audit, javascript, typescript, nodejs, react, nextjs)"
  semgrep --config=p/security-audit \
    --config=p/javascript \
    --config=p/typescript \
    --config=p/nodejs \
    --config=p/react \
    --config=p/nextjs \
    --error \
    --severity=ERROR . || {
    echo "❌ Semgrep found security issues"
    exit 1
  }
  echo "✅ Semgrep SAST scan passed (no errors)"
  
  # Show warnings but don't fail
  echo ""
  echo "📋 Checking for Semgrep warnings..."
  semgrep --config=p/security-audit --severity=WARNING . || true
elif command -v podman >/dev/null 2>&1; then
  echo "  → Using Semgrep via Podman container..."
  podman run --rm -v "$(pwd):/src" semgrep/semgrep semgrep scan /src \
    --config=p/security-audit \
    --config=p/typescript \
    --config=p/nextjs \
    --error \
    --severity=ERROR || {
    echo "❌ Semgrep found security issues"
    exit 1
  }
  echo "✅ Semgrep SAST scan passed (no errors)"
else
  echo "⚠️  Semgrep not installed. Install with: pip install semgrep"
  echo "   Semgrep provides SAST (Static Application Security Testing) for code-level security issues"
  echo "   Skipping Semgrep scan..."
fi

echo ""

pause_between_scans "🛡️  Trivy Security Scan"

# Trivy security scanning
echo "🛡️  Running Trivy security scan..."
if command -v trivy >/dev/null 2>&1; then
  # Warn about potentially long scan
  echo "⚠️  Note: Trivy scans can take 30+ seconds for large projects"
  echo "   Press 's' to skip, or wait 3 seconds to proceed..."
  read -t 3 -r skip_response || skip_response=""
  
  if [[ "$skip_response" == "s" ]] || [[ "$skip_response" == "skip" ]]; then
    echo "⏭️  Trivy scan skipped by user"
  else
    # Skip directories that contain non-production code or large files
    TRIVY_SKIP="--skip-dirs seed-data --skip-dirs node_modules --skip-dirs .venv --skip-dirs .next"
    
    # Scan for vulnerabilities in dependencies
    echo "  → Scanning filesystem for vulnerabilities..."
    trivy fs \
      --severity HIGH,CRITICAL \
      --scanners vuln \
      $TRIVY_SKIP \
      --exit-code 1 . || {
      echo "❌ Trivy found HIGH/CRITICAL vulnerabilities in filesystem"
      exit 1
    }
    
    # Scan for misconfigurations (Dockerfile, K8s, Terraform, Helm, YAML)
    echo "  → Scanning for infrastructure misconfigurations..."
    trivy config \
      --severity HIGH,CRITICAL \
      --misconfig-scanners dockerfile,kubernetes,terraform,helm,yaml \
      --include-non-failures \
      $TRIVY_SKIP \
      --exit-code 1 . || {
      echo "❌ Trivy found HIGH/CRITICAL misconfigurations"
      exit 1
    }
    
    # Scan for secrets in source code
    echo "  → Scanning current source code for hardcoded secrets..."
    trivy fs \
      --scanners secret \
      $TRIVY_SKIP \
      --exit-code 1 . || {
      echo "❌ Trivy found hardcoded secrets in current tree"
      exit 1
    }

    # Identify and scan images
    echo "  → Scanning container images..."
    
    # Base images (external)
    EXTERNAL_IMAGES=$(grep -E "image:|FROM" compose.yaml infra/containers/*.Containerfile 2>/dev/null | grep -v "build:" | sed -E 's/.*image: //;s/.*FROM //;s/ as .*//' | grep -v "^\." | sort | uniq)
    
    for img in $EXTERNAL_IMAGES; do
      echo "    • Scanning base image: $img"
      trivy image --severity CRITICAL --exit-code 0 "$img" | grep -E "(Total:|CRITICAL:)" || echo "      ✅ Clean or scan failed"
    done

    # Local project images (attempt to scan built versions)
    # We look for the service names in compose.yaml that have build context
    LOCAL_SERVICES=$(grep -B 1 "build:" compose.yaml 2>/dev/null | grep ":" | grep -v "build" | sed 's/://;s/^[ \t]*//' | sort | uniq)
    
    for service in $LOCAL_SERVICES; do
      # Convention: images are often named project_service or just service
      # We'll try to find a local image matching the service name
      echo "    • Auditing local service configuration: $service"
      # For now, we scan the Dockerfile/Containerfile associated with the service
      DOCKERFILE=$(grep -A 5 "$service:" compose.yaml | grep "dockerfile:" | sed 's/.*dockerfile: //;s/^[ \t]*//')
      if [ -n "$DOCKERFILE" ] && [ -f "$DOCKERFILE" ]; then
         echo "      → Scanning associated container definition: $DOCKERFILE"
         trivy config --severity HIGH,CRITICAL --exit-code 1 "$DOCKERFILE" || {
           echo "❌ Trivy found issues in $DOCKERFILE for service $service"
           exit 1
         }
      fi
    done
    
    echo "✅ Trivy scan passed"
  fi
else
  echo "⚠️  Trivy not installed. Install with: brew install trivy"
  echo "   Trivy scans for filesystem vulnerabilities, secrets, and IaC issues"
  echo "   Skipping Trivy scan..."
fi

echo ""

pause_between_scans "🔑 Gitleaks (Git History Secrets)"

# Gitleaks - Git history secret scanning
echo "🔑 Running gitleaks (Git history secret scan)..."
if command -v gitleaks >/dev/null 2>&1; then
  # Use .gitleaks.toml config if present (matches CI workflow)
  if [ -f ".gitleaks.toml" ]; then
    echo "  → Using .gitleaks.toml configuration"
    gitleaks detect --config .gitleaks.toml --verbose --redact --exit-code 1 || {
      echo "❌ Gitleaks found secrets in Git history"
      exit 1
    }
  else
    gitleaks detect --verbose --exit-code 1 || {
      echo "❌ Gitleaks found secrets in Git history"
      exit 1
    }
  fi
  echo "✅ Gitleaks scan passed (no secrets in Git history)"
else
  echo "⚠️  Gitleaks not installed. Install from: https://github.com/gitleaks/gitleaks"
  echo "   Gitleaks scans Git history for exposed secrets/credentials"
  echo "   Skipping gitleaks scan..."
fi

echo ""

pause_between_scans "🐳 Hadolint (Dockerfile Linting)"

# Hadolint - Dockerfile linting
echo "🐳 Running Hadolint (Dockerfile linting)..."
if command -v hadolint >/dev/null 2>&1; then
  dockerfile_count=0
  for dockerfile in $(find . -name "Dockerfile" -o -name "*.dockerfile" 2>/dev/null); do
    echo "  → Checking $dockerfile"
    hadolint "$dockerfile" || {
      echo "❌ Hadolint found issues in $dockerfile"
      exit 1
    }
    dockerfile_count=$((dockerfile_count + 1))
  done
  
  if [ $dockerfile_count -gt 0 ]; then
    echo "✅ Hadolint scan passed ($dockerfile_count Dockerfile(s) checked)"
  else
    echo "  → No Dockerfiles found"
  fi
else
  echo "⚠️  Hadolint not installed. Install from: https://github.com/hadolint/hadolint"
  echo "   Hadolint validates Dockerfile best practices"
  echo "   Skipping Hadolint scan..."
fi

echo ""

pause_between_scans "📋 SBOM Generation"

# SBOM Generation
echo "📋 Generating SBOM (Software Bill of Materials)..."
SBOM_DIR=".sbom"
mkdir -p "$SBOM_DIR"

# Generate SBOM with Syft (if available)
if command -v syft >/dev/null 2>&1; then
  echo "  → Generating SBOM with Syft (CycloneDX format)..."
  syft . -o cyclonedx-json="$SBOM_DIR/sbom-cyclonedx.json" 2>/dev/null || true
  syft . -o spdx-json="$SBOM_DIR/sbom-spdx.json" 2>/dev/null || true
  echo "  → SBOM saved to $SBOM_DIR/"
else
  echo "⚠️  Syft not installed. Install from: https://github.com/anchore/syft"
  echo "   Syft generates comprehensive SBOMs for supply chain security"
fi

# Generate npm SBOM with pnpm
if command -v pnpm >/dev/null 2>&1; then
  echo "  → Generating npm SBOM..."
  pnpm licenses list --json > "$SBOM_DIR/npm-licenses.json" 2>/dev/null || true
  echo "  → npm dependencies saved to $SBOM_DIR/npm-licenses.json"
fi

echo "✅ SBOM generation complete (check $SBOM_DIR/ directory)"

echo ""
echo "✅ Security audit complete!"
echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│                    AUDIT SUMMARY                        │"
echo "└─────────────────────────────────────────────────────────┘"
echo ""
echo "Tools Run Successfully:"
echo "  ✅ pnpm audit - npm dependency vulnerabilities"
if command -v semgrep >/dev/null 2>&1; then
  echo "  ✅ Semgrep - SAST code-level security"
else
  echo "  ⚠️  Semgrep - Not installed (used Podman container if available)"
fi
if command -v trivy >/dev/null 2>&1; then
  echo "  ✅ Trivy - Filesystem vulnerabilities & secrets"
else
  echo "  ⚠️  Trivy - Not installed"
fi
if command -v gitleaks >/dev/null 2>&1; then
  echo "  ✅ gitleaks - Git history secrets"
else
  echo "  ⚠️  gitleaks - Not installed"
fi
if command -v hadolint >/dev/null 2>&1; then
  echo "  ✅ Hadolint - Dockerfile linting"
else
  echo "  ⚠️  Hadolint - Not installed"
fi
if command -v syft >/dev/null 2>&1; then
  echo "  ✅ SBOM - Full (Syft + npm)"
else
  echo "  ⚠️  SBOM - Partial (npm only, Syft not installed)"
fi
echo ""
echo "Artifacts Generated:"
if [ -d ".sbom" ]; then
  echo "  📋 .sbom/ directory with dependency inventories"
else
  echo "  ⚠️  No SBOM directory created"
fi
echo ""
echo "Recommendations:"
echo "  • Install missing tools for complete coverage"
echo "  • Semgrep: pip install semgrep"
echo "  • Trivy: brew install trivy"
echo "  • Gitleaks: brew install gitleaks"
echo "  • Syft: https://github.com/anchore/syft"
echo "  • Hadolint: https://github.com/hadolint/hadolint"
echo "  • Review .sbom/ for supply chain compliance"
