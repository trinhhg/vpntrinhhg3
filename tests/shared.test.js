import { describe, it, expect, beforeEach } from 'vitest';
import {
  fmtVnd,
  esc,
  q,
  normId,
  isLife,
  normSt,
  trimNum,
  genId,
  genHex,
  parseAny,
  fmtBank,
  setTimezone,
  getTz,
  toggleTheme,
  initTheme
} from '../src/shared.js';

describe('src/shared.js — Tiện ích cốt lõi & Định dạng', () => {
  describe('Định dạng tiền tệ VND (fmtVnd)', () => {
    it('định dạng số nguyên dương chuẩn', () => {
      expect(fmtVnd(100000)).toBe('100,000');
      expect(fmtVnd(12345678)).toBe('12,345,678');
    });

    it('xử lý số 0 và giá trị rỗng', () => {
      expect(fmtVnd(0)).toBe('0');
      expect(fmtVnd(null)).toBe('0');
      expect(fmtVnd(undefined)).toBe('0');
      expect(fmtVnd('')).toBe('0');
    });

    it('xử lý chuỗi số và số âm', () => {
      expect(fmtVnd('50000')).toBe('50,000');
      expect(fmtVnd(-25000)).toBe('-25,000');
    });

    it('làm tròn số thập phân trước khi định dạng', () => {
      expect(fmtVnd(99999.6)).toBe('100,000');
    });
  });

  describe('Bảo mật & Escape HTML (esc & q)', () => {
    it('chuyển đổi đầy đủ các ký tự đặc biệt nguy hiểm XSS', () => {
      const malicious = '<script>alert("xss") & test\'</script>';
      const safe = esc(malicious);
      expect(safe).not.toContain('<');
      expect(safe).not.toContain('>');
      expect(safe).toContain('&lt;script&gt;');
      expect(safe).toContain('&quot;xss&quot;');
      expect(safe).toContain('&amp;');
      expect(safe).toContain('&#39;');
    });

    it('xử lý null và undefined không bị crash', () => {
      expect(esc(null)).toBe('');
      expect(esc(undefined)).toBe('');
      expect(esc(123)).toBe('123');
    });

    it('hàm q() bọc chuỗi an toàn cho attribute onclick', () => {
      const res = q('DH123');
      expect(res).toContain('&quot;DH123&quot;');
    });
  });

  describe('Chuẩn hóa mã & Trạng thái đơn hàng (normId, isLife, normSt)', () => {
    it('normId loại bỏ khoảng trắng, dấu gạch và viết hoa', () => {
      expect(normId(' dh-123_456.789 ')).toBe('DH123456789');
      expect(normId(null)).toBe('');
    });

    it('isLife phát hiện chính xác gói vĩnh viễn đa ngôn ngữ', () => {
      expect(isLife('Gói Vĩnh Viễn')).toBe(true);
      expect(isLife('vinh vien VIP')).toBe(true);
      expect(isLife('Lifetime Access')).toBe(true);
      expect(isLife('永久套餐')).toBe(true);
      expect(isLife('Gói 1 tháng')).toBe(false);
      expect(isLife('1 Year Sub')).toBe(false);
    });

    it('normSt chuẩn hóa trạng thái về mã hệ thống', () => {
      expect(normSt('paid')).toBe('success');
      expect(normSt('rejected')).toBe('failed');
      expect(normSt('pending')).toBe('pending');
      expect(normSt('active')).toBe('active');
      expect(normSt('')).toBe('pending');
    });

    it('trimNum làm tròn 2 chữ số thập phân', () => {
      expect(trimNum(12.3456)).toBe('12.35');
      expect(trimNum('10')).toBe('10');
      expect(trimNum('abc')).toBe('0');
    });
  });

  describe('Sinh mã ngẫu nhiên (genId, genHex)', () => {
    it('genId sinh chuỗi có tiền tố DH và độ dài 12 ký tự', () => {
      const id1 = genId();
      const id2 = genId();
      expect(id1.startsWith('DH')).toBe(true);
      expect(id1.length).toBe(12);
      expect(id1).not.toBe(id2);
    });

    it('genHex sinh chuỗi hex đúng độ dài yêu cầu', () => {
      const hex = genHex(16);
      expect(hex.length).toBe(16);
      expect(/^[0-9a-f]{16}$/.test(hex)).toBe(true);
    });
  });

  describe('Xử lý ngày giờ & Múi giờ (parseAny, fmtBank, timezone)', () => {
    it('quản lý múi giờ Việt Nam và Thượng Hải', () => {
      setTimezone('VN');
      expect(getTz()).toBe('Asia/Ho_Chi_Minh');
      setTimezone('CN');
      expect(getTz()).toBe('Asia/Shanghai');
      setTimezone('VN'); // Reset
    });

    it('parseAny phân tích epoch timestamp hoặc chuỗi ngày', () => {
      const now = 1714500000000;
      expect(parseAny(now)).toBe(now);
      expect(parseAny('')).toBe(0);
      expect(parseAny(null)).toBe(0);
      const parsed = parseAny('2026-05-01 12:00:00');
      expect(parsed).toBeGreaterThan(0);
    });

    it('fmtBank định dạng ngày chuẩn DD/MM/YYYY HH:mm', () => {
      const ts = 1714539600000; // Epoch milliseconds
      const formatted = fmtBank(ts, 'Asia/Ho_Chi_Minh');
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    });
  });

  describe('Dark / Light Theme (toggleTheme, initTheme)', () => {
    beforeEach(() => {
      document.documentElement.classList.remove('dark');
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    });

    it('toggleTheme chuyển đổi class dark trên document và lưu localStorage', () => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      toggleTheme();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(window.localStorage?.getItem('vpn_theme')).toBe('dark');
      toggleTheme();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(window.localStorage?.getItem('vpn_theme')).toBe('light');
    });

    it('initTheme khôi phục đúng theme đã lưu trong localStorage', () => {
      window.localStorage?.setItem('vpn_theme', 'dark');
      initTheme();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
