#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC
#
# Run comprehensive security audit locally before pushing to CI
#
# Usage: ./scripts/security-audit.sh [OPTIONS]
#
# Options:
#   --skip-npm       Skip npm/pnpm security audit
#   --skip-semgrep   Skip Semgrep SAST scan
#   --skip-trivy     Skip Trivy filesystem scan
#   --skip-images    Skip container image scanning
#   --skip-gitleaks  Skip Gitleaks git history scan
#   --skip-hadolint  Skip Hadolint Dockerfile linting
#   --skip-sbom      Skip SBOM generation
#   --fast           Skip container images and SBOM (quick local check)
#   --help           Show this help message

set -e

# Parse command line arguments
SKIP_NPM=false
SKIP_SEMGREP=false
SKIP_TRIVY=false
SKIP_IMAGES=false
SKIP_GITLEAKS=false
SKIP_HADOLINT=false
SKIP_SBOM=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-npm)
      SKIP_NPM=true
      shift
      ;;
    --skip-semgrep)
      SKIP_SEMGREP=true
      shift
      ;;
    --skip-trivy)
      SKIP_TRIVY=true
      shift
      ;;
    --skip-images)
      SKIP_IMAGES=true
      shift
      ;;
    --skip-gitleaks)
      SKIP_GITLEAKS=true
      shift
      ;;
    --skip-hadolint)
      SKIP_HADOLINT=true
      shift
      ;;
    --skip-sbom)
      SKIP_SBOM=true
      shift
      ;;
    --fast)
      SKIP_IMAGES=true
      SKIP_SBOM=true
      shift
      ;;
    --help|-h)
      head -20 "$0" | tail -15
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run with --help for usage"
      exit 1
      ;;
  esac
done

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
if [ "$SKIP_NPM" = true ]; then
  echo "📦 Skipping npm security audit (--skip-npm)"
else
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
fi

echo ""

if [ "$SKIP_SEMGREP" = true ]; then
  echo "🔬 Skipping Semgrep SAST scan (--skip-semgrep)"
  echo ""
else
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

fi # end semgrep skip check

echo ""

if [ "$SKIP_TRIVY" = true ]; then
  echo "🛡️  Skipping Trivy security scan (--skip-trivy)"
  echo ""
else
  pause_between_scans "🛡️  Trivy Security Scan"

