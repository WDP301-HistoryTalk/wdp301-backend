# HistoryTalk Backend — CLAUDE.md

## Project Overview

HistoryTalk is a Vietnamese history educational AI platform. This backend is a Node.js/TypeScript/Express REST API backed by MongoDB.

**Stack:** Node.js, TypeScript, Express 4, MongoDB + Mongoose 9, Zod v4, JWT auth, swagger-jsdoc, Vitest

---

## Quick Start

```bash
npm install
npm run db:migrate   # seed tiers + admin user
npm run dev          # tsx watch, hot reload
```

**Key env vars** (see `.env.example`):
- `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID`, `CLIENT_URL`, `PORT`

---

## Architecture

```
src/
  index.ts              # entry: connects DB, starts server
  app.ts                # Express app: middlewares, routes, /health, /api-docs
  config/
    index.ts            # env config object
    db.ts               # connectDB(), Mongoose global toJSON/toObject transform
    swagger.ts          # swaggerSpec from swagger-jsdoc (reads JSDoc in routes/)
  routes/               # REST routing + @openapi JSDoc blocks
  controllers/          # HTTP layer — parse req, call service, sendSuccess()
  services/             # Business logic + DB queries
  models/               # Mongoose schemas
  middlewares/          # Express middleware
  validations/          # Zod schemas
  types/
    enums.ts            # All enums (single source of truth)
    index.d.ts          # Express augmentation: req.user
  utils/
    app-error.ts        # AppError class
    logger.ts           # chalk-based logger
    response.ts         # sendSuccess() helper
  scripts/              # CLI scripts (migrate, rollback, generate-openapi, etc.)
  db/migrations/        # Typed migration files (001_init-tiers-and-admin.ts)
```

Layer dependency: `routes → controllers → services → models`

---

## Response Shape

All success responses use `sendSuccess()`:

```json
{ "success": true, "message": "...", "data": {...}, "timestamp": "..." }
```

All errors go through `errorHandler` middleware:

```json
{ "success": false, "message": "...", "errors": [...], "timestamp": "..." }
```

---

## Authentication & RBAC

- JWT access token (15m) + refresh token (7d, stored in User doc)
- `authenticate` middleware — verifies Bearer token, sets `req.user = { id, email, role }`
- `optionalAuth` — same but continues without error if no token
- `authorizeRoles(...roles: string[])` — from `auth.middleware.ts`, string roles
- `authorize(...roles: UserRole[])` — from `authorize.middleware.ts`, typed enum roles
- `checkTokenBalance` — enforces user has token > 0 before AI chat

**Roles:** `CUSTOMER`, `CONTENT_ADMIN`, `SYSTEM_ADMIN`

---

## API Routes

All routes mount under `/api/v1`.

| Prefix | File | Auth |
|--------|------|------|
| `/auth` | auth.routes.ts | mixed |
| `/users` | user.routes.ts | authenticate |
| `/characters` | character.routes.ts | mixed |
| `/historical-contexts` | historical-context.routes.ts | mixed |
| `/chat` | chat.routes.ts | authenticate |
| `/quizzes` | quiz.routes.ts | mixed |
| `/staff` | staff.routes.ts | CONTENT_ADMIN/SYSTEM_ADMIN |
| `/system-admin/dashboard` | dashboard.routes.ts | SYSTEM_ADMIN |
| `/payments` | payment.routes.ts | authenticate |
| `/tiers` | tier.routes.ts | public read, SYSTEM_ADMIN write |
| `/system/trash` | system-trash.routes.ts | CONTENT_ADMIN/SYSTEM_ADMIN |
| `/` | document.routes.ts | mixed (historical-doc & character-doc) |

### Auth (`/auth`)
- `POST /register` — register customer
- `POST /login` — returns `{ accessToken, refreshToken, user }`
- `POST /logout` — clears refresh token
- `POST /refresh` — rotate tokens
- `POST /google` — Google OAuth login
- `POST /register/content-admin` — SYSTEM_ADMIN only
- `POST /forgot-password`, `POST /reset-password`

### User (`/users`)
- `GET /profile` — own profile (+ daily token reset logic)
- `PATCH /profile` — update name, dob, gender, etc.
- `POST /change-password`
- Admin: `GET /`, `PATCH /:id`, `PATCH /:id/role`, `PATCH /:id/tier`

### Characters (`/characters`)
- Public: `GET /`, `GET /:id`
- Staff: create, update, soft-delete, restore

### Historical Contexts (`/historical-contexts`)
- Public: `GET /`, `GET /:id`
- Staff: create, update, soft-delete, restore

### Chat (`/chat`)
- `POST /sessions` — start new chat session with a character
- `GET /sessions` — list own sessions
- `GET /sessions/:id/messages` — chat history
- `POST /sessions/:id/messages` — send message (deducts token)
- `DELETE /sessions/:id` — delete session

### Quizzes (`/quizzes`)
- Public: `GET /`, `GET /:quizId`
- Authenticated: `POST /:quizId/start`, `POST /submit`, `GET /results/me`

### Staff (`/staff`) — CONTENT_ADMIN or SYSTEM_ADMIN
- Quiz CRUD: `GET /quizzes`, `POST /quizzes`, `PUT /quizzes/:id`, `DELETE /quizzes/:id`
- Quiz soft-delete/restore: `PATCH /quizzes/:id/soft-delete`, `PATCH /quizzes/:id/restore`
- Questions: `POST /quizzes/:id/questions`, `PUT .../questions/:qid`, `DELETE .../questions/:qid`

