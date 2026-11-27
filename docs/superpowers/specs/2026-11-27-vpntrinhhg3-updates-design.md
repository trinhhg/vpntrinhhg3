# Design Doc: VPNTrinhHg3 Admin Controls, Guide Layout & Content Refresh, and Live E2E Verification

**Date:** 2026-11-27  
**Repository:** `trinhhg/vpntrinhhg3`  
**Status:** Draft — awaiting owner approval

---

## 1. Intent & Why

Nâng cấp trải nghiệm quản trị và trang khách hàng (`index` & `admin`) cho `vpntrinhhg3`:
1. Cho phép Admin bật/tắt nhanh chế độ hiển thị Footer đầy đủ ở trang `index` để chuyển sang thanh Footer tối giản 1 hàng khi cần gọn giao diện mà vẫn giữ nguyên các kênh hỗ trợ và bản quyền.
2. Khắc phục tình trạng khung **Bài viết liên quan** bị chia lưới 2:2 thiếu cân đối hoặc cắt cụt tiêu đề bằng bố cục **danh sách 1 cột kiểu thẻ bài báo** kèm trích đoạn mở đầu của từng bài viết.
3. Chuẩn hóa toàn bộ nội dung bài hướng dẫn (Android, iOS, Windows, macOS) và viết mới hoàn chỉnh bài **Lưu ý cho TikTok** trực tiếp trong CMS Admin (`GUIDES` KV) với liên kết tải thực tế đã xác minh, không ảnh/video thừa, đầy đủ cảnh báo bảo mật OS và anchor link cuộn nhanh.
4. Xác minh toàn bộ luồng nghiệp vụ và thay đổi mới bằng kiểm thử E2E trực tiếp trên trình duyệt thật qua subagent `browser` (trong Test Mode với dữ liệu test được dọn sạch sau khi hoàn tất).

---

## 2. Goals, Non-Goals & Constraints

### Goals
- **Phần 1.1:** Thêm block bảng mới ngay bên phải block `Cấu hình Làm mờ / Khóa / Kiểm tra (Web này)` trong `Admin → Cài đặt → Quản trị web` gồm toggle switch + nút **Lưu**. Trạng thái BẬT hiển thị Footer đầy đủ; TẮT thu gọn Footer còn đúng 1 hàng gồm 4 nút (`Zalo Support`, `Mess Support`, `WeChat`, `Telegram`) + dòng bản quyền `© 2026 VPN Trinh Hg. All rights reserved.`.
- **Phần 1.2:** Chuyển phần hiển thị `Hiện Mục bài viết liên quan` trên `index` (và bản xem trước trong `admin`) sang danh sách thẻ dọc 1 cột full-width kiểu bài báo gồm tiêu đề đầy đủ + mô tả ngắn trích từ phần đầu bài viết tương ứng + chỉ báo mở bài, cân đối trên mọi số lượng bài (1, 2, 3, 4+) ở cả desktop và mobile.
- **Phần 2:** Cập nhật 4 bài hướng dẫn (`Android`, `iOS`, `Windows`, `macOS`) và tạo 1 bài mới trong mục `Lưu ý cho TikTok` lưu vào KV `GUIDES` qua Admin, tuân thủ đúng quy tắc không ảnh/video, chỉ dùng đúng các app được yêu cầu, link sống đã kiểm tra thực tế, watermark mờ nhẹ vừa phải (nếu dùng).
- **Phần 3:** Kiểm thử live E2E qua subagent `browser` cho mọi tổ hợp thanh toán, nâng gói, gia hạn, copy/verify link, luồng Footer → Hướng dẫn → Bảng điều khiển khi chưa đăng nhập, đối soát D1 + auto fulfillment, tạo 1–5 link sub ẩn nguồn `djjc` HSD hôm nay + chạy cron khóa tự động (kèm danh sách mã đơn/link test và dọn sạch sau test), và xác minh lại toàn bộ Phần 1 & Phần 2.

### Non-Goals & Anti-Goals
- Không thay đổi kiến trúc Vite + Vanilla JS/CSS hoặc thêm thư viện mới.
- Không sửa `worker.js` trừ trường hợp thật sự cần thiết (lưu cấu hình bật/tắt Footer vào `cms.footer` giúp tương thích 100% với Worker đang chạy ngay lập tức mà không phải deploy Worker).
- Không ghi đè dữ liệu đơn hàng thật (`ALL_ORDERS` production) — toàn bộ test đơn hàng/thanh toán chạy ở Test Mode (`ALL_ORDERS_TEST`).
- Không `git commit`, `git push`, hay deploy lên Cloudflare Pages/Workers.

