# Payment Integration (PayOS) — Backend ↔ Frontend Guide

This document describes the PayOS payment flow implemented in this backend and
exactly what the **frontend** must build to complete the subscription purchase
flow.

> TL;DR: backend is a thin **proxy** to PayOS. Frontend calls our API to create
> an order, redirects the user to PayOS's hosted checkout (or renders the QR),
> then polls our API for the final status. PayOS confirms payment to us via a
> signed **webhook** — that webhook is the source of truth that grants the tier.

---

## 1. Architecture / Flow

```
Frontend                Backend (this repo)              PayOS
   |                          |                             |
   |  POST /payments/orders   |                             |
   |  { tierId }              |                             |
   |------------------------->|  create Order (pending)     |
   |                          |  createPaymentLink -------->|
   |                          |<-- checkoutUrl + qrCode -----|
   |<-- checkoutUrl, qrCode --|                             |
   |                          |                             |
   |  redirect user to checkoutUrl  (or show QR) ---------->|  user pays
   |                          |                             |
   |                          |<==== POST /payments/webhook (signed) ====|
   |                          |  verify signature           |
   |                          |  mark Order paid            |
   |                          |  grant tier + tokens        |
   |                          |                             |
   |  PayOS redirects browser back to returnUrl?orderCode=..|
   |  GET /payments/orders/:orderCode  (poll)               |
   |------------------------->|  (lazy-syncs w/ PayOS)       |
   |<-- { status: "paid" } ---|                             |
```

Two independent signals confirm payment:
1. **Webhook** (server-to-server) — primary, authoritative, grants the tier.
2. **Polling** `GET /payments/orders/:orderCode` — the endpoint lazily reconciles
   with PayOS if the order is still `pending`, so the UI works even if the webhook
   is delayed or was missed locally.

---

## 2. Backend API Reference

All endpoints are under `/api/v1/payments`. All except the webhook require
`Authorization: Bearer <accessToken>`.

### `POST /payments/orders` — create checkout link
Body:
```json
{ "tierId": "665f0c1a2b3c4d5e6f000111" }
```
Response `201`:
```json
{
  "success": true,
  "message": "Tạo liên kết thanh toán thành công",
  "data": {
    "orderId": "....",
    "orderCode": 1718600000000123,
    "amount": 49000,
    "status": "pending",
    "checkoutUrl": "https://pay.payos.vn/web/....",
    "qrCode": "00020101....",
    "paymentLinkId": "....",
    "bin": "970422",
    "accountNumber": "....",
    "accountName": "....",
    "expiresAt": "2026-06-17T..."
  }
}
```
- Rate-limited: **10 requests / minute / user** (`paymentLimiter`).
- Rejects free tiers (`amount <= 0`) and inactive tiers.

### `GET /payments/orders` — list my orders
Query: `?page=0&size=10`. Returns a paginated list (same envelope shape as other
list endpoints: `content`, `totalElements`, `totalPages`, ...).

### `GET /payments/orders/:orderCode` — order status (poll this)
Response `data`:
```json
{
  "orderId": "....",
  "orderCode": 1718600000000123,
  "amount": 49000,
  "status": "paid",          // pending | paid | cancelled | expired
  "tierId": "....",
  "checkoutUrl": "....",
  "qrCode": "....",
  "paidAt": "2026-06-17T...",
  "createdAt": "2026-06-17T..."
}
```
If still `pending`, this call reconciles with PayOS automatically.

### `POST /payments/orders/:orderCode/cancel` — cancel a pending order
Only works while `pending`. Cancels the PayOS link and marks the order `cancelled`.

### `POST /payments/webhook` — PayOS callback (DO NOT call from frontend)
Public, unauthenticated, **HMAC-SHA256 verified**. Configured once in the PayOS
dashboard. Frontend never touches this.

---

## 3. What the Frontend Must Build

### 3.1 Pricing / tier page
- `GET /api/v1/tiers` to list purchasable tiers (already exists).
- On "Buy" click → `POST /payments/orders` with the chosen `tierId`.

### 3.2 Redirect or QR
Use the `data` from the create response. Two UX options:
- **Hosted checkout (recommended, simplest):** `window.location.href = checkoutUrl`.
- **Embedded QR:** render `qrCode` as a VietQR image (e.g. with a QR lib) and show
  `bin` / `accountNumber` / `amount` for manual bank transfer.

### 3.3 Result page (the `returnUrl` / `cancelUrl`)
PayOS redirects the browser back to the URL configured in `.env`
(`PAYOS_RETURN_URL` / `PAYOS_CANCEL_URL`), default `/payment/result`, with query
params appended by PayOS **and** by us (`?orderCode=...`, and `&cancel=true` on the
cancel URL).

