import { test, expect } from '@playwright/test';

test('Verify content display for conversations', async ({ page }) => {
    // Mock the explorer API response
    await page.route('/api/vault', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                categories: [{ name: 'Test Category', count: 1 }],
                conversations: [
                    {
                        id: 'test-convo-display',
                        title: 'Test Display Conversation',
                        category: 'Test Category',
                        createdAt: new Date().toISOString(),
                        turnCount: 16,
                        charCount: 1000,
                        status: 'processed',
                        hasRichContent: false,
                        firstPrompt: 'Hello',
                        firstResponse: 'Hi there',
                    }
                ]
            })
        });
    });

    // Mock individual conversation response
    await page.route('/api/conversations/test-convo-display', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'test-convo-display',
                title: 'Test Display Conversation',
                category: 'Test Category',
                createdAt: new Date().toISOString(),
                turnCount: 16,
                charCount: 1000,
                status: 'processed',
                hasRichContent: false,
                transcript: [
                    {
                        author: 'user',
                        parts: [{ type: 'text', content: 'This is the user content that should be visible.' }]
                    },
                    {
                        author: 'model',
                        parts: [{ type: 'text', content: 'This is the model content.' }]
                    }
                ]
            })
        });
    });

    // Navigate to explorer
    await page.goto('/vault');

    // Click the conversation
    await page.getByText('Test Display Conversation').click();

    // Verify turn count
    await expect(page.getByText('16 turn(s)')).toBeVisible();

    // Verify "Infinite" is NOT present
    await expect(page.getByText('Infinite')).not.toBeVisible();
    await expect(page.getByText('Infinity')).not.toBeVisible();

    // Verify content visibility
    await expect(page.getByText('This is the user content that should be visible.')).toBeVisible();
    await expect(page.getByText('This is the model content.')).toBeVisible();

    // Check for Author labels
    await expect(page.getByText('User', { exact: true })).toBeVisible();
    await expect(page.getByText('Model', { exact: true })).toBeVisible();
});