### Constraints
- Bảo toàn 100% hợp đồng API, localStorage keys (`vpn_footer_cache`, v.v.), và cơ chế sanitize `DOMPurify` (`GUIDE_PURIFY_CONFIG` / `CMS_PURIFY_CONFIG`).
- Không để lộ mật khẩu Admin hoặc bí mật trong source code, test files, log, hoặc ảnh chụp báo cáo.
- Chỉ sử dụng quy trình thuộc bộ skill `superpowers`.

---

## 3. Approaches Considered

### 3.1. Lưu cấu hình Bật/Tắt Footer (`Phần 1.1`)
- **Cách A (Chọn):** Lưu cờ `showFullFooter` (boolean, mặc định `true` khi chưa đặt) bên trong `cms.footer` qua `saveCmsDb({ footer: { showFullFooter } })`.
  - *Ưu điểm:* `worker.js` hiện tại đã trả sẵn `footer: cms.footer` trong `GET /api/public/config` và đã hỗ trợ deep-merge `footer` trong `POST /api/cms`. Hoạt động ngay lập tức trên cả local Vite preview lẫn production mà không cần deploy lại Worker.
  - *Lưu ý:* `saveFooterConfig()` trong `src/admin.js` khi ghi lại `cmsDb.footer` cần giữ nguyên `showFullFooter` hiện có để tránh vô tình reset cờ khi Admin lưu các cột Footer.
- **Cách B (Loại):** Lưu vào `cms.settings.showFullFooter` và sửa `worker.js` `/api/public/config` để trả thêm trường này.
  - *Nhược điểm:* Bắt buộc phải deploy lại Worker thì live/preview mới nhận được trường mới từ `/api/public/config`.

### 3.2. Bố cục Khối Bài viết liên quan (`Phần 1.2`)
- **Cách A (Chọn — theo lựa chọn của chủ dự án):** Danh sách thẻ 1 cột full-width kiểu bài báo (`flex flex-col gap-3`) có tiêu đề đầy đủ + đoạn trích mô tả ngắn (~150 ký tự) lấy tự động từ nội dung đầu bài viết + badge danh mục/mũi tên điều hướng.
  - *Ưu điểm:* Cân đối tuyệt đối dù có 1, 2, 3, 4 hay 5+ bài viết; tiêu đề không bị cắt cụt; đọc mượt trên cả desktop lẫn mobile.
- **Cách B (Loại):** Grid đa cột tự điều chỉnh (`grid-cols-2` / `grid-cols-3`).
  - *Nhược điểm:* Vẫn dễ bị lệch hàng khi số bài là 4 hoặc lẻ, và tiêu đề dài bị cắt cụt trên thẻ hẹp.

---

## 4. Technical Design Details

### 4.1. Admin & Index Footer Toggle (`admin.html`, `src/admin.js`, `index.html`, `src/customer.js`)
1. **Admin UI (`admin.html` — `#wpane-ui`):**
   - Tái cấu trúc lưới 2 cột `#wpane-ui` thành 2 hàng `grid grid-cols-1 lg:grid-cols-2 gap-4 items-start`:
     - Hàng 1: Cột trái chứa QR Expire Seconds + Email Verify TTL; Cột phải chứa `Định tuyến Gốc (Gán ô Link 1/2/3)`.
     - Hàng 2: Cột trái giữ nguyên `Cấu hình Làm mờ / Khóa / Kiểm tra (Web này)`; Cột phải đặt ngay block mới **`Hiển thị Footer Trang chủ (Index)`** gồm badge trạng thái `BẬT / TẮT`, toggle switch `#toggleShowFullFooter`, mô tả 2 chế độ, và nút **Lưu** (`saveFooterDisplayToggle()`).
2. **Admin JS (`src/admin.js`):**
   - Trong `loadWebAdminUI()` và `loadSettingsUI()`: đồng bộ `#toggleShowFullFooter.checked` theo `(cmsDb.footer?.showFullFooter !== false)` và cập nhật badge trạng thái.
   - Hàm `saveFooterDisplayToggle()`: cập nhật `cmsDb.footer = { ...(cmsDb.footer || {}), showFullFooter: !!$("toggleShowFullFooter")?.checked }`, gọi `saveCmsDb({ footer: { showFullFooter } })`, ghi log và toast xác nhận.
   - Trong `saveFooterConfig()`: bảo toàn `showFullFooter: cmsDb.footer?.showFullFooter !== false` khi lưu toàn bộ `cmsDb.footer`.
