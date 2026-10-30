# AGENTS.md — BỘ 80 QUY TẮC AN TOÀN BẢO VỆ DỰ ÁN VPNTRINHHG3

> **Dành cho tất cả AI Coding Agents tham gia bảo trì, phát triển và tái cấu trúc repository `vpntrinhhg3`.**  
> **Nguyên tắc tối cao:** Giữ nguyên chức năng đang chạy, sửa ít nhất có thể, kiểm tra đầy đủ và không đánh đổi độ ổn định để lấy sự tiện lợi khi viết code.

---

## 1. QUY TẮC CHỈNH SỬA MÃ NGUỒN (Quy tắc 1 – 25)

1. **Đọc AGENTS.md trước khi sửa bất kỳ file nào:** Mọi AI agent phải đọc hiểu toàn bộ quy tắc an toàn và tra cứu `PROJECT_MAP.md` trước khi thao tác mã nguồn.
2. **Tìm đúng module chứa chức năng cần sửa:** Chỉ can thiệp vào đúng module phụ trách chức năng đó (`api.js`, `shared.js`, `customer.js`, hoặc `admin.js`).
3. **Không sửa file không liên quan:** Tuyệt đối không chạm vào các file hoặc chức năng ngoài phạm vi yêu cầu (ví dụ: sửa đơn hàng không chạm vào CMS hay giao diện khách hàng).
4. **Không viết lại toàn bộ file chỉ vì một lỗi nhỏ:** Sử dụng chỉnh sửa có mục tiêu (targeted edit), giữ nguyên 99% phần mã nguồn đang vận hành tốt.
5. **Không tạo module mới nếu module hiện tại vẫn phù hợp:** Tránh phân mảnh cấu trúc thành hàng chục file nhỏ không cần thiết.
6. **Không tạo abstraction không cần thiết:** Không thêm các lớp wrapper, design patterns phức tạp, class kế thừa vô ích khi Vanilla JavaScript đơn giản đã đủ giải quyết vấn đề.
7. **Không đổi API contract:** Không thay đổi URL endpoint, HTTP method, tên trường request payload hoặc response format mà backend đang mong đợi.
8. **Không đổi database schema:** Không tự ý đổi kiểu dữ liệu, đổi tên trường hoặc thêm/bớt cấu trúc trường của KV, D1 hay Supabase.
9. **Không đổi URL và cấu trúc routing:** Bảo toàn tất cả các đường dẫn công khai: `/`, `/admin`, `/admin.html`, `/portal/*`, các bài hướng dẫn và fallback routing.
10. **Không đổi tên hoặc giá trị các localStorage/sessionStorage keys:** Các key phiên làm việc, token, theme, cache gói cước phải giữ nguyên để tương thích ngược.
11. **Không xóa chức năng cũ:** Mọi tính năng đang có (kể cả các công cụ chẩn đoán, test mode, xuất báo cáo) phải được giữ nguyên vẹn trừ khi có lệnh xóa rõ ràng từ chủ dự án.
12. **Không thay đổi giao diện nếu task không yêu cầu:** Giữ nguyên giao diện HTML/CSS, bố cục, icon và màu sắc đặc trưng của VPNTrinhHg.
13. **Không thêm dependency mới nếu chưa chứng minh được lợi ích:** Mọi thư viện mới phải được cân nhắc kỹ, phải có lý do kỹ thuật thuyết phục và được chủ dự án thông qua.
14. **Không sử dụng thư viện trả phí hoặc dịch vụ yêu cầu subscription:** Tuyệt đối chỉ sử dụng mã nguồn mở với giấy phép tương thích thương mại miễn phí (MIT, Apache 2.0, BSD).
15. **Không sử dụng CDN latest; phải cố định phiên bản:** Không import script từ `@latest` hoặc URL không pin version cụ thể để tránh rủi ro phá vỡ tương thích khi upstream cập nhật.
16. **Không đưa secret, API token, mật khẩu, private key vào frontend:** Mã nguồn client-side public tuyệt đối không chứa thông tin đăng nhập hoặc secret quản trị.
17. **Không tự ý thay đổi cách tính tiền, thời hạn gói, dung lượng VPN, quy tắc gia hạn hoặc cấp phát tài khoản:** Bảng giá, tỷ giá VND/CNY/USD, thời hạn ngày/tháng là nghiệp vụ cốt lõi không được chỉnh sửa.
18. **Không tự ý đổi tên biến, tên trường dữ liệu hoặc cấu trúc JSON đang được backend sử dụng:** Giữ nguyên cấu trúc dữ liệu gửi và nhận (`totalVnd`, `totalCny`, `orig`, `masked`, `expDate`, `linkIndex`, v.v.).
19. **Không thay đổi hành vi của các endpoint đang hoạt động:** Mọi tham số query, header hoặc body truyền qua proxy Worker phải được giữ tính tương thích 100%.
20. **Không tự ý di chuyển, đổi tên hoặc xóa tài nguyên đang được tham chiếu bởi URL:** Giữ nguyên tên và đường dẫn file tĩnh: `manifest.json`, `manifestadmin.json`, `icon-192.png`, `icon-512.png`, `_worker.js`, `_redirects`.
21. **Không thêm nhiều file nhỏ chỉ để chia code cho đẹp:** Tuân thủ kiến trúc tối giản: chỉ gom theo cụm nghiệp vụ lớn.
22. **Ưu tiên tận dụng 4 module chính:** Mọi logic mới phải được đặt hợp lý vào `api.js`, `shared.js`, `customer.js`, hoặc `admin.js`.
23. **Chỉ tách module khi có lý do kỹ thuật rõ ràng và phải cập nhật tài liệu:** Nếu một module vượt quá kích thước hợp lý hoặc có xung đột nghiêm trọng mới đề xuất tách và phải ghi nhận vào `PROJECT_MAP.md`.
24. **Không sử dụng eval, new Function hoặc thực thi mã động không an toàn:** Tránh mọi nguy cơ injection và vi phạm chính sách Content Security Policy (CSP).
25. **Không sử dụng innerHTML với dữ liệu không đáng tin cậy nếu chưa xử lý an toàn:** Dữ liệu do người dùng nhập hoặc từ query string phải được escape hoặc làm sạch qua DOMPurify.

