<div align="center">

# HistoryTalk — Backend API

**REST API cho nền tảng học Lịch sử tương tác HistoryTalk** — trò chuyện với nhân vật lịch sử bằng AI (RAG), làm quiz theo chương trình THPT, gamification (streak/nhiệm vụ), thanh toán gói thuê bao và quản trị nội dung.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](#license)

</div>

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng chính](#tính-năng-chính)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Kiến trúc & cấu trúc thư mục](#kiến-trúc--cấu-trúc-thư-mục)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Biến môi trường](#biến-môi-trường)
- [Scripts](#scripts)
- [API Reference](#api-reference)
- [Models dữ liệu](#models-dữ-liệu)
- [Xác thực & phân quyền](#xác-thực--phân-quyền)
- [Database migrations](#database-migrations)
- [Testing](#testing)
- [Quy ước code](#quy-ước-code)
- [Triển khai (Deployment)](#triển-khai-deployment)
- [Khắc phục sự cố](#khắc-phục-sự-cố)

---

## Tổng quan

**HistoryTalk** là nền tảng học Lịch sử THPT (bám sát chương trình SGK — `grade`, `chapterNumber`, `chapterTitle`) với hai trụ cột nghiệp vụ:

1. **Trò chuyện với nhân vật lịch sử** — người dùng chat với các `Character` (nhân vật lịch sử) thông qua một service AI ngoài (RAG — Retrieval-Augmented Generation), câu trả lời được bám sát tài liệu đã nạp (`Document` → `VectorChunk`). Mỗi tin nhắn tiêu tốn `token` (đúng nghĩa token LLM: `promptTokens + completionTokens`), trừ trực tiếp vào ví token của user.
2. **Làm quiz lịch sử** — `Quiz` gắn với `HistoricalContext` (bối cảnh/sự kiện), phân loại theo `level` (EASY/MEDIUM/HARD), `era`, `grade`. Hỗ trợ chấm điểm, lưu kết quả, đánh giá (rating), báo lỗi câu hỏi.

Repo này là **backend REST API** — lớp business logic + truy cập dữ liệu cho cả web (`HistoryTalk-FE`) lẫn mobile (`mobile-historytalk`).

## Tính năng chính

| Nhóm | Mô tả |
|---|---|
| **Auth** | Đăng ký/đăng nhập bằng email+password hoặc Google OAuth, JWT access/refresh token, quên/đặt lại mật khẩu qua email |
| **Chat AI (RAG)** | Chat theo phiên với nhân vật lịch sử, trừ token theo usage thật từ AI service, lưu lịch sử hội thoại |
| **Quiz** | Ngân hàng câu hỏi trắc nghiệm, làm bài có giới hạn thời gian, chấm điểm tự động, xem lại đáp án, rating, báo lỗi câu hỏi, import hàng loạt qua CSV |
| **Gamification** | Chuỗi ngày học (streak) tính atomic/idempotent, nhiệm vụ hằng ngày (`DailyQuest`) với phần thưởng token, staff chỉnh được reward/target qua API riêng |
| **Thanh toán** | Gói thuê bao (`Tier`: free/plus/pro) giới hạn token/tháng, thanh toán qua **PayOS**, lịch sử đơn hàng/giao dịch |
| **Quản trị nội dung (Staff)** | CRUD nhân vật, bối cảnh lịch sử, quiz + câu hỏi, soft-delete/restore, thùng rác dùng chung |
| **Dashboard** | Thống kê tổng hợp user, phiên chat, quiz, doanh thu cho SYSTEM_ADMIN |
| **Tài liệu & RAG pipeline** | Upload PDF/ảnh (OCR qua Tesseract), trích xuất văn bản, đẩy sang AI service để sinh embedding phục vụ RAG |
| **Thông báo đẩy** | Đăng ký device token, gửi push notification qua Firebase Cloud Messaging |
| **API Docs tự sinh** | OpenAPI/Swagger sinh từ JSDoc trong route, có UI trực quan tại `/api-docs` |

## Công nghệ sử dụng

| Layer | Công nghệ |
|---|---|
| Runtime / Ngôn ngữ | Node.js, TypeScript |
| Web framework | Express 4 |
| Database | MongoDB (Mongoose 9) |
| Xác thực | JWT (`jsonwebtoken`), Google OAuth (`google-auth-library`), `bcryptjs` |
| Validation | Zod v4 |
| Push notification | Firebase Admin SDK |
| Thanh toán | PayOS |
| Lưu trữ file | Supabase Storage |
| OCR / xử lý tài liệu | `tesseract.js`, `pdf-parse` |
| Email | Nodemailer |
| API Docs | `swagger-jsdoc` + `swagger-ui-express` |
| Testing | Vitest, Supertest, `mongodb-memory-server` |
| Dev tooling | `tsx` (hot reload), ESLint, Prettier |

## Kiến trúc & cấu trúc thư mục

Luồng phụ thuộc giữa các layer: **`routes → controllers → services → models`**

```
src/
  index.ts              # Entry point: kết nối DB, khởi động server
  app.ts                # Khởi tạo Express app: middlewares, routes, /health, /api-docs
  config/
    index.ts             # Tổng hợp toàn bộ biến môi trường thành 1 object config
    db.ts                 # connectDB() + global Mongoose toJSON/toObject transform (_id → id)
    swagger.ts            # Sinh swaggerSpec từ JSDoc trong routes/
  routes/                # Định nghĩa REST endpoint + khối JSDoc @openapi
  controllers/            # Lớp HTTP: parse request, gọi service, trả response chuẩn hoá
  services/               # Business logic + truy vấn database
  models/                 # Mongoose schema
  middlewares/             # Express middleware (auth, rate-limit, validation, error handling...)
  validations/             # Zod schema cho từng request
  types/
    enums.ts               # Toàn bộ enum dùng chung (nguồn duy nhất)
    index.d.ts              # Mở rộng type Express (req.user)
  utils/                   # AppError, logger, response helper...
  scripts/                 # CLI scripts (migrate, rollback, generate-openapi...)
  db/migrations/           # Migration có version, viết bằng TypeScript
test/
  unit/                    # Unit test (service, có mock)
  integration/             # Integration test (Express app thật + MongoDB in-memory)
```

### Định dạng response chuẩn hoá

Mọi response thành công đi qua `sendSuccess()`:

```json
{ "success": true, "message": "...", "data": { }, "timestamp": "...", "errorCode": null }
```

Mọi lỗi đi qua `errorHandler` middleware trung tâm:

```json
{ "success": false, "message": "...", "errors": [ ], "timestamp": "...", "errorCode": null }
```

## Bắt đầu nhanh

### Yêu cầu

- Node.js ≥ 18
- MongoDB (local hoặc Atlas)
- (Tuỳ chọn) Tài khoản Google Cloud (OAuth), PayOS, Supabase, Firebase nếu muốn chạy đầy đủ tính năng

### Cài đặt

```bash
git clone <repo-url>
cd wdp301-backend
npm install
```

### Cấu hình môi trường

```bash
cp .env.example .env
```

Điền các giá trị cần thiết — xem chi tiết ở mục [Biến môi trường](#biến-môi-trường). Tối thiểu để chạy được server: `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`.

### Khởi tạo dữ liệu

```bash
npm run db:migrate   # seed các gói (Tier) mặc định + tài khoản admin đầu tiên
```

### Chạy server

```bash
npm run dev           # tsx watch — hot reload khi sửa code
```

Server mặc định chạy tại `http://localhost:5000`, API mount dưới `/api/v1`, health-check tại `/health`, Swagger UI tại `/api-docs`.

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|:---:|---|
| `PORT` | | Cổng server (mặc định `5000`) |
| `NODE_ENV` | | `development` \| `production` \| `test` |
| `CLIENT_URL` | | URL frontend, dùng cho email/redirect |
| `CORS_ORIGIN` | | Origin được phép gọi API |
| `MONGO_URI` | ✅ | Connection string MongoDB |
| `JWT_SECRET` / `JWT_ACCESS_EXPIRES_IN` | ✅ | Secret + TTL cho access token |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` | ✅ | Secret + TTL cho refresh token |
| `GOOGLE_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_ID` / `GOOGLE_IOS_CLIENT_ID` | | Client ID Google OAuth theo từng nền tảng (mobile gửi `id_token` với `aud` khác web) |
| `PAYOS_CLIENT_ID` / `PAYOS_API_KEY` / `PAYOS_CHECKSUM_KEY` / `PAYOS_BASE_URL` | | Thông tin tích hợp cổng thanh toán [PayOS](https://my.payos.vn) |
| `PAYOS_RETURN_URL` / `PAYOS_CANCEL_URL` | | Trang frontend PayOS redirect về sau khi thanh toán |
| `PAYOS_MOBILE_DEEPLINK` | | Deep link app mobile nhận kết quả thanh toán (mặc định `mobilehistorytalk://payment/result`) |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USER` / `MAIL_PASS` / `MAIL_FROM` | | Cấu hình SMTP gửi email (reset password, thông báo) |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | | Service account Firebase Admin (push notification). `FIREBASE_PRIVATE_KEY` lưu `\n` dạng escape, code tự unescape |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (hoặc `SUPABASE_KEY`) / `SUPABASE_STORAGE_BUCKET` | | Supabase Storage — lưu file media (ảnh nhân vật, tài liệu...) |
| `SUPABASE_MEDIA_MAX_UPLOAD_MB` | | Giới hạn dung lượng upload (mặc định `50`, phải khớp cấu hình project Supabase) |
| `AI_SERVICE_URL` | | Base URL của AI service ngoài (RAG chat + xử lý tài liệu) |

> Xem `.env.example` để có template đầy đủ với comment giải thích từng biến.

## Scripts

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy dev server với hot reload (`tsx watch`) |
| `npm run build` | Dọn `dist/` rồi biên dịch TypeScript |
| `npm start` | Chạy bản đã build (`dist/index.js`) — dùng cho production |
| `npm run typecheck` | Kiểm tra type toàn bộ, không sinh file |
| `npm test` | Chạy toàn bộ test suite (Vitest) |
| `npm run test:unit` / `test:integration` | Chạy riêng unit / integration test |
| `npm run test:coverage` | Chạy test kèm báo cáo coverage |
| `npm run test:watch` | Chạy test ở chế độ watch |
| `npm run lint` / `lint:fix` | Kiểm tra / tự sửa lỗi ESLint |
| `npm run format` | Format code bằng Prettier |
| `npm run db:migrate` | Áp dụng các migration còn chưa chạy |
| `npm run db:rollback` | Rollback migration gần nhất |
| `npm run db:status` | Xem bảng trạng thái migration (đã chạy / chưa chạy) |
| `npm run subscriptions:downgrade` | Hạ cấp các gói thuê bao đã hết hạn (chạy định kỳ/cron) |
| `npm run generate:openapi` | Sinh lại `docs/openapi.json` từ JSDoc trong routes |

## API Reference

Tất cả route mount dưới tiền tố `/api/v1`.

| Tiền tố | Auth | Mô tả |
|---|---|---|
| `/auth` | mixed | Đăng ký, đăng nhập, Google OAuth, refresh token, quên/đặt lại mật khẩu |
| `/users` | authenticate | Hồ sơ cá nhân, đổi mật khẩu, (admin) quản lý user |
| `/characters` | mixed | Danh sách/chi tiết nhân vật lịch sử (public đọc, staff quản lý) |
| `/historical-contexts` | mixed | Bối cảnh/sự kiện lịch sử |
| `/chat` | authenticate | Phiên chat với nhân vật lịch sử, gửi tin nhắn (trừ token) |
| `/quizzes` | mixed | Danh sách quiz công khai, làm bài, nộp bài, xem kết quả |
| `/gamification` | authenticate | Streak + nhiệm vụ hằng ngày của user hiện tại, nhận thưởng |
| `/staff` | CONTENT_ADMIN/SYSTEM_ADMIN | CRUD quiz + câu hỏi, quản lý báo cáo câu hỏi |
| `/staff/quests` | CONTENT_ADMIN/SYSTEM_ADMIN | Xem + chỉnh định nghĩa nhiệm vụ hằng ngày (không tạo/xoá — xem `docs/GAMIFICATION_CRUD_PLAN.md`) |
| `/system-admin/dashboard` | SYSTEM_ADMIN | Thống kê tổng hợp toàn hệ thống |
| `/tiers` | public đọc, SYSTEM_ADMIN ghi | Quản lý gói thuê bao |
| `/payments` | authenticate | Tạo đơn hàng, callback PayOS, lịch sử giao dịch |
| `/system/trash` | CONTENT_ADMIN/SYSTEM_ADMIN | Thùng rác dùng chung cho các entity soft-delete |
| `/` | mixed | Upload/quản lý tài liệu gắn với nhân vật/bối cảnh |

**Swagger UI** (interactive, thử API trực tiếp): `http://localhost:5000/api-docs`
**OpenAPI JSON**: [`docs/openapi.json`](docs/openapi.json) — sinh lại bằng `npm run generate:openapi` mỗi khi đổi JSDoc trong routes.

## Models dữ liệu

| Model | Collection | Trường chính |
|---|---|---|
| `User` | `users` | email, password, role, tierId, token, streakCount, longestStreak |
| `Tier` | `tiers` | title (free/plus/pro), amount, noMonth, limitedToken, isActive |
| `Character` | `characters` | name, era, contextIds[], isActive, deletedAt |
| `HistoricalContext` | `historicalcontexts` | name, era, characterIds[], isActive, deletedAt |
| `Quiz` / `Question` | `quizzes` / `questions` | title, level, era, grade, câu hỏi + đáp án |
| `QuizSession` / `AnswerDetail` | `quizsessions` / `answerdetails` | Phiên làm bài + chi tiết từng câu trả lời |
| `ChatSession` / `Message` | `chatsessions` / `messages` | Phiên chat + tin nhắn |
| `Document` / `VectorChunk` | `documents` / `vectorchunks` | Tài liệu nguồn + embedding phục vụ RAG |
| `DailyQuest` / `UserQuestLog` | `dailyquests` / `userquestlogs` | Định nghĩa nhiệm vụ hằng ngày + tiến độ từng user/ngày |
| `Order` / `Transaction` | `orders` / `transactions` | Đơn hàng thuê gói + giao dịch thanh toán |

**Quy ước dùng chung:**
- Global Mongoose transform (`config/db.ts`): mọi `.toJSON()/.toObject()` tự đổi `_id → id`, xoá `__v`.
- **Soft delete**: `isActive: false` + `deletedAt: Date` — áp dụng cho `Character`, `HistoricalContext`, `Quiz`.

## Xác thực & phân quyền

- JWT access token (mặc định 15 phút) + refresh token (7 ngày, lưu trong `User` doc).
- Middleware `authenticate` verify Bearer token → gán `req.user = { id, email, role }`.
- `optionalAuth` — cho phép request không token (dùng cho route vừa public vừa cá nhân hoá).
- `authorizeRoles(...roles)` / `authorize(...roles)` — chặn theo vai trò.

**3 vai trò:** `CUSTOMER` · `CONTENT_ADMIN` · `SYSTEM_ADMIN`

## Database migrations

Migration runner tự viết bằng TypeScript, không phụ thuộc thư viện ngoài — trạng thái lưu ở collection `_migrations`.

```bash
npm run db:migrate     # chạy migration còn pending
npm run db:rollback    # rollback migration gần nhất
npm run db:status      # xem bảng đã chạy / chưa chạy
```

Migration mới thêm vào `src/db/migrations/NNN_ten-migration.ts`, export 2 hàm `up(db)` và `down(db)`.

## Testing

Stack: **Vitest** + **Supertest** + **MongoDB in-memory** (`mongodb-memory-server`) — integration test dùng Express app thật + DB thật (in-memory), không mock tầng HTTP.

```bash
npm test                 # toàn bộ test
npm run test:unit        # chỉ unit test (service, có mock model)
npm run test:integration # chỉ integration test (qua HTTP, DB in-memory)
npm run test:coverage    # kèm báo cáo coverage
```

- `test/unit/` — test logic service đơn lẻ, mock trực tiếp Mongoose model.
- `test/integration/` — test qua toàn bộ HTTP stack (`supertest(app)`), dùng chung `test/db-handler.ts` để bật/tắt MongoDB in-memory.
- Rate limiter tự động tắt khi `NODE_ENV=test`.

> **Lưu ý môi trường:** `mongodb-memory-server` cần tải/khởi chạy một binary `mongod` cục bộ — trên một số máy/sandbox bị chặn quyền thực thi (`spawn EFTYPE`/timeout khi start). Đây là giới hạn môi trường, không phải lỗi test; chạy trên máy dev bình thường hoặc CI sẽ không gặp vấn đề này.

## Quy ước code

- **Validation**: Zod v4, schema đặt trong `src/validations/`, áp dụng qua middleware `validate(schema)` cho `{ body, query, params }`. Lưu ý: `parseAsync()` của Zod v4 trả về `Promise<unknown>`, cần ép kiểu tường minh.
- **Lỗi nghiệp vụ**: ném `AppError(message, statusCode)`, không tự viết `res.status().json()` rải rác trong service.
- **Enum**: khai báo một lần duy nhất trong `src/types/enums.ts`, không hardcode string rải rác.
- **Không dùng `git add -A`/commit bừa bãi các thay đổi ngoài phạm vi task** (quy ước làm việc chung của repo, không phải rule kỹ thuật).

## Triển khai (Deployment)

```bash
npm run build   # biên dịch ra dist/
npm start       # chạy production build
```

Checklist trước khi deploy:
- [ ] Đặt `NODE_ENV=production`
- [ ] Dùng `JWT_SECRET`/`JWT_REFRESH_SECRET` đủ mạnh, khác giá trị mặc định trong code
- [ ] `MONGO_URI` trỏ tới cụm production (khuyến nghị MongoDB Atlas)
- [ ] Cấu hình đầy đủ `CORS_ORIGIN`/`CLIENT_URL` khớp domain frontend thật
- [ ] Chạy `npm run db:migrate` trên database production trước khi start
- [ ] Thiết lập cron/scheduler gọi `subscriptions:downgrade` định kỳ để hạ cấp gói hết hạn

## Khắc phục sự cố

| Vấn đề | Nguyên nhân thường gặp |
|---|---|
| `MongooseError: Connection operation buffering timed out` | Chưa kết nối được `MONGO_URI`, hoặc MongoDB local chưa chạy |
| Google login lỗi audience không hợp lệ | Thiếu `GOOGLE_ANDROID_CLIENT_ID`/`GOOGLE_IOS_CLIENT_ID` — mobile gửi `id_token` với `aud` khác web |
| Upload file lỗi vượt giới hạn dung lượng | Kiểm tra `SUPABASE_MEDIA_MAX_UPLOAD_MB` có khớp giới hạn thật đã cấu hình trên Supabase project không |
| Test integration treo/timeout khi start | `mongodb-memory-server` không spawn được `mongod` binary trên môi trường hiện tại — xem mục [Testing](#testing) |

## License

ISC — xem [`package.json`](package.json).

---

<div align="center">

Một phần của hệ sinh thái **HistoryTalk** — cùng với [`HistoryTalk-FE`](../HistoryTalk-FE) (web) và [`mobile-historytalk`](../mobile-historytalk) (ứng dụng di động).

</div>