### Tiers (`/tiers`)
- Public: `GET /`, `GET /:id`
- SYSTEM_ADMIN: `POST /`, `PUT /:id`, `DELETE /:id`

### System Trash (`/system/trash`) — CONTENT_ADMIN or SYSTEM_ADMIN
- `GET /characters`, `GET /historical-contexts`, `GET /quizzes` — list soft-deleted items
- `PATCH /characters/restore`, `PATCH /historical-contexts/restore`, `PATCH /quizzes/restore` — bulk restore (`{ ids: string[] }`)
- `DELETE /characters`, `DELETE /historical-contexts`, `DELETE /quizzes` — bulk hard delete

### Dashboard (`/system-admin/dashboard`) — SYSTEM_ADMIN
- Aggregated stats for users, sessions, quizzes, revenue

### Documents (`/`)
- Staff: upload, list, delete documents linked to characters/contexts (triggers AI processing)

---

## Models

| Model | Collection | Key fields |
|-------|-----------|------------|
| User | users | email, password(+select:false), role, tierId, token, lastTokenResetAt, refreshToken |
| Tier | tiers | title(TierTitle), amount, noMonth, limitedToken, isActive |
| Character | characters | name, era, contextIds[], isActive, deletedAt |
| HistoricalContext | historicalcontexts | name, era, characterIds[], isActive, deletedAt |
| Quiz | quizzes | title, contextId, createdBy, era, grade, isActive, deletedAt, playCount, rating |
| Question | questions | quizId, content, options[], correctAnswer, orderIndex |
| QuizSession | quizsessions | quizId, uid, score, startTime, endTime |
| AnswerDetail | answerdetails | questionId, sessionId, selectedOption, isCorrect |
| ChatSession | chatsessions | characterId, userId, title |
| Message | messages | sessionId, role(user/assistant), content |
| Document | documents | entityId, entityType(CHARACTER/CONTEXT), filename, status |
| VectorChunk | vectorchunks | entityId, entityType, embedding[], text |
| Order | orders | userId, tierId, status(OrderStatus) |
| Transaction | transactions | orderId, amount, status(TransactionStatus) |

**Global Mongoose transform** (`config/db.ts`): `_id → id`, removes `__v` on all `.toJSON()/.toObject()`.

**Soft delete pattern**: `isActive: false` + `deletedAt: Date` — used on Character, HistoricalContext, Quiz.

---

## Enums (`src/types/enums.ts`)

```ts
EntityType: CONTEXT | CHARACTER
EventEra: ANCIENT | MEDIEVAL | MODERN | CONTEMPORARY
EventCategory: WAR | POLITICS | CULTURE | SCIENCE | RELIGION | OTHER
UserRole: CUSTOMER | CONTENT_ADMIN | SYSTEM_ADMIN
TierTitle: free | plus | pro
OrderStatus: pending | paid | cancelled | expired
TransactionStatus: pending | success | failed
```

---

## Key Middleware

| Middleware | File | Purpose |
|-----------|------|---------|
| `globalLimiter` | rate-limit.middleware.ts | 100 req/min, skipped in test |
| `authLimiter` | rate-limit.middleware.ts | 10 req/15min on auth routes, skipped in test |
| `authenticate` | auth.middleware.ts | JWT verification → req.user |
| `optionalAuth` | auth.middleware.ts | JWT if present, else guest |
| `authorizeRoles` | auth.middleware.ts | string role check |
| `authorize` | authorize.middleware.ts | typed UserRole check |
| `checkTokenBalance` | token-check.middleware.ts | user.token > 0 |
| `validate(schema)` | validate.middleware.ts | Zod schema on { body, query, params } |
| `errorHandler` | error.middleware.ts | global error → JSON response |
| `apiLogger` | api-logger.middleware.ts | chalk request/response logging (skipped in test) |

---

## Validation

Request bodies validated by `validate(schema)` middleware using Zod v4.

Zod schemas live in `src/validations/`. Currently: `auth.validation.ts`, `user.validation.ts`.

**Important:** Zod v4 `parseAsync` returns `Promise<unknown>` — must cast result explicitly.

---

## DB Migrations

Custom TypeScript migration runner — no external deps.

```bash
npm run db:migrate      # run pending migrations
npm run db:rollback     # rollback last migration
npm run db:status       # show applied/pending table
```

Migrations live in `src/db/migrations/NNN_name.ts`, export `up(db: Db)` and `down(db: Db)`.
State tracked in MongoDB `_migrations` collection.

---

## OpenAPI Docs

`@openapi` JSDoc blocks in `src/routes/*.ts` files. Live UI at `/api-docs`.

```bash
npm run generate:openapi   # writes docs/openapi.json
```

---

## Dev Scripts

```bash
npm run dev              # tsx watch
npm run build            # tsc compile to dist/
npm run typecheck        # tsc --noEmit
npm run lint             # eslint src
npm run test             # vitest run
npm run test:watch       # vitest interactive
npm run generate:openapi # generate docs/openapi.json
```

---

## Testing

Vitest + supertest, MongoDB in-memory via `mongodb-memory-server`.

- `test/unit/` — unit tests
- `test/integration/` — integration tests with real Mongoose + in-memory MongoDB

Rate limiters skip in `NODE_ENV=test`.

---

## Daily Token System

On `GET /users/profile`, `UserService.findUserById()` checks if `lastTokenResetAt` is before today and if so adds `tier.limitedToken` to `user.token`. This is the daily token refresh mechanism.
