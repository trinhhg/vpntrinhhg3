# CHANGELOG — LỊCH SỬ THAY ĐỔI DỰ ÁN VPNTRINHHG3

> Mọi thay đổi đáng chú ý của dự án `vpntrinhhg3` sẽ được ghi nhận chi tiết tại file này theo nguyên tắc SemVer (Semantic Versioning) và quy ước chuẩn hóa.  
> Các loại thay đổi:
> - `Added`: Thêm chức năng, tài liệu hoặc file cấu hình mới.
> - `Changed`: Thay đổi trong chức năng hiện có hoặc cấu trúc mã nguồn.
> - `Deprecated`: Tính năng sẽ bị loại bỏ trong tương lai.
> - `Removed`: Tính năng hoặc dependency đã bị xóa.
> - `Fixed`: Sửa lỗi phát sinh.
> - `Security`: Khắc phục lỗ hổng hoặc cải thiện an toàn bảo mật.

---

## [Unreleased] — Giai đoạn 1: Chuẩn bị Môi trường Build & Thiết lập Vite (2026-10-30)

### Added
- **Khởi tạo `.gitignore`:** Loại trừ `node_modules/`, `dist/`, `.vite/`, logs, và các file tạm của hệ điều hành.
- **Khởi tạo `package.json` & `package-lock.json`:**
  - Runtime: `@fontsource/plus-jakarta-sans` (v5), `@fortawesome/fontawesome-free` (v6), `chart.js` (v4), `currency.js` (v2), `dayjs` (v1), `dompurify` (v3), `gridjs` (v6), `navigo` (v8), `qrcodejs` (v1), `quill` (v2), `sortablejs` (v1), `sweetalert2` (v11), `zod` (v3).
  - Dev/Build: `vite` (v5), `tailwindcss` (v3.4), `postcss` (v8), `autoprefixer` (v10), `vitest` (v1), `jsdom` (v24), `@playwright/test` (v1.45).
- **Khởi tạo `vite.config.js`:** Thiết lập Multi-page application cho 2 entrypoints `index.html` và `admin.html`, thư mục output `dist/`, và sao chép trực tiếp `public/`.
- **Khởi tạo `tailwind.config.js` & `postcss.config.js`:** Cấu hình Tailwind nội bộ quét `index.html`, `admin.html` và `src/**/*.{js,html}`.
- **Khởi tạo `THIRD_PARTY_NOTICES.md`:** Liệt kê đầy đủ 20 thư viện mã nguồn mở (100% MIT, Apache 2.0, BSD-3-Clause, SIL OFL) tuân thủ triệt để chính sách $0.
- **Thiết lập thư mục `public/`:** Chứa các tài nguyên tĩnh bắt buộc phục vụ nguyên bản ở root: `_worker.js`, `_redirects`, `manifest.json`, `manifestadmin.json`, `icon-192.png`, `icon-512.png`.

### Fixed
- **Sửa lỗi cú pháp HTML tại dòng 671 của `admin.html`:** Xóa ký tự `<   ` gõ nhầm trước thẻ `<div id="mcProg">` để trình phân tích HTML chuẩn của Vite (`parse5`) biên dịch thành công.

### Verified
- **Build kiểm tra ban đầu:** Lệnh `npm run build` hoàn thành trong 738ms, sinh đầy đủ 8 file tại `dist/` (`index.html`, `admin.html`, `_worker.js`, `_redirects`, `manifest.json`, `manifestadmin.json`, `icon-192.png`, `icon-512.png`).
- SHA256 checksum của `dist/_worker.js` và `dist/_redirects` khớp 100% với file gốc.

---

## [0.9.1] — Giai đoạn 0: Khởi tạo Nền tảng & Audit Toàn diện (2026-10-30)

### Added
- **Tạo nhánh an toàn `refactor/vite-migration`:** Tách biệt hoàn toàn môi trường làm việc tái cấu trúc khỏi nhánh `main` (Production) đang vận hành.
- **Khởi tạo `AGENTS.md`:** Thiết lập bộ 80 quy tắc an toàn bảo vệ dự án, bao gồm 7 phân hệ nghiêm ngặt:
  1. Quy tắc chỉnh sửa mã nguồn (Quy tắc 1–25)
  2. Quy tắc bảo mật (Quy tắc 26–37)
  3. Quy tắc dữ liệu và nghiệp vụ (Quy tắc 38–48)
  4. Quy tắc kiểm thử (Quy tắc 49–58)
  5. Quy tắc GitHub và triển khai (Quy tắc 59–70)
  6. Quy tắc chi phí $0 (Quy tắc 71–80)
  7. Quy tắc báo cáo bắt buộc sau mỗi tác vụ.
- **Khởi tạo `PROJECT_MAP.md`:** Bản đồ kiến trúc chi tiết dự án:
  - Sơ đồ tương tác luồng dữ liệu giữa Trình duyệt, Cloudflare Pages, Worker Backend, KV, D1 và GitHub Actions.
  - Phân định rõ vai trò và giới hạn trách nhiệm của 4 module JavaScript đích (`api.js`, `shared.js`, `customer.js`, `admin.js`) và 2 file CSS (`customer.css`, `admin.css`).
  - Bản đồ chi tiết toàn bộ 41 admin endpoints và 8 customer endpoints.
  - Cơ chế Proxy Worker `_worker.js` và quy tắc chuyển hướng `_redirects`.
  - Danh mục toàn bộ các `localStorage` / `sessionStorage` keys (cả tĩnh và động theo hostname).
  - Quy trình bảo vệ quota Cloudflare Free ($0/tháng).
- **Khởi tạo `CHANGELOG.md`:** Nhật ký theo dõi lịch sử cập nhật có hệ thống.

### Audited
- Hoàn thành audit tĩnh 100% mã nguồn:
  - `index.html` (2.673 dòng | ~199 KB | 8 API endpoints | 6 localStorage keys).
  - `admin.html` (5.636 dòng | ~405 KB | 41 API endpoints | 8 dynamic localStorage keys).
  - `_worker.js` (Proxy Worker chuyển hướng `/api`, `/qr`, `/v1`-`/v6` sang `vpntrinhhg3worker.lucastanora.workers.dev`).
  - `update_sub.py` (1.511 dòng script đồng bộ node VPN sử dụng `WEB_API_SECRET2`).
  - `.github/workflows/update.yml` (Workflow tự động hóa chạy hàng ngày lúc 00:00 UTC).
  - Rà soát lịch sử Git và xác nhận không có secret quản trị dạng plain text bị lộ.
  - Nhận diện các điểm thắt cổ chai kiến trúc:
    1. Trộn lẫn Read và Write trong `fetchAll()` của `admin.html` (tự động POST dữ liệu khi tải trang).
    2. Retry không an toàn `wpostRetry` cho các thao tác tạo đơn (`/api/public/order`, `/api/public/upgrade`).
    3. Sự phụ thuộc vào nhiều CDN bên ngoài (Tailwind Play CDN, ApexCharts, Quill, Day.js, v.v.).
    4. Thao tác `localStorage.clear()` quá rộng trong `resetAndHardReload()`.

---

## [0.9.0] — Phiên bản Hiện tại trên `main` (Production)
- Vận hành nguyên khối (monolithic) với hai file HTML `index.html` và `admin.html` chứa toàn bộ logic nhúng inline.
- Đồng bộ node VPN tự động qua GitHub Actions và `update_sub.py`.
- Cloudflare Pages Advanced Mode với `_worker.js`.
