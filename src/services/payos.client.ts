import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { AppError } from '../utils/app-error';

/**
 * Thin PayOS REST client.
 *
 * We deliberately avoid the `@payos/node` SDK and talk to the REST API directly
 * with axios + node's built-in `crypto`. This keeps the dependency surface small
 * and makes the security-critical signature logic explicit and auditable.
 *
 * Docs: https://payos.vn/docs/api/
 *  - Create payment link:  POST {base}/v2/payment-requests
 *  - Get link info:        GET  {base}/v2/payment-requests/{id}
 *  - Cancel link:          POST {base}/v2/payment-requests/{id}/cancel
 *
 * Signatures are HMAC-SHA256 over a deterministically-sorted querystring,
 * keyed with the merchant CHECKSUM key.
 */

export interface CreatePaymentLinkInput {
  orderCode: number;
  amount: number;
  description: string; // PayOS hard-limits this to 25 characters
  returnUrl: string;
  cancelUrl: string;
  buyerName?: string;
  buyerEmail?: string;
  items?: { name: string; quantity: number; price: number }[];
  expiredAt?: number; // unix seconds
}

export interface PaymentLinkData {
  bin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  orderCode: number;
  currency: string;
  paymentLinkId: string;
  status: string;
  checkoutUrl: string;
  qrCode: string;
}

/** Webhook payload `data` block PayOS POSTs to us after a payment event. */
export interface WebhookData {
  orderCode: number;
  amount: number;
  description: string;
  accountNumber: string;
  reference: string;
  transactionDateTime: string;
  currency: string;
  paymentLinkId: string;
  code: string;
  desc: string;
  counterAccountBankId?: string | null;
  counterAccountBankName?: string | null;
  counterAccountName?: string | null;
  counterAccountNumber?: string | null;
  virtualAccountName?: string | null;
  virtualAccountNumber?: string | null;
}

interface PayOSResponse<T> {
  code: string;
  desc: string;
  data: T | null;
  signature?: string;
}

/**
 * Build the canonical querystring PayOS signs: keys sorted alphabetically,
 * `key=value` pairs joined with `&`. Nested arrays are JSON-stringified with
 * their own keys sorted; null/undefined become empty strings. This mirrors the
 * official SDK's `convertObjToQueryStr` so signatures match byte-for-byte.
 */
function objToSortedQueryStr(obj: Record<string, unknown>): string {
  return Object.keys(obj)
    .sort()
    .map((key) => {
      let value = obj[key];
      if (Array.isArray(value)) {
        value = JSON.stringify(
          value.map((item) =>
            item && typeof item === 'object'
              ? sortObjectKeys(item as Record<string, unknown>)
              : item
          )
        );
      }
      if (value === null || value === undefined || value === 'undefined' || value === 'null') {
        value = '';
      }
      return `${key}=${value}`;
    })
    .join('&');
}

function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}

function hmac(data: string): string {
  return crypto.createHmac('sha256', config.payos.checksumKey).update(data).digest('hex');
}

class PayOSClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: config.payos.baseUrl,
      timeout: 15000,
      headers: {
        'x-client-id': config.payos.clientId,
        'x-api-key': config.payos.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  get isConfigured(): boolean {
    return Boolean(config.payos.clientId && config.payos.apiKey && config.payos.checksumKey);
  }

  private assertConfigured(): void {
    if (!this.isConfigured) {
      throw new AppError('Cổng thanh toán chưa được cấu hình', 503, null, 'PAYMENT_NOT_CONFIGURED');
    }
  }

  /**
   * Signature for create-payment-request is over a FIXED set of fields in a
   * FIXED alphabetical order — not the whole body.
   */
  private signCreatePayload(input: CreatePaymentLinkInput): string {
    const data = `amount=${input.amount}&cancelUrl=${input.cancelUrl}&description=${input.description}&orderCode=${input.orderCode}&returnUrl=${input.returnUrl}`;
    return hmac(data);
  }

  async createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLinkData> {
    this.assertConfigured();
    const signature = this.signCreatePayload(input);

    const body = {
      orderCode: input.orderCode,
      amount: input.amount,
      description: input.description,
      cancelUrl: input.cancelUrl,
      returnUrl: input.returnUrl,
      signature,
      ...(input.buyerName ? { buyerName: input.buyerName } : {}),
      ...(input.buyerEmail ? { buyerEmail: input.buyerEmail } : {}),
      ...(input.items ? { items: input.items } : {}),
      ...(input.expiredAt ? { expiredAt: input.expiredAt } : {}),
    };

    const { data: res } = await this.http
      .post<PayOSResponse<PaymentLinkData>>('/v2/payment-requests', body)
      .catch((err) => {
        const msg = err?.response?.data?.desc || err?.message || 'Unknown PayOS error';
        throw new AppError(`Lỗi khi tạo liên kết thanh toán: ${msg}`, 502, null, 'PAYOS_CREATE_FAILED');
      });

    if (res.code !== '00' || !res.data) {
      throw new AppError(`PayOS từ chối yêu cầu: ${res.desc}`, 502, null, 'PAYOS_CREATE_REJECTED');
    }

    return res.data;
  }

  async getPaymentLinkInformation(orderCode: number): Promise<Record<string, unknown>> {
    this.assertConfigured();
    const { data: res } = await this.http
      .get<PayOSResponse<Record<string, unknown>>>(`/v2/payment-requests/${orderCode}`)
      .catch((err) => {
        const msg = err?.response?.data?.desc || err?.message || 'Unknown PayOS error';
        throw new AppError(`Lỗi khi truy vấn thanh toán: ${msg}`, 502, null, 'PAYOS_GET_FAILED');
      });

    if (res.code !== '00' || !res.data) {
      throw new AppError(`PayOS không trả về thông tin: ${res.desc}`, 502, null, 'PAYOS_GET_REJECTED');
    }
    return res.data;
  }

  async cancelPaymentLink(orderCode: number, reason?: string): Promise<void> {
    this.assertConfigured();
    await this.http
      .post<PayOSResponse<unknown>>(`/v2/payment-requests/${orderCode}/cancel`, {
        cancellationReason: reason || 'Người dùng huỷ đơn',
      })
      .catch((err) => {
        const msg = err?.response?.data?.desc || err?.message || 'Unknown PayOS error';
        throw new AppError(`Lỗi khi huỷ thanh toán: ${msg}`, 502, null, 'PAYOS_CANCEL_FAILED');
      });
  }

  /**
   * Verify a webhook body. Returns the trusted `data` block on success.
   * Throws if the signature does not match — NEVER trust webhook data without this.
   */
  verifyWebhookData(payload: { data: WebhookData; signature?: string }): WebhookData {
    this.assertConfigured();
    if (!payload || !payload.data || !payload.signature) {
      throw new AppError('Webhook không hợp lệ', 400, null, 'WEBHOOK_MALFORMED');
    }

    const computed = hmac(objToSortedQueryStr(payload.data as unknown as Record<string, unknown>));

    // constant-time compare to avoid timing side-channels
    const a = Buffer.from(computed);
    const b = Buffer.from(payload.signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new AppError('Chữ ký webhook không hợp lệ', 401, null, 'WEBHOOK_BAD_SIGNATURE');
    }

    return payload.data;
  }
}

export const payos = new PayOSClient();
