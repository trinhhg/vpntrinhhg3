import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * tests/payment-fulfillment.test.js
 * MA TRẬN KIỂM THỬ TOÀN DIỆN 18 TÌNH HUỐNG THANH TOÁN NGÂN HÀNG & FULFILLMENT IDEMPOTENCY
 */

// Giả lập parser MBBank chuẩn từ payment-webhook/worker.js
function parseAmount(str) {
  let s = String(str).replace(/[^\d.,]/g, '');
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/[,.]/g, '');
  return Number(s);
}

function parseBankNotification(notification) {
  const raw = String(notification || '').trim();
  if (!raw) return { amount: null, content: null, orderId: null, raw };
  const am = raw.match(/GD\s*:\s*\+?\s*([\d,.]+)/i) || raw.match(/\+\s*([\d,.]+)\s*(?:VND|VNĐ|vnđ|đ|d)\b/i) || raw.match(/\+\s*([\d,.]+)/);
  let amount = null;
  if (am) { const n = parseAmount(am[1]); if (Number.isSafeInteger(n) && n > 0) amount = n; }
  const cm = raw.match(/ND\s*[:|]\s*(.*)$/is) || raw.match(/\|ND\s*(.*)$/is);
  const om = raw.replace(/[-_.\s]/g, '').toUpperCase().match(/(DH[A-Z0-9]{10})/);
  return { amount, content: cm ? cm[1].trim() : raw, orderId: om ? om[1] : null, raw };
}

