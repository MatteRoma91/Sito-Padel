import { test, expect } from '@playwright/test';

test.describe('Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('opens chat page and shows conversation list', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.locator('h1')).toContainText('Chat');
    await expect(page.getByText(/conversazione|nuova chat|chat/i)).toBeVisible({ timeout: 5000 });
  });

  test('can start new DM', async ({ page }) => {
    await page.goto('/chat');
    await page.click('text=Nuova chat');
    const userButton = page.locator('button').filter({ hasText: /^(?!Annulla|Torneo)/ }).first();
    if (await userButton.isVisible()) {
      await userButton.click();
      await expect(page.getByPlaceholder('Scrivi un messaggio...')).toBeVisible({ timeout: 3000 });
    }
  });
});
