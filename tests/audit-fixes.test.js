import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const readSrc = rel => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

describe('Audit & Redesign Fixes Verification', () => {
  it('xóa sạch toàn bộ code thông báo header cũ và dùng Top Notice Bar mới', () => {
    const indexHtml = readSrc('index.html');
    const adminHtml = readSrc('admin.html');
    const customerJs = readSrc('src/customer.js');
    const adminJs = readSrc('src/admin.js');

    const legacyTokens = [
      'headerAnnouncementDrawer',
      'siteAnnouncementBanner',
      'updateDrawerOffsets',
      'renderHeaderDrawer',
      'renderAnnouncementBanner',
      'dismissAnnouncement',
      'headerDrawerPreviewBox',
      'updateHeaderDrawerPreview'
    ];
    for (const tok of legacyTokens) {
      expect(indexHtml).not.toContain(tok);
      expect(adminHtml).not.toContain(tok);
      expect(customerJs).not.toContain(tok);
      expect(adminJs).not.toContain(tok);
    }

    expect(indexHtml).toContain('id="siteTopHeader"');
    expect(indexHtml).toContain('id="topNoticeBar"');
    expect(adminHtml).toContain('id="topNoticePreviewBox"');
    expect(customerJs).toContain('function renderTopNoticeBar(');
    expect(adminJs).toContain('function renderTopNoticeAdminPreview()');
  });

  it('4 công tắc Tab Chức năng đọc và lưu đồng bộ lên server KV qua cmsDb.settings', () => {
    const adminJs = readSrc('src/admin.js');
    expect(adminJs).toContain('cmsDb.settings.mailOnSave');
    expect(adminJs).toContain('cmsDb.settings.manualEdit');
    expect(adminJs).toContain('lockFulfill: draftLockFulfill');
    expect(adminJs).toContain('mailOnSave: draftMailOnSave');
    expect(adminJs).toContain('manualEdit: draftManualEdit');
    expect(adminJs).toContain('lockExpiry: draftLockExpiry');
  });

  it('Tab Link Sub bỏ HSD ở header cụm và dùng icon tick xanh gọn cho Auto Ready', () => {
    const adminJs = readSrc('src/admin.js');
    expect(adminJs).not.toContain('${expBadgeHtml}');
    expect(adminJs).not.toContain('✔ Auto Ready');
    expect(adminJs).toContain('title="Auto Ready — Sẵn sàng cấp tự động"');
  });

  it('Đối soát D1 mobile dùng màu xanh cho thành công và đỏ cho trạng thái khác', () => {
    const adminJs = readSrc('src/admin.js');
    expect(adminJs).toContain('const isOkNote = /^(success|paid)$/i.test(String(m.s || ""));');
    expect(adminJs).toContain('text-emerald-700 bg-emerald-50 border-emerald-200');
    expect(adminJs).toContain('text-rose-700 bg-rose-50 border-rose-200');
  });

  it('Tab Đã xóa mobile giữ nút Khôi phục không tràn màn hình (min-w-0 + shrink-0)', () => {
    const adminJs = readSrc('src/admin.js');
    expect(adminJs).toContain('flex items-center gap-2 min-w-0 flex-1');
    expect(adminJs).toContain('shrink-0 whitespace-nowrap text-emerald-600');
  });

  it('Bottom Nav Admin mobile giữ cố định Đơn hàng và Link Sub trong 5 slot chuẩn iOS', () => {
    const adminHtml = readSrc('admin.html');
    const matches = [...adminHtml.matchAll(/id="bnav-(t-[a-z]+)"/g)].map(m => m[1]);
    expect(matches).toEqual(['t-ord', 't-lnk', 't-check', 't-trans', 't-more']);
  });

  it('Checkout reset toàn bộ form khi đổi gói trước thanh toán & cập nhật cột phải theo phương thức thanh toán', () => {
    const customerJs = readSrc('src/customer.js');
    expect(customerJs).toContain("$('orderForm')?.reset()");
    expect(customerJs).toContain('pendingChildOrder');
    expect(customerJs).toContain('wasInActiveSuccessPortal');
  });
});
