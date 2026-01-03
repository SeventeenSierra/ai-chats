import { test, expect } from '@playwright/test';

/**
 * Critical Flow: Import & Process
 * 
 * This test verifies the complete import pipeline:
 * 1. Upload a file via the UploadZone
 * 2. Wait for processing to complete
 * 3. Verify conversations appear with proper transcript structure
 */
test.describe('Critical Flow: Import & Process', () => {

    test('User can upload XML export and see conversations with transcript content', async ({ page }) => {
        test.setTimeout(180000); // Allow 3 minutes for full processing

        // 1. Navigate to the Vault
        await page.goto('/vault');

        // 2. Verify we're on the vault page with the UploadZone
        await expect(page.getByText('Welcome to The Vault')).toBeVisible();
        await expect(page.getByText('Drag & drop your Gemini export file')).toBeVisible();

        // 3. Upload file via the UploadZone
        const seedFilePath = '/Users/afla/Documents/Code/ai-chats/seed-data/alyssa@seventeensierra.com-uoU3kL.xml';

        // Set file directly on the hidden input
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(seedFilePath);

        // 4. Wait for processing to start and show progress
        // The UploadZone should show "Splitting..." or "Processing..." or "Fetching..."
        await expect(page.getByText(/Splitting|Processing|Fetching/i)).toBeVisible({ timeout: 10000 });

        // 5. Wait for processing to complete
        // The UploadZone should show progress, then either complete or conversations appear
        // Wait for the progress indicator to disappear (processing done)
        await page.waitForFunction(
            () => !document.body.textContent?.match(/Splitting|Processing|Fetching/i),
            { timeout: 120000 }
        );

        // 6. Verify conversations were imported
        // We should see at least one conversation in the sidebar
        // The sidebar shows conversation list items as buttons
        const conversationList = page.locator('button:has(p.truncate)'); // Buttons with truncated title
        await expect(conversationList.first()).toBeVisible({ timeout: 30000 });

        // 7. Count conversations (should be > 0)
        const count = await conversationList.count();
        expect(count).toBeGreaterThan(0);
        console.log(`Found ${count} conversations after import`);

        // 8. Click on a conversation to view it
        await conversationList.first().click();

        // 9. Verify TRANSCRIPT CONTENT is visible (not just metadata)
        // The ConversationView should render ReactMarkdown content in .prose divs
        await expect(page.locator('.prose').first()).toBeVisible({ timeout: 10000 });

        // 10. Verify we see actual content - either in TurnView (.prose) or StagedConversationPreview
        // At minimum, we should see "First Prompt" or "First Response" or user/model turns
        const hasContent = await Promise.race([
            page.getByText('First Prompt').isVisible().catch(() => false),
            page.locator('.prose p, .prose h1, .prose h2, .prose li').first().isVisible().catch(() => false),
        ]);
        expect(hasContent).toBeTruthy();
    });

    test('Transcript structure has proper parts array', async ({ page, request }) => {
        // This test verifies the API returns correct transcript structure
        // It assumes conversations already exist from a previous run or seed data

        // 1. Fetch the vault to get conversation IDs
        const vaultResponse = await request.get('/api/vault');
        expect(vaultResponse.ok()).toBeTruthy();

        const vaultData = await vaultResponse.json();
        const conversations = vaultData.conversations || [];

        // Skip if no conversations
        if (conversations.length === 0) {
            test.skip(true, 'No conversations available to test');
            return;
        }

        // 2. Fetch a conversation with transcript
        const convoId = conversations[0].id;
        const convoResponse = await request.get(`/api/conversations/${convoId}`);
        expect(convoResponse.ok()).toBeTruthy();

        const conversation = await convoResponse.json();

        // 3. Verify transcript structure
        if (conversation.transcript) {
            expect(Array.isArray(conversation.transcript)).toBeTruthy();
            expect(conversation.transcript.length).toBeGreaterThan(0);

            // Each turn should have: author, parts
            const firstTurn = conversation.transcript[0];
            expect(firstTurn).toHaveProperty('author');
            expect(['user', 'model']).toContain(firstTurn.author);
            expect(firstTurn).toHaveProperty('parts');
            expect(Array.isArray(firstTurn.parts)).toBeTruthy();

            // Each part should have: content
            if (firstTurn.parts.length > 0) {
                expect(firstTurn.parts[0]).toHaveProperty('content');
                expect(typeof firstTurn.parts[0].content).toBe('string');
            }
        } else {
            // If no transcript, at least firstPrompt/firstResponse should exist
            expect(conversation.firstPrompt || conversation.firstResponse).toBeTruthy();
        }
    });
});
