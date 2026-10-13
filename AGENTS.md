# FloodWheel Coding Rules & Guidelines

Tài liệu này là quy tắc bắt buộc áp dụng cho toàn bộ dự án **FloodWheel** (Frontend & Backend).

---

## 1. Quy Tắc Giới Hạn Chiều Dài File (Core Rule)

- **Quy tắc cứng:** Mỗi file code **không dài hơn 250 dòng**.
- **Ngưỡng tối ưu:** Ưu tiên duy trì mỗi file trong khoảng **100 – 200 dòng** code.
- **Yêu cầu thực thi:** 
  - Không viết dồn logic vào một file duy nhất.
  - Khi một file đạt ngưỡng ~200 dòng hoặc bổ sung tính năng mới làm vượt ngưỡng, bắt buộc phân tách thành các module con:
    - **Frontend:** Tách Types ra `types.ts`, tách State/API ra Custom Hooks (`hooks/`), tách sub-components ra các component con, tách helper ra `utils/`.
    - **Backend:** Tách sub-routers (`routers/`), tách schemas Pydantic (`schemas/`), tách domain logic (`services/`), tách dependencies (`dependencies/`).

---

## 2. Tiêu Chuẩn Chất Lượng & Kiến Trúc

1. **Zero Breaking Changes:** Khi tái cấu trúc hoặc thêm code mới, phải bảo toàn nguyên vẹn REST API endpoints, DTOs, và routing URLs.
2. **Type Safety & Validation:**
   - **TypeScript (Frontend):** Tuyệt đối hạn chế dùng `any`, định nghĩa interface/type chặt chẽ.
   - **Python (Backend):** Sử dụng đầy đủ Type Annotations và Pydantic schemas cho dữ liệu vào/ra.
3. **Single Responsibility:** Mỗi file, hàm, class chỉ đảm nhiệm một vai trò chuyên biệt.
