import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import dotenv from 'dotenv';
import connectDB from './config/db';
import createEmailTransporter from './config/email';

// Prometheus monitoring
import { register } from './monitoring/metrics';
import {
  trackActiveConnections,
  trackHttpRequests,
  trackApiErrors,
  trackRateLimitHits,
} from './middleware/prometheus.middleware';

// Import separate route files
import customerRoutes from './Auth/customer/customer.routes';
import merchantRoutes from './Auth/merchant/merchant.routes';
import sharedAuthRoutes from './Auth/shared/auth.routes';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();
createEmailTransporter();

// Load Swagger documentation
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));

// Prometheus metrics middleware (should be first)
app.use(trackActiveConnections);
app.use(trackHttpRequests);
app.use(trackRateLimitHits);

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests per window
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5'), // 5 requests per window for auth
  message: {
    status: 'error',
    message: 'Too many authentication attempts from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Qmart API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

// Health check with Prometheus metrics
app.get('/health', (req, res) => {
  const { healthCheck } = require('./monitoring/metrics');

  try {
    // Update health status
    healthCheck.set(1);

    res.json({
      status: 'success',
      message: 'Qmart API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      monitoring: {
        prometheus: '/metrics',
        grafana: 'http://localhost:3000 (if running)',
      },
    });
  } catch (error) {
    healthCheck.set(0);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
    });
  }
});

// API info
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Qmart Fintech API',
    version: '1.0.0',
    documentation: '/api-docs',
    monitoring: {
      metrics: '/metrics',
      health: '/health',
    },
    architecture: {
      customerAuth: '/api/auth/customer',
      merchantAuth: '/api/auth/merchant',
      sharedAuth: '/api/auth',
    },
    rateLimits: {
      general: '100 requests per 15 minutes',
      authentication: '5 requests per 15 minutes',
    },
    testingWorkflows: {
      customer: [
        'POST /api/auth/customer/signup',
        'POST /api/auth/verify-otp',
        'POST /api/auth/customer/signin'
      ],
      merchant: [
        'POST /api/auth/merchant/signup',
        'POST /api/auth/verify-otp',
        'POST /api/auth/merchant/business-info',
        'POST /api/auth/merchant/signin'
      ]
    }
  });
});

// Apply stricter rate limiting to authentication routes
app.use('/api/auth', authLimiter);

// Properly separated API routes
app.use('/api/auth/customer', customerRoutes);
app.use('/api/auth/merchant', merchantRoutes);
app.use('/api/auth', sharedAuthRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: {
      health: '/health',
      metrics: '/metrics',
      apiInfo: '/api',
      documentation: '/api-docs',
      customerAuth: '/api/auth/customer',
      merchantAuth: '/api/auth/merchant',
      sharedAuth: '/api/auth',
    },
  });
});

// Global error handler with Prometheus tracking
app.use(trackApiErrors);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
  console.error('Error:', err.stack);

  // Rate limit error
  if (err.status === 429) {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests',
      retryAfter: err.retryAfter,
    });
    return;
  }

  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`��� Qmart API running on port ${PORT}`);
  console.log(`��� Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`��� Health check: http://localhost:${PORT}/health`);
  console.log(`��� Prometheus metrics: http://localhost:${PORT}/metrics`);
  console.log(`��� API info: http://localhost:${PORT}/api`);
  console.log(`��� Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`��� Customer auth: http://localhost:${PORT}/api/auth/customer`);
  console.log(`��� Merchant auth: http://localhost:${PORT}/api/auth/merchant`);
  console.log(`��� Shared auth: http://localhost:${PORT}/api/auth`);
  console.log(`��� Rate limits: General(100/15min), Auth(5/15min)`);
  console.log(`��� Monitoring: Prometheus metrics available at /metrics`);
});

export default app;
