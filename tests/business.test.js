import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';
import currency from 'currency.js';

describe('tests/business.test.js — Nghiệp vụ Tính toán, Phân bổ & CMS', () => {
  describe('Tính toán giá gói & Mã giảm giá (Coupon Calculation)', () => {
    it('áp dụng mã giảm giá phần trăm chính xác không lệch số thập phân', () => {
      const basePrice = 200000; // 200.000 đ
      const discountPercent = 15; // 15%
      
      const discountAmount = currency(basePrice).multiply(discountPercent).divide(100).value;
      const finalPrice = currency(basePrice).subtract(discountAmount).value;

      expect(discountAmount).toBe(30000);
      expect(finalPrice).toBe(170000);
    });

    it('áp dụng mã giảm giá cố định và không bao giờ cho phép giá âm', () => {
      const basePrice = 50000;
      const couponFixedDiscount = 70000; // Giảm nhiều hơn giá gói

      const finalPrice = Math.max(0, currency(basePrice).subtract(couponFixedDiscount).value);
      expect(finalPrice).toBe(0);
    });

    it('quy đổi tỷ giá VND sang CNY làm tròn số nguyên an toàn', () => {
      const totalVnd = 150000;
      const exchangeRate = 3500; // 1 CNY = 3.500 VND

      const totalCny = Math.ceil(totalVnd / exchangeRate);
      expect(totalCny).toBe(43); // 150000 / 3500 = 42.85 -> làm tròn lên 43 CNY
    });
  });

  describe('Tính toán Doanh thu, Chi phí & Lợi nhuận Admin (Financial Aggregation)', () => {
    const mockOrders = [
      { id: '1', date: '2026-05-02', status: 'paid', method: 'bank', totalVnd: 100000 },
      { id: '2', date: '2026-05-05', status: 'paid', method: 'alipay', totalVnd: 150000 },
      { id: '3', date: '2026-05-10', status: 'paid', method: 'wechat', totalVnd: 80000 },
      { id: '4', date: '2026-05-12', status: 'pending', method: 'bank', totalVnd: 200000 }, // Chưa thanh toán
      { id: '5', date: '2026-05-15', status: 'rejected', method: 'bank', totalVnd: 50000 }  // Bị từ chối
    ];

    it('chỉ tính doanh thu từ các đơn hàng có trạng thái "paid"', () => {
      const paidOrders = mockOrders.filter(o => o.status === 'paid');
      const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalVnd, 0);

      expect(paidOrders.length).toBe(3);
      expect(totalRevenue).toBe(330000);
    });

    it('tính toán phân bổ doanh thu theo từng kênh thanh toán', () => {
      const paidOrders = mockOrders.filter(o => o.status === 'paid');
      const byMethod = paidOrders.reduce((acc, o) => {
        acc[o.method] = (acc[o.method] || 0) + o.totalVnd;
        return acc;
      }, {});

      expect(byMethod.bank).toBe(100000);
      expect(byMethod.alipay).toBe(150000);
      expect(byMethod.wechat).toBe(80000);
      expect(byMethod.bank + byMethod.alipay + byMethod.wechat).toBe(330000);
    });

    it('tính Lợi nhuận ròng = Doanh thu - Chi phí máy chủ', () => {
      const totalRevenue = 330000;
      const serverCosts = 120000; // Chi phí server VPS/tháng

      const netProfit = totalRevenue - serverCosts;
      expect(netProfit).toBe(210000);
    });
  });

  describe('Phân bổ Link Pool (Node Allocation)', () => {
    const mockNodes = [
      { id: 'node_1', masked: 'link1', used: true, status: 'active', expDate: '2026-12-31' },
      { id: 'node_2', masked: 'link2', used: false, status: 'disabled', expDate: '2026-12-31' },
      { id: 'node_3', masked: 'link3', used: false, status: 'active', expDate: '2025-01-01' }, // Hết hạn
      { id: 'node_4', masked: 'link4', used: false, status: 'active', expDate: '2026-12-31' }, // Hợp lệ!
      { id: 'node_5', masked: 'link5', used: false, status: 'active', expDate: '2026-12-31' }
    ];

    it('tìm chính xác node khả dụng đầu tiên (chưa dùng, active và còn hạn)', () => {
      const today = '2026-05-01';
      const availableNode = mockNodes.find(n => !n.used && n.status === 'active' && n.expDate >= today);

      expect(availableNode).toBeDefined();
      expect(availableNode.id).toBe('node_4');
    });

    it('báo hết node khi không còn node nào thỏa điều kiện', () => {
      const fullyUsedNodes = mockNodes.map(n => ({ ...n, used: true }));
      const availableNode = fullyUsedNodes.find(n => !n.used && n.status === 'active');

      expect(availableNode).toBeUndefined();
    });
  });

  describe('Làm sạch nội dung CMS với DOMPurify (Bảo mật Stored XSS)', () => {
    it('loại bỏ triệt để các thẻ <script> và inline event handlers nguy hiểm', () => {
      const maliciousHtml = `
        <div class="guide">
          <h3>Hướng dẫn cài đặt Shadowrocket</h3>
          <p>Tải ứng dụng tại App Store.</p>
          <script>fetch('/api/admin_token').then(r => r.text()).then(t => steal(t));</script>
          <img src="https://example.com/pic.png" onerror="alert('hacked')" />
          <a href="javascript:void(0)" onclick="alert(1)">Bấm vào đây</a>
        </div>
      `;

      const cleanHtml = DOMPurify.sanitize(maliciousHtml);

      expect(cleanHtml).not.toContain('<script>');
      expect(cleanHtml).not.toContain('onerror');
      expect(cleanHtml).not.toContain('onclick');
      expect(cleanHtml).not.toContain('javascript:');
      expect(cleanHtml).toContain('Hướng dẫn cài đặt Shadowrocket');
      expect(cleanHtml).toContain('<img src="https://example.com/pic.png">');
    });
  });
});
