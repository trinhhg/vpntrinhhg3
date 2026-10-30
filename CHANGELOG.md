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

## [1.0.0] — Hoàn Thành Tái Cấu Trúc Toàn Diện (Vite, Local NPM, Chart.js, 56 Automated Tests) (2026-10-30)

### Milestone Summary
- Đã hoàn tất 100% toàn bộ 7 giai đoạn (Giai đoạn 0 đến Giai đoạn 6) theo đúng kế hoạch kỹ thuật.
- Toàn bộ frontend được chuyển từ HTML inline sang Vite 5 + Tailwind CSS 3.4 nội bộ + Vanilla JS ESM với kiến trúc tối giản (~10–12 file chính).
- Loại bỏ hoàn toàn 9 CDN ngoài, thay ApexCharts bằng Chart.js (MIT), giữ nguyên 100% giao diện, nghiệp vụ và hợp đồng 49 API endpoints.
- Đạt 56/56 bài test tự động (Vitest + Playwright) với chi phí $0 trọn đời.
- Sẵn sàng để hợp nhất (merge) vào nhánh `main`.

---

## [0.9.7] — Giai đoạn 6: Kiểm Tra Cấu Hình Cloudflare Pages Preview & Fallback Routing (2026-10-30)

### Added
- **Khởi tạo `.node-version`:** Cố định phiên bản Node.js LTS `20.18.0` cho môi trường Cloudflare Pages Build Runner, đảm bảo tính nhất quán tuyệt đối giữa môi trường phát triển cục bộ và CI/CD trên Cloudflare.
- **Tạo `tests/routing.test.js` (5 routing tests):** Kiểm tra toàn diện cơ chế định tuyến của `_worker.js`:
  - Kiểm tra điều hướng `/admin` và `/admin/` về `/admin.html`.
  - Kiểm tra proxy ngầm toàn bộ 6 chuẩn Link Sub (`/v1`-`/v6`) sang `vpntrinhhg3worker.lucastanora.workers.dev`.
  - Kiểm tra proxy ngầm `/api/*` và `/qr/*`.
  - Kiểm tra phục vụ tài nguyên tĩnh `env.ASSETS` (`/`, `/index.html`, `/admin.html`, manifest, icon, css, js).

### Changed
- **Chuẩn hóa `_worker.js` (cả root và `public/`):** Tự động điều hướng `/admin` và `/admin/` sang `/admin.html` cho `env.ASSETS.fetch` mà không bắt buộc người dùng phải gõ thủ công `.html`. Khởi tạo `Request` tương thích cross-realm chuẩn Cloudflare Worker.
- **Cập nhật `_redirects` (cả root và `public/`):** Khai báo rõ ràng quy tắc phân giải cho Cloudflare Pages:
  ```text
  /admin       /admin.html   200
  /admin/*     /admin.html   200
  /*           /index.html   200
  ```
  Giúp khách hàng truy cập `/portal/*` hoặc bài hướng dẫn không bị lỗi 404, đồng thời quản trị viên vào `/admin` được nạp trực tiếp giao diện quản trị.

### Verified
- **Chạy toàn bộ 56 bài kiểm thử tự động (`npm run test:all`):**
  - 52/52 Unit, Integration, Schema, Business & Routing tests (Vitest) hoàn thành trong 1.67s (100% Pass).
  - 4/4 Browser E2E tests (Playwright) hoàn thành trong 2.9s (100% Pass).
- **Kiểm tra Root Assets (`dist/`):** Đảm bảo cả 8 file tĩnh cốt lõi sẵn sàng cho Cloudflare Pages (`index.html`, `admin.html`, `_worker.js`, `_redirects`, `manifest.json`, `manifestadmin.json`, `icon-192.png`, `icon-512.png`).

---

## [0.9.6] — Giai đoạn 5: Kiểm Thử Nghiệp Vụ Tự Động (Vitest & Playwright) (2026-10-30)

