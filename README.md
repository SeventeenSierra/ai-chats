# Gemini Oracle

A pnpm monorepo for importing, exploring, and analyzing your Google Gemini conversation exports.

## Architecture

| Package | Description |
|---------|-------------|
| `ai-chat--web` | Next.js 16 frontend |
| `ai-chat--backend` | SQLite + Local storage operations |
| `ai-chat--services` | Genkit AI flows |
| `ai-chat--middleware` | Shared types and schemas |
| `ai-chat--docs` | Documentation |
| `ai-chat--tests` | Test suite (Vitest) |
| `ai-chat--seed-data` | Demo conversation data |

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Database**: SQLite (better-sqlite3)
- **Storage**: Local Filesystem
- **AI**: Genkit with Google AI
- **Package Manager**: pnpm

## Getting Started

```bash
# Install dependencies (requires Nix environment)
nix develop --command pnpm install

# Run development server
nix develop --command pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Core Workflow

1. **Import**: Upload your Gemini export (XML). Files are split and stored in S3.
2. **Browse**: View conversations in the Explorer with metadata extraction.
3. **AI Processing**: Generate summaries and categorize conversations.
4. **Export**: Download as Markdown for Obsidian.
