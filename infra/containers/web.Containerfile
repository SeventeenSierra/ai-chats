# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

# Development Containerfile for Gemini Oracle Next.js web application
FROM node:22-bullseye-slim

# Set working directory
WORKDIR /app

# Install curl for health checks and pnpm
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    npm install -g pnpm@10.27.0 && \
    rm -rf /var/lib/apt/lists/*

# Ensure permissions for node user
RUN mkdir -p /app && chown -R node:node /app

USER node

# Copy workspace configuration
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package descriptors for dependency installation
COPY --chown=node:node apps/ai-chats/package.json ./apps/ai-chats/
COPY --chown=node:node shared/package.json ./shared/
COPY --chown=node:node backend/package.json ./backend/
COPY --chown=node:node ai/package.json ./ai/
COPY --chown=node:node infra/package.json ./infra/
COPY --chown=node:node tests/package.json ./tests/
COPY --chown=node:node seed-data/package.json ./seed-data/

# Install dependencies with strict memory limits (filtered to web app)
RUN pnpm install --frozen-lockfile --network-concurrency 1 --filter @ai-chat/ai-chats...

# Copy source code
COPY --chown=node:node . .

# Set working directory to the web app
WORKDIR /app/apps/ai-chats

# Expose port
EXPOSE 3000

# Set environment variables for development
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Start development server
CMD ["pnpm", "dev"]
