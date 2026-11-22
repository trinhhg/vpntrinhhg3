# AGENTS.md — BỘ 94 QUY TẮC AN TOÀN BẢO VỆ DỰ ÁN VPNTRINHHG3

> **Dành cho tất cả AI Coding Agents tham gia bảo trì, phát triển và tái cấu trúc repository `vpntrinhhg3`.**  
> **NGUYÊN TẮC TỐI THƯỢNG — SOURCE CÓ KIỂM SOÁT:** AI được phép đọc repo và chỉnh sửa trong sandbox/workspace tách biệt để sửa lỗi, refactor, tối ưu, loại bỏ code dư thừa và chạy build/test phù hợp. Mặc định không ghi trực tiếp GitHub, commit/push, tạo PR/merge hoặc deploy; chỉ làm khi Admin yêu cầu rõ trong task hiện tại. Không deploy nếu chưa yêu cầu. Bảo toàn contract/dữ liệu quan trọng, nhưng không giữ code trùng lặp, dead code, fallback/guard vô căn cứ hoặc cấu trúc gây phình chỉ vì nguyên tắc bảo toàn quá cứng. Chỉ đọc file liên quan và dependency cần thiết; không quét hàng loạt repo trong task nhỏ.

---

## 1. QUY TẮC CHỈNH SỬA MÃ NGUỒN (Quy tắc 1 – 25)

1. **Đọc hướng dẫn trước khi phân tích:** Đọc `AGENTS.md` và chỉ tra cứu phần liên quan trong `PROJECT_MAP.md` khi cần định vị chức năng. Việc đọc hướng dẫn không cho phép quét toàn repo; tuân thủ phạm vi task hiện tại.
2. **Tìm module và dependency liên quan:** Bắt đầu ở module chứa chức năng, nhưng được đọc và chỉnh các module/file phụ thuộc trực tiếp nếu cần để xử lý đúng, tách trách nhiệm hoặc cô lập lỗi. Không bó buộc fix trong một file nếu kiến trúc hiện tại gây coupling.
3. **Giữ phạm vi có liên quan, không bị bó vào một file:** Không chỉnh nghiệp vụ ngoài task. Tuy nhiên, được sửa các file liên quan trực tiếp để đảm bảo module boundaries, shared contracts, Admin-to-Customer propagation, test hoặc giảm duplication/coupling.
4. **Được sửa trong sandbox/workspace tách biệt:** AI được phép áp dụng patch, sửa code, refactor, xóa code dư thừa và thử nghiệm trong sandbox riêng. Không ghi trực tiếp repo/working tree chính hoặc GitHub trừ khi Admin yêu cầu rõ. Kết quả phải có diff dễ review; Admin kiểm soát việc áp dụng cuối.
5. **Tách module theo trách nhiệm, không cực đoan:** Không giữ một file monolith chỉ vì muốn hạn chế số file. Khi file quá lớn, chứa nhiều nhóm nghiệp vụ độc lập, khó test hoặc dễ ảnh hưởng chéo, chủ động đánh giá tách module. Không tạo file nhỏ vụn chỉ chứa vài hàm; nhóm theo trách nhiệm nghiệp vụ rõ.
6. **Abstraction phải giảm độ phức tạp thực tế:** Tránh wrapper, pattern hoặc tầng kiến trúc vô ích; nhưng được dùng shared helper/abstraction khi giúp loại bỏ duplication, tách trách nhiệm, giảm coupling hoặc cải thiện testability. Chọn giải pháp đơn giản nhất có hiệu quả lâu dài.
7. **Không đổi API contract:** Không thay đổi URL endpoint, HTTP method, tên trường request payload hoặc response format mà backend đang mong đợi.
8. **Không đổi database schema:** Không tự ý đổi kiểu dữ liệu, đổi tên trường hoặc thêm/bớt cấu trúc trường của KV, D1 hay Supabase.
9. **Không đổi URL và cấu trúc routing:** Bảo toàn tất cả các đường dẫn công khai: `/`, `/admin`, `/admin.html`, `/portal/*`, các bài hướng dẫn và fallback routing.
10. **Không đổi tên hoặc giá trị các localStorage/sessionStorage keys:** Các key phiên làm việc, token, theme, cache gói cước phải giữ nguyên để tương thích ngược.
11. **Bảo toàn behavior quan trọng, không bảo tồn code bằng mọi giá:** Không làm mất chức năng/nghiệp vụ, dữ liệu lịch sử, contract hoặc công cụ đang dùng nếu chưa có căn cứ. Được xóa dead code, code trùng, phiên bản cũ không còn được gọi, guard/fallback không cần thiết sau khi xác minh call sites, dependency và tests.
12. **Không thay đổi giao diện nếu task không yêu cầu:** Giữ nguyên giao diện HTML/CSS, bố cục, icon và màu sắc đặc trưng của VPNTrinhHg.
13. **Không thêm dependency mới nếu chưa chứng minh được lợi ích:** Mọi thư viện mới phải được cân nhắc kỹ, phải có lý do kỹ thuật thuyết phục và được chủ dự án thông qua.
14. **Không sử dụng thư viện trả phí hoặc dịch vụ yêu cầu subscription:** Tuyệt đối chỉ sử dụng mã nguồn mở với giấy phép tương thích thương mại miễn phí (MIT, Apache 2.0, BSD).
15. **Không sử dụng CDN latest; phải cố định phiên bản:** Không import script từ `@latest` hoặc URL không pin version cụ thể để tránh rủi ro phá vỡ tương thích khi upstream cập nhật.
16. **Không đưa secret, API token, mật khẩu, private key vào frontend:** Mã nguồn client-side public tuyệt đối không chứa thông tin đăng nhập hoặc secret quản trị.
17. **Không tự ý thay đổi cách tính tiền, thời hạn gói, dung lượng VPN, quy tắc gia hạn hoặc cấp phát tài khoản:** Bảng giá, tỷ giá VND/CNY/USD, thời hạn ngày/tháng là nghiệp vụ cốt lõi không được chỉnh sửa.
18. **Không tự ý đổi tên biến, tên trường dữ liệu hoặc cấu trúc JSON đang được backend sử dụng:** Giữ nguyên cấu trúc dữ liệu gửi và nhận (`totalVnd`, `totalCny`, `orig`, `masked`, `expDate`, `linkIndex`, v.v.).
19. **Không thay đổi hành vi của các endpoint đang hoạt động:** Mọi tham số query, header hoặc body truyền qua proxy Worker phải được giữ tính tương thích 100%.
20. **Không tự ý di chuyển, đổi tên hoặc xóa tài nguyên đang được tham chiếu bởi URL:** Giữ nguyên tên và đường dẫn file tĩnh: `manifest.json`, `manifestadmin.json`, `icon-192.png`, `icon-512.png`, `_worker.js`, `_redirects`.
21. **Không để số file là mục tiêu tối ưu:** Ưu tiên ranh giới module rõ và giảm coupling. Được tách file khi module lớn, nhiều trách nhiệm, thay đổi thường xuyên hoặc dễ gây ảnh hưởng chéo; tránh cả monolith lẫn file vụn.
22. **Không ép mọi logic vào 4 module chính:** `api.js`/`shared.js` chỉ giữ logic thật sự dùng chung. `customer.js`/`admin.js` là entry/điều phối nếu phù hợp; nghiệp vụ lớn có thể tách module riêng, tránh biến file chính thành nơi chứa tất cả logic.
23. **Chủ động kiểm soát kích thước và coupling:** Không đợi xung đột nghiêm trọng mới tách. Nếu file phình, chứa nhiều chức năng độc lập, duplication, khó review/test hoặc thay đổi một phần gây rủi ro, đánh giá refactor/tách module. Cập nhật `PROJECT_MAP.md` khi thay đổi kiến trúc đáng kể.
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

