// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { googleAI } from '@genkit-ai/googleai'
import { genkit } from 'genkit'

export const ai = genkit({
	plugins: [googleAI()],
})