---

## 2. QUY TẮC BẢO MẬT (Quy tắc 26 – 37)

26. **Không đưa secret vào GitHub repository, kể cả repository private:** Repository hiện tại là public; bất kỳ secret nào commit lên sẽ bị lộ tức thì.
27. **Không hardcode token trong JavaScript, HTML, CSS hoặc file cấu hình frontend:** Mã client-side được tải về máy người dùng nên không thể che giấu secret.
28. **Secret của Worker phải được quản lý bằng Cloudflare Worker Secrets:** Sử dụng biến môi trường bảo mật trên Cloudflare Dashboard hoặc GitHub Secrets (`WEB_API_SECRET2`).
29. **Không in token, mật khẩu, mã xác thực hoặc thông tin nhạy cảm vào console/log:** Không dùng `console.log(TOKEN)` hoặc ghi mật khẩu vào nhật ký sự kiện.
30. **Không trả dữ liệu quản trị cho endpoint công khai:** Các endpoint `/api/public/*` chỉ trả về thông tin tối thiểu cần thiết cho khách, không lộ danh sách toàn bộ đơn hàng, doanh thu hay link gốc của nhà cung cấp.
31. **Không dựa vào việc ẩn nút hoặc ẩn giao diện để bảo vệ quyền truy cập:** Việc thêm class `hidden` trên DOM không phải là bảo mật; API backend phải luôn kiểm tra header `Authorization`.
32. **Mọi thao tác quan trọng phải được xác thực và kiểm tra quyền ở backend:** Xóa đơn, đổi trạng thái, fulfillment, chỉnh sửa Link Pool đều bắt buộc có token hợp lệ.
33. **Dữ liệu HTML do người dùng nhập phải được làm sạch trước khi hiển thị:** Áp dụng DOMPurify cho nội dung CMS, hướng dẫn, ghi chú đơn hàng để triệt tiêu lỗ hổng Stored XSS.
34. **Không bỏ qua kiểm tra quyền khi sửa hoặc thêm endpoint:** Luôn gửi kèm token quản trị qua header khi gọi API private từ `admin.js`.
35. **Không làm suy yếu CORS, authentication, authorization hoặc rate limiting:** Không thiết lập `Access-Control-Allow-Origin: *` bừa bãi trên các endpoint nhạy cảm.
36. **Không tự ý thay đổi chính sách bảo mật hiện tại nếu chưa phân tích ảnh hưởng:** Mọi can thiệp vào cơ chế xác thực thiết bị (`myDev`), token expiration đều phải được thẩm định kỹ.
37. **Nếu phát hiện secret đã bị commit, phải báo cáo và đề xuất thu hồi/thay thế:** Tuyệt đối không chỉ xóa secret trong commit mới rồi coi như đã an toàn; phải cảnh báo chủ dự án để revoke/rotate secret ngay lập tức.

