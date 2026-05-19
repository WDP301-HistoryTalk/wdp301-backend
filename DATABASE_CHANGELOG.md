# Database Changelog

Vì dự án sử dụng **MongoDB (NoSQL)** và **Mongoose**, cấu trúc dữ liệu rất linh hoạt và không có các file migration cứng như SQL (Prisma, TypeORM, v.v.). 
Do đó, file này được dùng để **theo dõi lịch sử thay đổi cấu trúc Database**.

Mỗi khi bạn thêm, sửa, hoặc xoá một Mongoose Schema / Collection, hãy ghi log lại vào đây để team nắm được:
1. Trường (Field) nào mới được thêm vào.
2. Có cần phải chạy script cập nhật data cũ hay không.
3. Collection nào mới được tạo.

---

## [1.0.0] - 2026-05-19
### Added
- Khởi tạo Database MongoDB kết nối Atlas (`HistoryTalkDB`).
- **`users` collection**: Tạo Schema cơ bản cho người dùng.
  - Các trường: `name` (String), `email` (String, unique), `password` (String, select: false), `role` (String, enum: [user, admin]).
  - Hỗ trợ Mongoose timestamps (`createdAt`, `updatedAt`).

---

## Template (Copy cho các thay đổi trong tương lai)

## [Phiên bản hoặc Ngày tháng] - YYYY-MM-DD
### Added (Thêm mới)
- [Tên collection/field]: Mô tả...

### Changed (Thay đổi)
- [Tên collection/field]: Mô tả (ví dụ: Đổi kiểu dữ liệu từ String sang Boolean)...

### Removed (Đã xoá)
- [Tên collection/field]: Mô tả...

### Script Data (Nếu cần)
- Nếu có viết script cập nhật dữ liệu cũ (ví dụ `src/scripts/update-users.ts`), hãy ghi tên script vào đây để mọi người chạy.
