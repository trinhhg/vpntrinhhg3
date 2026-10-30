import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ==================== ZOD SCHEMAS CHO HỢP ĐỒNG DỮ LIỆU ====================

export const OrderSchema = z.object({
  orderId: z.string().regex(/^DH[A-Z0-9]+$/),
  status: z.enum(['pending', 'paid', 'active', 'expired', 'locked', 'cancelled', 'success', 'failed']),
  totalVnd: z.union([z.number(), z.string()]),
  totalCny: z.union([z.number(), z.string()]).optional(),
  pkg: z.string().min(1),
  days: z.number().int().nonnegative(),
  link: z.string().optional(),
  note: z.string().optional(),
  createdTs: z.number().optional(),
  date: z.string().optional()
});

export const LinkPoolItemSchema = z.object({
  id: z.string().min(1),
  orig: z.string().url(),
  masked: z.string().min(1),
  expDate: z.string(),
  linkIndex: z.number().int().optional(),
  used: z.boolean(),
  status: z.string().optional()
});

export const D1TransactionSchema = z.object({
  txId: z.string().min(1),
  amount: z.number().positive(),
  bank: z.string().min(1),
  content: z.string(),
  date: z.string()
});

export const PackageConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  vnd: z.number().nonnegative(),
  cny: z.number().nonnegative(),
  days: z.number().int().positive(),
  gb: z.number().nonnegative(),
  desc: z.string().optional()
});

// ==================== KIỂM THỬ XÁC THỰC ====================

describe('tests/schema.test.js — Xác thực Hợp đồng Dữ liệu với Zod', () => {
  describe('Xác thực Schema Đơn hàng (OrderSchema)', () => {
    it('chấp nhận đơn hàng hợp lệ theo chuẩn hệ thống', () => {
      const validOrder = {
        orderId: 'DHABC123XYZ',
        status: 'paid',
        totalVnd: 150000,
        totalCny: 45,
        pkg: 'Gói 3 Tháng VIP',
        days: 90,
        link: 'vless://example.com:443',
        createdTs: 1714539600000
      };

      const result = OrderSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });

    it('từ chối đơn hàng có mã ID không đúng chuẩn DH', () => {
      const invalidOrder = {
        orderId: 'INVALID_123',
        status: 'pending',
        totalVnd: 50000,
        pkg: 'Gói 1 Tháng',
        days: 30
      };

      const result = OrderSchema.safeParse(invalidOrder);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('orderId');
      }
    });

    it('từ chối trạng thái đơn hàng không nằm trong enum', () => {
      const invalidStatus = {
        orderId: 'DH12345678',
        status: 'unknown_status',
        totalVnd: 50000,
        pkg: 'Gói 1 Tháng',
        days: 30
      };

      const result = OrderSchema.safeParse(invalidStatus);
      expect(result.success).toBe(false);
    });
  });

  describe('Xác thực Schema Link Pool (LinkPoolItemSchema)', () => {
    it('chấp nhận node VPN hợp lệ với URL nguồn chuẩn', () => {
      const validLink = {
        id: 'node_hk_01',
        orig: 'https://sub.myprovider.com/v1/sub?token=abc',
        masked: 'https://vpn.trinhhg.com/v1/hk01',
        expDate: '2026-12-31',
        linkIndex: 0,
        used: false,
        status: 'active'
      };

      const result = LinkPoolItemSchema.safeParse(validLink);
      expect(result.success).toBe(true);
    });

    it('từ chối nếu orig không phải là URL hợp lệ', () => {
      const invalidLink = {
        id: 'node_err',
        orig: 'not-a-url',
        masked: 'masked_url',
        expDate: '2026-12-31',
        used: false
      };

      const result = LinkPoolItemSchema.safeParse(invalidLink);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('orig');
      }
    });
  });

  describe('Xác thực Schema Giao dịch D1 (D1TransactionSchema)', () => {
    it('chấp nhận giao dịch ngân hàng hợp lệ', () => {
      const validTx = {
        txId: 'MB_20260501_998877',
        amount: 250000,
        bank: 'MBBank',
        content: 'DHABC123XYZ chuyen tien',
        date: '2026-05-01 10:15:30'
      };

      const result = D1TransactionSchema.safeParse(validTx);
      expect(result.success).toBe(true);
    });

    it('từ chối giao dịch có số tiền âm hoặc bằng 0', () => {
      const invalidTx = {
        txId: 'MB_000',
        amount: -50000,
        bank: 'MBBank',
        content: 'test',
        date: '2026-05-01'
      };

      const result = D1TransactionSchema.safeParse(invalidTx);
      expect(result.success).toBe(false);
    });
  });

  describe('Xác thực Schema Gói cước VPN (PackageConfigSchema)', () => {
    it('chấp nhận gói cước có giá và thời hạn chuẩn', () => {
      const validPkg = {
        id: 'pkg_1m',
        name: 'Gói 1 Tháng',
        vnd: 50000,
        cny: 15,
        days: 30,
        gb: 100,
        desc: 'Không giới hạn thiết bị'
      };

      const result = PackageConfigSchema.safeParse(validPkg);
      expect(result.success).toBe(true);
    });
  });
});