### Added
- **Bộ Kiểm thử Đơn vị & Tích hợp (Vitest 47 tests):**
  - **`tests/shared.test.js` (18 tests):** Kiểm thử định dạng tiền tệ `fmtVnd`, làm sạch mã độc XSS `esc` và `q`, sinh mã đơn hàng `genId`/`genHex`, chuẩn hóa trạng thái `normSt`, nhận diện gói vĩnh viễn `isLife`, phân tích ngày giờ `parseAny` và múi giờ Việt Nam `fmtBank`, cơ chế chuyển đổi và lưu trữ giao diện Dark/Light Mode.
  - **`tests/api.test.js` (12 tests):** Kiểm thử giao tiếp Worker Backend, tự động chèn header `Authorization` Bearer token và `x-site-key`, cơ chế soft-fail khi mất mạng, xử lý mã 401 Unauthorized, và **xác thực nghiêm ngặt Quy tắc An toàn 41 & 42**: tuyệt đối không retry tạo đơn (`/api/public/order`) hoặc gia hạn (`/api/public/upgrade`) để ngăn ngừa phát sinh giao dịch kép.
  - **`tests/schema.test.js` (8 tests):** Ứng dụng Zod kiểm định hợp đồng dữ liệu chuẩn hóa cho `OrderSchema`, `LinkPoolItemSchema`, `D1TransactionSchema`, và `PackageConfigSchema`.
  - **`tests/business.test.js` (9 tests):** Kiểm thử tính toán giá gói cước, mã giảm giá phần trăm/cố định, quy đổi tỷ giá VND-CNY an toàn, tổng hợp doanh thu theo cổng thanh toán, tính toán lợi nhuận ròng, thuật toán cấp phát node Link Pool khả dụng, và làm sạch bài viết CMS với DOMPurify.
  - **`tests/setup.js`:** Mock storage môi trường Node.js giải quyết triệt để cảnh báo Node 26 experimental localStorage.
- **Bộ Kiểm thử Trình duyệt Trực tiếp E2E (Playwright 4 tests):**
  - **`playwright.config.js`:** Cấu hình headless Microsoft Edge, tự động khởi động server preview cục bộ (`127.0.0.1:4173`) với cơ chế fast-timeout an toàn.
  - **`tests/e2e/pages.spec.js` (4 tests):** Kiểm tra tải thực tế trang Khách hàng (`index.html`) và Quản trị (`admin.html`), xác nhận không có runtime error console, kiểm tra tương tác click chuyển Dark/Light Mode trên DOM, và kiểm tra hiển thị canvas biểu đồ Chart.js.

### Fixed
- **Khắc phục lỗi treo cổng mạng khi chạy Playwright:** Chuẩn hóa cấu hình `webServer` sang địa chỉ IPv4 tường minh (`127.0.0.1:4173`) kèm cờ `--host`, đồng thời chạy lệnh kiểm thử với quyền truy cập cổng cục bộ để không bị nghẽn socket sandbox trên Windows.

### Verified
- **Chạy toàn bộ 51 bài kiểm thử tự động (`npm run test:all`):**
  - 47/47 Unit & Integration tests (Vitest) hoàn thành trong 1.73s (100% Pass).
  - 4/4 Browser E2E tests (Playwright) hoàn thành trong 4.0s (100% Pass).
- **Biên dịch Production (`npm run build`):** Hoàn thành trong 3.43s với 0 cảnh báo và 0 lỗi.

---

## [0.9.5] — Giai đoạn 4: Chuyển Thư Viện Sang Local NPM & Đổi ApexCharts sang Chart.js (2026-10-30)

### Added
- **Đóng gói Font và Icon nội bộ:**
  - Nhập `@fontsource/plus-jakarta-sans` và `@fortawesome/fontawesome-free` trực tiếp trong `src/customer.css` và `src/admin.css`.
  - Toàn bộ webfont (`.woff2`, `.woff`, `.ttf`) được Vite trích xuất và lưu tĩnh trong `dist/assets/`, không còn phụ thuộc vào Google Fonts hay CDN FontAwesome.
