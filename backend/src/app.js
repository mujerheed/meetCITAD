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
import apiRoutes from './routes/index.js';

const app = express();

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/uploads', express.static(config.storage.uploadDir));
app.use('/certificates', express.static(config.storage.certificateDir));

// ============ API ROUTES ============
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
