// app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Load Swagger documentation
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));

// Import route files
import customerRoutes from './Auth/customer/customer.routes';
import merchantRoutes from './Auth/merchant/merchant.routes';
import sharedAuthRoutes from './Auth/shared/auth.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Qmart API Documentation',
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Qmart API is running',
    timestamp: new Date().toISOString(),
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Qmart Fintech API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      customerAuth: '/api/auth/customer',
      merchantAuth: '/api/auth/merchant',
      sharedAuth: '/api/auth',
    },
  });
});

// API routes
app.use('/api/auth/customer', customerRoutes);
app.use('/api/auth/merchant', merchantRoutes);
app.use('/api/auth', sharedAuthRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  });
});

export default app;
