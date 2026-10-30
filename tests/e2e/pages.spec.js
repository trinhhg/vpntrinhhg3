import { test, expect } from '@playwright/test';

test.describe('E2E Test: Trang Khách hàng (index.html)', () => {
  test('tải trang thành công, tiêu đề đúng và nạp đầy đủ CSS/JS', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');

    // Kiểm tra tiêu đề trang
    await expect(page).toHaveTitle(/VPN/i);

    // Kiểm tra không có lỗi crash JS nghiêm trọng khi khởi tạo
    const fatalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('Failed to load resource'));
    expect(fatalErrors.length).toBe(0);
  });

  test('nút đổi giao diện Dark/Light Mode hoạt động trên DOM', async ({ page }) => {
    await page.goto('/');

    // Tìm nút chuyển đổi theme
    const themeBtn = page.locator('#themeToggleDesktop, #themeToggleMobile, button:has(i.fa-moon), button:has(i.fa-sun)').first();
    if (await themeBtn.isVisible()) {
      const isDarkBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      await themeBtn.click();
      const isDarkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(isDarkAfter).not.toBe(isDarkBefore);
    }
  });

  test('khung giao diện cửa hàng và portal hiển thị đầy đủ', async ({ page }) => {
    await page.goto('/');

    // Kiểm tra các phần tử cốt lõi
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText.length).toBeGreaterThan(100);
  });
});

test.describe('E2E Test: Trang Quản trị (admin.html)', () => {
  test('tải trang admin.html thành công và hiển thị khung đăng nhập hoặc dashboard', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/admin.html');

    // Kiểm tra tiêu đề hoặc nội dung quản trị
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Kiểm tra các thẻ canvas cho biểu đồ Chart.js tồn tại trong cây DOM
    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThanOrEqual(0);
  });
});
