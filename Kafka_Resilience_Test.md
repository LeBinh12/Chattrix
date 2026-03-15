# Hướng Dẫn Kiểm Thử Độ Tin Cậy Của Kafka (Resilience Test)

Để khẳng định 100% tin nhắn không bị mất, chúng ta cần thực hiện bài kiểm tra "Gãy & Phục hồi" (Crash & Recover). Đây là phương pháp chuyên nghiệp để kiểm tra tính toàn vẹn của dữ liệu trong các hệ thống phân tán.

## 1. Kịch Bản Kiểm Thử (The Chaos Strategy)

1.  **Bắt đầu Load Test**: Chạy test với khoảng 1,000 - 5,000 tin nhắn qua Dashboard.
2.  **Giả lập sự cố (Kill Process)**: Ngay khi máy báo đã gửi được khoảng 50%, bạn hãy **tắt nóng** Backend (nhấn Ctrl+C hoặc Kill process `go run main.go`). 
    *   *Lúc này: Hàng ngàn tin nhắn vẫn còn nằm trong hàng đợi Kafka nhưng chưa được lưu vào Database.*
3.  **Khởi động lại**: Bật lại Backend.
4.  **Kiểm tra đối soát**: Sau khi Backend chạy xong, hãy đếm số lượng bản ghi trong MongoDB và so sánh với chỉ số "Total Sent" mà Dashboard đã báo trước khi sập.

## 2. Tại Sao Phương Pháp Này Chứng Minh Được "Không Mất Dữ Liệu"?

Dựa trên cấu trúc code hiện tại của bạn:

*   **Producer (Gửi đi):** Sử dụng `RequiredAcks = WaitForAll` (dòng 33 file `producer.go`). Kafka Broker đảm bảo tin nhắn đã nằm an toàn trên ổ cứng của tất cả các bản sao (replicas) trước khi báo thành công cho Backend.
*   **Consumer (Nhận về):** Đã tắt `AutoCommit` (dòng 200 file `consumer.go`). 
    *   Nếu Backend sập khi đang xử lý tin nhắn, Kafka sẽ thấy Consumer này biến mất.
    *   Vì bạn **chưa gọi lệnh `Commit`**, Kafka vẫn giữ con trỏ (offset) ở vị trí cũ.
    *   Khi bạn bật lại Backend, Consumer sẽ đọc lại từ đúng vị trí đó và xử lý tiếp những tin nhắn còn dở dang.

## 3. Cách Thực Hiện Đối Soát (Validation Script)

Bạn có thể dùng một script nhỏ để đếm số tin nhắn có nội dung "Load test" trong MongoDB để so sánh:

```javascript
// Chạy trong MongoDB Compass hoặc Shell
db.messages.countDocuments({ 
    content: { $regex: /Load test/ } 
})
```

## 4. Các điểm cần lưu ý để đạt 100% độ tin cậy

Trong code của bạn hiện tại đã rất tốt, nhưng để tuyệt đối nhất:

1.  **Duplicate (Lặp tin nhắn)**: Trong trường hợp sập, có thể có tin nhắn bị xử lý 2 lần (do Consumer sập sau khi lưu DB nhưng trước khi Commit Kafka). Tuy nhiên, code của bạn đã có cơ chế `Idempotent = true` để giảm thiểu việc này ở phía Producer. Bạn có thể thêm trường `request_id` ở tin nhắn để DB không bị trùng.
2.  **Graceful Shutdown**: Khi tắt Backend, nếu bạn nhấn Ctrl+C, code đã có đoạn `CloseProducer` (dòng 152 `producer.go`) để đợi gửi nốt các tin nhắn đang nằm trong bộ nhớ đệm (Flush) rồi mới tắt hẳn.

**Kết luận:** Nếu số lượng trong DB khớp (hoặc nhiều hơn do trùng lặp nhưng không ít hơn) so với số lượng gửi từ Client, bạn đã chứng minh được hệ thống Kafka hoạt động tin cậy 100%.