49. **Được thử và refactor trong sandbox:** Agent được phép sửa nhiều file trong workspace/sandbox tạm để kiểm chứng fix/refactor, chạy build/test và tạo artifact. Không ghi vào repo/working tree chính hoặc GitHub nếu chưa được Admin yêu cầu rõ.
50. **Không được bỏ qua lỗi build hoặc lỗi import:** Bất kỳ cảnh báo nghiêm trọng hoặc lỗi build nào xuất hiện đều phải được giải quyết triệt để trước khi tạo commit.
51. **Kiểm tra cả trang khách hàng và trang quản trị nếu thay đổi module dùng chung:** Khi sửa đổi trong `api.js` hoặc `shared.js`, phải kiểm thử cả `index.html` và `admin.html`.
52. **Kiểm tra các chức năng liên quan trực tiếp đến thay đổi:** Lập danh sách các tính năng phụ thuộc và rà soát kỹ lưỡng sau khi sửa code.
53. **Kiểm tra responsive trên desktop và mobile nếu thay đổi giao diện:** Đảm bảo trải nghiệm liền mạch trên cả màn hình điện thoại di động và máy tính để bàn.
54. **Không chỉ kiểm tra giao diện; phải kiểm tra cả dữ liệu gửi và nhận từ API:** Kiểm tra Network Tab, payload gửi đi và phản hồi JSON trả về có đúng hợp đồng không.
55. **Được test mutation trên demo đã xác nhận:** Website, Admin, webhook và downstream được Admin xác nhận là demo/test chưa vận hành production có thể được Agent thao tác thật để test, gồm tạo/sửa test order, gửi webhook giả, cập nhật trạng thái và kiểm thử fulfillment nếu tất cả dịch vụ đích cũng là demo. Không giao dịch tiền thật, không gửi email hoặc cấp dịch vụ cho khách thật.
56. **Xác minh môi trường trước test ghi:** Trước mutation, Agent phải xác minh URL website, Admin, webhook và downstream là demo/test được Admin xác nhận, không phải production. Nếu có dấu hiệu production hoặc không chắc, dừng mutation và hỏi Admin.
57. **Nếu không thể chạy kiểm thử, phải nói rõ chưa kiểm thử phần nào:** Báo cáo trung thực các trường hợp biên chưa được kiểm thử trong báo cáo công việc.
58. **Code cuối phải được kiểm chứng và không phình vô lý:** Thử trong sandbox, chạy test/build và regression phù hợp. Đánh giá correctness, duplication, coupling, complexity và kích thước diff; không dùng LOC làm KPI nhưng giải thích khi lượng code tăng mạnh. Không gọi là đã test nếu chỉ đọc/suy luận.

---

## 5. QUY TẮC GITHUB VÀ TRIỂN KHAI (Quy tắc 59 – 70)

59. **Không ghi lên GitHub mặc định:** Sandbox/workspace được phép chỉnh sửa. Không ghi trực tiếp GitHub, commit, push, tạo PR, merge hoặc thay đổi lịch sử trừ khi Admin yêu cầu rõ trong task hiện tại.
60. **Không tạo branch để áp dụng code:** Việc sửa code được cung cấp dưới dạng hướng dẫn block replacement; Admin tự thao tác trên repo của họ.
61. **Không tự tạo commit:** Nếu hữu ích, AI có thể gợi ý nội dung commit để Admin tự dùng; không được tạo commit hoặc thay đổi lịch sử Git.
62. **Không tạo hoặc merge Pull Request:** Chỉ Admin tự quản lý PR/merge nếu họ chọn quy trình đó.
63. **CẤM TUYỆT ĐỐI TỰ DEPLOY:** AI không được chạy deploy hoặc kích hoạt bất kỳ release nào lên production/preview, Pages/Workers hay môi trường khác. Không có ngoại lệ tự động; chỉ đưa hướng dẫn khi Admin yêu cầu cụ thể, nhưng vẫn không tự thực thi.
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


---

## 8. QUY TRÌNH READ-ONLY — CHẨN ĐOÁN VÀ BLOCK REPLACEMENT, ADMIN TỰ DÁN

