# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

# Agent Rules for Gemini Oracle

## Mandatory Session Start

1. **Self-identify**: State your agent type and model
2. **Read context**: Check `.agent/session-context.md`
3. **Create session record** (if making changes)

## Commit Requirements

### Before Committing

Present this checklist to the human:

```markdown
## Pre-Commit Checklist

- [ ] Code compiles (`pnpm build`)
- [ ] Types check (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Tests pass (if applicable)
- [ ] Changes are documented

AI-Agent: [your-agent-name]
Human-Involvement: [full|reviewed|approved|automated]
```

### WAIT for human approval

Only humans run `git commit -s`. Never commit directly.

## Conventional Commit Format

```
<type>(<scope>): <subject>

<body>

AI-Agent: antigravity
Human-Involvement: reviewed
Signed-off-by: Name <email>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance
- `ci`: CI/CD changes

### Scopes (see GEMINI.md)

web, api, lib, ui, db, storage, deps, config, ci, docs

## AI Zones

Respect `.ai-zones.yaml`:

| Zone | Human Involvement |
|------|-------------------|
| 0 | Automated (lock files) |
| 1 | Approved (tests, docs) |
| 2 | Reviewed (source code) |
| 3 | Full (security, config) |

## Branch Strategy

All development work **must** happen on feature branches:

- Use branch format: `feature/<name>`, `fix/<name>`, `docs/<name>`
- Never commit directly to `main` or `develop`
- PRs required for merging to protected branches
- Feature branches should be deleted after merge