---

## 3. QUY TẮC DỮ LIỆU VÀ NGHIỆP VỤ (Quy tắc 38 – 48)

38. **Không tự ý chuyển dữ liệu giữa KV, D1 và Supabase:** Kiến trúc lưu trữ của backend Worker do backend quản lý; frontend không tự suy diễn chuyển nguồn dữ liệu.
39. **Không tự ý thay đổi nguồn dữ liệu chính của bất kỳ nghiệp vụ nào:** Đơn hàng, Link Pool, giao dịch, nhật ký có phân vùng lưu trữ riêng trên Worker; giữ nguyên các endpoint tương ứng.
40. **Không thực hiện thao tác ghi dữ liệu trong các hàm chỉ có nhiệm vụ đọc dữ liệu:** Tuyệt đối tách biệt Read và Write. `fetchAll()` hoặc các hàm polling chỉ đọc dữ liệu hiển thị, không được tự ý gọi `POST /api/link_pool` hay `POST /api/links`.
41. **Không để thao tác retry tạo đơn hàng, thanh toán, gia hạn hoặc cấp phát VPN hai lần:** Cấm retry mù quáng với các API tạo đơn (`/api/public/order`, `/api/public/upgrade`) khi chưa có cơ chế kiểm tra idempotent từ backend.
42. **Những thao tác có thể được gửi lại phải có cơ chế idempotency phù hợp ở backend:** Nếu backend chưa hỗ trợ deduplication token, frontend phải ngăn chặn người dùng bấm nút nhiều lần (disable button + debouncing).
43. **Không ghi đè toàn bộ danh sách dữ liệu nếu chỉ cần cập nhật một bản ghi:** Tránh race condition khi hai quản trị viên cùng mở trang quản trị và ghi đè danh sách đơn của nhau.
44. **Không tự động sửa dữ liệu thật khi trang quản trị vừa tải:** Không chạy logic "auto heal" ngầm gửi dữ liệu lên server ngay khi mở `admin.html`. Mọi thao tác sửa đổi phải có xác nhận rõ ràng của Admin.
45. **Không tự ý xóa dữ liệu hoặc chạy migration trên production:** Các thao tác bảo trì cấu trúc ngày tháng (`migrate_dates`) hay gói cước (`migrate_pkg`) phải có bước quét thử (dry-run) trước khi áp dụng thật.
46. **Không thay đổi dữ liệu đơn hàng cũ hoặc giá trị lịch sử:** Giữ nguyên giá trị `totalVnd`, `totalCny` cũ của các đơn trước đây, không tự ý áp dụng giá gói mới cho đơn cũ.
47. **Không thay đổi timezone mặc định UTC+7 của nghiệp vụ Việt Nam:** Các hàm format ngày giờ phải giữ múi giờ `Asia/Ho_Chi_Minh` (hoặc `Asia/Shanghai` khi Admin chọn múi giờ TQ trong cài đặt).
48. **Phải bảo toàn dữ liệu khi chuyển đổi hoặc chuẩn hóa cấu trúc lưu trữ:** Nếu có bước migrate trường dữ liệu, phải đảm bảo fallback đọc được cả trường cũ lẫn trường mới.

---

## 4. QUY TẮC KIỂM THỬ (Quy tắc 49 – 58)

