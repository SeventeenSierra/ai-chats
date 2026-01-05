import path from 'node:path'
import { type BrowserContext, expect, type Page, test } from '@playwright/test'

// Serial mode ensures tests run in order and can share state (the page).
test.describe
	.serial('E2E: Data Pipeline Stages', () => {
		const FIXTURE_PATH = path.resolve(
			__dirname,
			'../fixtures/seeds/01-go-web-components-and-secure-development.xml',
		)
		let page: Page
		let context: BrowserContext

		test.beforeAll(async ({ browser }) => {
			// Create a persistent context and page for the series of steps
			context = await browser.newContext({ baseURL: 'http://localhost:3000' })
			page = await context.newPage()

			// 0. Clean Slate
			console.log('Setup: Wiping Data...')
			await page.goto('/explorer')
			// Handle "Open Menu" - might be blocked by welcome screen?
			// Wait for sidebar/header to be ready
			await page.waitForLoadState('domcontentloaded')

			// Sometimes wipes are flaky if menu animation is slow
			await page.getByRole('button', { name: /open menu/i }).click()
			await page.getByRole('menuitem', { name: 'Wipe Data' }).click()
			await page.getByRole('button', { name: 'Continue' }).click()
			await page.waitForTimeout(2000) // Wait for wipe
			await page.reload()
			console.log('Setup: Data Wiped.')
		})

		test.afterAll(async () => {
			await page.close()
			await context.close()
		})

		test('Stage 1: Ingestion (Upload & Auto-Enrich)', async () => {
			// --- Step 1: Upload & Initial Processing (Automated via Quick Import) ---
			await page.getByRole('button', { name: /open menu/i }).click()
			await page.getByRole('menuitem', { name: 'Quick Import' }).click()
			const fileInput = page.locator('input[type="file"]')
			await fileInput.setInputFiles(FIXTURE_PATH)
			await page.getByRole('button', { name: 'Upload & Process' }).click()

			// Wait for page reload and content to appear (Metadata extracted)
			// This validates "Stages 1-3" (Upload, Split, Process)
			await page.waitForLoadState('domcontentloaded')
			const titleLocator = page.getByText('Go, Web Components, and Secure Development')
			await expect(titleLocator).toBeVisible({ timeout: 60000 })
			console.log('Stage 1: Ingestion Complete.')
		})

		test('Stage 2: Summarization (AI)', async () => {
			test.setTimeout(300000) // 5 mins just for this step

			// --- Step 2: Verify Enriched Content (Summarization) ---
			const titleLocator = page.getByText('Go, Web Components, and Secure Development')
			await titleLocator.click()

			// Check for "Generate Summary" button (implies Transcript exists)
			const summaryBtn = page.getByRole('button', { name: 'Generate Summary' })
			await expect(summaryBtn).toBeVisible({ timeout: 10000 })

			// Trigger Summarization
			await summaryBtn.click()

			// Wait for Summary Generation
			// Using locator('p') inside the summary section
			await expect(page.getByText('AI Summary').locator('..').locator('p')).toBeVisible({
				timeout: 180000,
			})
			console.log('Stage 2: Summarization Complete.')
		})

		test('Stage 3: Categorization (AI)', async () => {
			test.setTimeout(300000) // 5 mins just for this step

			// --- Step 3: Categorization ---
			// Select via Checkbox in List
			await page
				.getByRole('checkbox', { name: 'Select Go, Web Components, and Secure Development' })
				.click()

			// Click Process (Categorize)
			await page.getByRole('button', { name: /Process \(1\)/ }).click()

			// Wait for Categorization (AI)
			// Verify Checkbox unchecked (Selection cleared)
			await expect(
				page.getByRole('checkbox', { name: 'Select Go, Web Components, and Secure Development' }),
			).not.toBeChecked({ timeout: 180000 })
			console.log('Stage 3: Categorization Complete.')
		})
	})
