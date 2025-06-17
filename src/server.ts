import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
// Legacy swagger imports removed - using comprehensive documentation routes instead
import dotenv from 'dotenv';
import connectDB from './config/database';
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
import walletRoutes from './routes/wallet.routes';
import kycRoutes from './routes/kyc.routes';
import adminRoutes from './routes/admin.routes';
import documentationRoutes from './routes/documentation.routes';
import { createDefaultAdmin } from './services/admin.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database and services with proper timing
const initializeServices = async () => {
  try {
    // Connect to database first
    await connectDB();
    console.log('Database connection established');

    // Initialize email transporter
    createEmailTransporter();
    console.log('Email transporter initialized');

    // Create default admin user after database is ready
    await createDefaultAdmin();
    console.log('Admin user initialization completed');

  } catch (error) {
    console.error('Service initialization failed:', error);
    // Don't exit in development
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// Initialize services
initializeServices();

// Legacy swagger document loading removed - using comprehensive documentation routes instead

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

// Legacy Swagger UI endpoint removed - using comprehensive documentation routes instead
// Access documentation at: /api/docs (main), /api/docs/customers, /api/docs/merchants, /api/docs/admin

// Documentation routes (new comprehensive docs)
app.use('/', documentationRoutes);

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
      documentation: {
        index: '/api/docs',
        customer: '/api/docs/customers',
        merchant: '/api/docs/merchants',
        admin: '/api/docs/admin',
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
    documentation: {
      comprehensive: '/api/docs',
      customer: '/api/docs/customers',
      merchant: '/api/docs/merchants',
      admin: '/api/docs/admin',
    },
    monitoring: {
      metrics: '/metrics',
      health: '/health',
    },
    architecture: {
      customerAuth: '/api/auth/customer',
      merchantAuth: '/api/auth/merchant',
      sharedAuth: '/api/auth',
      wallet: '/api/wallet',
      kyc: '/api/kyc',
      admin: '/admin-panel',
    },
    rateLimits: {
      general: '100 requests per 15 minutes',
      authentication: '5 requests per 15 minutes',
      transfers: '10 requests per minute',
      kycSubmissions: '3 requests per hour',
    },
    features: {
      walletSystem: 'Complete digital wallet with transfers and QR codes',
      kycSystem: '3-tier verification system with daily limits',
      adminPanel: 'Real-time monitoring and management interface',
      security: 'Comprehensive rate limiting and validation',
      monitoring: 'Prometheus metrics and Grafana dashboards',
    },
  });
});

// Apply stricter rate limiting to authentication routes
app.use('/api/auth', authLimiter);

// Properly separated API routes
app.use('/api/auth/customer', customerRoutes);
app.use('/api/auth/merchant', merchantRoutes);
app.use('/api/auth', sharedAuthRoutes);

// Wallet and KYC routes
app.use('/api/wallet', walletRoutes);
app.use('/api/kyc', kycRoutes);

// Admin routes
app.use('/', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: {
      health: '/health',
      metrics: '/metrics',
      apiInfo: '/api',
      documentation: '/api/docs',
      customerDocs: '/api/docs/customers',
      merchantDocs: '/api/docs/merchants',
      adminDocs: '/api/docs/admin',
      customerAuth: '/api/auth/customer',
      merchantAuth: '/api/auth/merchant',
      sharedAuth: '/api/auth',
      wallet: '/api/wallet',
      kyc: '/api/kyc',
      adminPanel: '/admin-panel',
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
  console.log(`🚀 Qmart API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`❤️ Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Prometheus metrics: http://localhost:${PORT}/metrics`);
  console.log(`📋 API info: http://localhost:${PORT}/api`);
  console.log(`📚 Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`👤 Customer docs: http://localhost:${PORT}/api/docs/customers`);
  console.log(`🏪 Merchant docs: http://localhost:${PORT}/api/docs/merchants`);
  console.log(`🔐 Admin docs: http://localhost:${PORT}/api/docs/admin`);
  console.log(`🔐 Admin panel: http://localhost:${PORT}/admin-panel`);
  console.log(`⚡ Rate limits: General(100/15min), Auth(5/15min), Transfers(10/min)`);
  console.log(`📈 Monitoring: Prometheus metrics available at /metrics`);
});

export default app;