3. **Index HTML & Customer JS (`index.html`, `src/customer.js`):**
   - Trong `index.html`: gắn `id="footerFullColsWrap"` cho khối 5 cột (`<div id="footerFullColsWrap" class="grid grid-cols-2 lg:grid-cols-5 ...">`).
   - Trong `renderDynamicFooter(ft)`: đọc `const showFull = ft.showFullFooter !== false;`:
     - Khi `showFull === true`: bỏ `.hidden` khỏi `#footerFullColsWrap`, render các cột bình thường, giữ padding mặc định (`pt-8 pb-4`).
     - Khi `showFull === false`: thêm `.hidden` vào `#footerFullColsWrap`, thu gọn padding `#footerArea` (`pt-3 pb-3`) để chỉ hiển thị đúng 1 hàng gồm 4 nút support (`Zalo Support`, `Mess Support`, `WeChat`, `Telegram`) và dòng `© 2026 VPN Trinh Hg. All rights reserved.`.
   - `vpn_footer_cache` trong `localStorage` tự động lưu toàn bộ `ft` nên trạng thái thu gọn/đầy đủ được áp dụng ngay khi tải trang không bị chớp nháy.

### 4.2. Related Articles 1-Column Newspaper Cards (`src/customer.js`, `src/admin.js`)
1. **Helper trích xuất mô tả ngắn `extractGuideExcerpt(art, maxLen = 155)`:**
   - Parse `art.html` (sau khi sanitize nhẹ hoặc strip HTML tags bằng DOM/textContent, fallback từ `art.blocks` nếu là bài cũ), bỏ qua các thẻ heading mở đầu nếu chỉ là tiêu đề lặp, ưu tiên lấy nội dung đoạn văn (`p`, `li`, `blockquote`) đầu tiên có nghĩa, chuẩn hóa khoảng trắng và cắt gọn ở ranh giới từ kèm `...`.
2. **Customer Portal (`src/customer.js` — `openGuideArticle`):**
   - Thay lưới `grid grid-cols-1 sm:grid-cols-2 gap-2.5` bằng danh sách 1 cột `flex flex-col gap-3`.
   - Mỗi thẻ bài viết liên quan hiển thị:
     - Tên danh mục nhỏ (badge/label) + Tiêu đề đầy đủ (`font-extrabold text-sm md:text-[15px] leading-snug`, không `truncate`).
     - Đoạn mô tả ngắn 1–2 dòng (`line-clamp-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed`) nếu có nội dung.
     - Biểu tượng mũi tên bên phải.
3. **Admin Preview (`src/admin.js` — `cmsPrev`):**
   - Cập nhật khối `#cmsPreview` tương ứng từ `grid-template-columns:1fr 1fr` sang danh sách 1 cột có mô tả ngắn để preview khớp giao diện `index`.

