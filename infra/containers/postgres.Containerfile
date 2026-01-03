# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

# Using Chainguard's secure-by-default PostgreSQL image (0 CVEs)
# https://images.chainguard.dev/directory/image/postgres/overview
# Note: Version-specific tags require paid Chainguard subscription
# trivy:ignore:AVD-DS-0001 Chainguard free tier only offers 'latest' tag
# hadolint ignore=DL3007
FROM cgr.dev/chainguard/postgres:latest

# Run as non-root postgres user
USER postgres

# Health check for PostgreSQL
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD pg_isready -U postgres || exit 1

LABEL org.opencontainers.image.source="https://github.com/seventeensierra/ai-chats"
LABEL org.opencontainers.image.description="PostgreSQL for Gemini Oracle (Chainguard secure image)"
