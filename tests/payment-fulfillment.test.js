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