- **Tích hợp Chart.js (v4.4.3, giấy phép MIT):**
  - Thay thế toàn bộ ApexCharts (giấy phép Community có điều kiện) bằng Chart.js đạt chuẩn 100% mã nguồn mở tự do.
  - Tái hiện chính xác 3 biểu đồ quản trị trong `src/admin.js`:
    1. Biểu đồ cột chồng (Stacked Bar Chart): Doanh thu phân theo Ngân hàng VN, Alipay và WeChat theo từng tháng.
    2. Biểu đồ tròn Donut (Donut Chart): Cơ cấu tỷ trọng cổng thanh toán.
    3. Biểu đồ đường diện tích mượt mà (Smooth Area Line Chart): Doanh thu so với Chi phí hạ tầng và Lợi nhuận ròng.
  - Đảm bảo tương thích hoàn toàn cấu trúc dữ liệu, bảng màu nhận diện thương hiệu (`#4f46e5`, `#0284c7`, `#10b981`, `#f97316`), format tooltip tiền tệ VND, và tự động dọn dẹp canvas instance khi chuyển tab hoặc refresh dữ liệu.
- **Tối ưu hóa Code Splitting (Vite manualChunks):**
  - Phân tách vendor chunks tại `vite.config.js`: `vendor-chart` (Chart.js), `vendor-quill` (Quill WYSIWYG editor), `vendor-grid` (Grid.js), `vendor-swal` (SweetAlert2), và `vendor-core` (DOMPurify, Day.js, SortableJS, Navigo, QRCode.js).

### Changed
- **`index.html`:** Xóa bỏ toàn bộ thẻ `<link>` và `<script>` tải từ CDN ngoài: Google Fonts (`fonts.googleapis.com`), Font Awesome CDN (`cdnjs.cloudflare.com`), Day.js CDN, SweetAlert2 CDN, Navigo CDN, QRCode.js CDN, Currency.js CDN.
- **`admin.html`:** Xóa bỏ toàn bộ thẻ CDN ngoài: Google Fonts, Font Awesome, ApexCharts CDN (`cdn.jsdelivr.net/npm/apexcharts`), Grid.js CDN (`unpkg.com/gridjs`), Quill CDN, SortableJS CDN, Day.js CDN, SweetAlert2 CDN, DOMPurify CDN.
- **`src/customer.js` & `src/admin.js`:** Nhập trực tiếp các module NPM cục bộ (`dayjs`, `currency.js`, `navigo`, `qrcodejs`, `sweetalert2`, `dompurify`, `quill`, `gridjs`, `sortablejs`, `chart.js`), đồng thời gắn các đối tượng toàn cục cần thiết lên `window` để tương thích 100% với các hàm sẵn có.

### Removed
- **0 external runtime network dependencies:** Loại bỏ triệt để nguy cơ gián đoạn do CDN ngoài bị chặn, sập hoặc chậm tại Việt Nam / Trung Quốc.

### Verified
- **Biên dịch độc lập & tự chủ hoàn toàn:** Lệnh `npm run build` hoàn thành trong 3.26s với 0 cảnh báo và 0 lỗi. Toàn bộ tài nguyên font, icon, css và js được phục vụ tĩnh từ chính domain Cloudflare Pages.
- **Kiểm tra Root Assets:** Xác nhận đầy đủ 8 file gốc bắt buộc tại `dist/` (`index.html`, `admin.html`, `_worker.js`, `_redirects`, `manifest.json`, `manifestadmin.json`, `icon-192.png`, `icon-512.png`).

---

## [0.9.4] — Giai đoạn 3: Chia Code Tối Thiểu (4 Module JavaScript Chính) (2026-10-30)

