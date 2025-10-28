Để chạy được chương trình cần chuẩn bị các công nghệ sau:
- Database: MongoDB
- Kafka
- Docker
- Môi trường Go
  
Tiếp theo clone src [github](https://github.com/LeBinh12/Chattrix.git)

Lần đầu cần chạy chương trình sẽ chạy 
- docker-compose up --build (Để sinh ra môi trường minio)
- chạy container minio mới sinh

Cuối cùng chỉ cần chạy câu lệnh go run main.go


Dưới đây là mô tả về cấu trúc dự án

- common/ – chứa các tệp và thư viện chung được sử dụng trong toàn bộ dự án.
- config/ – chứa các tệp cấu hình cho ứng dụng.
- data/ – chứa dữ liệu liên quan đến ứng dụng, bao gồm cả MinIO cho lưu trữ đối tượng.
- database/ – chứa các tệp và script liên quan đến cơ sở dữ liệu.
- logs/ – chứa các tệp nhật ký hoạt động của ứng dụng.
- middleware/ – chứa các middleware cho ứng dụng.
- modules/ – chứa các module chức năng của ứng dụng.
- routes/ – chứa định nghĩa các tuyến đường API.
- utils/ – chứa các hàm tiện ích hỗ trợ.

