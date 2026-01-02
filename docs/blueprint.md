# **App Name**: Gemini Oracle

## Core Features:

- Import Vault Data: Parse Gemini Vault export: Accepts a Gemini Vault export file (JSON format) and stores it in Google Cloud Storage due to its large size (over 30MB).
- Split Conversations: Conversation Splitting: Automatically split the imported data into individual conversation files based on conversation turns.
- Conversation UI: Conversation Viewer: Render a UI to browse conversations.
- Summarize conversations: Summary Generator: Tool to generate summaries of conversations to determine if the whole conversation should be downloaded. This summary can be presented in the Conversation UI
- Download to Obsidian: Markdown Export: Allow the user to download each conversation as a Markdown file, formatted for use in Obsidian.

## Style Guidelines:

- Primary color: Subtle light blue (#A7D1E8), reminiscent of clarity and focus.
- Background color: Clean, light gray (#F2F4F7), providing a neutral backdrop.
- Accent color: Soft lavender (#B1AEE8), drawing focus without overwhelming.
- Headline font: 'Space Grotesk' sans-serif, giving a tech-forward feel. Body Font: 'Inter' for a neutral, highly readable body.
- Code Font: 'Source Code Pro' monospace font for display of the original Gemini transcripts
- Minimal, outline-style icons for actions like "download," "summarize," and "export."
- Clean, card-based layout for displaying conversation snippets, and an expanded view when selected.