### 8.1. Quyền được phép
- Được truy cập GitHub, git clone hoặc git pull để đọc phiên bản mã nguồn mới nhất. Clone phải dùng để đọc/phân tích; không ghi sửa lên repo hoặc working tree.
- Được đọc đúng file liên quan và các file phụ thuộc trực tiếp cần thiết để lần theo luồng gọi, contract hoặc nguyên nhân.
- Được tìm kiếm có mục tiêu và đọc dependency/call sites liên quan; có thể mở rộng sang file cần thiết để kiểm tra contract, module boundaries, duplication và tác động liên đới, nêu lý do khi mở rộng đáng kể.
- Được sửa nhiều file trong sandbox/workspace, chạy kiểm tra phù hợp, rồi cung cấp diff dễ review cùng bằng chứng test.

### 8.2. Các hành vi bị cấm — không được tự thực hiện
- Không ghi trực tiếp vào repo/working tree chính hoặc GitHub nếu chưa được Admin yêu cầu rõ.
- Không commit, push, tạo PR, merge hoặc thay đổi lịch sử Git nếu chưa được yêu cầu.
- **Cấm tuyệt đối tự deploy** Cloudflare Pages, Workers, preview hay production; cấm chạy script deploy, Wrangler deploy, workflow release hoặc bất kỳ thao tác tương đương.
- Cấm tự chạy migration, thao tác ghi/xóa dữ liệu, sửa binding/secret/env, hoặc kiểm thử có thể tạo đơn, thanh toán, fulfillment hay ảnh hưởng dịch vụ.
- Cấm im lặng chạy tiến trình dài, quét toàn bộ repo hoặc phân tích hàng loạt file không liên quan. Nếu phát sinh nhu cầu mở rộng, phải nêu lý do và xin Admin xác nhận trước.
- Không được hiểu yêu cầu “đọc repo”, “tìm lỗi”, “sửa code”, “build” hay “kiểm tra” là cho phép ghi sửa hoặc deploy.

### 8.3. Quy trình xử lý task
1. Xác định triệu chứng, expected behavior, actual behavior và phạm vi task.
2. Đọc phiên bản mới nhất của các file trực tiếp liên quan; ghi rõ file/commit/branch hoặc thời điểm truy cập nếu xác định được.
3. Lần theo nguyên nhân bằng bằng chứng trong code. Phân biệt rõ **đã xác minh**, **giả thuyết**, và **chưa đủ dữ liệu**.
4. Đưa phương án tối thiểu. Không tự mở rộng refactor hoặc sửa lỗi ngoài phạm vi; lỗi ngoài phạm vi chỉ ghi chú.
5. Áp dụng targeted fix/refactor trong sandbox nếu phù hợp, test và review diff. Nếu task chỉ yêu cầu tư vấn thì không sửa. Nêu rõ chưa ghi lên repo/GitHub, chưa commit/push và chưa deploy.
6. Nếu không thể đọc chính xác block hiện hữu hoặc phiên bản code khác nhau, yêu cầu Admin gửi file/đoạn code phù hợp; không bịa block cũ.

### 8.4. Format bắt buộc cho code replacement
Mỗi thay đổi phải ghi **File**, **vị trí**, **nguyên nhân**, rồi trình bày một trong các mẫu sau. Block cũ phải là code nguyên văn, đủ cụ thể để Ctrl+F tìm đúng; tuyệt đối không dùng `...` để lược code.

**Chèn thêm (giữ dòng mốc):**  
Tìm:
```js
[block mốc nguyên văn]
```
Thay:
```js
[block mới đầy đủ, giữ dòng mốc]
```

**Xóa code (giữ dòng mốc xung quanh):**  
Tìm:
```js
[block nguyên văn gồm code cần xóa và các dòng mốc]
```
Thay:
```js
[block sau khi xóa, giữ nguyên dòng mốc xung quanh]
```

**Sửa code:**  
Tìm:
```js
[block code cũ nguyên văn, đầy đủ]
```
Thay:
```js
[block code mới hoàn chỉnh]
```

Không thay block cũ bằng mô tả, không dùng placeholder hoặc dấu ba chấm trong code cũ. Nếu sửa nhiều file, tách từng file và từng patch riêng; giữ nguyên các phần không liên quan.

### 8.5. Version note khi đề xuất sửa file chính
Với file chính như `worker.js`, `payment-webhook/worker.js`, `src/admin.js`, `src/customer.js`, `src/api.js`, `src/shared.js`, hãy đề xuất thêm comment version ở đầu file hoặc trong block đầu phù hợp:
- JavaScript: `// vN — YYYY-MM-DD HH:mm (UTC+7) — mô tả thay đổi`
- HTML: `<!-- vN — YYYY-MM-DD HH:mm (UTC+7) — mô tả thay đổi -->`
- CSS: `/* vN — YYYY-MM-DD HH:mm (UTC+7) — mô tả thay đổi */`
Tăng version theo lịch sử version note đang có; nếu không xác định được thì ghi rõ đề xuất bắt đầu từ v1, không tự nhận đó là Cloudflare deployment version. Bảo toàn shebang/directive/encoding marker nếu có. Ghi hướng dẫn cụ thể vị trí Admin cần dán.

### 8.6. Kiểm tra và deploy
- Nêu các lệnh build/test phù hợp để Admin tự chạy. Không báo “đã test/build thành công” nếu AI không có kết quả thực tế.
- Có thể chạy lệnh build/test và tạo artifact trong sandbox/workspace tách biệt; không chạy lệnh tác động source chính, cấu hình, dữ liệu hoặc trạng thái dịch vụ. Nếu tác động không rõ, dừng và giải thích.
- Nếu Admin hỏi cách deploy, có thể hướng dẫn theo đúng Worker/site đích đã xác nhận; không được tự chạy deploy.
- Không deploy trong cùng task chỉ vì đã sửa code hoặc build/test được yêu cầu.

### 8.7. Phân biệt các Worker
1. `worker.js` ở thư mục gốc: Worker API chính.
2. `payment-webhook/worker.js`: Worker webhook thanh toán.
3. `public/_worker.js`: Cloudflare Pages routing.
Không suy đoán mục tiêu deploy từ tên file; mặc định không deploy.

---

## 9. QUY TẮC BẢO TOÀN BINDINGS & KHÔNG XÓA DỮ LIỆU (QUY TẮC BẮT BUỘC)