> ⚠️ Trust the **backend status**, not PayOS's redirect query params. The redirect
> only tells you the user came back; it is not proof of payment.

On this page the frontend should:
1. Read `orderCode` from the query string.
2. Poll `GET /payments/orders/:orderCode` every ~2s (cap ~30s / ~10 tries).
3. When `status === "paid"` → show success, refresh the user profile
   (`GET /users/profile`) so the new tier/token balance shows.
4. If `status` stays `pending` after the cap → show "đang xử lý, kiểm tra lại sau".
5. If `status` is `cancelled`/`expired` → show failure + retry button.

Example poll:
```ts
async function pollOrder(orderCode: string) {
  for (let i = 0; i < 10; i++) {
    const res = await api.get(`/payments/orders/${orderCode}`);
    const status = res.data.data.status;
    if (status === 'paid') return 'paid';
    if (status === 'cancelled' || status === 'expired') return status;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return 'pending';
}
```

### 3.4 Order history (optional)
`GET /payments/orders` to render the user's past orders/subscriptions.

---

## 4. Backend Setup Checklist (for whoever deploys)

1. Create a payment channel at <https://my.payos.vn> and copy the credentials.
2. Fill `.env` (see `.env.example`):
   ```
   PAYOS_CLIENT_ID=...
   PAYOS_API_KEY=...
   PAYOS_CHECKSUM_KEY=...
   PAYOS_RETURN_URL=https://<frontend>/payment/result
   PAYOS_CANCEL_URL=https://<frontend>/payment/result
   ```
3. In the PayOS dashboard, register the **Webhook URL**:
   `https://<backend-domain>/api/v1/payments/webhook`
   - PayOS sends a verification ping on registration; the endpoint ACKs it.
   - The webhook must be reachable from the public internet. For local testing
     use a tunnel (e.g. `ngrok http 5000`) and register the tunnel URL.
4. Ensure the tiers exist (`npm run db:migrate` seeds them).

---

## 5. Security Notes / Design Decisions

- **Signature verification**: every webhook is verified with HMAC-SHA256 over a
  deterministically-sorted querystring of the `data` block, using the merchant
  checksum key (constant-time compare). Unsigned/forged webhooks are rejected.
  See `src/services/payos.client.ts`.
- **Idempotency**: the tier grant is applied via a single atomic
  `findOneAndUpdate` that claims the order `-> paid`. A concurrent webhook + poll
  cannot double-credit tokens. (No multi-doc transaction is used, so it works on
  standalone MongoDB.)
- **Source of truth**: only the webhook (or PayOS-confirmed polling) grants a
  tier — never the browser redirect.
- **Rate limiting**: order creation is capped per-user (`paymentLimiter`,
  10/min). The webhook is intentionally **not** per-user limited (only the global
  100/min) so PayOS retries are not blocked.
- **No new dependency**: PayOS is called directly over REST with `axios` +
  node's built-in `crypto` (no `@payos/node` SDK), keeping the signature logic
  explicit and auditable.
- **Token grant**: on purchase the user receives a one-time `tier.limitedToken`
  grant and `lastTokenResetAt` is set to now so the daily-reset logic in
  `UserService.findUserById` does not double-credit the same day. Subscription
  end is tracked in `user.tierExpiresAt` (stacks if renewed early).
- **Expiry enforcement**: an in-process scheduler (`src/utils/scheduler.ts`,
  started in `index.ts`) runs hourly and downgrades users whose `tierExpiresAt`
  has passed back to the free tier (`SubscriptionService.downgradeExpiredUsers`,
  idempotent). The same job is runnable standalone for an external cron via
  `npm run subscriptions:downgrade`. Disabled in `NODE_ENV=test`.

---

## 6. Files

| File | Purpose |
|------|---------|
| `src/services/payos.client.ts` | Thin PayOS REST client + signature logic |
| `src/services/payment.service.ts` | Order lifecycle, webhook handling, tier grant |
| `src/controllers/payment.controller.ts` | HTTP layer |
| `src/routes/payment.routes.ts` | Routes + OpenAPI + rate limiting |
| `src/validations/payment.validation.ts` | Zod request schemas |
| `src/models/order.model.ts` | Order schema (orderCode, checkoutUrl, qrCode, status) |
| `src/models/transaction.model.ts` | Transaction ledger |
| `src/services/subscription.service.ts` | Downgrade lapsed paid subscribers to free |
| `src/utils/scheduler.ts` | Hourly in-process job: expired-subscription downgrade |
| `src/scripts/downgrade-expired.ts` | Standalone downgrade job (external cron) |
