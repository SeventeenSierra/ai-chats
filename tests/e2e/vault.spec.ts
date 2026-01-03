// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(__dirname, '..', 'fixtures')

// Helper to upload the demo file and wait for processing
async function uploadAndWaitForConversations(page: Page) {
    const demoFile = path.join(fixturesDir, 'demo-export.xml')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(demoFile)

    // Wait for the conversations count to show 14
    await expect(page.getByText(/Conversations \(14\)/i)).toBeVisible({ timeout: 120000 })
}

test.describe('Vault Operations', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/vault')
        await expect(page).toHaveTitle(/Gemini Oracle/)
    })

    test('should select and view a conversation', async ({ page }) => {
        await uploadAndWaitForConversations(page)

        // Click on a conversation in the sidebar
        await page.getByText('Getting Started with TypeScript').first().click()

        // The main content area should show the conversation view
        await expect(page.locator('main')).toContainText('Getting Started with TypeScript')
    })

    test('should fetch all transcripts', async ({ page }) => {
        await uploadAndWaitForConversations(page)

        // Click "Fetch All Transcripts" button in sidebar
        const fetchAllBtn = page.getByRole('button', { name: /Fetch All Transcripts/i })
        await expect(fetchAllBtn).toBeVisible()
        await fetchAllBtn.click()

        // Wait for transcripts to be fetched - the fetch buttons should disappear
        await expect(page.getByTestId('fetch-transcript-btn')).toHaveCount(0, { timeout: 120000 })
    })

    test('should wipe all data', async ({ page }) => {
        await uploadAndWaitForConversations(page)

        // Open the more menu
        await page.getByRole('button', { name: /open menu/i }).click()

        // Click wipe data
        await page.getByRole('menuitem', { name: /wipe data/i }).click()

        // Confirm the wipe
        await page.getByRole('button', { name: /continue/i }).click()

        // Wait for wipe to complete - should show "No conversations yet"
        await expect(page.getByText(/No conversations yet/i)).toBeVisible({ timeout: 15000 })
    })
})