81. **Tuyệt đối cấm xóa:** Không được tự ý xóa, reset hoặc detach bất kỳ Cloudflare binding, biến môi trường, secret, KV namespace, D1 database, bảng SQL hoặc dữ liệu sản xuất nào.
82. **Cho phép thêm biến mới:** Khi phát triển tính năng mới, Agent được phép bổ sung biến môi trường, secret hoặc binding mới nếu cần, nhưng phải giữ nguyên 100% các biến và binding hiện hành.
83. **Không tự ý tạo/copy DB hoặc binding:** Trong demo/test đã xác minh, được phép ghi test records vào database demo hiện có. Không tự tạo binding, namespace, DB hay bảng mới nếu chưa được cho phép riêng; tuyệt đối không ghi database production.
84. **Xác minh bindings trước và sau deploy:** Khi deploy Worker, script deploy phải kiểm tra và kế thừa đầy đủ toàn bộ danh sách bindings từ phiên bản trước (bao gồm KV, D1, plain_text, secret_text) để đảm bảo không bị thiếu hụt sau khi kích hoạt 100% traffic.

---

## 10. QUY TẮC XỬ LÝ THEO TỪNG LẦN GIAO VIỆC ("LẦN XX") & PHẠM VI TỐI THIỂU (Quy tắc 85 – 94)

85. **Phạm vi task hiện tại:** Khi người dùng ghi “Lần XX”, chỉ làm mục được nêu; nhưng được đọc/sửa file phụ thuộc trực tiếp và refactor phần liên quan nếu cần sửa an toàn hoặc giảm coupling/duplication. Không mở rộng sang nghiệp vụ không liên quan.
86. **Không tự động kéo dài hay mở rộng lần trước:** Tuyệt đối không tự động tiếp tục, sửa lại, làm tiếp hoặc mở rộng các yêu cầu từ những lần giao việc trước, trừ khi người dùng nhắc lại cụ thể trong nội dung của lần hiện tại.
87. **Phạm vi file hợp lý:** Bắt đầu với file liên quan, nhưng có thể đọc/sửa module, caller, shared code, test và cấu hình phụ thuộc trực tiếp khi cần để hiểu, fix, modularize hoặc kiểm chứng. Không cấm mở rộng hợp lý chỉ vì task ban đầu nêu một file.
88. **Không quét toàn repo cho task nhỏ:** Không rà hàng loạt không cần thiết. Tuy nhiên, nếu người dùng yêu cầu audit toàn repo hoặc refactor kiến trúc, được quét toàn bộ repo theo phạm vi đã yêu cầu.
89. **Mở rộng theo dependency/evidence:** Khi cần theo dependency, call sites, duplicate hoặc ảnh hưởng liên đới, chủ động đọc thêm file cần thiết và giải thích ngắn lý do. Không cần xin phép cho mỗi file phụ thuộc trực tiếp hợp lý.
90. **Không refactor ngoài phạm vi nghiệp vụ liên quan:** Không sửa phần không liên quan. Trong phạm vi task, được refactor/cleanup/tách module, loại duplication hoặc logic dư thừa nếu cần cho fix, ổn định, maintainability hoặc giảm code bloat; mô tả tác động và kiểm thử.
91. **Không tự ý thay đổi hạ tầng, schema và dữ liệu:** Không tự ý thay đổi API, routes, schema dữ liệu (KV, D1, Supabase), Cloudflare bindings, environment variables, secrets, cấu hình Cloudflare hoặc dữ liệu production.
92. **Không deploy hoặc thay đổi production nếu chưa yêu cầu:** Tuyệt đối không deploy lên Cloudflare Workers, Pages hoặc thay đổi hệ thống production nếu người dùng chưa yêu cầu rõ ràng trong lần hiện tại.
93. **Phát hiện lỗi ngoài phạm vi chỉ ghi chú, không tự sửa:** Nếu phát hiện lỗi khác ngoài phạm vi của lần hiện tại, chỉ được phép ghi chú vào báo cáo để thông báo cho người dùng; tuyệt đối không tự ý sửa code.
94. **Chủ động hỏi khi chưa rõ hoặc có rủi ro:** Nếu yêu cầu của người dùng chưa đủ rõ ràng hoặc có nguy cơ ảnh hưởng đến dữ liệu/hệ thống, Agent phải dừng lại và hỏi người dùng trước khi thực hiện.

---

## 11. QUYỀN RUNTIME TEST SÂU & KIỂM CHỨNG CODE TRƯỚC KHI ĐỀ XUẤT

95. Agent được phép runtime test trực tiếp website/Admin demo bằng browser với thao tác thực tế, gồm đăng nhập Admin hợp lệ, điều hướng, nhập liệu, submit forms, tạo/sửa/xóa test records, UI/responsive, console, Network/API, validation và luồng nghiệp vụ. Mutation chỉ được thực hiện sau khi xác minh đúng demo/test và không chạm production.
96. Agent được phép tự chỉnh bản thử trong sandbox/workspace tạm (không phải repo/working tree chính thức), chạy build/unit/integration/E2E, thử nhiều phương án và tạo artifact test. Không ghi source chính, commit, push, PR, merge hoặc deploy.
97. Code replacement cuối chỉ được đưa sau khi thử nghiệm phù hợp, xác minh lỗi mục tiêu và kiểm tra regression liên quan. Nếu không thể test runtime, phải nêu giới hạn rõ; không giả nhận đã xác minh.
98. Cho phép giả lập thanh toán/webhook bằng payload dữ liệu giả có cấu trúc gần thật: mã đơn/giao dịch, nội dung chuyển khoản, số tiền, thời điểm, trạng thái; có thể thử sai mã, sai tiền, trùng giao dịch, webhook lặp hoặc trễ. Không sử dụng giao dịch/ngân hàng thật.
99. Trong demo/test đã xác minh, Agent được phép gửi webhook giả trực tiếp đến webhook demo đang chạy để kiểm tra runtime thật, gồm xác thực, parser, đối soát, dedup/idempotency, trạng thái và response. Không gửi giao dịch ngân hàng thật hoặc gọi endpoint production.
100. Được test end-to-end trên demo: tạo order trong DB demo → webhook giả vào webhook demo → đối soát → cập nhật paid → fulfillment demo → kiểm tra Admin/customer và kết quả link demo. Downstream phải là test; không cấp dịch vụ cho khách thật, thu tiền hoặc gửi email thật.
101. Test data phải có dấu hiệu test rõ, ID riêng và không trùng dữ liệu thật. Chỉ dọn record do Agent tạo trong lần test khi chắc chắn nhận diện đúng record test và xóa an toàn; nếu không thì giữ nguyên và báo Admin.
102. Báo cáo test phải nêu environment, test case, pass/fail, evidence console/network/API, regression, test chưa chạy và lý do; phân biệt đã test, đã phân tích và chưa xác minh.
103. Payload giả có thể mô phỏng cấu trúc ngân hàng thật nhưng chỉ được gửi vào webhook demo/test đã xác minh. Nếu không chắc môi trường demo hay production, không gửi payload và hỏi Admin.
104. Admin vẫn kiểm soát source: Agent cung cấp diff/block replacement đã review, nêu file/vị trí, lý do, test và rủi ro. Sandbox edits không tự áp dụng lên repo chính; Admin duyệt/applies changes trừ khi task hiện tại cho phép thao tác repo rõ ràng.

