import { test } from '@playwright/test';

test('kpi screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/auth/login');
  await page.waitForTimeout(2000);
  const inputs = await page.locator('input').all();
  for (const inp of inputs) {
    const t = await inp.getAttribute('type');
    const n = await inp.getAttribute('name');
    const p = await inp.getAttribute('placeholder');
    console.log(`type=${t} name=${n} placeholder=${p}`);
  }
  await page.screenshot({ path: 'login.png' });
});