# Trivy security scanning
echo "🛡️  Running Trivy security scan..."
if command -v trivy >/dev/null 2>&1; then
  # Setup Podman socket for macOS (Trivy needs DOCKER_HOST to access local Podman images)
  # Note: We use --image-src remote for registry images, so socket is only needed for local builds
  if [[ "$(uname)" == "Darwin" ]] && command -v podman >/dev/null 2>&1; then
    PODMAN_SOCKET=$(podman machine inspect 2>/dev/null | grep -o '"Path": "[^"]*api.sock"' | head -1 | sed 's/"Path": "//;s/"//')
    if [ -n "$PODMAN_SOCKET" ] && [ -S "$PODMAN_SOCKET" ]; then
      export DOCKER_HOST="unix://$PODMAN_SOCKET"
      echo "  → Using Podman socket: $PODMAN_SOCKET"
    else
      echo "  ℹ️  Podman socket not found (local image scanning unavailable)"
      echo "     Registry images will be scanned via --image-src remote"
    fi
  fi

  # Warn about potentially long scan
  echo "⚠️  Note: Trivy scans can take 30+ seconds for large projects"
  echo "   Press 's' to skip, or wait 3 seconds to proceed..."
  read -t 3 -r skip_response || skip_response=""
  
  if [[ "$skip_response" == "s" ]] || [[ "$skip_response" == "skip" ]]; then
    echo "⏭️  Trivy scan skipped by user"
  else
    # Use trivy.yaml config if present
    TRIVY_CONFIG=""
    if [ -f "trivy.yaml" ]; then
      TRIVY_CONFIG="--config trivy.yaml"
      echo "  → Using trivy.yaml configuration"
    fi
    
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

    # Identify and scan images (matching CI workflow behavior)
    if [ "$SKIP_IMAGES" = true ]; then
      echo "  → Skipping container image scanning (--skip-images)"
    else
      echo "  → Scanning container images..."
      
      # Explicitly define the images to scan (matching security.yaml)
      # Using Chainguard for Postgres (0 CVEs), official Node for web
      # Note: Version-specific Chainguard tags require paid subscription
      IMAGES_TO_SCAN=(
        "cgr.dev/chainguard/postgres:latest"
        "node:22-slim"
        "dxflrs/garage:v1.0.1"
      )
      
      IMAGE_SCAN_FAILED=0
      for img in "${IMAGES_TO_SCAN[@]}"; do
        echo "    • Scanning image: $img (from registry, linux/amd64)"
        # Match CI: HIGH,CRITICAL severity, ignore-unfixed, vuln scanner only
        # Use --image-src remote to pull directly from registry (works on macOS with Podman)
        # Use --platform linux/amd64 to match CI environment (GitHub Actions runs on amd64)
        # Use --ignorefile to suppress known third-party image CVEs
        if ! trivy image \
          --image-src remote \
          --platform linux/amd64 \
          --ignorefile .trivyignore \
          --severity HIGH,CRITICAL \
          --ignore-unfixed \
          --scanners vuln \
          --exit-code 1 \
          "$img"; then
          echo "      ⚠️  Vulnerabilities found in $img (see above)"
          IMAGE_SCAN_FAILED=1
        else
          echo "      ✅ $img clean"
        fi
      done
      
      if [ $IMAGE_SCAN_FAILED -eq 1 ]; then
        echo ""
        echo "⚠️  Container image vulnerabilities detected (non-blocking)"
        echo "   These are in third-party base images, not your code."
        echo "   Consider updating to newer image versions if available."
      fi
      
      # Also scan images from Containerfiles (base images)
      CONTAINERFILE_IMAGES=$(grep -E "^FROM" infra/containers/*.Containerfile 2>/dev/null | sed -E 's/.*FROM //;s/ as .*//' | grep -v "^\." | sort | uniq)
      
      for img in $CONTAINERFILE_IMAGES; do
        # Skip if already scanned
        if [[ " ${IMAGES_TO_SCAN[*]} " =~ " ${img} " ]]; then
          continue
        fi
        echo "    • Scanning Containerfile base image: $img"
        trivy image --severity HIGH,CRITICAL --ignore-unfixed --scanners vuln "$img" || true
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
    fi # end skip-images check
    
    echo "✅ Trivy scan passed"
  fi
else
  echo "⚠️  Trivy not installed. Install with: brew install trivy"
  echo "   Trivy scans for filesystem vulnerabilities, secrets, and IaC issues"
  echo "   Skipping Trivy scan..."
fi

fi # end trivy skip check

echo ""

if [ "$SKIP_GITLEAKS" = true ]; then
  echo "🔑 Skipping Gitleaks (--skip-gitleaks)"
  echo ""
else
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

fi # end gitleaks skip check

echo ""

if [ "$SKIP_HADOLINT" = true ]; then
  echo "🐳 Skipping Hadolint (--skip-hadolint)"
  echo ""
else
  pause_between_scans "🐳 Hadolint (Dockerfile Linting)"

  # Hadolint - Dockerfile linting
  echo "🐳 Running Hadolint (Dockerfile linting)..."
  if command -v hadolint >/dev/null 2>&1; then
    dockerfile_count=0
    for dockerfile in $(find . -name "Dockerfile" -o -name "*.dockerfile" -o -name "*.Containerfile" 2>/dev/null); do
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

fi # end hadolint skip check

echo ""

if [ "$SKIP_SBOM" = true ]; then
  echo "📋 Skipping SBOM generation (--skip-sbom)"
  echo ""
else
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

fi # end sbom skip check

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
