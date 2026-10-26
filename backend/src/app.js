import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import swaggerUi from 'swagger-ui-express';
import config from './config/index.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import apiRoutes from './routes/index.js';

const app = express();

// Honour X-Forwarded-For only when explicitly deployed behind a trusted proxy.
if (config.trustProxy) {
  app.set('trust proxy', config.trustProxy);
}

// ============ SECURITY MIDDLEWARE ============
// Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: config.isProduction,
  crossOriginEmbedderPolicy: config.isProduction,
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// ============ GENERAL MIDDLEWARE ============
// Body parser
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Cookie parser
app.use(cookieParser(config.security.cookieSecret));

// Compression
app.use(compression());

// HTTP request logger
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// ============ STATIC FILES ============
// Uploaded event images are public by design. Certificate PDFs are deliberately
// NOT served statically: they are private records delivered through the
// authenticated /certificates/:id/download endpoint.
// The portals are served from a different origin than the API in development
// (and may be in production), so allow public uploads to be embedded elsewhere.
// Keep the rest of the API protected by Helmet's same-origin default.
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(config.storage.uploadDir)
);

// ============ API ROUTES ============
// Broad API guard. Sensitive endpoints add stricter per-route limiters.
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// API version info
app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'meetCITAD API',
    version: config.apiVersion,
    description: 'Event Attendance and Engagement System',
    documentation: '/api-docs',
  });
});

// API routes
app.use(`/api/${config.apiVersion}`, apiRoutes);

// Swagger documentation (development only)
if (config.isDevelopment) {
  // We'll generate this dynamically
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'meetCITAD API Documentation',
  }));
}

// ============ ERROR HANDLING ============
// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
