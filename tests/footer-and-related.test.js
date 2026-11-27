import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const readSrc = rel => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

function setupCustomerDom() {
  if (!globalThis.fetch) {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  }
  window.matchMedia = vi.fn().mockImplementation(q => ({
    matches: false,
    media: q,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
  const html = readSrc('index.html');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  document.body.innerHTML = (bodyMatch ? bodyMatch[1] : html).replace(/<script[\s\S]*?<\/script>/gi, '');
  localStorage.clear();
  sessionStorage.clear();
}

describe('Phần 1.1: Admin & Index Footer Toggle', () => {
  beforeEach(() => {
    setupCustomerDom();
  });

  it('renderDynamicFooter ẩn khối 5 cột khi showFullFooter = false và giữ nguyên 4 nút hỗ trợ + dòng bản quyền', async () => {
    const mod = await import('../src/customer.js');
    expect(typeof mod.renderDynamicFooter).toBe('function');

    mod.renderDynamicFooter({
      showFullFooter: false,
      columns: [{ title: 'Dịch vụ', links: [{ title: 'Bảng giá', url: '/portal/packages' }] }]
    });

    const colsWrap = document.getElementById('footerFullColsWrap');
    const footerArea = document.getElementById('footerArea');
    expect(colsWrap).toBeTruthy();
    expect(colsWrap.classList.contains('hidden')).toBe(true);
    expect(footerArea.classList.contains('footer-compact')).toBe(true);

    const supportLinks = Array.from(footerArea.querySelectorAll('.footer-support-btns a, .footer-support-btns button'));
    expect(supportLinks.length).toBe(4);
    expect(footerArea.innerHTML).toContain('https://zalo.me/0917678211');
    expect(footerArea.innerHTML).toContain('https://www.facebook.com/trinh.hg.57');
    expect(footerArea.innerHTML).toContain('openWechatModal()');
    expect(footerArea.innerHTML).toContain('https://t.me/hoaian57');
    expect(footerArea.textContent).toContain('© 2026 VPN Trinh Hg. All rights reserved.');
  });

  it('renderDynamicFooter hiển thị đầy đủ khối cột khi showFullFooter = true hoặc mặc định chưa đặt', async () => {
    const mod = await import('../src/customer.js');
    mod.renderDynamicFooter({
      columns: [{ title: 'Hướng dẫn', links: [{ title: 'Android', url: '/portal/guide/android' }] }]
    });

    const colsWrap = document.getElementById('footerFullColsWrap');
    const footerArea = document.getElementById('footerArea');
    expect(colsWrap.classList.contains('hidden')).toBe(false);
    expect(footerArea.classList.contains('footer-compact')).toBe(false);
    expect(document.getElementById('footerDynCols').textContent).toContain('Hướng dẫn');
  });

  it('admin.html đặt block Bật/Tắt Footer ngay bên phải Cấu hình Làm mờ / Khóa / Kiểm tra và gắn saveFooterDisplayToggle', () => {
    const adminHtml = readSrc('admin.html');
    const blurIdx = adminHtml.indexOf('Cấu hình Làm mờ / Khóa / Kiểm tra (Web này)');
    const toggleIdx = adminHtml.indexOf('id="toggleShowFullFooter"');
    const saveIdx = adminHtml.indexOf('saveFooterDisplayToggle()');
    expect(blurIdx).toBeGreaterThan(-1);
    expect(toggleIdx).toBeGreaterThan(blurIdx);
    expect(saveIdx).toBeGreaterThan(toggleIdx);
  });

  it('src/admin.js bảo toàn showFullFooter khi lưu saveFooterConfig()', () => {
    const adminJs = readSrc('src/admin.js');
    expect(adminJs).toContain('async function saveFooterDisplayToggle()');
    const saveFooterBlock = adminJs.slice(adminJs.indexOf('async function saveFooterConfig()'), adminJs.indexOf('async function saveQrExpireSeconds()'));
    expect(saveFooterBlock).toContain('showFullFooter');
  });
});

describe('Phần 1.2: Mục Bài viết liên quan kiểu danh sách 1 cột kèm mô tả ngắn', () => {
  beforeEach(() => {
    setupCustomerDom();
  });

  it('extractGuideExcerpt bỏ qua heading mở đầu, loại bỏ HTML và trích đoạn mô tả ngắn gọn từ nội dung bài viết', async () => {
    const mod = await import('../src/customer.js');
    expect(typeof mod.extractGuideExcerpt).toBe('function');

    const excerpt = mod.extractGuideExcerpt({
      html: '<h2>1. Giới thiệu chung</h2><p>Hướng dẫn cài đặt <strong>VPN Trinh Hg</strong> trên điện thoại Android bằng ứng dụng Hiddify, FlClash và Karing chỉ trong 2 phút.</p>'
    }, 95);

    expect(excerpt).not.toContain('<');
    expect(excerpt).not.toContain('Giới thiệu chung');
    expect(excerpt).toContain('Hướng dẫn cài đặt VPN Trinh Hg');
    expect(excerpt.length).toBeLessThanOrEqual(99);
  });

  it('extractGuideExcerpt xử lý an toàn khi nội dung rỗng hoặc chỉ có heading', async () => {
    const mod = await import('../src/customer.js');
    expect(mod.extractGuideExcerpt({ html: '' })).toBe('');
    expect(mod.extractGuideExcerpt({ html: '<h2>Chỉ có tiêu đề</h2>' })).toBe('Chỉ có tiêu đề');
  });

  it('buildRelatedArticlesHtml render danh sách 1 cột kiểu thẻ bài báo cho 4 bài liên quan, không chia grid 2:2', async () => {
    const mod = await import('../src/customer.js');
    expect(typeof mod.buildRelatedArticlesHtml).toBe('function');

    const entries = [1, 2, 3, 4].map(n => ({
      tabName: `Mục ${n}`,
      item: {
        slug: `bai-${n}`,
        name: `Tiêu đề bài viết hướng dẫn rất dài số ${n} để kiểm tra không bị cắt cụt`,
        html: `<h2>Bước 1</h2><p>Đoạn mô tả mở đầu chi tiết của bài viết số ${n} giúp người dùng nắm nhanh nội dung trước khi bấm xem.</p>`
      }
    }));

    const html = mod.buildRelatedArticlesHtml(entries);
    expect(html).not.toContain('sm:grid-cols-2');
    expect(html).toContain('flex flex-col gap-3');
    expect(html).not.toContain('truncate');
    expect(html).toContain('data-guide-action="openart"');
    expect(html).toContain('data-guide-slug="bai-4"');
    expect(html).toContain('Đoạn mô tả mở đầu chi tiết của bài viết số 4');
  });
});
