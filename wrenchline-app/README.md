# ISUZU Thăng Long — Quản lý quy trình xưởng sửa xe ô tô

Ứng dụng web theo dõi quy trình sửa chữa theo vai trò, xây dựng bằng React + Vite,
Supabase (đăng nhập, cơ sở dữ liệu, RLS), triển khai trên Vercel. Giao diện tiếng Việt,
ngày giờ hiển thị theo múi giờ TP. Hồ Chí Minh (GMT+7).

## Vai trò

| Vai trò | Quyền hạn |
|---|---|
| **Quản lý** (`admin`) | Toàn quyền: xem/sửa mọi phiếu xe, phân công tổ trưởng, giao việc, đổi vị trí công việc của bất kỳ nhân sự nào, xác nhận tài khoản mới đăng ký, lên đơn sơn xe. |
| **Cố vấn dịch vụ** (`service_advisor`) | Tạo phiếu theo dõi khi xe vào xưởng. Xem tất cả phiếu. Lên đơn sơn xe mới. |
| **Tổ trưởng** (`foreman`) | Xem xe được phân công, theo dõi tiến độ kỹ thuật viên, cập nhật trạng thái xe, nghiệm thu chất lượng sau sửa chữa. |
| **Kỹ thuật viên** (`technician`) | Xem công việc được giao và cập nhật trạng thái (chờ xử lý → đang thực hiện → hoàn thành). |
| **Tổ sơn** (`paint_team`) | Xem danh sách đơn sơn xe được phân công. Bấm **Bắt đầu** khi nhận xe, **Hoàn thành** khi sơn xong. |

## Xác nhận tài khoản

Khi đăng ký, tài khoản mới ở trạng thái **chờ quản lý xác nhận** và chưa thể dùng hệ
thống (được thực thi bằng row-level security, không chỉ chặn ở giao diện). Quản lý xác
nhận trong tab **Nhân sự & vị trí**. Tài khoản đăng ký với vai trò *Quản lý* được tự
động xác nhận để mở tài khoản quản lý đầu tiên.

Quản lý cũng có thể đổi vị trí công việc (vai trò) của bất kỳ nhân sự nào bất cứ lúc nào
từ cùng tab đó.

## Hiển thị phiếu theo dõi

Danh sách phiếu theo dõi (xe) tự chuyển đổi theo kích thước màn hình:
- **Máy tính bàn / laptop** (rộng hơn 860px): dạng bảng kiểu Excel, dễ quét nhiều dòng.
- **Điện thoại** (hẹp hơn 860px): dạng thẻ (card), dễ chạm và đọc trên màn hình nhỏ.

## Đã cấu hình sẵn

Một Supabase project thật đã được tạo cho ứng dụng này:

- Project ref: `hcnphjkayzkwybfburgv` (khu vực Singapore — gần Việt Nam nhất hiện có)
- Bảng: `profiles` (có cột `approved`), `vehicles`, `tasks`, `status_updates`,
  `quality_inspections` — đều bật row-level security.
- File `.env` trong project đã trỏ sẵn tới project này, chạy được ngay không cần cấu hình thêm.

## Chạy trên máy (localhost)

```bash
npm install
npm run dev
```

Mở địa chỉ hiển thị trong terminal (thường là `http://localhost:5173`).

## Triển khai lên Vercel

1. Đẩy thư mục này lên một repo GitHub.
2. Trên Vercel, chọn "Add New Project" → import repo (framework preset: Vite).
3. Thêm biến môi trường trong phần Settings của project Vercel:
   - `VITE_SUPABASE_URL` = `https://hcnphjkayzkwybfburgv.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (khóa publishable trong file `.env`)
4. Deploy. File `vercel.json` đã cấu hình sẵn để mọi đường dẫn đều trỏ về `index.html` (SPA).

## Xác nhận email khi đăng ký

Mặc định Supabase yêu cầu xác nhận email khi đăng ký tài khoản mới. Để test nhanh nội bộ,
có thể tắt ở Supabase → Authentication → Providers → Email → "Confirm email".

## Ghi chú

- Row-level security thực thi ai được ghi gì (cố vấn tạo phiếu, quản lý/tổ trưởng phân
  công, kỹ thuật viên chỉ cập nhật việc của chính mình) — không chỉ là giới hạn ở giao diện.
- `status_updates` lưu lại lịch sử mọi lần đổi trạng thái, ai đổi và khi nào — hữu ích
  sau này cho báo cáo hoặc nhật ký hoạt động toàn xưởng.
