import { test, expect } from '@playwright/test';

test.describe('Live Score', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('bracket page loads', async ({ page }) => {
    await page.goto('/tournaments');
    const firstTournament = page.locator('a[href^="/tournaments/"]').first();
    if (await firstTournament.isVisible()) {
      await firstTournament.click();
      const bracketLink = page.locator('a[href*="/bracket"]');
      if (await bracketLink.isVisible()) {
        await bracketLink.click();
        await expect(page).toHaveURL(/\/bracket/);
        await expect(page.getByText(/Tabellone|quart|semi|finale/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
