import { test, expect } from '@playwright/test';

test('should not infinitely fetch conversations when a conversation is selected', async ({ page }) => {
    // Mock the API response to ensure we have data to click
    await page.route('/api/vault', async route => {
        const json = {
            conversations: [
                {
                    id: '123',
                    title: 'Test Conversation',
                    createdAt: new Date().toISOString(),
                    status: 'active',
                    turnCount: 5,
                    charCount: 100,
                    category: 'Test Category',
                },
            ],
            categories: [{ id: 'cat1', name: 'Test Category' }]
        };
        await route.fulfill({ json });
    });

    // Also mock the individual conversation endpoint to avoid errors
    await page.route('/api/conversations/123', async route => {
        await route.fulfill({ json: { id: '123', title: 'Test Conversation', transcript: [] } });
    });

    let fetchCount = 0;
    // Monitor requests to /api/vault *after* the initial load
    // We'll attach a listener that increments a counter
    test.setTimeout(60000);

    page.on('request', request => {
        console.log('>>', request.method(), request.url());
        if (request.url().includes('/api/vault')) {
            fetchCount++;
        }
    });

    page.on('response', response => {
        console.log('<<', response.status(), response.url());
    });

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    await page.goto('/vault');

    // Verify initial load - The accordion might be closed due to a bug in defaultOpenValue logic
    try {
        // The category should be visible and open by default, so we just check for the conversation
        await expect(page.getByText('Test Conversation')).toBeVisible({ timeout: 5000 });
    } catch (e) {
        console.log('Current URL:', page.url());
        console.log('Page content preview:', (await page.content()).slice(0, 1000));
        throw e;
    }

    // Reset count after initial load (it might be 1 or 2 depending on React.useEffect strict mode etc)
    // We wait a bit to let initial things settle
    await page.waitForTimeout(1000);
    const initialCount = fetchCount;
    console.log(`Initial fetch count: ${initialCount}`);

    // Click the conversation
    await page.getByText('Test Conversation').click();

    // Wait for a short period to detect if loop happens
    // If there's an infinite loop, fetchCount will skyrocket
    await page.waitForTimeout(2000);

    const finalCount = fetchCount;
    console.log(`Final fetch count: ${finalCount}`);

    // In an infinite loop, we'd expect dozens or hundreds of requests in 2 seconds
    // In a correct implementation, we might expect maybe 1 re-fetch if at all, but certainly not many.
    // Let's set a conservative limit. If it's infinite, it will be huge.
    expect(finalCount - initialCount).toBeLessThan(5);
});
