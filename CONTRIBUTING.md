# Contributing to Gemini Oracle

Thank you for your interest in contributing to Gemini Oracle! We welcome contributions from the community to help improve this project.

## Development Process

1.  **Fork and Clone**: Fork the repository and clone it locally.
2.  **Environment Setup**: We use Nix for a reproducible development environment. Run `nix develop` to enter the shell.
3.  **Dependencies**: Run `pnpm install` to install dependencies.
4.  **Branching**: Create a feature branch for your changes using standard prefixes:
    *   `feat/`: New features (e.g., `feat/user-auth`)
    *   `fix/`: Bug fixes (e.g., `fix/login-error`)
    *   `chore/`: Maintenance (e.g., `chore/dependency-updates`)
    *   `docs/`, `infra/`, `refactor/`, `style/`, `test/`, `ci/`, `build/`, `revert/`
    *   *Note: Pre-commit hooks will validate your branch name.*
5.  **Coding Standards**:
    *   We use **Biome** for linting and formatting. Run `pnpm lint` and `pnpm format` before committing.
    *   Follow the **Conventional Commits** specification for commit messages.
    *   Sign off on all commits (DCO) using `git commit -s`.
6.  **Git Hooks**:
    *   **Pre-commit**: Validates branch name, runs linting and typechecking. (Fast)
    *   **Pre-push**: Runs full build, security audit (npm audit, Semgrep, Trivy, Gitleaks, Hadolint), and SBOM generation. (Strict)
    *   *Tip: You can skip hooks with `git commit --no-verify` or `git push --no-verify` in emergencies, but CI will likely fail.*
7.  **Testing**: Run `pnpm test` to ensure tests pass.
8.  **Pull Request**: Open a Pull Request against the `main` branch.

## Licensing

This project uses a split licensing model:
*   **Web App & Shared Code**: AGPL-3.0-or-later (Open Source)
*   **Backend, AI, & Infrastructure**: PolyForm Strict 1.0.0 (Source Available, Non-Commercial)
*   **Documentation**: CC-BY-SA-4.0

Please ensure you understand these licenses before contributing. By contributing, you agree that your contributions will be licensed under the appropriate license for the component you are modifying.

## Developer Certificate of Origin (DCO)

All contributions must include a `Signed-off-by` line to certify that you wrote the code or have the right to contribute it. See the [DCO](DCO) file for details.
