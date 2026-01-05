import path from 'node:path'
import { expect, test } from '@playwright/test'

test.describe('E2E: Full Application Flow', () => {
	// Use a unique fixture file for testing
	const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/originals/snippet_dl.xml')

	test.beforeEach(async ({ page }) => {
		// Go to Explorer - usage relative path to use baseURL from config
		await page.goto('/explorer')

		// Clean Slate: Wipe Data
		await page.getByRole('button', { name: /open menu/i }).click()
		await page.getByRole('menuitem', { name: 'Wipe Data' }).click()
		// Confirm Alert
		await page.getByRole('button', { name: 'Continue' }).click()
		// Wait for wipe to finish (menu closes or toast appears)
		await page.waitForTimeout(2000) // Wait for wipe action to complete
		await page.reload() // Reload to ensure clean state
	})

	// Helper to upload a file
	async function uploadFile(page: any) {
		await page.getByRole('button', { name: /open menu/i }).click()
		await page.getByRole('menuitem', { name: 'Quick Import' }).click()
		const fileInput = page.locator('input[type="file"]')
		await expect(fileInput).toBeVisible()
		await fileInput.setInputFiles(FIXTURE_PATH)
		await page.getByRole('button', { name: 'Upload & Process' }).click()
		await page.waitForLoadState('domcontentloaded')
		await expect(page.getByText('Go, Web Components, and Secure Development')).toBeVisible({
			timeout: 60000,
		})
	}

	test('should upload a file and see it appear', async ({ page }) => {
		await uploadFile(page)
	})

	test('should categorize a conversation', async ({ page }) => {
		// 1. Upload data first
		await uploadFile(page)

		// 2. Select the conversation
		await page
			.getByRole('checkbox', { name: 'Select Go, Web Components, and Secure Development' })
			.click()

		// 3. Click "Process"
		await page.getByRole('button', { name: /Process \(1\)/ }).click()

		// 4. Wait for processing to complete
		// We rely on the selection state clearing as the signal of completion
		// The toast might be missed due to timing or re-renders

		// 5. Verify Selection Cleared (indicates success/refresh)
		await expect(
			page.getByRole('checkbox', { name: 'Select Go, Web Components, and Secure Development' }),
		).not.toBeChecked({ timeout: 120000 })
	})
})
