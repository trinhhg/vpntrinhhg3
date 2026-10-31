import { test, expect } from '@playwright/test';

test.describe('E2E Test: Trang Khách hàng (index.html)', () => {
  test('tải trang thành công, tiêu đề đúng và nạp đầy đủ CSS/JS', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') pageErrors.push(msg.text());
    });

    await page.goto('/');

    // Kiểm tra tiêu đề trang
    await expect(page).toHaveTitle(/VPN/i);

    // Kiểm tra không có bất kỳ ngoại lệ JavaScript nào khi khởi tạo
    const fatalErrors = pageErrors.filter(e => !e.includes('favicon') && !e.includes('Failed to load resource'));
    expect(fatalErrors).toEqual([]);

    // Kiểm tra các hàm nghiệp vụ toàn cục đã được nạp thành công lên window
    const functionsLoaded = await page.evaluate(() => ({
      renderPackages: typeof window.renderPackages,
      openWechatModal: typeof window.openWechatModal,
      QRCode: typeof window.QRCode
    }));

    expect(functionsLoaded.renderPackages).toBe('function');
    expect(functionsLoaded.openWechatModal).toBe('function');
    expect(functionsLoaded.QRCode).toBe('function');
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
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') pageErrors.push(msg.text());
    });

    await page.goto('/admin.html');

    // Kiểm tra tiêu đề hoặc nội dung quản trị
    const body = page.locator('body');
    await expect(body).toBeVisible();

    const fatalErrors = pageErrors.filter(e => !e.includes('favicon') && !e.includes('Failed to load resource'));
    expect(fatalErrors).toEqual([]);

    // Kiểm tra các hàm cốt lõi đã được gắn đầy đủ vào window, không bị ReferenceError
    const adminFns = await page.evaluate(() => ({
      setRevMonth: typeof window.setRevMonth,
      setRevTab: typeof window.setRevTab,
      setRevPayView: typeof window.setRevPayView,
      mcToHtml: typeof window.mcToHtml,
      addFaqRow: typeof window.addFaqRow,
      saveFaqAdmin: typeof window.saveFaqAdmin,
      addFooterColumn: typeof window.addFooterColumn,
      saveFooterConfig: typeof window.saveFooterConfig,
      recordAdminNav: typeof window.recordAdminNav,
      renderHealTab: typeof window.renderHealTab,
      renderScanTab: typeof window.renderScanTab,
      customCmsImageHandler: typeof window.customCmsImageHandler,
      customCmsVideoHandler: typeof window.customCmsVideoHandler,
      toggleDataRequestSeen: typeof window.toggleDataRequestSeen,
      markAllDataRequestsSeen: typeof window.markAllDataRequestsSeen
    }));

    expect(adminFns.setRevMonth).toBe('function');
    expect(adminFns.setRevTab).toBe('function');
    expect(adminFns.setRevPayView).toBe('function');
    expect(adminFns.mcToHtml).toBe('function');
    expect(adminFns.addFaqRow).toBe('function');
    expect(adminFns.saveFaqAdmin).toBe('function');
    expect(adminFns.addFooterColumn).toBe('function');
    expect(adminFns.saveFooterConfig).toBe('function');
    expect(adminFns.recordAdminNav).toBe('function');
    expect(adminFns.renderHealTab).toBe('function');
    expect(adminFns.renderScanTab).toBe('function');
    expect(adminFns.customCmsImageHandler).toBe('function');
    expect(adminFns.customCmsVideoHandler).toBe('function');
    expect(adminFns.toggleDataRequestSeen).toBe('function');
    expect(adminFns.markAllDataRequestsSeen).toBe('function');

    // Kiểm tra header fulfillment mapping đã được làm sạch mô tả sai lệch
    const fulfillPaneText = await page.locator('#pane-pkg-fulfill').textContent();
    expect(fulfillPaneText).toContain('Cấu Hình Tự Động Cấp Link');
    expect(fulfillPaneText).not.toContain('Chứa các đơn thành công còn hạn bị thiếu ô link');
  });
});