49. **Sau mỗi thay đổi phải kiểm tra cú pháp và build:** Chạy lệnh build kiểm tra (`npm run build`) để đảm bảo không có lỗi cú pháp hoặc hỏng import/export.
50. **Không được bỏ qua lỗi build hoặc lỗi import:** Bất kỳ cảnh báo nghiêm trọng hoặc lỗi build nào xuất hiện đều phải được giải quyết triệt để trước khi tạo commit.
51. **Kiểm tra cả trang khách hàng và trang quản trị nếu thay đổi module dùng chung:** Khi sửa đổi trong `api.js` hoặc `shared.js`, phải kiểm thử cả `index.html` và `admin.html`.
52. **Kiểm tra các chức năng liên quan trực tiếp đến thay đổi:** Lập danh sách các tính năng phụ thuộc và rà soát kỹ lưỡng sau khi sửa code.
53. **Kiểm tra responsive trên desktop và mobile nếu thay đổi giao diện:** Đảm bảo trải nghiệm liền mạch trên cả màn hình điện thoại di động và máy tính để bàn.
54. **Không chỉ kiểm tra giao diện; phải kiểm tra cả dữ liệu gửi và nhận từ API:** Kiểm tra Network Tab, payload gửi đi và phản hồi JSON trả về có đúng hợp đồng không.
55. **Không dùng dữ liệu thật để thử các thao tác có thể gây thanh toán hoặc cấp phát VPN:** Tuyệt đối không tạo đơn hàng rác trên production database hoặc kích hoạt webhook chuyển tiền thật.
56. **Sử dụng dữ liệu test hoặc môi trường Preview khi kiểm thử nghiệp vụ:** Tận dụng tham số `?test=1`, mock data hoặc nhánh preview độc lập để kiểm thử.
57. **Nếu không thể chạy kiểm thử, phải nói rõ chưa kiểm thử phần nào:** Báo cáo trung thực các trường hợp biên chưa được kiểm thử trong báo cáo công việc.
58. **Không được tự tuyên bố hoàn thành nếu chưa có bằng chứng build/test phù hợp:** Mọi tuyên bố thành công phải kèm theo log build hoặc kết quả test thực tế.

---

## 5. QUY TẮC GITHUB VÀ TRIỂN KHAI (Quy tắc 59 – 70)

59. **Không commit trực tiếp lên main:** Nhánh `main` là nhánh Production của website. Tuyệt đối không sửa hoặc commit trực tiếp lên `main`.
60. **Mọi thay đổi phải thực hiện trên nhánh riêng:** Sử dụng nhánh `refactor/vite-migration` cho đợt tái cấu trúc, và các nhánh `ai/<tên-tính-năng>` cho các tác vụ bảo trì sau này.
61. **Mỗi task nên có commit riêng, tên commit phải mô tả đúng nội dung:** Sử dụng Conventional Commits rõ ràng (ví dụ: `feat: ...`, `fix: ...`, `chore: ...`).
62. **Không tự ý Merge Pull Request:** Quyền duyệt và bấm Merge Pull Request vào `main` thuộc về chủ dự án sau khi đã xem xét bản Preview.
63. **Không tự ý triển khai production:** Không kích hoạt release production khi chưa có sự xác nhận của người sở hữu.
64. **Không xóa nhánh hoặc commit cũ nếu chưa được cho phép:** Không thực hiện `git push --force` hoặc ghi đè lịch sử git làm mất dấu vết kiểm toán.
65. **Không thay đổi cấu hình Cloudflare Pages hoặc Workers nếu task không yêu cầu:** Giữ nguyên các thiết lập định tuyến, custom domain và biến môi trường hiện hành.
66. **Không xóa hoặc sửa `.github/workflows/update.yml` và `update_sub.py`:** Workflow đồng bộ VPN hàng ngày lúc 00:00 UTC là huyết mạch vận hành của dịch vụ; phải giữ nguyên vẹn vị trí và nội dung.
67. **Không làm mất `_worker.js`, `_redirects`, manifest PWA, icon hoặc tài nguyên hiện tại:** Khi đóng gói qua Vite, các file này phải nằm trong thư mục `public/` để được copy trực tiếp vào thư mục gốc `dist/`.
68. **Sau khi build phải kiểm tra thư mục output có đầy đủ tài nguyên:** Thư mục `dist/` phải chứa: `index.html`, `admin.html`, `_worker.js`, `_redirects`, `manifest.json`, `manifestadmin.json`, `icon-192.png`, `icon-512.png`.
69. **Phải đảm bảo Cloudflare Pages vẫn xử lý đúng URL `/`, `/admin`, `/admin.html` và các đường dẫn bài hướng dẫn:** Kiểm tra kỹ cơ chế fallback routing để khách hàng và quản trị viên không bị lỗi 404.
70. **Không tự động bật tính năng deploy production từ nhánh thử nghiệm:** Chỉ nhánh `main` mới được triển khai lên Production URL.

