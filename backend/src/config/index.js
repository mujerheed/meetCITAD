import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  mongodb: {
    uri: process.env.NODE_ENV === 'test' 
      ? process.env.MONGODB_TEST_URI 
      : process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    cookieExpiresIn: parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 7,
  },

  // OTP
  otp: {
    window: parseInt(process.env.OTP_WINDOW, 10) || 1,
    step: parseInt(process.env.OTP_STEP, 10) || 30,
  },

  // Email
  email: {
    mailjet: {
      apiKey: process.env.MAILJET_API_KEY,
      secretKey: process.env.MAILJET_SECRET_KEY,
    },
    from: process.env.EMAIL_FROM || 'noreply@citad.org',
    fromName: process.env.EMAIL_FROM_NAME || 'meetCITAD',
  },

  // SMS
  sms: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
  },

  // Storage
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // 'local', 's3', 'cloudinary'
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'),
    certificateDir: process.env.CERTIFICATE_DIR || path.join(__dirname, '..', 'certificates'),
    templateDir: process.env.TEMPLATE_DIR || path.join(__dirname, '..', 'templates'),
    
    // AWS S3
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET,
    },
    
    // Cloudinary
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
    sessionSecret: process.env.SESSION_SECRET,
    cookieSecret: process.env.COOKIE_SECRET,
    csrfSecret: process.env.CSRF_SECRET,
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:5174'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 5,
    scanMax: parseInt(process.env.SCAN_RATE_LIMIT_MAX, 10) || 100,
  },

  // Frontend URLs
  frontend: {
    userUrl: process.env.FRONTEND_USER_URL || 'http://localhost:5173',
    adminUrl: process.env.FRONTEND_ADMIN_URL || 'http://localhost:5174',
  },

  // Certificate
  certificate: {
    signatureKey: process.env.CERTIFICATE_SIGNATURE_KEY,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(__dirname, '..', 'logs', 'app.log'),
  },

  // Monitoring
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
  },

  // Bull Queue
  bull: {
    redis: {
      host: process.env.BULL_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.BULL_REDIS_PORT, 10) || parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.BULL_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
    },
  },

  // Worker Settings
  workers: {
    certificateGenerationConcurrency: parseInt(process.env.CERTIFICATE_GENERATION_CONCURRENCY, 10) || 3,
    emailQueueConcurrency: parseInt(process.env.EMAIL_QUEUE_CONCURRENCY, 10) || 5,
  },
};

// Validation
if (!config.jwt.secret || !config.jwt.refreshSecret) {
  throw new Error('JWT secrets must be defined in environment variables');
}

if (!config.mongodb.uri) {
  throw new Error('MongoDB URI must be defined in environment variables');
}

export default config;