### Added
- **`src/api.js`:** Module giao tiếp Worker Backend tập trung duy nhất (`request`, `wpost`, `wpostRetry`, `api`, `aj`, `getSiteKey`, `getAdminToken`, `setAdminToken`, `clearAdminToken`). Chặn đứng rủi ro retry mù quáng cho API tạo đơn hàng và nâng cấp (`/api/public/order`, `/api/public/upgrade`).
- **`src/shared.js`:** Module hàm dùng chung giữa Khách hàng và Admin (`$`, `arr`, `esc`, `q`, `cm`, `sm`, `genId`, `genHex`, `normId`, `isLife`, `normSt`, `trimNum`, `VND_SEP`, `fmtVnd`, `sleep`, `cp`, `toast`, `showToast`, `parseAny`, `fmtBank`, `oTs`, `paintThemeIcon`, `toggleTheme`, `initTheme`, `autoGrow`).
- **`src/customer.js`:** Module nghiệp vụ khách hàng (Cửa hàng, Gói cước, Checkout, Thanh toán QR, Tra cứu portal, Đa ngôn ngữ i18n, Router Navigo, Hướng dẫn sử dụng).
- **`src/admin.js`:** Module nghiệp vụ quản trị toàn diện (Quản lý đơn, Kiểm tra fulfillment, Giao dịch D1, Link Sub, Link Pool, Gói cước, Mail Composer, CMS Hướng dẫn, Cài đặt hệ thống, Test mode).

### Changed
- **`index.html`:** Chuyển đổi từ file nguyên khối 2.497 dòng thành khung HTML 545 dòng, nạp script module `<script type="module" src="/src/customer.js"></script>`.
- **`admin.html`:** Chuyển đổi từ file nguyên khối 5.449 dòng thành khung HTML 1.157 dòng, nạp script module `<script type="module" src="/src/admin.js"></script>`.
- **Tương thích DOM & HTML Event Handlers:** Toàn bộ 400+ hàm và biến toàn cục cần thiết cho các thuộc tính `onclick`, `onchange`, `oninput` trên HTML được gắn an toàn vào `window` để đảm bảo 100% tương thích ngược.

### Verified
- **Biên dịch Vite Multi-page:** `npm run build` hoàn thành trong 1.41s, tách tự động shared chunk `dist/assets/shared-*.js` (5.86 kB), `dist/assets/main-*.js` (91.14 kB), `dist/assets/admin-*.js` (238.71 kB).
- **Dung lượng HTML thu gọn:**
  - `dist/index.html` giảm từ 201 kB xuống còn 64.05 kB.
  - `dist/admin.html` giảm từ 410 kB xuống còn 101.00 kB.
- **Bảo toàn tính toàn vẹn:** Checksum SHA256 của `dist/_worker.js` và `dist/_redirects` khớp 100% với file gốc.

---

## [0.9.3] — Giai đoạn 2: Chuyển đổi HTML & CSS sang Module Tĩnh (2026-10-30)

### Added
- **`src/customer.css`:** Tách toàn bộ custom CSS từ thẻ `<style>` của `index.html` (~170 dòng animation, dark mode, card glassmorphism, responsive utilities) kết hợp các chỉ thị `@tailwind base`, `@tailwind components`, `@tailwind utilities`.
- **`src/admin.css`:** Tách toàn bộ custom CSS từ thẻ `<style>` của `admin.html` (~185 dòng glass-card, SweetAlert2 toast chuẩn, badge, macro-dot, toggle switch, word-editor) kết hợp Tailwind CSS.

### Changed
- **`index.html`:** Loại bỏ hoàn toàn script Tailwind Play CDN (`cdn.tailwindcss.com`) và khối `<style>` inline; thay thế bằng `<link rel="stylesheet" href="/src/customer.css">`.
- **`admin.html`:** Loại bỏ hoàn toàn script Tailwind Play CDN (`cdn.tailwindcss.com`) và khối `<style>` inline; thay thế bằng `<link rel="stylesheet" href="/src/admin.css">`.

### Verified
- **Biên dịch CSS nội bộ:** Vite và PostCSS tự động quét class, loại trừ CSS thừa và đóng gói thành 2 file CSS tĩnh tại `dist/assets/` (`main-*.css` 90.16 kB và `admin-*.css` 87.66 kB).
- **Loại bỏ runtime CDN:** Xác nhận `dist/index.html` và `dist/admin.html` không còn bất kỳ liên kết nào tới `cdn.tailwindcss.com`.
- **Bảo toàn tài nguyên gốc:** Cả 8 file tĩnh ở root `dist/` vẫn đầy đủ và nguyên vẹn.

---

## [0.9.2] — Giai đoạn 1: Chuẩn bị Môi trường Build & Thiết lập Vite (2026-10-30)

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
