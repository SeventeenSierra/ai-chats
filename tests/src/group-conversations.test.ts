import { describe, expect, test, vi } from 'vitest'
import { ai } from '../../ai/src/core/openai'
import { categorizeSingleConversation } from '../../ai/src/flows/group-conversations'

// Mock the OpenAI client
vi.mock('../../ai/src/core/openai', () => ({
	ai: {
		chat: {
			completions: {
				create: vi.fn(),
			},
		},
	},
	model: 'test-model',
}))

describe('categorizeSingleConversation', () => {
	test('should prioritize summary over title when provided', async () => {
		// Mock a response that reflects understanding of the summary
		const mockCreate = ai.chat.completions.create as any
		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: 'Programming',
					},
				},
			],
		})

		const result = await categorizeSingleConversation({
			conversation: {
				id: '1',
				title: 'How to bake a cake', // Misleading title
				summary: 'Debugging a Python API issue', // Clear summary
			},
			existingCategories: ['Cooking', 'Programming'],
		})

		expect(result.category).toBe('Programming')

		// Verify the prompt contained the summary
		const callArgs = mockCreate.mock.calls[0][0]
		expect(callArgs.messages[0].content).toContain('Debugging a Python API issue')
	})

	test('should fallback to title if no summary provided', async () => {
		const mockCreate = ai.chat.completions.create as any
		mockCreate.mockResolvedValueOnce({
			choices: [
				{
					message: {
						content: 'Cooking',
					},
				},
			],
		})

		const result = await categorizeSingleConversation({
			conversation: {
				id: '2',
				title: 'How to bake a cake',
			},
			existingCategories: ['Cooking', 'Programming'],
		})

		expect(result.category).toBe('Cooking')
	})
})
