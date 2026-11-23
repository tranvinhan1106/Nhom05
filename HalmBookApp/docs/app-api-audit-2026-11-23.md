# Rà soát kết nối và đồng bộ HalmBookApp — 23/11/2026

## Phạm vi

Kiểm tra code ứng dụng Expo/React Native trong `HalmBookApp`, đối chiếu endpoint với backend đang chạy, kiểm thử API qua localhost và Cloudflare, chạy test/TypeScript/lint/build, và kiểm tra giao diện từ bản web được export bởi chính app. Mọi thay đổi code trong nhánh này chỉ thuộc `HalmBookApp` trên fork. Không sửa `HalmBookFE`, mã backend, source local gốc hoặc repo chính của nhóm; không chỉnh cấu trúc database hay dữ liệu admin thủ công.

Theo `AGENTS.md`, đã đọc tài liệu Expo v57 được yêu cầu trước khi viết code. Dependency thực tế là Expo SDK 58; không thay SDK hoặc nâng dependency để sửa các lỗi API này.

## Các lỗi xác nhận và sửa

| Mức độ | Vấn đề | Bằng chứng / hành vi sau sửa |
|---|---|---|
| P1 | Màn Ưu đãi gọi hàm `fetchPromotions` không còn tồn tại | TypeScript ban đầu báo hai lỗi TS2552. Luồng mới tải offer feed qua một callback dùng chung cho mount, polling và kéo làm mới. |
| P1 | Banner admin không được gắn vào Trang chủ | `HomeBannerCarousel` chỉ được import nhưng không render. Đã gắn component vào màn Trang chủ; dữ liệu APP thật xuất hiện và nút banner mở đúng màn Ưu đãi. |
| P1 | Một phần ưu đãi vẫn đọc cache cũ và quy ước promotion ID giả | Bỏ cache `halm_offer_single_deals_v1` và bảng đoán P001 → B001. Hero/sách giảm giá nhận đúng SINGLE offer từ server; COMBO, voucher và biểu giá dùng dữ liệu backend. Snapshot rỗng xóa ưu đãi đã ngừng; lỗi mạng giữ dữ liệu xác nhận gần nhất kèm trạng thái thử lại. |
| P2 | Hai font của màn Ưu đãi tải từ URL không tồn tại | URL Plus Jakarta Sans và Inter trả 404 khi kiểm tra. Đổi sang font hệ thống, không tải ba font từ mạng lúc mở màn. |
| P2 | Tìm kiếm gọi `/api/books/search` không có trong controller backend | Đường dẫn cũ bị security chặn 401 trong môi trường hiện tại. Tìm kiếm mới đọc các trang `/api/home/books` rồi lọc dữ liệu trên app. Có test theo dõi phân trang và truyền hủy request. |
| P2 | Chức năng tải tài liệu gọi danh mục admin | `/api/admin/books/categories` trả 401 cho khách/member. Đổi sang `/api/home/categories`, nhận danh mục công khai thực tế. |
| P2 | Ảnh dự phòng đoán tên file từ book ID | `/api/home/covers/B0001.jpg` trả 404, trong khi metadata có URL ảnh thật. Loại bỏ URL dự đoán tại helper chung, danh mục, giỏ hàng và tủ sách. Giữ placeholder khi thiếu metadata; chuyển tài nguyên nội bộ/tunnel cũ về backend hiện tại. |
| P2 | Lỗi đồng bộ thông báo bị che bởi cache cục bộ | API tài khoản test trả 15 thông báo, một chưa đọc. UI bản kiểm thử hiển thị dữ liệu này. Khi API lỗi hoặc trả schema sai, app giữ cache nhưng hiển thị trạng thái chưa đồng bộ và nút thử lại; không báo danh sách đã cập nhật thành công. |
| P2 | Cấu hình có thể suy ra API từ host Expo và dò nhiều IP LAN | Chỉ dùng backend đã cấu hình. Chặn URL có `/api`, đường dẫn màn hình, credentials, query/fragment hoặc URL tunnel Expo. Khi chạy qua Expo tunnel phải đặt API rõ ràng. Không tự chuyển JWT/request ghi dữ liệu sang các IP máy khác. |
| P2 | Host frontend trả HTML 200 bị coi là dữ liệu API | Client phát hiện HTML và báo cần kiểm tra backend URL. Lỗi 404 giữ nguyên HTTP status và thêm endpoint liên quan; không tự thử lại mutation. Có lệnh `start:connected` kiểm tra backend JSON trước khi chạy Expo. |

