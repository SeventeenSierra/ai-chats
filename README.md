# Gemini Oracle

A pnpm monorepo for importing, exploring, and analyzing your Google Gemini conversation exports.

## Architecture

| Package | Description |
|---------|-------------|
| `ai-chat--web` | Next.js 16 frontend |
| `ai-chat--backend` | PostgreSQL + S3 storage operations |
| `ai-chat--services` | Genkit AI flows |
| `ai-chat--middleware` | Shared types and schemas |
| `ai-chat--infra` | Docker, database migrations |
| `ai-chat--docs` | Documentation |
| `ai-chat--tests` | Test suite (Vitest) |
| `ai-chat--seed-data` | Demo conversation data |

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Database**: PostgreSQL (via Podman)
- **Storage**: Garage (S3-compatible, via Podman)
- **AI**: Genkit with Google AI
- **Package Manager**: pnpm

## Getting Started

```bash
# Start infrastructure
podman-compose up -d postgres garage

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Core Workflow

1. **Import**: Upload your Gemini export (XML). Files are split and stored in S3.
2. **Browse**: View conversations in the Explorer with metadata extraction.
3. **AI Processing**: Generate summaries and categorize conversations.
4. **Export**: Download as Markdown for Obsidian.
