import express, { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

const router = express.Router();


const loadSwaggerDoc = (filename: string) => {
  try {
    return YAML.load(path.join(__dirname, '../../swagger', filename));
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return null;
  }
};

// Load documentation files
const customerApiDoc = loadSwaggerDoc('customer-api.yaml');
const merchantApiDoc = loadSwaggerDoc('merchant-api.yaml');
const adminApiDoc = loadSwaggerDoc('admin-api.yaml');

// Swagger UI options
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #2c3e50; font-size: 2.5em; }
    .swagger-ui .info .description { font-size: 1.1em; line-height: 1.6; }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .swagger-ui .opblock.opblock-post { border-color: #27ae60; }
    .swagger-ui .opblock.opblock-get { border-color: #3498db; }
    .swagger-ui .opblock.opblock-put { border-color: #f39c12; }
    .swagger-ui .opblock.opblock-delete { border-color: #e74c3c; }
    .swagger-ui .btn.authorize { background-color: #3498db; border-color: #3498db; }
    .swagger-ui .btn.authorize:hover { background-color: #2980b9; border-color: #2980b9; }
  `,
  customSiteTitle: 'Qmart API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
};

/**
 * Customer API Documentation
 * Create a completely isolated setup for customer docs
 */
router.use('/api/docs/customers', (req: Request, res: Response, next: NextFunction): void => {
  if (!customerApiDoc) {
    res.status(500).json({
      status: 'error',
      message: 'Customer API documentation not available',
      suggestion: 'Please ensure swagger/customer-api.yaml exists and is valid'
    });
    return;
  }
  next();
});

// Apply Swagger UI middleware specifically for customer docs
router.use('/api/docs/customers', ...swaggerUi.serve);
router.get('/api/docs/customers', swaggerUi.setup(customerApiDoc, {
  ...swaggerOptions,
  customSiteTitle: 'Qmart Customer API Documentation',
}));

/**
 * Merchant API Documentation
 * Create a completely isolated setup for merchant docs
 */
router.use('/api/docs/merchants', (req: Request, res: Response, next: NextFunction): void => {
  if (!merchantApiDoc) {
    res.status(500).json({
      status: 'error',
      message: 'Merchant API documentation not available',
      suggestion: 'Please ensure swagger/merchant-api.yaml exists and is valid'
    });
    return;
  }
  next();
});

// Apply Swagger UI middleware specifically for merchant docs
router.use('/api/docs/merchants', ...swaggerUi.serve);
router.get('/api/docs/merchants', swaggerUi.setup(merchantApiDoc, {
  ...swaggerOptions,
  customSiteTitle: 'Qmart Merchant API Documentation',
}));

/**
 * Admin API Documentation
 * Create a completely isolated setup for admin docs
 */
router.use('/api/docs/admin', (req: Request, res: Response, next: NextFunction): void => {
  if (!adminApiDoc) {
    res.status(500).json({
      status: 'error',
      message: 'Admin API documentation not available',
      suggestion: 'Please ensure swagger/admin-api.yaml exists and is valid'
    });
    return;
  }
  next();
});

// Apply Swagger UI middleware specifically for admin docs
router.use('/api/docs/admin', ...swaggerUi.serve);
router.get('/api/docs/admin', swaggerUi.setup(adminApiDoc, {
  ...swaggerOptions,
  customSiteTitle: 'Qmart Admin API Documentation',
}));

/**
 * GET /api/docs
 * API documentation index page
 */
router.get('/api/docs', (req: Request, res: Response): void => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Qmart API Documentation</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                padding: 40px;
                max-width: 800px;
                width: 100%;
                text-align: center;
            }

            .logo {
                font-size: 3em;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }

            .subtitle {
                color: #7f8c8d;
                font-size: 1.2em;
                margin-bottom: 40px;
            }

            .docs-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 30px;
                margin-bottom: 40px;
            }

            .doc-card {
                background: #f8f9fa;
                border-radius: 15px;
                padding: 30px;
                text-decoration: none;
                color: inherit;
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }

            .doc-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
                border-color: #3498db;
                text-decoration: none;
                color: inherit;
            }

            .doc-icon {
                font-size: 3em;
                margin-bottom: 20px;
            }

            .customer-card .doc-icon {
                color: #27ae60;
            }

            .merchant-card .doc-icon {
                color: #f39c12;
            }

            .admin-card .doc-icon {
                color: #e74c3c;
            }

            .doc-title {
                font-size: 1.5em;
                font-weight: 600;
                color: #2c3e50;
                margin-bottom: 15px;
            }

            .doc-description {
                color: #7f8c8d;
                line-height: 1.6;
                margin-bottom: 20px;
            }

            .doc-features {
                list-style: none;
                text-align: left;
            }

            .doc-features li {
                color: #5a6c7d;
                margin-bottom: 8px;
                padding-left: 20px;
                position: relative;
            }

            .doc-features li:before {
                content: "✓";
                position: absolute;
                left: 0;
                color: #27ae60;
                font-weight: bold;
            }

            .api-info {
                background: #ecf0f1;
                border-radius: 10px;
                padding: 20px;
                margin-top: 30px;
            }

            .api-info h3 {
                color: #2c3e50;
                margin-bottom: 15px;
            }

            .api-endpoints {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                text-align: left;
            }

            .endpoint {
                background: white;
                padding: 10px 15px;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                color: #2c3e50;
            }

            .method {
                font-weight: bold;
                margin-right: 10px;
            }

            .get { color: #3498db; }
            .post { color: #27ae60; }
            .put { color: #f39c12; }
            .delete { color: #e74c3c; }

            @media (max-width: 768px) {
                .container {
                    padding: 20px;
                }

                .docs-grid {
                    grid-template-columns: 1fr;
                }

                .logo {
                    font-size: 2em;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🏦 Qmart API</div>
            <div class="subtitle">Comprehensive Fintech API Documentation</div>

            <div class="docs-grid">
                <a href="${baseUrl}/api/docs/customers" class="doc-card customer-card">
                    <div class="doc-icon">👤</div>
                    <div class="doc-title">Customer API</div>
                    <div class="doc-description">
                        Complete documentation for customer operations including wallet management, transfers, and KYC.
                    </div>
                    <ul class="doc-features">
                        <li>Account registration & authentication</li>
                        <li>Wallet operations & transfers</li>
                        <li>Transaction history & analytics</li>
                        <li>KYC verification system</li>
                        <li>QR code payments</li>
                        <li>Security & rate limiting</li>
                    </ul>
                </a>

                <a href="${baseUrl}/api/docs/merchants" class="doc-card merchant-card">
                    <div class="doc-icon">🏪</div>
                    <div class="doc-title">Merchant API</div>
                    <div class="doc-description">
                        Business-focused API documentation for payment processing, analytics, and merchant operations.
                    </div>
                    <ul class="doc-features">
                        <li>Business registration & verification</li>
                        <li>Payment processing & collection</li>
                        <li>QR code generation</li>
                        <li>Transaction analytics</li>
                        <li>Business wallet management</li>
                        <li>Compliance & reporting</li>
                    </ul>
                </a>

                <a href="${baseUrl}/api/docs/admin" class="doc-card admin-card">
                    <div class="doc-icon">🔐</div>
                    <div class="doc-title">Admin API</div>
                    <div class="doc-description">
                        Administrative API documentation for system management, user oversight, and platform operations.
                    </div>
                    <ul class="doc-features">
                        <li>Admin authentication & sessions</li>
                        <li>User management & oversight</li>
                        <li>Transaction monitoring & control</li>
                        <li>KYC approval & rejection</li>
                        <li>System analytics & reporting</li>
                        <li>Security monitoring & alerts</li>
                    </ul>
                </a>
            </div>

            <div class="api-info">
                <h3>🚀 Quick Start Endpoints</h3>
                <div class="api-endpoints">
                    <div class="endpoint">
                        <span class="method get">GET</span>/health
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>/api
                    </div>
                    <div class="endpoint">
                        <span class="method post">POST</span>/api/auth/customer/signup
                    </div>
                    <div class="endpoint">
                        <span class="method post">POST</span>/api/auth/merchant/signup
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>/api/wallet/balance
                    </div>
                    <div class="endpoint">
                        <span class="method post">POST</span>/api/wallet/transfer
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
  `);
});

/**
 * GET /api/docs/health
 * Documentation health check
 */
router.get('/api/docs/health', (req: Request, res: Response): void => {
  res.json({
    status: 'success',
    message: 'Documentation service is running',
    documentation: {
      customer: customerApiDoc ? 'available' : 'unavailable',
      merchant: merchantApiDoc ? 'available' : 'unavailable',
      admin: adminApiDoc ? 'available' : 'unavailable',
    },
    endpoints: {
      index: '/api/docs',
      customer: '/api/docs/customers',
      merchant: '/api/docs/merchants',
      admin: '/api/docs/admin',
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
