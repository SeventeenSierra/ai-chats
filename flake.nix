# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

{
  description = "Gemini Oracle - Import, explore, and analyze Gemini conversation exports";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
      in
      {
        devShells.default = pkgs.mkShellNoCC {
          buildInputs = with pkgs; [
            # Node.js and pnpm
            nodejs_22
            pnpm
            tsx

            # Container runtime
            podman
            podman-compose

            # Code quality
            biome

            # E2E testing (Playwright)
            playwright

            # Secret detection & history cleaning
            gitleaks
            git-filter-repo

            # Local Workflow Runners & Security
            act
            trivy
            hadolint
            syft

            # Python for pip-based tools (semgrep)
            python313
            python313Packages.pip

            # Optional: TypeScript
            nodePackages.typescript
          ];

          shellHook = ''
            echo "🔮 Gemini Oracle Dev Environment"
            echo "Node: $(node --version)"
            echo "pnpm: $(pnpm --version)"

            export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock

            # Setup Python venv for pip packages (semgrep)
            if [ ! -d ".venv" ]; then
              python3 -m venv .venv
            fi
            source .venv/bin/activate
            pip install --quiet semgrep
            echo "✓ Semgrep $(semgrep --version 2>/dev/null | head -1 || echo 'installed')"

            # Favor podman-compose
            if command -v podman-compose > /dev/null; then
              alias docker-compose='podman-compose'
              echo "✓ Podman-native infrastructure"
            fi

            echo "💡 Run 'pnpm dev' to start the dev server"
            echo "💡 Run 'podman-compose up -d' for PostgreSQL/MinIO"
          '';
        };
      }
    );
}