Phiên Expo local được kiểm tra đã nhận URL Cloudflare mới qua environment của tiến trình. File `.env.local` gốc còn URL cũ nhưng không bị sửa theo yêu cầu; do đó không quy mọi lỗi hiện tại cho file này. Bản fork có phiên Expo riêng và QR riêng.

## Kết quả kiểm tra

- Rà 105 tham chiếu `/api/` trong 28 file code có liên quan đến HTTP; đồng thời đọc navigation, service và các màn app liên quan.
- 64 lượt kiểm tra HTTP đọc dữ liệu, chia đều giữa backend local và tunnel: 56 phản hồi 200; 6 phản hồi 401 tại endpoint tìm kiếm cũ/API admin dùng sai và 2 phản hồi 404 của ảnh dự phòng không tồn tại. Các đường dẫn lỗi được dùng làm trường hợp chẩn đoán, không tính là chức năng đã pass.
- Các API đúng của danh mục/sách, banner APP, khuyến mãi, book offer, gói nạp, biểu giá, hạng, hồ sơ, giỏ hàng, ví/lịch sử, tủ sách/quyền đọc, yêu thích, nhiệm vụ, thông báo, hỗ trợ và lịch sử chat đều trả 200 với quyền phù hợp trong bộ kiểm tra.
- 81 unit/regression tests đạt, gồm phản hồi offer feed rỗng, hủy ưu đãi, giá 0, nhận thông báo admin mới, bảo toàn cache khi offline/schema sai, phân trang tìm kiếm, cấu hình URL và kiểm tra backend trước khi chạy.
- `tsc --noEmit`: đạt, không còn lỗi TypeScript.
- `npm run lint`: 0 lỗi, 68 cảnh báo; chưa dọn toàn bộ cảnh báo ngoài phạm vi lỗi kết nối.
- `expo export --platform all --max-workers 2`: đạt cho Android, iOS và web sau bản sửa cuối cùng.
- Kiểm tra giao diện bản web của HalmBookApp ở kích thước điện thoại: đăng nhập bằng tài khoản test; hiển thị banner APP và mở Ưu đãi từ banner; hiển thị SINGLE offer, ba gói nạp và hai voucher; inbox 15 thông báo/một chưa đọc; tìm kiếm Sapiens trả một kết quả; tủ sách hiển thị sách đang thuê.
- Manifest công khai của phiên Expo Go riêng trả 200 và SDK 58. Phiên này dùng checkout của nhánh sửa app, không dùng thư mục source local gốc.

## Giới hạn và vận hành

Kiểm tra giao diện trên web của app và build native không thay thế việc thao tác cuối cùng trên điện thoại bằng Expo Go. Chưa xác minh toàn bộ gesture, picker file, OAuth và phát nhạc trên thiết bị thật. Không thực hiện thanh toán, chuyển Khoai, đổi mật khẩu, gửi broadcast/hỗ trợ hoặc thuê sách thật để kiểm thử; các luồng ghi dữ liệu được kiểm tra bằng contract/test mô phỏng và đọc mapping backend.

Backend hiện không cung cấp nguồn reader leaderboard mặc định. Màn reader leaderboard cần endpoint cấu hình riêng; không bịa dữ liệu xếp hạng hoặc trỏ sang API admin.

Ảnh bìa do metadata backend/admin cung cấp có thể không khớp tác phẩm; việc sửa catalog là một thay đổi dữ liệu riêng, không được thực hiện trong lần sửa app này.

Giữ backend, Cloudflare Tunnel và Metro của bản fork chạy khi mở QR thử nghiệm. QR cũ vẫn mở phiên source cũ. Quick Tunnel/Expo tunnel có thể đổi URL sau khi khởi động lại; không commit URL tạm thời vào source. Không cần redeploy hoặc thay đổi FE để sử dụng bản app này.
