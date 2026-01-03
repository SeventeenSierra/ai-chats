# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

FROM dxflrs/garage:v1.0.1

# Run as non-root user (UID 65534 is 'nobody' - common for unprivileged containers)
# Note: Garage is a scratch image, so no user management commands available
USER 65534

# Note: Garage is a scratch image (no shell/tools), so HEALTHCHECK cannot be added here.
# Health checks are handled at the orchestration layer (compose.yaml/K8s).
# trivy:ignore:AVD-DS-0026 scratch images cannot have shell-based healthchecks
HEALTHCHECK NONE

LABEL org.opencontainers.image.source="https://github.com/seventeensierra/ai-chats"
LABEL org.opencontainers.image.description="Garage S3 Storage for Gemini Oracle"
