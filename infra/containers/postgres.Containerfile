# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

# trivy:ignore:AVD-DS-0002
FROM postgres:16-alpine

LABEL org.opencontainers.image.source="https://github.com/seventeensierra/ai-chats"
LABEL org.opencontainers.image.description="PostgreSQL 16 for Gemini Oracle"