105. **Đăng nhập Admin an toàn:** Agent được phép đăng nhập Admin demo bằng browser session được Admin ủy quyền hoặc credential qua cơ chế bảo mật của nền tảng. Không yêu cầu password/token nhạy cảm trong chat, không bypass đăng nhập, không lấy credential, không ghi credential vào repo/log/report. Nếu chưa có session hợp lệ, xin Admin thiết lập cách cấp quyền an toàn.
106. **Test runtime thực, không chỉ mock UI:** Khi demo đã xác minh, ưu tiên thao tác browser thật, API đến demo, webhook giả gửi thật đến endpoint demo và xác nhận kết quả bằng Admin/UI/API/readback được phép. Ghi nhận side effects của test và chỉ dọn dữ liệu do chính lần test tạo nếu nhận diện chắc chắn.

## 12. QUY TẮC CHỐNG CODE BLOAT, MODULARITY & FAILURE ISOLATION (BẮT BUỘC)

107. **Không xem line count là mục tiêu, nhưng phải kiểm soát code bloat:** Ưu tiên behavior đúng, an toàn và dễ bảo trì. Không thêm code để xử lý giả định chưa có bằng chứng; trước khi thêm guard, fallback, retry, wrapper hoặc state mới, xác định case cụ thể và kiểm tra cơ chế hiện có.
108. **Ưu tiên reuse trước khi nhân bản:** Trước khi viết chức năng tương tự, tìm helper/function/flow hiện có trong phạm vi liên quan. Nếu có thể dùng chung mà không tăng coupling/rủi ro, hãy reuse hoặc parameterize. Không copy cả bộ CRUD/modal/render/save/toggle/delete cho tính năng tương tự nếu dùng chung phần lõi hợp lý được.
109. **Dọn code an toàn được phép:** Trong phạm vi task/refactor, được loại duplicate, dead code, unreachable branches, stale compatibility code, guard/fallback trùng hoặc không còn cần thiết sau khi kiểm tra call sites, dependency, contracts và tests. Không xóa chỉ dựa vào phỏng đoán.
110. **Giữ diff cân đối:** Nếu tính năng nhỏ làm tăng hàng trăm dòng, phải xem lại reuse, giảm lặp, tách trách nhiệm hoặc đơn giản hóa. Không ép giảm LOC bằng cách rút gọn gây khó đọc, bỏ bảo mật, xóa xử lý lỗi thiết yếu hoặc mất behavior.
111. **Tách module theo nghiệp vụ, tránh phụ thuộc chéo:** Module nên có trách nhiệm rõ, giao tiếp qua API/interface/event hoặc shared contract nhỏ ổn định. Tránh phụ thuộc vào nhiều biến/hàm nội bộ module khác, vòng import và global/window làm kênh kết nối mới nếu có lựa chọn module-level rõ ràng.
112. **Failure isolation:** Các tính năng độc lập nên được khởi tạo và xử lý lỗi độc lập. Lỗi import/init/render/API/state của một feature không được làm toàn Admin/customer app ngừng hoạt động nếu có thể cô lập an toàn. Dùng error boundary theo feature và fallback UI phù hợp; không nuốt lỗi—ghi nhận/log có kiểm soát để phần còn lại tiếp tục.
113. **Admin và trang khách hàng vẫn phải liên thông nghiệp vụ:** Tách module Admin không được làm mất khả năng cấu hình Admin tác động lên `index.html` theo thiết kế. Public config phải đi qua API/data contract/shared layer phù hợp (ví dụ Worker/API), không để `index.html` import trực tiếp code Admin hoặc phụ thuộc vào Admin runtime. Giữ đúng luồng cập nhật, schema, endpoint, storage và behavior hiện có; test cả Admin và Customer khi thay đổi dữ liệu chung.
114. **Không kiến trúc hóa quá mức:** Ưu tiên module độc lập vừa đủ—ít file nhưng không monolith. Tránh tự tạo framework nội bộ, event bus, dependency injection hoặc abstraction mới nếu chưa chứng minh giúp giảm coupling/duplication và phù hợp quy mô.
115. **Refactor có bản đồ tác động:** Xác định callers, globals, inline handlers, DOM IDs, shared state, API/storage contracts và feature liên quan trước khi di chuyển logic. Sau refactor, kiểm tra imports/exports, khởi tạo module, failure isolation, Admin-to-Customer propagation và regression phù hợp.
116. **Báo cáo refactor:** Nêu file/LOC trước-sau khi có số liệu, duplication đã xử lý, module boundary/coupling thay đổi, behavior giữ lại, test đã chạy và rủi ro còn lại. Không tuyên bố modularity tốt hơn chỉ vì tạo thêm file.
## 13. SELF-TESTING & AUTO-FIX GATE — CODE PHẢI TỰ KIỂM CHỨNG TRƯỚC KHI BÀN GIAO