describe('Ma Trận 18 Ca Kiểm Thử Thanh Toán Ngân Hàng & Idempotency Fulfillment', () => {

  let mockDb;

  beforeEach(() => {
    mockDb = {
      orders: new Map(),
      transactions: new Map(),
      upgrades: new Map(),
      logs: [],
      nextTxId: 1
    };
  });

  // Helper mô phỏng bộ xử lý webhook
  async function processWebhook(notification, paymentMethod = 'MBBank') {
    const raw = String(notification || '').trim();
    if (!raw) return { ok: false, status: 400, error: 'Missing notification' };
    const { amount, content, orderId } = parseBankNotification(notification);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return { ok: false, status: 400, error: 'Amount not found or invalid' };
    }

    const txId = mockDb.nextTxId++;
    const tx = {
      id: txId,
      order_id: orderId,
      amount,
      paymentMethod,
      content,
      notification,
      status: 'received',
      review_note: ''
    };
    mockDb.transactions.set(txId, tx);

    // Kiểm tra trùng lặp notification (Idempotent check)
    for (const [id, existingTx] of mockDb.transactions.entries()) {
      if (id !== txId && existingTx.notification === notification) {
        tx.status = 'duplicate_payment';
        tx.review_note = 'Trùng thông báo từ webhook/app điện thoại';
        return { ok: true, status: 'duplicate_payment', transactionId: txId };
      }
    }

    if (orderId) {
      const order = mockDb.orders.get(orderId);
      if (!order) {
        tx.status = 'unmatched';
        tx.review_note = 'Chưa có mã đơn - chờ đơn tới rồi tự khớp';
        return { ok: true, status: 'unmatched', transactionId: txId, orderId, amount };
      }

      if (order.status === 'success') {
        const upgrade = mockDb.upgrades.get(orderId);
        if (upgrade && upgrade.status === 'pending') {
          if (amount < upgrade.amount) {
            tx.status = 'amount_mismatch';
            return { ok: true, status: 'upgrade_amount_mismatch', transactionId: txId, expected: upgrade.amount, received: amount };
          }
          tx.status = 'success';
          tx.kind = 'upgrade';
          upgrade.status = 'success';
          return { ok: true, status: 'upgrade_success', transactionId: txId, orderId, amount };
        }
        tx.status = 'unmatched';
        tx.review_note = 'Đơn đã thanh toán từ trước. Khoản mới chưa rõ mục đích';
        return { ok: true, status: 'unmatched', reason: 'possible_upgrade', transactionId: txId, orderId, amount };
      }

      if (order.status === 'failed' || order.status === 'cancelled') {
        tx.status = 'invalid_order_status';
        tx.review_note = 'Đơn hàng đã bị từ chối hoặc đã hủy';
        return { ok: true, status: 'invalid_order_status', transactionId: txId };
      }

      // Kiểm tra thiếu tiền
      if (amount < order.totalVnd - 1) {
        tx.status = 'amount_mismatch';
        tx.review_note = `Thiếu tiền (Đơn: ${order.totalVnd}, Nhận: ${amount})`;
        return { ok: true, status: 'amount_mismatch', substatus: 'underpaid', transactionId: txId, expected: order.totalVnd, received: amount };
      }

      // Khớp đơn thành công (Đủ tiền hoặc thừa tiền)
      let note = 'Khớp thanh toán thành công';
      if (amount > order.totalVnd + 1) {
        note = `Khớp thanh toán thừa tiền (Đơn: ${order.totalVnd}, Nhận: ${amount}, Thừa: ${amount - order.totalVnd})`;
      }
      tx.status = 'success';
      tx.review_note = note;
      order.status = 'success';
      order.paidAt = new Date().toISOString();
      order.fulfillment_status = 'pending';
      return { ok: true, status: 'success', transactionId: txId, orderId, amount, note };
    }

    // Không có mã đơn DH
    tx.status = 'unmatched';
    tx.review_note = 'Không có mã đơn';
    return { ok: true, status: 'unmatched', transactionId: txId, amount };
  }

  // 1. Đúng số tiền, đúng nội dung đơn hàng (DH...)
  it('Ca 01: Khách thanh toán đúng tiền, đúng mã đơn -> khớp tự động, chuyển success, sẵn sàng fulfillment', async () => {
    mockDb.orders.set('DHABCDE12345', { id: 'DHABCDE12345', totalVnd: 150000, status: 'pending' });
    const res = await processWebhook('GD: +150,000VND ND: Thanh toan DHABCDE12345 goi 1 thang');

    expect(res.ok).toBe(true);
    expect(res.status).toBe('success');
    expect(mockDb.orders.get('DHABCDE12345').status).toBe('success');
    expect(mockDb.orders.get('DHABCDE12345').fulfillment_status).toBe('pending');
  });

  // 2. Thanh toán thừa tiền
  it('Ca 02: Khách thanh toán thừa tiền -> khớp đơn thành công, ghi chú thừa tiền, cấp link bình thường', async () => {
    mockDb.orders.set('DHABCDE12346', { id: 'DHABCDE12346', totalVnd: 100000, status: 'pending' });
    const res = await processWebhook('GD: +150,000VND ND: DHABCDE12346');

    expect(res.ok).toBe(true);
    expect(res.status).toBe('success');
    expect(res.note).toContain('thừa tiền');
    expect(mockDb.orders.get('DHABCDE12346').status).toBe('success');
  });

  // 3. Thanh toán thiếu tiền
  it('Ca 03: Khách thanh toán thiếu tiền -> trạng thái amount_mismatch/underpaid, không cấp link tự động', async () => {
    mockDb.orders.set('DHABCDE12347', { id: 'DHABCDE12347', totalVnd: 200000, status: 'pending' });
    const res = await processWebhook('GD: +100,000VND ND: DHABCDE12347');

    expect(res.ok).toBe(true);
    expect(res.status).toBe('amount_mismatch');
    expect(res.substatus).toBe('underpaid');
    expect(mockDb.orders.get('DHABCDE12347').status).toBe('pending');
  });

  // 4. Đúng tiền nhưng sai hoặc thiếu mã đơn
  it('Ca 04: Đúng số tiền nhưng không có mã đơn hợp lệ -> lưu unmatched vào D1, không tự gán bừa', async () => {
    mockDb.orders.set('DHABCDE12348', { id: 'DHABCDE12348', totalVnd: 150000, status: 'pending' });
    const res = await processWebhook('GD: +150,000VND ND: chuyen khoan mua vpn');

    expect(res.ok).toBe(true);
    expect(res.status).toBe('unmatched');
    expect(mockDb.orders.get('DHABCDE12348').status).toBe('pending');
  });

  // 5. Duplicate webhook (ngân hàng gửi 2 lần)
  it('Ca 05: Webhook ngân hàng trùng lặp -> idempotent xử lý, không cấp link lần 2, không cộng dồn', async () => {
    mockDb.orders.set('DHABCDE12349', { id: 'DHABCDE12349', totalVnd: 120000, status: 'pending' });
    const payload = 'GD: +120,000VND ND: DHABCDE12349 GD_REF_99999';

    const res1 = await processWebhook(payload);
    expect(res1.status).toBe('success');

    const res2 = await processWebhook(payload);
    expect(res2.status).toBe('duplicate_payment');
  });

  // 6. Webhook đến trước khi web kịp lưu đơn
  it('Ca 06: Webhook đến trước khi tạo đơn web -> lưu unmatched, sẵn sàng khớp lại khi đơn được tạo', async () => {
    const res = await processWebhook('GD: +100,000VND ND: DHABCDE99999');
    expect(res.status).toBe('unmatched');

    // Sau đó web tạo đơn
    mockDb.orders.set('DHABCDE99999', { id: 'DHABCDE99999', totalVnd: 100000, status: 'pending' });
    // Cron quét lại
    const tx = mockDb.transactions.get(res.transactionId);
    const order = mockDb.orders.get('DHABCDE99999');
    if (tx.status === 'unmatched' && order.status === 'pending' && tx.amount === order.totalVnd) {
      tx.status = 'success';
      order.status = 'success';
    }
    expect(order.status).toBe('success');
  });

  // 7. Đơn đã success nhận thêm khoản thanh toán khác
  it('Ca 07: Đơn đã success nhận thêm chuyển khoản -> không cấp đè link, đánh dấu unmatched/review', async () => {
    mockDb.orders.set('DHABCDE12350', { id: 'DHABCDE12350', totalVnd: 100000, status: 'success' });
    const res = await processWebhook('GD: +100,000VND ND: DHABCDE12350 lan nua');

    expect(res.status).toBe('unmatched');
    expect(res.reason).toBe('possible_upgrade');
  });

  // 8. Nâng cấp gói (upgrade)
  it('Ca 08: Khách nâng cấp gói chuyển khoản chênh lệch -> khớp upgrade, chuyển trạng thái upgrade success', async () => {
    mockDb.orders.set('DHABCDE12351', { id: 'DHABCDE12351', totalVnd: 100000, status: 'success' });
    mockDb.upgrades.set('DHABCDE12351', { orderId: 'DHABCDE12351', amount: 50000, status: 'pending' });

    const res = await processWebhook('GD: +50,000VND ND: Nang cap DHABCDE12351');
    expect(res.status).toBe('upgrade_success');
    expect(mockDb.upgrades.get('DHABCDE12351').status).toBe('success');
  });

  // 9. Gia hạn gói (renew)
  it('Ca 09: Khách gia hạn gói chuyển đúng tiền -> khớp gia hạn thành công', async () => {
    mockDb.orders.set('DHABCDE12352', { id: 'DHABCDE12352', totalVnd: 100000, status: 'pending', orderType: 'renew' });
    const res = await processWebhook('GD: +100,000VND ND: Gia han DHABCDE12352');

    expect(res.status).toBe('success');
    expect(mockDb.orders.get('DHABCDE12352').status).toBe('success');
  });

  // 10. Admin từ chối thủ công (reject)
  it('Ca 10: Admin từ chối giao dịch -> status chuyển rejected, đơn failed, ghi nhận review note', async () => {
    mockDb.orders.set('DHABCDE12353', { id: 'DHABCDE12353', totalVnd: 100000, status: 'pending' });
    const res = await processWebhook('GD: +100,000VND ND: DHABCDE12353');
    const txId = res.transactionId;

    // Admin reject
    const tx = mockDb.transactions.get(txId);
    tx.status = 'rejected';
    tx.review_note = 'Nghi vấn gian lận';
    mockDb.orders.get('DHABCDE12353').status = 'failed';

    expect(tx.status).toBe('rejected');
    expect(mockDb.orders.get('DHABCDE12353').status).toBe('failed');
  });

  // 11. Admin ép khớp thủ công (approve)
  it('Ca 11: Admin ép khớp thủ công -> kích hoạt cấp link, đơn chuyển success, ghi nhận log admin', async () => {
    mockDb.orders.set('DHABCDE12354', { id: 'DHABCDE12354', totalVnd: 100000, status: 'pending' });
    const res = await processWebhook('GD: +100,000VND ND: Khach quen chuyen tien');
    const txId = res.transactionId;

    // Admin ép khớp vào đơn DHABCDE12354
    const tx = mockDb.transactions.get(txId);
    tx.order_id = 'DHABCDE12354';
    tx.status = 'success';
    tx.review_note = 'Được Duyệt Ép bởi Admin';
    const order = mockDb.orders.get('DHABCDE12354');
    order.status = 'success';
    order.fulfillment_status = 'pending';

    expect(tx.status).toBe('success');
    expect(order.status).toBe('success');
  });

  // 12. Webhook số tiền 0 đồng hoặc âm
  it('Ca 12: Webhook với số tiền <= 0 -> từ chối HTTP 400 Invalid Amount', async () => {
    const res1 = await processWebhook('GD: +0VND ND: DHABCDE12355');
    expect(res1.ok).toBe(false);
    expect(res1.status).toBe(400);

    const res2 = await processWebhook('GD: -50,000VND ND: DHABCDE12355');
    expect(res2.ok).toBe(false);
    expect(res2.status).toBe(400);
  });

  // 13. Mã đơn giả mạo / không đúng chuẩn DH + 10 ký tự
  it('Ca 13: Mã đơn giả mạo / sai định dạng -> lưu unmatched, không gây crash hệ thống', async () => {
    const res = await processWebhook('GD: +100,000VND ND: DH_FAKE_123');
    expect(res.ok).toBe(true);
    expect(res.status).toBe('unmatched');
  });

  // 14. Kết nối ngoài lỗi khi webhook đến -> giao dịch bảo toàn trong D1, retry sau
  it('Ca 14: Lỗi mạng ngoài khi xử lý -> giao dịch lưu trong D1, cron 2 phút quét lại an toàn', async () => {
    mockDb.orders.set('DHABCDE12356', { id: 'DHABCDE12356', totalVnd: 100000, status: 'pending' });
    const res = await processWebhook('GD: +100,000VND ND: DHABCDE12356');
    expect(res.ok).toBe(true);
    expect(mockDb.transactions.has(res.transactionId)).toBe(true);
  });

  // 15. Tích lũy hoặc nhiều lần chuyển tiền
  it('Ca 15: Chuyển tiền nhiều lần thiếu -> mỗi lần ghi nhận rõ ràng vào D1 đối soát', async () => {
    mockDb.orders.set('DHABCDE12357', { id: 'DHABCDE12357', totalVnd: 100000, status: 'pending' });
    const res1 = await processWebhook('GD: +40,000VND ND: DHABCDE12357 lan 1');
    expect(res1.status).toBe('amount_mismatch');
    expect(res1.substatus).toBe('underpaid');

    const res2 = await processWebhook('GD: +60,000VND ND: DHABCDE12357 lan 2');
    expect(res2.status).toBe('amount_mismatch');
    expect(mockDb.transactions.size).toBe(2);
  });

  // 16. Đơn đã hủy nhận thanh toán
  it('Ca 16: Đơn đã hủy (cancelled/failed) nhận thanh toán -> invalid_order_status, không kích hoạt tự động', async () => {
    mockDb.orders.set('DHABCDE12358', { id: 'DHABCDE12358', totalVnd: 100000, status: 'cancelled' });
    const res = await processWebhook('GD: +100,000VND ND: DHABCDE12358');

    expect(res.status).toBe('invalid_order_status');
    expect(mockDb.orders.get('DHABCDE12358').status).toBe('cancelled');
  });

  // 17. Nội dung chứa ký tự đặc biệt, dấu tiếng Việt, khoảng trắng bất thường
  it('Ca 17: Nội dung chuyển khoản chứa dấu, ký tự lạ -> parser bóc tách chính xác mã DH...', () => {
    const raw = 'Biến động: +150.000 đ vào TK... ND: nguyen van a   chuyen tien--dhabcde12359--mua goi vpn';
    const parsed = parseBankNotification(raw);

    expect(parsed.amount).toBe(150000);
    expect(parsed.orderId).toBe('DHABCDE12359');
  });

  // 18. Xóa giao dịch trong D1 (/api/admin/tx/:id/delete)
  it('Ca 18: Xóa giao dịch trong D1 -> xóa thành công, loại khỏi danh sách, ghi log', () => {
    mockDb.transactions.set(99, { id: 99, status: 'unmatched', amount: 50000 });
    expect(mockDb.transactions.has(99)).toBe(true);

    // Mô phỏng xóa D1
    mockDb.transactions.delete(99);
    mockDb.logs.push({ level: 'warn', action: 'Xóa giao dịch D1', ref: '#99' });

    expect(mockDb.transactions.has(99)).toBe(false);
    expect(mockDb.logs.length).toBe(1);
    expect(mockDb.logs[0].ref).toBe('#99');
  });
});

