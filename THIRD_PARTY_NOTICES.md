# THÔNG BÁO BẢN QUYỀN VÀ GIẤY PHÉP BÊN THỨ BA (THIRD-PARTY NOTICES)

Dự án **VPNTrinhHg3** cam kết 100% sử dụng mã nguồn mở với giấy phép cho phép sử dụng thương mại miễn phí (MIT, Apache 2.0, BSD-3-Clause, SIL OFL). Không sử dụng bất kỳ thư viện trả phí hoặc dịch vụ yêu cầu thuê bao tính phí định kỳ.

---

## 1. Runtime Dependencies

| Package | Phiên bản | Giấy phép | Repository | Mục đích sử dụng |
|:---|:---:|:---:|:---|:---|
| **@fontsource/plus-jakarta-sans** | ^5.0.21 | SIL OFL 1.1 | https://github.com/fontsource/fontsource | Font chữ giao diện Plus Jakarta Sans đóng gói nội bộ (offline) |
| **@fortawesome/fontawesome-free** | ^6.5.2 | MIT / CC BY 4.0 / SIL OFL | https://github.com/FortAwesome/Font-Awesome | Bộ icon giao diện bản Free (offline) |
| **chart.js** | ^4.4.3 | MIT | https://github.com/chartjs/Chart.js | Biểu đồ doanh thu & thống kê (thay thế ApexCharts) |
| **currency.js** | ^2.0.4 | MIT | https://github.com/scurker/currency.js | Tính toán tiền tệ chuẩn xác, triệt tiêu sai số dấu phẩy động |
| **dayjs** | ^1.11.13 | MIT | https://github.com/iamkun/dayjs | Thư viện ngày giờ nhẹ, hỗ trợ múi giờ UTC+7 và parse format linh hoạt |
| **dompurify** | ^3.1.6 | Apache-2.0 / MPL-2.0 | https://github.com/cure53/DOMPurify | Làm sạch HTML để ngăn chặn lỗ hổng bảo mật XSS (Cross-Site Scripting) |
| **gridjs** | ^6.2.0 | MIT | https://github.com/grid-js/gridjs | Bảng dữ liệu tương tác, tìm kiếm và phân trang |
| **navigo** | ^8.11.1 | MIT | https://github.com/krasimir/navigo | Điều hướng client-side routing nhẹ cho Single Page Application |
| **qrcodejs** | ^1.0.0 | MIT | https://github.com/davidshimjs/qrcodejs | Tạo mã QR code thanh toán trên trình duyệt |
| **quill** | ^2.0.2 | BSD-3-Clause | https://github.com/slab/quill | Trình soạn thảo văn bản giàu tính năng (Rich Text Editor) cho CMS Hướng dẫn |
| **sortablejs** | ^1.15.2 | MIT | https://github.com/SortableJS/Sortable | Thư viện kéo thả reorder danh sách/tab bài viết |
| **sweetalert2** | ^11.12.2 | MIT | https://github.com/sweetalert2/sweetalert2 | Hộp thoại thông báo và toast notification |
| **zod** | ^3.23.8 | MIT | https://github.com/colinhacks/zod | Xác thực schema dữ liệu đầu vào / đầu ra API |

---

## 2. Development & Build Dependencies

| Package | Phiên bản | Giấy phép | Repository | Mục đích sử dụng |
|:---|:---:|:---:|:---|:---|
| **vite** | ^5.3.3 | MIT | https://github.com/vitejs/vite | Công cụ build Multi-page application và development server siêu tốc |
| **tailwindcss** | ^3.4.4 | MIT | https://github.com/tailwindlabs/tailwindcss | Utility-first CSS framework biên dịch nội bộ, loại bỏ Tailwind Play CDN |
| **postcss** | ^8.4.39 | MIT | https://github.com/postcss/postcss | Bộ tiền xử lý CSS |
| **autoprefixer** | ^10.4.19 | MIT | https://github.com/postcss/autoprefixer | Tự động thêm tiền tố vendor CSS tương thích đa trình duyệt |
| **vitest** | ^1.6.0 | MIT | https://github.com/vitest-dev/vitest | Khung kiểm thử tự động (Unit Test) cho logic và tiện ích |
| **jsdom** | ^24.1.0 | MIT | https://github.com/jsdom/jsdom | Môi trường DOM giả lập chạy trên Node.js phục vụ kiểm thử |
| **@playwright/test** | ^1.45.1 | Apache-2.0 | https://github.com/microsoft/playwright | Kiểm thử End-to-End trên trình duyệt thực tế (Chromium, Firefox, WebKit) |
