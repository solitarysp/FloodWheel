# FloodWheel — Kịch bản Thuyết trình Demo 3 Phút (Hackathon / Stakeholder)

## Thời lượng: 180 giây (3 phút)
## Mục tiêu: Chứng minh tính khả thi đột phá của VLRDR với Gemini Vision AI, không cần cảm biến ngập đắt đỏ.

---

### Phút 1 (0:00 – 1:00): Đặt vấn đề & Nỗi đau thực tế (The Problem)
- **Lời thoại (Speaker):**
  > "Kính thưa Ban giám khảo, tại Hà Nội, TP.HCM, hay Manila, cứ mưa lớn là ngập.
  > Hiện nay cả chính quyền lẫn hàng triệu người dân, shipper Grab, Gojek đều hoàn toàn **'mù thông tin'** về việc đường ngập sâu bao nhiêu centimet.
  > Cảm biến ngập thủy lực dưới cống thì đắt đỏ, dễ nghẹt rác và bảo trì cực kỳ tốn kém.
  > Nhưng thành phố chúng ta đã có sẵn hàng trăm chiếc **camera giao thông CCTV** hoạt động 24/7.
  > **FloodWheel** biến toàn bộ camera sẵn có này thành mạng lưới cảm biến đo độ sâu nước ngập mà **không tốn 1 đồng chi phí phần cứng mới**."

---

### Phút 2 (1:00 – 2:00): Trình diễn Trực tiếp (Live Demo Showcase)
- **Thao tác (Action):**
  1. Mở trang Demo tại `http://localhost:3000/demo`.
  2. Bấm nút **"Nạp ảnh mẫu (Demo Quick Load)"** hoặc kéo thả ảnh đường Nguyễn Hữu Cảnh vào khung upload.
  3. Bấm **"Phân tích độ sâu ngập (Gemini VLRDR)"**.
- **Lời thoại (Speaker):**
  > "Hãy quan sát: Chỉ trong chưa đầy **0.5 giây**, mô hình Gemini Vision đã phát hiện chiếc xe Wave đang lội nước.
  > Thay vì đoán mò, AI áp dụng phương pháp **VLRDR (Visual Landmark Relative Depth Reasoning)**:
  > - Bánh xe máy chuẩn có đường kính 50cm.
  > - Ở đây, nước đã dâng qua nửa bánh và che lấp hoàn toàn miệng ống xả xe máy (~35cm).
  > - AI lập tức kết luận: **Ngập 30–38cm — Cảnh báo chết máy cho xe 2 bánh!**"

---

### Phút 3 (2:00 – 3:00): Khả năng nhân rộng & Tác động xã hội (Impact & Scalability)
- **Lời thoại (Speaker):**
  > "Từ một camera đơn lẻ, hệ thống tự động tổng hợp dữ liệu từ 50–100 camera toàn thành phố thành bản đồ nhiệt ngập lụt theo thời gian thực.
  > - **Đối với chính quyền:** Cảnh báo các điểm đen ngập úng để điều tiết máy bơm và lực lượng cứu hộ.
  > - **Đối với tài xế và người dân:** Tự động đề xuất tuyến đường tránh ngập an toàn, bảo vệ tài sản và tính mạng.
  > **FloodWheel: Biến camera đường phố thành tai mắt bảo vệ đô thị thông minh.** Xin cảm ơn!"