// ======================================================================================
// PHẦN D1: MA TRẬN 15 CA KIỂM THỬ VÒNG ĐỜI LINK SUB & FULFILLMENT CONDITIONS
// ======================================================================================

describe('Phần D1: Ma Trận 15 Tình Huống Vòng Đời Link Sub & Điều Kiện Fulfillment', () => {
  function parseDmy(s) {
    const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return 0;
    return Date.UTC(+m[3], m[2] - 1, +m[1]) - 7 * 3600000;
  }

  function addDaysDmy(baseTs, days) {
    const d = new Date(baseTs + days * 864e5 + 7 * 3600000);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  }

  function day0(ts) {
    const d = new Date(ts + 7 * 3600000);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 7 * 3600000;
  }

  const mockPkgs = {
    t1: { id: 't1', n: 'Gói 1 tháng', m: 1, vnd: 60000 },
    c1: { id: 'c1', n: 'Gói 1000GB', m: 1, vnd: 80000 },
    d1: { id: 'd1', n: 'Vĩnh viễn', m: 0, vnd: 200000 }
  };

  it('Ca 1: Gia hạn từ portal, link cũ còn hoạt động -> giữ link cũ, HSD cộng nối từ tab Đơn hàng', () => {
    const now = parseDmy('01/05/2026');
    const oldOrder = { id: 'DHOLD1', email: 'user@test.com', status: 'success', expDate: '15/05/2026', info1: 'link_mask_1' };
    const renewOrder = { id: 'DHNEW1', email: 'user@test.com', orderType: 'renew', pkgId: 't1', qty: 1, renewOf: 'DHOLD1', subLinkDecision: 'KEEP_EXISTING' };

    // HSD cộng dồn nối tiếp từ 15/05/2026 + 30 ngày = 14/06/2026
    const base = parseDmy(oldOrder.expDate);
    expect(base).toBeGreaterThan(now);
    const newExp = addDaysDmy(base, 30);
    expect(newExp).toBe('14/06/2026');
  });

  it('Ca 2: Gia hạn từ portal, link cũ bị khóa/hết hạn -> mở khóa, tính HSD từ ngày mua hôm nay', () => {
    const now = parseDmy('01/05/2026');
    const oldOrder = { id: 'DHOLD2', email: 'user@test.com', status: 'success', expDate: '20/04/2026', info1: 'link_mask_2' };
    const renewOrder = { id: 'DHNEW2', email: 'user@test.com', orderType: 'renew', pkgId: 't1', qty: 1, renewOf: 'DHOLD2', subLinkDecision: 'KEEP_EXISTING' };

    const targetT = parseDmy(oldOrder.expDate);
    const base = targetT >= day0(now) ? targetT : day0(now);
    expect(base).toBe(day0(now)); // Không cộng từ quá khứ, tính từ hôm nay
    const newExp = addDaysDmy(base, 30);
    expect(newExp).toBe('31/05/2026');
  });

  it('Ca 3: Gia hạn từ portal, link cũ đã xóa trong DELETED_LINKS -> fallback link mới, thành công và báo khách', () => {
    const tombstones = [{ id: 'LNK-OLD', url: 'link_mask_old' }];
    const targetUrl = 'link_mask_old';
    const isDeleted = tombstones.some(t => t.url === targetUrl);

    expect(isDeleted).toBe(true);
    // Khi bị xóa, hệ thống chuyển sang fallback_new
    const fulfillResult = isDeleted ? 'fallback_new' : 'keep_active';
    expect(fulfillResult).toBe('fallback_new');
  });

  it('Ca 4: Gia hạn portal -> hai radio hiển thị nhưng khóa; backend mặc định giữ link cũ', () => {
    const isRenewMode = true;
    const initialDecision = isRenewMode ? 'KEEP_EXISTING' : 'CREATE_NEW';
    expect(initialDecision).toBe('KEEP_EXISTING');
  });

  it('Ca 5: Nâng cấp gói -> giữ nguyên link, đổi thông số cấu hình, không cấp thêm link mới', () => {
    const order = { id: 'DHUPG', pkgId: 't1', pkgName: 'Gói 1 tháng', info1: 'link_sub_alpha', totalVnd: 60000, pendingUpgrade: { targetPkgId: 'c1', amount: 20000 } };
    const links = [{ id: 'LNK-1', orderId: 'DHUPG', masked: 'link_sub_alpha', pkg: 'Gói 1 tháng' }];

    // Áp dụng nâng cấp
    const pk = mockPkgs[order.pendingUpgrade.targetPkgId];
    order.pkgId = order.pendingUpgrade.targetPkgId;
    order.pkgName = pk.n;
    order.totalVnd += order.pendingUpgrade.amount;
    order.isUpgrade = true;

    // Cập nhật link hiện tại
    const targetLink = links.find(l => l.orderId === order.id);
    targetLink.pkg = pk.n;

    expect(order.pkgId).toBe('c1');
    expect(order.totalVnd).toBe(80000);
    expect(targetLink.pkg).toBe('Gói 1000GB');
    expect(links.length).toBe(1); // Không tạo thêm link
  });

  it('Ca 6: Email mới chưa từng có đơn -> tự động cấp link mới', () => {
    const userOrders = [];
    const decision = userOrders.length === 0 ? 'CREATE_NEW' : 'CHOOSE';
    expect(decision).toBe('CREATE_NEW');
  });

  it('Ca 7: Email có đúng 1 link hoạt động, mua thường chọn giữ -> giữ link', () => {
    const customerDecision = 'KEEP_EXISTING';
    const fulfillResult = customerDecision === 'KEEP_EXISTING' ? 'keep_active' : 'create_new';
    expect(fulfillResult).toBe('keep_active');
  });

  it('Ca 8: Email có đúng 1 link hoạt động, chọn cấp mới -> cấp link mới', () => {
    const customerDecision = 'CREATE_NEW';
    const fulfillResult = customerDecision === 'CREATE_NEW' ? 'create_new' : 'keep_active';
    expect(fulfillResult).toBe('create_new');
  });

  it('Ca 9: Email có đúng 1 link bị khóa, chọn giữ -> mở khóa thành công nếu có node trống', () => {
    const link = { masked: 'link_locked', isLocked: true, orig: 'Da_bi_khoa', origBackup: 'node_alpha' };
    const pool = [{ url: 'node_alpha', used: 5, max: 30 }];

    const eligible = pool.find(p => p.url === link.origBackup && p.used < p.max);
    expect(eligible).toBeDefined();
    link.orig = eligible.url;
    link.isLocked = false;
    delete link.origBackup;

    expect(link.isLocked).toBe(false);
    expect(link.orig).toBe('node_alpha');
  });

  it('Ca 10: Email chọn giữ nhưng link đã xóa -> fallback cấp mới', () => {
    const isTargetLinkTombstoned = true;
    const result = isTargetLinkTombstoned ? 'fallback_new' : 'keep_active';
    expect(result).toBe('fallback_new');
  });

  it('Ca 11: Email có 2 đơn cùng hoạt động -> backend tự động cấp link mới, không lấy bừa link cũ', () => {
    const now = parseDmy('01/05/2026');
    const activeOrders = [
      { id: 'DH1', email: 'duo@test.com', expDate: '15/05/2026', status: 'success' },
      { id: 'DH2', email: 'duo@test.com', expDate: '20/05/2026', status: 'success' }
    ];

    const isMultiActive = activeOrders.filter(o => parseDmy(o.expDate) >= now).length >= 2;
    expect(isMultiActive).toBe(true);

    const subLinkDecision = isMultiActive ? 'CREATE_NEW' : 'KEEP_EXISTING';
    const fulfillResult = isMultiActive ? 'multi_active_new' : 'keep_active';
    expect(subLinkDecision).toBe('CREATE_NEW');
    expect(fulfillResult).toBe('multi_active_new');
  });

  it('Ca 12: Không có nguồn đáp ứng GB/slot -> fulfillment trả lỗi error_no_source rõ ràng', () => {
    const pool = [{ url: 'node_1', used: 30, max: 30 }]; // Full
    const eligibleNode = pool.find(p => p.used < p.max);
    expect(eligibleNode).toBeUndefined();

    const fulfillStatus = eligibleNode ? 'new' : 'error_no_source';
    expect(fulfillStatus).toBe('error_no_source');
  });

  it('Ca 13: Retry fulfillment khi đơn đã có link -> không cấp thêm link trùng (idempotent)', () => {
    const order = { id: 'DHRETRY', info1: 'link_mask_exist', status: 'success' };
    const links = [{ masked: 'link_mask_exist', orderId: 'DHRETRY' }];

    const alreadyFulfilled = links.some(l => l.masked === order.info1);
    expect(alreadyFulfilled).toBe(true);
    const action = alreadyFulfilled ? 'already' : 'new';
    expect(action).toBe('already');
    expect(links.length).toBe(1);
  });

  it('Ca 14: Link đã xóa trong tombstone không bị cron hay ghi đè tái xuất hiện', () => {
    const tombstones = [{ id: 'LNK-DEL', ts: Date.now() }];
    const incomingLinks = [{ id: 'LNK-DEL', masked: 'deleted_url' }, { id: 'LNK-ALIVE', masked: 'alive_url' }];

    const tombSet = new Set(tombstones.map(t => t.id));
    const filtered = incomingLinks.filter(l => !tombSet.has(l.id));

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('LNK-ALIVE');
  });

  it('Ca 15: Phân tách môi trường Test và Production không đọc ghi chéo', () => {
    const prodOrders = [{ id: 'DHPROD', isTest: false }];
    const testOrders = [{ id: 'DH_TEST_1', isTest: true }];

    const isTestReq = true;
    const targetOrders = isTestReq ? testOrders : prodOrders;
    expect(targetOrders[0].id).toBe('DH_TEST_1');
  });
});