**117. Test ngay trong quá trình code:** Không đợi hoàn thành toàn bộ task mới kiểm thử. Sau mỗi thay đổi logic hoặc mỗi nhóm thay đổi có ý nghĩa, Agent phải chạy kiểm tra phù hợp, phát hiện lỗi và xử lý trước khi chuyển sang phần tiếp theo.

**118. Bắt buộc vòng lặp Auto-Fix:** Khi phát hiện lỗi từ build, test, Browser, API, workflow, console, network hoặc regression, Agent phải tự phân tích nguyên nhân, sửa code trong sandbox/workspace và chạy lại test. Không chỉ liệt kê lỗi rồi giao Admin tự sửa.

**119. Không test trên Production bằng code chưa deploy:** Khi cần kiểm tra code mới bằng Browser, phải chạy code trong môi trường local preview/sandbox hoặc test environment phù hợp. Browser phải truy cập đúng phiên bản code đang sửa, không được nhầm website production đang chạy code cũ với code mới.

**120. Local Preview & Browser Verification:** Với frontend Vite, chủ động sử dụng dev server hoặc preview server phù hợp để Browser kiểm tra phiên bản workspace. Phải xác nhận URL và phiên bản code thực tế đang được test. Không mặc định Browser đã đăng nhập production cũng có quyền đăng nhập local preview vì khác origin/session.

**121. Tách biệt backend và dữ liệu test:** Local frontend không đồng nghĩa backend là test. Trước khi kiểm tra API, webhook, Admin, D1/KV, email, thanh toán, fulfillment, cấu hình hoặc bất kỳ mutation nào, phải xác định chính xác backend và downstream đang sử dụng. Không để localhost vô tình ghi vào production.

**122. Cấm test mutation trên production:** Không tạo/sửa/xóa đơn thật, không gửi giao dịch ngân hàng, không thanh toán thật, không cấp VPN cho khách thật, không gửi email thật, không thay đổi dữ liệu/configuration production, không chạy migration thật để phục vụ test. Nếu chưa có test environment an toàn thì phải đánh dấu BLOCKED/NOT VERIFIED và đề xuất cách test thay thế.

**123. Test theo workflow đầu-cuối:** Không coi test riêng từng button, function, API response hoặc toast là đủ. Phải kiểm tra workflow từ điểm bắt đầu đến kết quả cuối cùng, gồm dữ liệu, trạng thái, side effects, nơi hiển thị, persistence và readback sau reload nếu phù hợp.

**124. Kiểm tra kết quả thực, không suy đoán:** Click thành công, toast success, HTTP 200, email log hoặc response thành công không tự chứng minh nghiệp vụ hoàn tất. Phải xác minh dữ liệu/state thực tế ở nguồn đích và các màn hình/feature liên quan trong phạm vi môi trường được phép.

**125. Auto-Fix không được làm lệch task:** Khi sửa lỗi test, ưu tiên root cause và patch tối thiểu. Không làm giả test pass, không hạ assertion, không xóa test, không bỏ workflow, không mock kết quả thật để che lỗi, không vô hiệu hóa validation/security, không sửa expected result chỉ để khớp code sai.

**126. Test lại sau mỗi lần sửa:** Mỗi bug fix phải chạy lại test case gây lỗi. Sau đó chạy regression tests cho chức năng liên quan, shared modules, Admin/Customer, API/data contracts và workflow có nguy cơ bị ảnh hưởng.

**127. Lặp lại đến khi đạt hoặc bị blocker:** Agent phải chủ động tiếp tục chu trình phát hiện → phân tích → sửa → test lại → regression. Không được dừng ở lần test fail đầu tiên. Chỉ được kết thúc khi các test phù hợp đã PASS hoặc khi blocker thực sự không thể xử lý bằng quyền hạn, môi trường, dữ liệu hoặc công cụ hiện có. Không giới hạn tùy tiện số vòng fix khi vẫn có thể tiến hành an toàn.

**128. Test gate trước khi bàn giao:** Không được đánh dấu task hoàn tất khi còn lỗi nghiêm trọng, build fail, workflow mục tiêu fail, regression fail hoặc test có thể thực hiện nhưng chưa chạy. Các phần không thể test phải được nêu riêng, không được tính PASS.

**129. Báo cáo test có bằng chứng:** Phân loại kết quả `PASS`, `FAIL`, `BLOCKED`, `NOT VERIFIED`. Báo cáo phải nêu test nào đã chạy, môi trường, kết quả thực, bằng chứng phù hợp, bug đã sửa, test lại sau fix, regression và phần còn hạn chế.

**130. Review gate — chờ Admin:** Khi test gate đạt, Agent chỉ được bàn giao code, diff, báo cáo và hướng dẫn review. Không tự commit, push, tạo PR, merge, deploy, publish hoặc kích hoạt production. Admin là người review và quyết định bước tiếp theo.

**131. Không được tuyên bố hoàn tất giả:** Build pass không có nghĩa workflow pass; test mock không có nghĩa runtime pass; test frontend không có nghĩa backend pass. Mỗi kết luận chỉ được ghi ở mức đã thực sự kiểm chứng. Nếu thiếu môi trường, công cụ hoặc quyền truy cập, phải báo trung thực và dừng phần test bị chặn.
# SELF-TESTING & AUTO-FIX MODE — VPNTRINHHG

Đọc `AGENTS.md` trước khi thực hiện. Task này yêu cầu mày chủ động phát triển code, tự kiểm thử, tìm lỗi, sửa lỗi và kiểm thử lại trước khi bàn giao.

## MỤC TIÊU

Không chỉ viết code theo yêu cầu.

Mày phải làm việc như một Developer + QA Engineer:

**Phân tích → Code → Test → Phát hiện lỗi → Tìm nguyên nhân → Auto-Fix → Retest → Regression → Review → Bàn giao.**

Tao không muốn nhận code mới chỉ được đọc qua hoặc build thành công nhưng chưa kiểm tra workflow thực tế.

---

## PHASE 1 — PHÂN TÍCH TASK VÀ LẬP TEST PLAN

Trước khi code:

1. Xác định yêu cầu và behavior mong muốn.
2. Kiểm tra code hiện tại, module liên quan, caller, dependency, API contract và dữ liệu liên quan.
3. Xác định chức năng nào bị ảnh hưởng trực tiếp và gián tiếp.
4. Xác định những workflow có thể bị hỏng sau thay đổi.
5. Xác định cách kiểm thử từng workflow.
6. Phân loại:
   - Test được hoàn toàn bằng unit test.
   - Test được bằng integration/API test.
   - Phải test bằng Browser.
   - Cần backend hoặc test data.
   - Bị giới hạn do không có môi trường test an toàn.

Không lập test plan chỉ để hoàn thành thủ tục. Test case phải phản ánh nghiệp vụ thật của task.

Không mở rộng sửa các chức năng ngoài phạm vi nếu không cần thiết.

---

## PHASE 2 — CODE VÀ TEST LIÊN TỤC

Trong quá trình code, không đợi hoàn thành toàn bộ task mới test.

Thực hiện theo từng nhóm thay đổi:

1. Sửa một nhóm logic.
2. Chạy kiểm tra liên quan ngay.
3. Nếu test fail, phân tích lỗi.
4. Sửa root cause.
5. Chạy lại test.
6. Khi đạt, tiếp tục nhóm thay đổi tiếp theo.

Ưu tiên test sớm để tránh tích lũy nhiều lỗi khiến khó xác định nguyên nhân.

Không chỉ đọc code và tự suy luận rằng code đúng.

---

## PHASE 3 — TỰ ĐỘNG BUILD VÀ KIỂM TRA CODE

Tự xác định các công cụ test phù hợp với project hiện tại.

Thực hiện nếu có thể:

- Build.
- Kiểm tra syntax và module imports.
- Unit tests.
- Integration tests.
- Kiểm tra API contract.
- Kiểm tra lỗi runtime.
- Kiểm tra dependency và circular imports.
- Kiểm tra các function/call sites liên quan.
- Kiểm tra dữ liệu input, output, validation và edge cases.
- Kiểm tra code mới có gây duplication, coupling hoặc code bloat không.

Nếu phát hiện lỗi:

**Không dừng ở việc báo lỗi. Tự sửa rồi chạy lại.**

Không được:

- Xóa test đang fail để làm test suite pass.
- Hạ tiêu chuẩn assertion.
- Bỏ qua lỗi bằng catch rỗng.
- Giả lập thành công khi nghiệp vụ thực tế thất bại.
- Thay đổi behavior không liên quan để làm test dễ hơn.

---

## PHASE 4 — CHẠY LOCAL PREVIEW VÀ TEST BẰNG BROWSER

Nếu task ảnh hưởng giao diện hoặc workflow web, bắt buộc sử dụng Browser để kiểm tra phiên bản code mới khi môi trường cho phép.

### Quy trình

1. Chạy code mới từ workspace/sandbox.
2. Khởi động local server hoặc preview server phù hợp.
3. Xác định URL preview thực tế.
4. Mở Browser tại URL đó.
5. Xác nhận Browser đang sử dụng code mới, không phải production cũ.
6. Thực hiện thao tác UI thật.
7. Quan sát kết quả, trạng thái, dữ liệu và side effects.
8. Kiểm tra console, network/API errors nếu có thể.
9. Reload trang để kiểm tra persistence.
10. Kiểm tra các màn hình liên quan.

Ví dụ Vite:

`npm run dev -- --host 127.0.0.1`

Chỉ sử dụng nếu phù hợp với scripts/configuration hiện tại của repository.

Không được test code mới bằng cách thao tác website Production đang chạy code cũ rồi kết luận code workspace đã đạt.

Nếu local preview không chạy được, phải tìm và xử lý nguyên nhân trong phạm vi cho phép. Không được giả nhận đã test Browser.

---

## PHASE 5 — KIỂM TRA WORKFLOW ĐẦU-CUỐI (E2E)

Không kiểm tra mỗi button hoặc function riêng lẻ.

Phải test workflow từ đầu đến cuối, tùy phạm vi task.

Ví dụ:

### Đặt hàng

- Mở trang khách hàng.
- Chọn gói.
- Nhập thông tin.
- Tạo đơn.
- Xác nhận mã đơn.
- Kiểm tra đơn đã được lưu đúng nguồn dữ liệu.
- Kiểm tra đơn xuất hiện ở Admin.
- Reload và xác nhận dữ liệu còn tồn tại.
- Kiểm tra các trường dữ liệu không bị sai hoặc mất.

### Thanh toán và đối soát

Trong môi trường test đã xác minh:

- Tạo order test.
- Kiểm tra order được lưu.
- Giả lập nội dung giao dịch.
- Gửi webhook test nếu có endpoint test an toàn.
- Kiểm tra parser.
- Kiểm tra match mã đơn.
- Kiểm tra match số tiền.
- Kiểm tra deduplication.
- Kiểm tra giao dịch trùng.
- Kiểm tra webhook lặp.
- Kiểm tra giao dịch sai tiền hoặc sai mã.
- Kiểm tra trạng thái paid.
- Kiểm tra Transactions.
- Kiểm tra All Orders.
- Kiểm tra fulfillment nếu downstream hoàn toàn là test.
- Reload Admin và kiểm tra persistence.

Email, thanh toán, webhook và fulfillment chỉ test qua môi trường giả lập/test đã xác minh.

### Admin → Customer

Nếu task ảnh hưởng cấu hình Admin:

- Thay đổi cấu hình bằng Admin test.
- Kiểm tra dữ liệu được lưu đúng.
- Kiểm tra API trả về đúng contract.
- Mở hoặc reload Customer.
- Xác nhận Customer nhận cấu hình mới.
- Kiểm tra cache, polling và persistence nếu có.
- Đảm bảo Customer không phụ thuộc vào Admin runtime.

### CRUD

Nếu task ảnh hưởng CRUD:

- Create.
- Read.
- Update.
- Delete chỉ trên dữ liệu test.
- Kiểm tra validation.
- Kiểm tra duplicate.
- Kiểm tra lỗi API.
- Kiểm tra reload.
- Kiểm tra dữ liệu không bị ghi đè ngoài ý muốn.

Chỉ test các workflow liên quan đến task, không cần test toàn bộ project một cách máy móc.

---

