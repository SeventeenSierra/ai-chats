import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'

test.describe
	.serial('E2E: Import All Conversations', () => {
		const SEEDS_DIR = path.resolve(__dirname, '../fixtures/seeds')
		const files = fs
			.readdirSync(SEEDS_DIR)
			.filter((f) => f.endsWith('.xml'))
			.sort()

		test.beforeAll(async ({ browser }) => {
			const page = await browser.newPage({ baseURL: 'http://localhost:3000' })

			console.log('Setup: Wiping Data...')
			await page.goto('/explorer')
			await page.waitForLoadState('domcontentloaded')

			await page.getByRole('button', { name: 'Settings' }).click()
			await page.getByRole('menuitem', { name: 'Wipe Data' }).click()
			await page.getByRole('button', { name: 'Continue' }).click()
			await page.waitForTimeout(2000)

			await page.close()
		})

		test('Mass Import & Verify', async ({ page }) => {
			// Increase timeout for mass import
			test.setTimeout(files.length * 30000 + 60000)

			await page.goto('/explorer')

			for (const file of files) {
				console.log(`Importing ${file}...`)
				const filePath = path.join(SEEDS_DIR, file)

				// Upload
				const fileInput = page.locator('input[type="file"]')
				await fileInput.setInputFiles(filePath)

				// Wait for "Import Complete"
				await expect(page.getByText('Import Complete').first()).toBeVisible({ timeout: 60000 })

				// Wait a bit for list refresh (though new SidebarUpload should do it)
				await page.waitForTimeout(1000)
			}

			console.log(`Successfully imported ${files.length} files. Verifying count...`)

			// Go to Dashboard to check total count
			await page.goto('/dashboard')
			await page.waitForLoadState('domcontentloaded')

			// Check "Total Conversations" card
			// Structure: CardTitle "Total Conversations" -> sibling CardContent -> div text
			// Or simplified: find text matching the count.

			// We expect `files.length` (15) conversations.
			await expect(page.getByText(`${files.length}`, { exact: false })).toBeVisible({
				timeout: 30000,
			})
			console.log('Verification Complete: Dashboard shows correct count.')
		})
	})
