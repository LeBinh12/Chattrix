Để chạy được chương trình cần chuẩn bị các công nghệ sau:

- Database: MongoDB
- Kafka
- Docker
- Môi trường Go

Tiếp theo clone src [github](https://github.com/LeBinh12/Chattrix.git)

Lần đầu cần chạy chương trình sẽ chạy

- docker-compose up --build (Để sinh ra môi trường minio)
- chạy container minio mới sinh

 Cuối cùng chỉ cần chạy câu lệnh go run main.go. Trước khi chạy nhớ cấu hình file `.env` với thông tin MongoDB, ví dụ:

```
MONGO_URI=mongodb://root:19006292@localhost:27018/?authSource=admin
MONGO_DB=chattrix
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Trong đó `authSource=admin` là bắt buộc nếu bạn dùng tài khoản mặc định được tạo bởi `docker-compose` để việc xác thực không bị lỗi.

- `CORS_ALLOWED_ORIGINS` (tùy chọn): danh sách origin được phép (phân tách bằng dấu phẩy). Để mở cho tất cả, có thể bỏ trống để mặc định `*`.

### Seed tài khoản mẫu

Chạy seeder để tạo sẵn 2 tài khoản `admin` và `user` (mật khẩu mặc định `123456`):

```
go run cmd/seeder/main.go
```

Dưới đây là mô tả về cấu trúc dự án

- common/ – chứa các tệp và thư viện chung được sử dụng trong toàn bộ dự án.
- config/ – chứa các tệp cấu hình cho ứng dụng.
- data/ – chứa dữ liệu liên quan đến ứng dụng, bao gồm cả MinIO cho lưu trữ đối tượng.
- database/ – chứa các tệp và script liên quan đến cơ sở dữ liệu.
- logs/ – chứa các tệp nhật ký hoạt động của ứng dụng.
- middleware/ – chứa các middleware cho ứng dụng.
- modules/ – chứa các module chức năng của ứng dụng (đang được di chuyển dần sang kiến trúc sạch – xem bên dưới).
- routes/ – chứa định nghĩa các tuyến đường API.
- utils/ – chứa các hàm tiện ích hỗ trợ.

### Kiến trúc sạch (Clean Architecture)

Mã nguồn đang được refactor theo Clean Architecture với các lớp sau:

- `internal/domain/*`: entity và interface thuần domain.
- `internal/usecase/*`: use case điều phối nghiệp vụ, không phụ thuộc framework.
- `internal/adapter/*`: adapter cho HTTP, DB, bảo mật, v.v.

Tiến trình hiện tại: flow đăng nhập người dùng đã được chuyển sang Clean Architecture. Chi tiết xem `docs/architecture.md`.