## PHASE 6 — KHI TEST FAIL: AUTO-FIX LOOP

Khi bất kỳ test nào fail, thực hiện chu trình sau:

### A. Thu thập evidence

Ghi nhận:

- Test case bị fail.
- Expected result.
- Actual result.
- Console error.
- Network/API request và response nếu có.
- File/function liên quan.
- State/data thực tế.
- Bug có tái hiện được không.

### B. Tìm root cause

Không sửa dựa trên phỏng đoán khi có thể trace.

Phân biệt:

- Lỗi frontend.
- Lỗi backend.
- Lỗi API contract.
- Lỗi data persistence.
- Lỗi state/cache.
- Lỗi async/race condition.
- Lỗi authentication/authorization.
- Lỗi module initialization.
- Lỗi test environment.

### C. Fix

- Sửa nguyên nhân gốc.
- Ưu tiên patch nhỏ và đúng phạm vi.
- Không workaround để che triệu chứng.
- Không làm suy yếu bảo mật hoặc validation.
- Không tạo thêm duplication không cần thiết.

### D. Retest

Sau khi sửa:

1. Chạy lại test case fail.
2. Xác nhận bug đã hết.
3. Test edge cases liên quan.
4. Test regression những chức năng có thể bị ảnh hưởng.
5. Nếu tiếp tục fail, quay lại thu thập evidence và fix tiếp.

**Lặp lại chu trình này cho đến khi đạt hoặc gặp blocker thực sự. Không được dừng chỉ vì đã thử sửa một lần.**

---

## PHASE 7 — REGRESSION TEST

Sau khi các lỗi mục tiêu đã được fix, kiểm tra lại những chức năng có nguy cơ bị ảnh hưởng.

Ưu tiên:

- Các workflow liên quan trực tiếp.
- Các module dùng chung.
- Import/export và initialization.
- API contract.
- Data schema.
- Admin và Customer.
- Persistence.
- Authentication và authorization.
- UI state và reload.
- Các chức năng trước đây đang hoạt động có liên quan.

Nếu task là refactor hoặc module splitting, phải kiểm tra callers, inline handlers, globals, shared state, dependency, circular imports và failure isolation.

Nếu một feature gặp lỗi, các feature độc lập còn lại phải tiếp tục hoạt động khi có thể.

---

## PHASE 8 — TEST GATE

Chỉ được đánh dấu READY FOR REVIEW khi:

- [ ] Code đã sửa đúng yêu cầu.
- [ ] Build thành công nếu project có build.
- [ ] Không còn lỗi syntax/import nghiêm trọng.
- [ ] Test mục tiêu đã PASS.
- [ ] Workflow đầu-cuối liên quan đã PASS khi có môi trường.
- [ ] Các bug phát hiện trong quá trình test đã được sửa.
- [ ] Test lỗi sau fix đã chạy lại.
- [ ] Regression test phù hợp đã PASS.
- [ ] API/data contract được giữ nguyên.
- [ ] Không gây side effects ngoài ý muốn.
- [ ] Không có production mutation.
- [ ] Diff được kiểm tra lại.
- [ ] Không thêm code dư thừa hoặc abstraction không cần thiết.

Nếu test không thể chạy vì thiếu môi trường hoặc quyền truy cập, không được giả nhận đã đạt. Phải phân loại BLOCKED hoặc NOT VERIFIED.

---

## PHASE 9 — BÁO CÁO CUỐI

Sau khi hoàn thành, báo cáo:

### 1. Task
Tóm tắt yêu cầu và những gì đã xử lý.

### 2. Files changed
Danh sách file đã sửa/tạo/xóa và mục đích.

### 3. Root causes
Những lỗi phát hiện, nguyên nhân thực tế và cách khắc phục.

### 4. Testing results

| Test | Kết quả | Evidence |
|---|---|---|
| Build | PASS/FAIL/BLOCKED | Output |
| Unit | PASS/FAIL/BLOCKED | Test report |
| Integration/API | PASS/FAIL/BLOCKED | Request/response |
| Browser/UI | PASS/FAIL/BLOCKED | Browser result |
| E2E workflow | PASS/FAIL/BLOCKED | Workflow evidence |
| Regression | PASS/FAIL/BLOCKED | Test result |

Chỉ liệt kê những test thực sự chạy.

### 5. Auto-fix history
- Bug đã phát hiện.
- Root cause.
- Fix đã áp dụng.
- Kết quả retest.

### 6. Regression impact
Những chức năng đã test lại và những chức năng có nguy cơ liên đới.

### 7. Unverified / Blocked
Những phần chưa test được và lý do cụ thể.

### 8. Diff review
Đánh giá thay đổi:

- Code có tăng bất hợp lý không?
- Có duplicate không?
- Có dead code không?
- Có thêm abstraction không cần thiết không?
- Có coupling mới không?
- Có thể đơn giản hơn không?
- Có thay đổi ngoài phạm vi không?

### 9. Production safety
Xác nhận rõ:

- Không commit.
- Không push.
- Không tạo PR.
- Không merge.
- Không deploy.
- Không ghi dữ liệu production.
- Không gửi giao dịch/email thật.
- Không thay đổi dịch vụ khách hàng thật.

### 10. Trạng thái bàn giao

Chỉ chọn một:

- **READY FOR REVIEW** — các test có thể thực hiện đã đạt, còn giới hạn nào được nêu rõ.
- **BLOCKED** — chưa thể hoàn thành do blocker cụ thể.
- **FAILED** — còn lỗi chưa giải quyết được.

Không dùng READY FOR REVIEW nếu workflow mục tiêu còn FAIL hoặc test khả thi nhưng chưa chạy.

---

## NGUYÊN TẮC CUỐI

Tao không cần mày chỉ viết code nhanh.

Tao cần code đúng, workflow thực sự hoạt động, lỗi được tự phát hiện và sửa, regression được kiểm tra, diff hợp lý và an toàn trước khi tao nhận để review.

**Hãy chủ động làm việc, tự test, tự fix và tự retest. Chỉ bàn giao khi có kết quả kiểm chứng. Không deploy. Không đẩy code lên GitHub. Không tác động Production.**
