// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import OpenAI from 'openai'

// Initialize OpenAI client pointing to local Llama instance
export const ai = new OpenAI({
	baseURL: process.env.AI_BASE_URL || 'http://localhost:11434/v1',
	apiKey: process.env.AI_API_KEY || 'ollama', // Ollama doesn't strictly need this, but OpenAI client does
})

export const model = process.env.AI_MODEL || 'llama3:latest'
