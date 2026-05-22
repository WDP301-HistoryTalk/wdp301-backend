# Database Changelog

Vì dự án sử dụng **MongoDB (NoSQL)** và **Mongoose**, cấu trúc dữ liệu rất linh hoạt và không có các file migration cứng như SQL (Prisma, TypeORM, v.v.). 
Do đó, file này được dùng để **theo dõi lịch sử thay đổi cấu trúc Database**.

Mỗi khi bạn thêm, sửa, hoặc xoá một Mongoose Schema / Collection, hãy ghi log lại vào đây để team nắm được:
1. Trường (Field) nào mới được thêm vào.
2. Có cần phải chạy script cập nhật data cũ hay không.
3. Collection nào mới được tạo.

---

## [2.0.0] - 2026-05-22
### Added
- **`tiers` collection**: Subscription plans for users.
  - Fields: `title` (enum: free/plus/pro), `amount` (int), `limitedToken` (int).
- **`orders` collection**: Payment orders for tier upgrades.
  - Fields: `uid`, `tierId`, `orderCode`, `amount`, `paymentLinkId`, `checkoutUrl`, `qrCode`, `status` (enum), `paidAt`.
- **`transactions` collection**: Individual payment transaction records.
  - Fields: `orderId`, `amount`, `paymentLinkId`, `payload` (mixed), `status` (enum), `transactionDate`.
- **`historicalcontexts` collection**: Historical periods/events.
  - Fields: `createdBy`, `name`, `description`, `era` (enum), `year`, `isDC`, `location`, `imageUrl`, `videoUrl`, `characterIds[]` (replaces ContextCharacterMapping join table).
  - Indexes: `era` (asc), `name` (text search).
- **`characters` collection**: Historical figures.
  - Fields: `createdBy`, `name`, `title`, `background`, `imageUrl`, `bornDate`, `deathDate`, `personality`.
  - Indexes: `name` (text search).
- **`documents` collection**: Source documents for RAG pipeline.
  - Fields: `uploadedBy`, `entityId`, `entityType` (enum: Context/Character), `title`, `fileUrl`, `content`.
  - Indexes: `(entityId, entityType)` compound.
- **`vectorchunks` collection**: Embedding chunks for AI/RAG.
  - Fields: `docId`, `entityId`, `content`, `embedding` (number[]), `sequenceNumber`.
  - Indexes: `(docId, sequenceNumber)` compound. Atlas Vector Search index created separately.
- **`chatsessions` collection**: AI chat sessions.
  - Fields: `uid`, `contextId`, `characterId`, `title`, `lastMessageAt`.
- **`messages` collection**: Individual messages in a chat session.
  - Fields: `sessionId`, `content`, `isFromAi`, `suggestedQuestion`.
- **`quizzes` collection**: Quizzes linked to a historical context, with embedded questions.
  - Fields: `contextId`, `createdBy`, `title`, `questions[]` (embedded: content, options[], correctAnswer, explanation).
- **`quizsessions` collection**: User quiz attempts, with embedded answer details.
  - Fields: `quizId`, `uid`, `limitedTime`, `startTime`, `endTime`, `score`, `answers[]` (embedded: questionId, selectedOption, isCorrect).

### Changed
- **`users` collection**: Extended to match full ERD.
  - Added: `tierId` (ref Tier), `token` (int, default 0), `lastActiveDate` (Date).
  - Updated: `role` enum changed from `['user', 'admin']` to `['customer', 'content_admin', 'system_admin']`.

### Notes
- `ContextCharacterMapping` from ERD is **not** a separate collection — replaced by `characterIds[]` in `historicalcontexts`.
- `Question` and `AnswerDetail` from ERD are **embedded** sub-documents, not separate collections.

### Script Data
- Run `npm run db:seed` after first `docker compose up` to populate tiers and admin user.
- Run `npm run db:reset` to wipe all collections and re-seed (local dev only).

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
