import { cert, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging as getFirebaseMessaging, type Messaging } from 'firebase-admin/messaging';
import { config } from './index';
import { logger } from '../utils/logger';

// Fail-soft: neu chua cau hinh Service Account (dev moi/CI), khong throw luc
// import module nay — chi log 1 lan va cac ham gui push se tu bo qua.
let app: App | null = null;

if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
  app = initializeApp({
    credential: cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    }),
  });
} else {
  logger.warn('[firebase] Service Account chưa được cấu hình — push notification sẽ bị bỏ qua (no-op)');
}

export function getMessaging(): Messaging | null {
  return app ? getFirebaseMessaging(app) : null;
}