### 4.3. Guide Articles Content (`GUIDES` KV via Admin CMS)
- **Kiểm tra link tải thực tế trước khi lưu:** Dùng kiểm tra trực tiếp trên trình duyệt / URL thật cho từng release asset của `hiddify/hiddify-app`, `chen08209/FlClash`, `KaringX/karing`, Google Play, App Store, và `clashmi.app/download#android`.
- **Android:** Đọc bài hiện có `Hướng dẫn cài đặt APP cấu hình VPN`, chuẩn hóa câu từ/thuật ngữ, chia khối & đánh số bước rõ ràng, chỉ giữ 3 app `Hiddify`, `FlClash`, `Karing` với đúng 3 link yêu cầu.
- **iOS:** Viết lại theo quy trình chuẩn cho đúng 2 app `Hiddify` và `Karing`, dùng **text hyperlink** trực tiếp tới App Store (không dùng button CTA).
- **Windows:** Đổi tiêu đề thành tiêu đề chung đa ứng dụng (ví dụ `Hướng dẫn cài đặt & sử dụng VPN trên Windows (Hiddify, FlClash, Karing)`), trình bày theo thứ tự `1. Hiddify`, `2. FlClash`, `3. Karing` kèm link GitHub Releases chính thức, bổ sung mục cảnh báo **Windows Defender SmartScreen** (*More info / Thông tin thêm* → *Run anyway / Vẫn chạy*).
- **macOS:** Cùng luồng cho `Hiddify`, `FlClash`, `Karing`; gắn link tải trực tiếp các file `.dmg` và `.pkg` thực tế từ GitHub Releases mới nhất (ghi rõ bản `arm64` Apple Silicon / `amd64/x64` Intel / `Universal`). Bổ sung mục **Lưu ý xử lý cảnh báo bảo mật macOS (Gatekeeper)** ở cuối bài (Cài đặt hệ thống → Quyền riêng tư & Bảo mật → *Vẫn mở (Open Anyway)*, *Control-click → Mở*, và `xattr -cr`), đồng thời đặt anchor link `#anchor:...` ở giữa bài tại các bước mở file tải từ GitHub để bấm là cuộn thẳng xuống mục xử lý bảo mật.
- **Lưu ý cho TikTok (tạo bài mới):** Viết mới hoàn toàn với văn phong tự nhiên, chuyên nghiệp; giải thích cơ chế nhận diện môi trường (IP, vị trí, múi giờ, vùng máy, cache, quyền theo dõi, mã nhà mạng SIM), lý do tránh Hồng Kông và ưu tiên Singapore/Nhật Bản, giải thích `CTCarrier` từ iOS/iPadOS 16.4+; sắp xếp các bước xử lý từ cơ bản đến nâng cao (iOS hệ thống, làm sạch môi trường, mẹo Safari/đăng nhập chéo/nhờ người thân VN/cập nhật iOS, và phương án Android không cần tháo SIM giữ đúng placeholder chờ Admin chèn link APK).

### 4.4. Live Browser E2E Matrix (`browser` subagent)
Kiểm thử trên `vite preview` (hoặc `vite dev`) kết nối Test Mode (`?test=1` / `ALL_ORDERS_TEST`) và Admin (`admin.html`, đăng nhập trong phiên test):
1. **Tổ hợp thanh toán ở `index`:** Gói chu kỳ/du lịch/dung lượng (1T, 3T, 6T, 12T, XT), phương thức `bank` / `alipay` / `wechat`, có/không coupon, có/không cần hỗ trợ Zalo, trạng thái chưa đăng nhập vs đang ở portal (tạo đơn mới / gia hạn / nâng gói), kiểm tra QR tạo/hủy/timeout hoặc lỗi đầu vào không hợp lệ.
2. **Luồng sau mua hàng:** Nâng gói (`upgrade`), Gia hạn (`renew`), Copy link sub, Xác minh link sub (trả về config hợp lệ + mở/tắt `Kiểm tra` xác minh email).
3. **Luồng Footer → Bảng điều khiển khi chưa đăng nhập:** Đảm bảo logged out → bấm 1 bài viết hướng dẫn ở Footer → bấm `Bảng điều khiển` → xác nhận hiện modal kiểm tra mã đơn hàng (`#guideAuthModal` nhập `DH...`).
4. **Admin Đối soát D1, Auto Fulfillment & Cron `djjc`:** Kiểm tra đơn test đồng bộ sang Admin, kiểm tra D1/đối soát & auto fulfillment; tạo 1–5 link sub ẩn nguồn `djjc` có HSD là ngày hôm nay, chạy Cron, xác minh hệ thống tự khóa (`isLocked: true`, `orig: "dabikhoa"`) và dọn sạch link/đơn test sau kiểm thử.
5. **Xác minh Phần 1 & Phần 2:** Bật/tắt Footer từ Admin → reload `index` xác nhận cả 2 trạng thái trên desktop & mobile; mở bài viết có 4 bài liên quan xác nhận layout 1 cột + mô tả ngắn; mở 4 mục hướng dẫn + bài TikTok mới kiểm tra anchor link, hyperlink, cảnh báo SmartScreen/Gatekeeper, và kiểm tra không có link tải hỏng/404.

---

## 5. Risks & What's Left to Implementation Plan

- **Rủi ro:** Việc tạo link test `djjc` và chạy `runCron` thao tác trên `ALL_LINKS` trong KV dùng chung. Cần kiểm tra danh sách link hiện tại trước khi chạy cron và chỉ dọn đúng các link test đã tạo (tạo mới + xóa ngay sau khi xác minh khóa tự động).
- **Bước tiếp theo:** Sau khi bạn duyệt Design Doc này, mình sẽ chuyển sang `superpowers:writing-plans` để lập kế hoạch chi tiết từng bước, rồi thực thi qua `superpowers:executing-plans` và xác minh cuối bằng `superpowers:verification-before-completion` + `browser` subagent.
