# Phân tích sự khác biệt giữa Test Dữ liệu ảo (5000u) và Test Dữ liệu thật (600u)

Tiếp theo thắc mắc của bạn về việc tại sao hệ thống đạt được ~5000 user trong test giả lập nhưng chỉ đạt ~600 user khi test thực tế, tôi đã rà soát mã nguồn và phát hiện các nguyên nhân kỹ thuật sau:

## 1. Bản chất của "Virtual User" (Goroutine) vs "Real Client"
- **Dữ liệu ảo (Simulation)**: Được chạy bằng các `goroutine` trong Go. Mỗi user giả lập chỉ tốn khoảng vài KB RAM. Do đó, 5000 user chỉ tốn khoảng 400-500MB RAM (như trong báo cáo 5000u của bạn).
- **Dữ liệu thật (Real Client)**: Nếu bạn dùng trình duyệt (Chrome/Edge) để test thật, mỗi tab trình duyệt tốn từ 100MB - 200MB RAM. Một máy tính thông thường sẽ cạn kiệt tài nguyên (RAM/CPU) sau khi mở vài chục đến 100 tab, dẫn đến không thể kết nối thêm.

## 2. Lưu lượng Phản hồi (Outgoing Broadcast)
Đây là nguyên nhân quan trọng nhất trong mã nguồn:
- **Khi test ảo**: Mã nguồn thường gửi tin nhắn đến các ID ngẫu nhiên không online. Server kiểm tra thấy ID không online nên không thực hiện "Broadcast" (truyền tin) đi đâu cả -> Server rất rảnh.
- **Khi test thật (Stress Test với User ID thật)**: Các user đều đang online. Một tin nhắn gửi đi sẽ kích hoạt cơ chế `Hub.Broadcast`.
    - Server phải duyệt qua danh sách session để gửi lại tin nhắn cho người nhận.
    - Hệ thống còn gửi thêm `Conversation Preview` cập nhật trạng thái cho cả người gửi và người nhận.
    - **Kết quả**: Khối lượng công việc của Server tăng gấp nhiều lần (O(N)) so với test ảo.

## 3. Giới hạn Kết nối của Hệ điều hành (Windows)
Bạn đang chạy trên **Windows**, hệ điều hành này có các giới hạn mặc định khắt khe hơn Linux về:
- **Ephemeral Ports**: Windows thường giới hạn khoảng 5000 cổng cho các kết nối ra (outgoing). Nếu các user thật kết nối dồn dập và không được giải phóng kịp (trạng thái `TIME_WAIT`), bạn sẽ chạm ngưỡng giới hạn cổng ở khoảng 600-1000 kết nối.
- **Socket Handles**: Windows giới hạn số lượng handle mà một tiến trình có thể mở nếu không được cấu hình lại Registry.

## 4. Bottleneck tại Cơ sở dữ liệu (MongoDB)
Trong file [database/mongo.go](file:///e:/C%C3%A1%20nh%C3%A2n/KhoaLuan/database/mongo.go), hệ thống đang sử dụng cấu hình mặc định:
- **MaxPoolSize**: Mặc định là **100**.
- Khi 600 user thật kết nối cùng lúc và yêu cầu truy vấn (lấy thông tin user, bạn bè), các yêu cầu thứ 101 trở đi sẽ phải xếp hàng chờ kết nối DB trống. Điều này gây ra hiện tượng nghẽn cổ chai (bottleneck) khiến các kết nối sau bị timeout.

## 5. Chỉ số CPU "ảo" trên Dashboard
Tôi nhận thấy trong [modules/loadtest/handler.go](file:///e:/C%C3%A1%20nh%C3%A2n/KhoaLuan/modules/loadtest/handler.go), chỉ số CPU được tính bằng công thức:
`cpu_usage = số lượng goroutine * 0.05`
Đây là một chỉ số mô phỏng để biểu đồ trông sống động, không phản ánh chính xác 100% tải thực tế của CPU máy tính bạn.

---
### Tóm lại:
Hiện tượng này **không hoàn toàn do server của máy bạn yếu**, mà do sự kết hợp giữa **giới hạn của Windows**, **cấu hình DB Connection Pool** và **độ phức tạp thực tế** khi các user thật tương tác với nhau (so với việc các user ảo gửi tin nhắn vào "không trung").
