# Bộ Dataset 20 Ảnh Thực tế: Ngập lụt & Không ngập lụt (Flood & Dry Benchmark)

Bộ dữ liệu gồm **20 hình ảnh giao thông đường phố thực tế** với độ phân giải cao, được lưu trữ trên hệ thống CDN tốc độ cao (CORS mở, không giới hạn tốc độ, xem trực tiếp trong trình duyệt mà không bị lỗi 403/429/400). Bộ ảnh phục vụ kiểm thử và đánh giá độ chính xác của mô hình **Gemini Vision AI (gemini-3.8-flash)** theo phương pháp **Visual Landmark Relative Depth Reasoning (VLRDR)**.

---

## 🌊 Nhóm 1: 10 Ảnh Có Ngập Lụt (Flooded Streets)

| # | Mã ID | Tên & Ngữ cảnh | Mức ngập Ground Truth | Dấu hiệu mốc vật lý (VLRDR Landmarks) | Link xem trực tiếp ảnh (Direct CDN) |
|---|---|---|---|---|---|
| 1 | `flood-01` | Ô tô vượt dòng nước ngập sâu giữa phố đô thị | **Level 3 (30–40cm)** | Bánh xe ô tô ngập 1/2 (~35cm), nước bắn qua mép gầm xe, mặt đường chìm hoàn toàn. | [Xem ảnh](https://images.pexels.com/photos/8568720/pexels-photo-8568720.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 2 | `flood-02` | Xe hơi di chuyển chật vật qua đường ngập sau giông lốc | **Level 3 (28–36cm)** | Nước dâng sát cản trước, mép vỉa hè chìm dưới nước, lốp xe chìm 1/2. | [Xem ảnh](https://images.pexels.com/photos/28447761/pexels-photo-28447761/free-photo-of-car-navigating-flooded-street-after-heavy-rain.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 3 | `flood-03` | Ô tô lội nước ngập nửa bánh xe trên đường đô thị | **Level 3 (30–38cm)** | Vành lazang ngập nửa, mực nước tiệm cận gầm xe, lớp nước phẳng lặng phủ kín mặt đường. | [Xem ảnh](https://images.pexels.com/photos/28447757/pexels-photo-28447757/free-photo-of-car-navigating-flooded-road-in-urban-area.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 4 | `flood-04` | Nhiều xe mắc kẹt trên đoạn đường ngập sâu cục bộ | **Level 4 (50–65cm)** | Nhiều xe ô tô chìm gần nửa thân, mực nước ngập ngang mép cửa, tuyến đường tê liệt. | [Xem ảnh](https://images.pexels.com/photos/28447763/pexels-photo-28447763/free-photo-of-flooded-road-with-submerged-cars-and-trees.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 5 | `flood-05` | Tuyến phố nhiệt đới nước tràn bờ vỉa hè 18-25cm | **Level 2 (18–25cm)** | Bờ vỉa hè 15cm bị chìm, vũng nước lớn chiếm trọn làn đường, cây cối soi bóng xuống vũng ngập. | [Xem ảnh](https://images.pexels.com/photos/14216445/pexels-photo-14216445.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 6 | `flood-06` | Khu phố ngập diện rộng sau mưa bão nhiệt đới | **Level 3 (25–35cm)** | Đường phố ngập úng toàn bộ, mặt đường biến thành mặt hồ, tòa nhà đô thị phản chiếu mặt nước. | [Xem ảnh](https://images.pexels.com/photos/35302178/pexels-photo-35302178/free-photo-of-urban-flooding-after-heavy-rain-in-city.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 7 | `flood-07` | Người dân lội bộ qua tuyến phố ngập ngang bắp chân | **Level 3 (30–42cm)** | Người đi bộ ngập ngang bắp chân/đầu gối, chân tường nhà chìm trong nước, vỉa hè ngập hoàn toàn. | [Xem ảnh](https://images.pexels.com/photos/35249003/pexels-photo-35249003/free-photo-of-urban-flooding-scene-with-historical-buildings.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 8 | `flood-08` | Người dân bì bõm lội nước tại khu dân cư | **Level 3 (32–45cm)** | Nước ngập ngang đùi người dân, lòng đường và hiên nhà chìm sâu, dòng nước đục ngầu cuộn sóng. | [Xem ảnh](https://images.pexels.com/photos/32404938/pexels-photo-32404938/free-photo-of-flooded-street-in-metro-manila-with-people-walking.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 9 | `flood-09` | Đường phố ngập nước đêm phản chiếu ánh đèn đô thị | **Level 2 (15–25cm)** | Cảnh quan đường phố ban đêm, đèn đường phản chiếu mặt nước ngập, nước phủ kín mặt đường. | [Xem ảnh](https://images.pexels.com/photos/9963280/pexels-photo-9963280.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 10 | `flood-10` | Biển cảnh báo cấm đường do ngập lụt sâu nguy hiểm | **Level 4 (45–60cm)** | Biển rào chắn cấm đường Road Closed, nước ngập sâu phủ kín toàn bộ lòng đường, đường hoàn toàn phong tỏa. | [Xem ảnh](https://images.pexels.com/photos/13865777/pexels-photo-13865777.jpeg?auto=compress&cs=tinysrgb&w=800) |

---

## ☀️ Nhóm 2: 10 Ảnh Không Ngập Lụt (Dry / Clear Streets)

| # | Mã ID | Tên & Ngữ cảnh | Mức ngập Ground Truth | Dấu hiệu mốc vật lý (VLRDR Landmarks) | Link xem trực tiếp ảnh (Direct CDN) |
|---|---|---|---|---|---|
| 11 | `dry-01` | Xe máy lưu thông trên đường phố rợp bóng cây | **Level 0 (0cm)** | Mặt đường nhựa khô ráo hoàn toàn, bánh xe máy tiếp xúc trực tiếp mặt đường, bờ vỉa hè lộ rõ 100%. | [Xem ảnh](https://images.pexels.com/photos/12392817/pexels-photo-12392817.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 12 | `dry-02` | Hàng xe máy đỗ bên lề đường TP. Hồ Chí Minh | **Level 0 (0cm)** | Xe máy dựng trên vỉa hè khô sạch, ống xả và bánh xe cách đất rõ rệt, không có vũng đọng. | [Xem ảnh](https://images.pexels.com/photos/25915972/pexels-photo-25915972/free-photo-of-a-person-sitting-on-a-motor-scooter-parked-by-the-building.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 13 | `dry-03` | Tuyến phố đô thị Việt Nam nhộn nhịp xe cộ | **Level 0 (0cm)** | Dòng xe máy lưu thông nhịp nhàng, vạch kẻ đường sơn trắng sắc nét, không có nước ngập. | [Xem ảnh](https://images.pexels.com/photos/20237762/pexels-photo-20237762/free-photo-of-urban-street-in-vietnam.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 14 | `dry-04` | Dòng xe máy di chuyển trên đường phố Hà Nội buổi sáng | **Level 0 (0cm)** | Nắng sớm rọi trên mặt đường nhựa khô, mật độ phương tiện đông đúc, bờ vỉa hè khô ráo. | [Xem ảnh](https://images.pexels.com/photos/19504817/pexels-photo-19504817/free-photo-of-golden-light-of-the-rising-sun-flooding-the-street-of-hanoi.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 15 | `dry-05` | Khu phố thương mại sầm uất tại TP. Hồ Chí Minh | **Level 0 (0cm)** | Phương tiện và người đi bộ trên lòng đường khô, cửa hàng buôn bán tấp nập, mặt đường khô hoàn toàn. | [Xem ảnh](https://images.pexels.com/photos/25897526/pexels-photo-25897526/free-photo-of-blocks-of-flats-in-city.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 16 | `dry-06` | Ngõ phố dân cư rực rỡ cờ hoa ngày nắng đẹp | **Level 0 (0cm)** | Tuyến ngõ lát bê tông khô ráo, xe máy dựng gọn gàng hai bên, bóng râm và ánh nắng rõ nét. | [Xem ảnh](https://images.pexels.com/photos/20237798/pexels-photo-20237798/free-photo-of-residential-street-in-vietnam.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 17 | `dry-07` | Cửa hàng mặt phố và xe máy đỗ lề đường Hà Nội | **Level 0 (0cm)** | Dãy xe máy dựng trước cửa hàng, vỉa hè lát gạch khô ráo, vành nan hoa xe máy lộ 100%. | [Xem ảnh](https://images.pexels.com/photos/19577372/pexels-photo-19577372/free-photo-of-store-in-house-by-street-in-city.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 18 | `dry-08` | Góc phố vỉa hè cổ kính TP. Hồ Chí Minh | **Level 0 (0cm)** | Vỉa hè lát gạch thông thoáng, người đi bộ bước trên mặt đường khô, không có vũng đọng. | [Xem ảnh](https://images.pexels.com/photos/25915984/pexels-photo-25915984/free-photo-of-view-of-a-street-sidewalk-and-exterior-of-an-old-building-in-a-city.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 19 | `dry-09` | Tuyến phố Sa Đéc yên bình rợp bóng cây | **Level 0 (0cm)** | Đường nhựa phẳng phiu rợp bóng mát, bờ lề và mép cỏ khô ráo, tầm nhìn quan sát hoàn hảo. | [Xem ảnh](https://images.pexels.com/photos/39645882/pexels-photo-39645882/free-photo-of-quaint-streetscape-in-sa-dec-vietnam.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 20 | `dry-10` | Người phụ nữ chở hoa xe đạp trên phố chợ Hà Nội | **Level 0 (0cm)** | Xe đạp chở hoa trên phố chợ khô, người đi chợ bước đi trên mặt đường khô, không có nước ngập. | [Xem ảnh](https://images.pexels.com/photos/20633112/pexels-photo-20633112/free-photo-of-woman-leading-bike-with-shopping.jpeg?auto=compress&cs=tinysrgb&w=800) |

---

## 🛠️ Hướng dẫn Tải toàn bộ 20 ảnh về máy

Bạn chỉ cần chạy script tải tự động:

```bash
python3 demo-assets/download_images.py
```

Toàn bộ 20 file sẽ được tự động lưu vào thư mục `demo-assets/images/` với tên chuẩn:
- `flood-01_flooded.jpg` đến `flood-10_flooded.jpg`
- `dry-01_non-flooded.jpg` đến `dry-10_non-flooded.jpg`