---

## 6. QUY TẮC CHI PHÍ $0 (Quy tắc 71 – 80)

71. **Toàn bộ giải pháp phải sử dụng tài nguyên miễn phí:** Mục tiêu dự án là vận hành với chi phí **0 USD/tháng**.
72. **Không đăng ký gói trả phí hoặc dịch vụ dùng thử có khả năng tự động tính phí:** Cấm kích hoạt trial thẻ tín dụng có rủi ro tự trừ tiền sau khi hết hạn.
73. **Không tự ý chuyển Cloudflare Workers, Pages, D1 hoặc KV sang Paid:** Giữ nguyên trong hạn mức gói Free:
    - Cloudflare Pages: 500 builds/tháng
    - Cloudflare Workers: 100.000 requests/ngày
    - Cloudflare D1: 5 triệu rows read/ngày, 100.000 rows written/ngày
    - Cloudflare KV: 100.000 reads/ngày, 1.000 writes/ngày
74. **Không thêm dịch vụ SaaS bên ngoài nếu có giải pháp miễn phí phù hợp:** Không tích hợp các dịch vụ trả phí bên thứ ba khi Cloudflare và GitHub đã đủ đáp ứng.
75. **Không sử dụng API AI trả phí trong runtime website:** Trình duyệt khách hàng và trang quản trị không được gọi trực tiếp đến API OpenAI/Claude/Gemini tốn phí.
76. **Không sử dụng dịch vụ có quota miễn phí nhưng yêu cầu thẻ thanh toán nếu chưa được chấp thuận:** Mọi tích hợp có rủi ro phát sinh công nợ đều bị cấm.
77. **Không tự ý tăng số lần build, chạy workflow hoặc polling nếu không cần thiết:** Tối ưu hóa chu kỳ polling (tắt khi tab ẩn `document.hidden`), hạn chế số lần commit kích hoạt CI/CD lãng phí phút build.
78. **Phải ưu tiên tối ưu trong giới hạn Cloudflare Free:** Thiết kế cache hợp lý bằng Cache API / `Cache-Control` để giảm thiểu số lượt đọc/ghi vào KV và D1.
79. **Khi đề xuất một dependency hoặc dịch vụ mới, phải ghi rõ giấy phép và giới hạn miễn phí:** Cung cấp thông tin minh bạch về license và quota trước khi thêm vào dự án.
80. **Không được khẳng định miễn phí vô thời hạn nếu nhà cung cấp có điều kiện quota:** Phải luôn theo dõi cảnh báo quota của Cloudflare và GitHub Actions.

---

## 7. QUY TẮC BÁO CÁO SAU MỖI TASK (Báo cáo bắt buộc)

Sau mỗi lần sửa mã nguồn hoặc hoàn thành một giai đoạn, AI phải cung cấp báo cáo chi tiết gồm 10 mục:
1. **Những file đã đọc:** Danh sách cụ thể các file đã phân tích.
2. **Những file đã sửa/tạo:** Đường dẫn chính xác và mục đích của từng file.
3. **Nguyên nhân của vấn đề:** Giải thích rõ lý do cần chỉnh sửa.
4. **Cách đã khắc phục:** Tóm tắt giải pháp kỹ thuật đã áp dụng.
5. **Chức năng có thể bị ảnh hưởng:** Các luồng nghiệp vụ liên đới cần lưu tâm.
6. **Kết quả build:** Kết quả kiểm tra biên dịch Vite (`dist/` output).
7. **Kết quả kiểm thử:** Log test hoặc bằng chứng chạy thử nghiệm.
8. **Những phần chưa thể kiểm tra:** Các trường hợp cần môi trường thật hoặc xác nhận thủ công.
9. **Kiểm tra hợp đồng API & Database:** Xác nhận không làm thay đổi API contract, database schema hay URL routing.
10. **Đánh giá rủi ro Production:** Cam kết không gây ảnh hưởng đến website đang vận hành.

---
*Bản quy tắc này có hiệu lực vĩnh viễn trong suốt vòng đời dự án `vpntrinhhg3`.*
