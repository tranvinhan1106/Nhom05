# HALMBOOK

Ứng dụng đọc sách được xây dựng với Expo SDK 58, React Native và TypeScript.

## Chạy dự án

```bash
npm ci --legacy-peer-deps
npm start
```

Các lệnh tiện ích:

```bash
npm run android
npm run ios
npm run web
npm run lint
npx tsc --noEmit
npx expo-doctor
```

## Kết nối backend

API URL được đọc từ biến môi trường `EXPO_PUBLIC_API_URL`.

```bash
Copy-Item .env.example .env.local
```

Sau đó sửa URL trong `.env.local`:

- Android Emulator: `http://10.0.2.2:8082`
- iOS Simulator hoặc web: `http://localhost:8082`
- Thiết bị thật: `http://<IPv4-của-máy-chạy-backend>:8082`, với hai thiết bị cùng mạng LAN

Không commit `.env.local`. Expo sẽ nạp các biến có tiền tố `EXPO_PUBLIC_` vào ứng dụng lúc chạy.

### Chạy bản kiểm thử bằng tunnel, không sửa `.env.local`

```powershell
npm run start:connected -- --api https://your-api.example.com
```

Thay địa chỉ ví dụ bằng origin HTTPS đang hoạt động của backend/Cloudflare Tunnel, không thêm `/api` hoặc đường dẫn màn hình. Lệnh kiểm tra API sách trước khi mở Expo Go, truyền `EXPO_PUBLIC_API_URL` riêng cho tiến trình con và dùng cổng Metro 8083. Lệnh không ghi biến vào file cấu hình. Cổng backend vẫn là 8082.

Tùy chọn: `--port 8085` để chọn cổng khác; `--lan` khi dùng cùng mạng; `--check` để chỉ kiểm tra kết nối. Nếu đã có một phiên Expo đang chạy từ thư mục source khác, quét QR của phiên mới để mở đúng code vừa kiểm thử. Link/QR Expo dùng để tải bundle app; URL Cloudflare dùng để app gọi API. Khi khởi động lại Quick Tunnel, lấy URL backend mới rồi chạy lại lệnh.

### Đồng bộ dữ liệu admin xuống app

- Banner: app đọc `/api/home/banners?platform=APP`. Trong trang admin, chọn kênh **APP**; banner WEB là dữ liệu riêng. Banner APP xuất hiện trên Trang chủ, làm mới khi kéo xuống, đưa app về foreground hoặc tối đa khoảng 15 giây khi đang mở. Đích đến hỗ trợ `app:offers`, `app:categories`, các màn app được cho phép, hoặc `book:<bookId>`.
- Ưu đãi: gói nạp, promotion, book offer và biểu giá được đọc từ các API công khai của backend. Sách giảm sâu/COMBO nhận đúng ID của offer do admin cấu hình. Không dùng cache khuyến mãi cũ trên thiết bị để tự tạo ưu đãi. Kéo xuống để làm mới hoặc chờ đợt cập nhật khoảng 30 giây khi app đang active.
- Thông báo: cần đăng nhập đúng tài khoản người nhận. Inbox/badge làm mới khi mở màn, về foreground hoặc khoảng 15 giây. Nếu không đồng bộ được, app giữ lịch sử đã lưu và hiển thị trạng thái lỗi để thử lại.
- Ảnh: dùng URL từ metadata của backend. URL tài nguyên nội bộ/tunnel cũ được chuyển về backend hiện tại; nếu không có URL bìa, hiển thị placeholder thay vì đoán tên file `{bookId}.jpg`.

Kết quả rà soát API và giới hạn kiểm thử: [docs/app-api-audit-2026-11-23.md](docs/app-api-audit-2026-11-23.md).

## Cấu trúc

Ứng dụng sử dụng `App.tsx` và navigation nội bộ bằng state. Package `expo-router` vẫn được giữ trong dependency tree để tương thích với bộ package Expo hiện tại, nhưng dự án không sử dụng file-based routing.
