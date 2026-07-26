import { getMessaging } from '../config/firebase';
import DeviceToken from '../models/device-token.model';

// Gioi han cua FCM sendEachForMulticast: toi da 500 token/request.
const CHUNK_SIZE = 500;

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// FCM data payload chi chap nhan string values.
function stringifyData(data?: Record<string, unknown>): Record<string, string> {
  if (!data) return {};
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)])
  );
}

export class PushService {
  static async registerDeviceToken(uid: string, fcmToken: string, platform: 'android' | 'ios'): Promise<void> {
    // fcmToken la khoa duy nhat: upsert theo token de 1 may doi tai khoan
    // thi token tu chuyen sang uid moi thay vi tro nham chu cu.
    await DeviceToken.findOneAndUpdate(
      { fcmToken },
      { uid, fcmToken, platform },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  static async removeDeviceToken(fcmToken: string): Promise<void> {
    await DeviceToken.deleteOne({ fcmToken });
  }

  // Best-effort: khong bao gio duoc phep lam fail luong nghiep vu chinh
  // (thanh toan, dang nhap...) chi vi FCM loi hoac cham — giong pattern cua
  // mailService.
  static async sendToUser(uid: string, payload: PushPayload): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;

    try {
      const tokens = await DeviceToken.find({ uid }).select('fcmToken');
      if (tokens.length === 0) return;
      await this.sendToTokens(
        tokens.map((t) => t.fcmToken),
        payload
      );
    } catch (error) {
      console.error('[push] sendToUser failed', error);
    }
  }

  static async sendToTokens(tokens: string[], payload: PushPayload): Promise<void> {
    if (tokens.length === 0) return;

    const messaging = getMessaging();
    if (!messaging) {
      console.warn('[push] Firebase chưa được cấu hình — bỏ qua gửi push');
      return;
    }

    const data = stringifyData(payload.data);

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      try {
        const res = await messaging.sendEachForMulticast({
          tokens: chunk,
          notification: { title: payload.title, body: payload.body },
          data,
        });

        const deadTokens = chunk.filter((_, idx) => {
          const code = res.responses[idx]?.error?.code;
          return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
        });
        if (deadTokens.length > 0) {
          await DeviceToken.deleteMany({ fcmToken: { $in: deadTokens } });
        }
      } catch (error) {
        console.error('[push] sendToTokens chunk failed', error);
      }
    }
  }
}
