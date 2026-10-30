import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WORKER_URL,
  getSiteKey,
  getAdminToken,
  setAdminToken,
  clearAdminToken,
  setOnUnauthorized,
  request,
  wpost,
  wpostRetry,
  aj
} from '../src/api.js';

describe('src/api.js — Giao tiếp API & Cơ chế An toàn Idempotency', () => {
  beforeEach(() => {
    clearAdminToken();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearAdminToken();
  });

  describe('Cấu hình Worker URL & Quản lý Token', () => {
    it('WORKER_URL trỏ chính xác về Worker Production hiện tại', () => {
      expect(WORKER_URL).toBe('https://vpntrinhhg3worker.lucastanora.workers.dev');
    });

    it('getSiteKey trả về hostname chuẩn hóa làm namespace lưu trữ', () => {
      const siteKey = getSiteKey();
      expect(typeof siteKey).toBe('string');
      expect(siteKey.length).toBeGreaterThan(0);
      expect(siteKey).not.toContain('.');
    });

    it('setAdminToken, getAdminToken và clearAdminToken hoạt động an toàn', () => {
      expect(getAdminToken()).toBe('');
      setAdminToken('test_secret_token_123');
      expect(getAdminToken()).toBe('test_secret_token_123');
      clearAdminToken();
      expect(getAdminToken()).toBe('');
    });
  });

  describe('Hàm universal request()', () => {
    it('tự động gắn Content-Type và Authorization token khi có token', async () => {
      setAdminToken('my_adm_token');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });
      globalThis.fetch = mockFetch;

      await request('/api/orders');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://vpntrinhhg3worker.lucastanora.workers.dev/api/orders');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['Authorization']).toBe('Bearer my_adm_token');
    });

    it('kích hoạt onUnauthorizedCallback khi server trả về mã 401', async () => {
      const on401 = vi.fn();
      setOnUnauthorized(on401);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      });

      await request('/api/orders');
      expect(on401).toHaveBeenCalledTimes(1);
      setOnUnauthorized(null);
    });
  });

  describe('Hàm wpost()', () => {
    it('trả về đúng định dạng contract: { ok, status, data } khi thành công', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ orderId: 'DH123456' })
      });

      const res = await wpost('/api/public/order', { pkg: 'vip' });
      expect(res.ok).toBe(true);
      expect(res.status).toBe(200);
      expect(res.data.orderId).toBe('DH123456');
    });

    it('xử lý lỗi mạng mượt mà không văng exception (soft-fail)', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Mất kết nối mạng'));

      const res = await wpost('/api/public/order', { pkg: 'vip' });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(0);
      expect(res.data.error).toContain('Mất kết nối');
    });
  });

  describe('Quy tắc an toàn 41: Idempotency trong wpostRetry()', () => {
    it('TUYỆT ĐỐI KHÔNG RETRY khi gọi /api/public/order dù n = 5', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network drop'));
      globalThis.fetch = mockFetch;

      const res = await wpostRetry('/api/public/order', { pkg: 'vip' }, 5);
      // Bắt buộc chỉ gọi đúng 1 lần duy nhất để không tạo đơn hàng rác thứ hai
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(res.ok).toBe(false);
    });

    it('TUYỆT ĐỐI KHÔNG RETRY khi gọi /api/public/upgrade dù n = 3', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Timeout'));
      globalThis.fetch = mockFetch;

      const res = await wpostRetry('/api/public/upgrade', { orderId: 'DH123' }, 3);
      // Bắt buộc chỉ gọi đúng 1 lần duy nhất để không trừ tiền hoặc gia hạn đúp
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(res.ok).toBe(false);
    });

    it('cho phép retry với các API đọc dữ liệu an toàn khác khi gặp lỗi', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 2) {
          return { ok: false, status: 502, json: async () => ({}) };
        }
        return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
      });

      const res = await wpostRetry('/api/public/check_status', {}, 2);
      expect(callCount).toBe(2);
      expect(res.ok).toBe(true);
    });
  });

  describe('Hàm aj() của Admin', () => {
    it('ném lỗi có nội dung rõ ràng khi server phản hồi mã lỗi và soft=false', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Sai mật khẩu quản trị' })
      });

      await expect(aj('/api/admin_check')).rejects.toThrow('Sai mật khẩu quản trị');
    });

    it('không ném lỗi khi tùy chọn soft: true được bật', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Không tìm thấy' })
      });

      const res = await aj('/api/links/missing', { soft: true });
      expect(res).toEqual({ error: 'Không tìm thấy' });
    });
  });
});