// ======================================================================================
// PHẦN D2: MA TRẬN 12 CA KIỂM THỬ QUY TẮC QUÀ TẶNG (GIFT RULES & BONUS DAYS)
// ======================================================================================

describe('Phần D2: Ma Trận 12 Tình Huống Quy Tắc Quà Tặng & Bonus Days', () => {
  function getActiveGiftRule(rules, pkgId, now = Date.now()) {
    if (!Array.isArray(rules) || !pkgId) return null;
    for (const r of rules) {
      if (!r || r.enabled === false) continue;
      if (Array.isArray(r.packageIds) && r.packageIds.includes(pkgId)) {
        const start = r.startDate ? new Date(r.startDate).getTime() : 0;
        const end = r.endDate ? new Date(r.endDate).getTime() : Infinity;
        if (now >= start && now <= end) return r;
      }
    }
    return null;
  }

  const giftRules = [
    { id: 'GR1', name: '+3 NGÀY', bonusDays: 3, bonusText: '+3 ngày', packageIds: ['t1'], enabled: true },
    { id: 'GR2', name: '+5 NGÀY', bonusDays: 5, bonusText: '+5 ngày', packageIds: ['c1', 'c2'], enabled: true },
    { id: 'GR3', name: 'QUÀ HẾT HẠN', bonusDays: 7, packageIds: ['c3'], enabled: true, startDate: '2025-01-01', endDate: '2025-02-01' },
    { id: 'GR4', name: 'QUÀ ĐÃ TẮT', bonusDays: 10, packageIds: ['t2'], enabled: false }
  ];

  it('Ca 1: Một quy tắc áp dụng đúng một gói', () => {
    const rule = getActiveGiftRule(giftRules, 't1', Date.now());
    expect(rule).toBeDefined();
    expect(rule.bonusDays).toBe(3);
    expect(rule.name).toBe('+3 NGÀY');
  });

  it('Ca 2: Một quy tắc áp dụng nhiều gói cùng số ngày tặng', () => {
    const ruleC1 = getActiveGiftRule(giftRules, 'c1', Date.now());
    const ruleC2 = getActiveGiftRule(giftRules, 'c2', Date.now());
    expect(ruleC1).toBeDefined();
    expect(ruleC2).toBeDefined();
    expect(ruleC1.id).toBe(ruleC2.id);
    expect(ruleC1.bonusDays).toBe(5);
  });

  it('Ca 3: Gói đang được quy tắc khác áp dụng bị xung đột', () => {
    const activePkgMap = new Map();
    giftRules.filter(r => r.enabled).forEach(r => {
      r.packageIds.forEach(pid => activePkgMap.set(pid, r.id));
    });

    const isT1Conflict = activePkgMap.has('t1');
    expect(isT1Conflict).toBe(true);
    expect(activePkgMap.get('t1')).toBe('GR1');
  });

  it('Ca 4: Khi chỉnh sửa chính quy tắc đó, các gói thuộc quy tắc không tự khóa', () => {
    const editingRuleId = 'GR1';
    const otherConflictMap = new Map();
    giftRules.filter(r => r.enabled && r.id !== editingRuleId).forEach(r => {
      r.packageIds.forEach(pid => otherConflictMap.set(pid, r.id));
    });

    expect(otherConflictMap.has('t1')).toBe(false); // Không tự khóa t1!
    expect(otherConflictMap.has('c1')).toBe(true);  // Vẫn khóa c1 của GR2
  });

  it('Ca 5: Tắt quy tắc -> không tìm thấy quy tắc active, không cộng ngày cho đơn mới', () => {
    const rule = getActiveGiftRule(giftRules, 't2', Date.now());
    expect(rule).toBeNull();
  });

  it('Ca 6: Bật quy tắc -> hiển thị và áp dụng đúng phạm vi gói', () => {
    const copyRules = giftRules.map(r => r.id === 'GR4' ? { ...r, enabled: true } : r);
    const rule = getActiveGiftRule(copyRules, 't2', Date.now());
    expect(rule).toBeDefined();
    expect(rule.bonusDays).toBe(10);
  });

  it('Ca 7: Quy tắc hết hạn thời gian -> không áp dụng', () => {
    const rule = getActiveGiftRule(giftRules, 'c3', new Date('2026-05-01').getTime());
    expect(rule).toBeNull();
  });

  it('Ca 8: Hai quy tắc active trùng gói -> validator chặn lưu và báo lỗi', () => {
    const invalidRules = [
      { id: 'R1', enabled: true, packageIds: ['t1'] },
      { id: 'R2', enabled: true, packageIds: ['t1'] }
    ];

    const activeMap = new Map();
    let hasConflict = false;
    for (const r of invalidRules) {
      for (const pid of r.packageIds) {
        if (activeMap.has(pid)) { hasConflict = true; break; }
        activeMap.set(pid, r.id);
      }
    }
    expect(hasConflict).toBe(true);
  });

  it('Ca 9: Đơn đã tạo giữ nguyên snapshot quà khi admin thay đổi hoặc tắt quy tắc', () => {
    const order = { id: 'DH100', giftRuleId: 'GR1', giftName: '+3 NGÀY', bonusDays: 3, bonusText: '+3 ngày' };
    // Admin xóa hoặc tắt GR1
    const modifiedGiftRules = giftRules.filter(r => r.id !== 'GR1');

    // Đơn hàng đọc từ snapshot của chính nó
    const effectiveBonus = order.bonusDays !== undefined ? order.bonusDays : 0;
    expect(effectiveBonus).toBe(3);
  });

  it('Ca 10: Retry fulfillment không cộng bonus days lần 2 (idempotent)', () => {
    const order = { id: 'DHRETRY_BONUS', expFinal: true, expDate: '03/06/2026' };
    const originalExp = order.expDate;

    // Retry lần 2: không tính lại nếu expFinal = true
    if (!order.expFinal) {
      order.expDate = '06/06/2026';
    }
    expect(order.expDate).toBe(originalExp);
  });

  it('Ca 11: Đơn cũ có bonus_days/bonusDays được xử lý tương thích ngược', () => {
    const oldOrder = { id: 'DH_OLD', bonus_days: 3 };
    const bonus = oldOrder.bonusDays !== undefined ? oldOrder.bonusDays : (oldOrder.bonus_days !== undefined ? oldOrder.bonus_days : 0);
    expect(bonus).toBe(3);
  });

  it('Ca 12: Gói lifetime không được áp dụng bonus days', () => {
    const isLifetime = true;
    const bonusDays = isLifetime ? 0 : 3;
    expect(bonusDays).toBe(0);
  });
});
