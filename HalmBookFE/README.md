# HALM Book Web

Frontend React/Vite của HALM Book. Cấu trúc module, quy tắc phiên đăng nhập và dữ liệu được mô tả trong [ARCHITECTURE.md](./ARCHITECTURE.md).

## Chạy local

Cài dependency theo lockfile bằng `npm ci`. Sao chép `.env.example` thành `.env.local` rồi cấu hình `VITE_API_BASE_URL`. Dev mặc định dùng http://localhost:8082; build yêu cầu khai báo địa chỉ API rõ ràng. Không ghi token hay mật khẩu vào cấu hình frontend.

- npm run dev: máy chủ Vite local (cấu hình HTTPS hiện có).
- npm run build: tạo bản production.
- npm run preview: xem bản đã build.
- npm run lint: kiểm tra mã, bao gồm lỗi JSX thiếu import.
- npm test: kiểm tra phiên, chính sách chọn JWT theo endpoint và cấu hình route.

Đối chiếu thay đổi và kết quả xác minh tại báo cáo WEB_REFACTOR_REPORT.md ở thư mục gốc repo.

## Deploy fork lên Vercel

1. Chọn repo fork và nhánh cần deploy. Root Directory: `HalmBookFE`; Framework: Vite; Output Directory: `dist`.
2. Install Command: `npm ci` (hoặc để tự nhận diện). File `.npmrc` giữ tương thích quá trình cài đặt thư viện Facebook hiện có với React 19; vẫn cần kiểm thử OAuth bằng tài khoản thật.
3. Build Command: `npm run build`. Trong Environment Variables, đặt `VITE_API_BASE_URL` bằng origin HTTPS công khai của backend, ví dụ `https://api.example.com`. Không thêm `/api`. Áp dụng cho cả Preview và Production cần sử dụng, rồi redeploy để đưa giá trị mới vào bundle.
4. Nếu dùng Cloudflare Quick Tunnel, backend local phải chạy trước. Chạy `cloudflared tunnel --url http://localhost:8082`, lấy địa chỉ HTTPS trả về và điền vào biến trên. Giữ backend, MySQL, các dịch vụ phụ thuộc và tunnel hoạt động trong lúc demo. Tunnel chuyển tiếp HTTP tới backend; frontend không kết nối trực tiếp cổng MySQL. Quick Tunnel đổi URL khi khởi động lại, khi đó phải cập nhật biến và redeploy.
5. Tùy chọn: đặt `VITE_APP_DOWNLOAD_URL` bằng trang tải app HTTPS hoặc deep link Expo `exp://` / `exps://` đang hoạt động. Nếu bỏ trống, footer không hiển thị QR giả. Link Expo Go là link mở dự án trong Expo Go, không thay thế bản cài app độc lập; Metro/Expo vẫn phải hoạt động khi dùng link dev.
6. Redeploy, mở trực tiếp và tải lại `/dangnhap`, `/hang`, `/uudai`, `/admin/login`. `vercel.json` đã cấu hình fallback cho các route React. Nếu Dashboard đang ghi đè Install Command bằng lệnh cũ, chuyển về `npm ci` hoặc bỏ Override.

Không đặt `VITE_API_BASE_URL` thành localhost/IP LAN trên Vercel. Build trên Vercel sẽ báo lỗi rõ ràng nếu thiếu địa chỉ hoặc dùng địa chỉ local. Google/Facebook OAuth cần cấu hình domain/redirect của bản deploy trong trang quản trị nhà cung cấp.

Thay đổi backend phải được chạy từ bản backend đã cập nhật; deploy riêng frontend lên Vercel không cập nhật backend đang chạy local. Bản sửa phân quyền trả 401 khi chưa xác thực, 403 khi member gọi API admin; các API admin hỗ trợ/analytics và khuyến mãi quản trị đều yêu cầu ADMIN.
