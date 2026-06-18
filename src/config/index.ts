import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/wdp301_historytalk',
  jwt: {
    secret: process.env.JWT_SECRET || 'wdp301_access_secret_key_1234567890',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'wdp301_refresh_secret_key_0987654321',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  payos: {
    clientId: process.env.PAYOS_CLIENT_ID || '',
    apiKey: process.env.PAYOS_API_KEY || '',
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
    baseUrl: process.env.PAYOS_BASE_URL || 'https://api-merchant.payos.vn',
    // Where PayOS redirects the buyer's browser after the hosted checkout.
    // These point at frontend pages, NOT backend endpoints.
    returnUrl: process.env.PAYOS_RETURN_URL || `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/result`,
    cancelUrl: process.env.PAYOS_CANCEL_URL || `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/result`,
  },
};
