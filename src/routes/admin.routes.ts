import express, { Request, Response } from 'express';
import path from 'path';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { adminPanelLimiter, adminOperationLimiter } from '../middleware/enhanced-rate-limit.middleware';
import {
  adminSignin,
  getDashboardStats,
  getAllUsers,
  getAllTransactions,
  getSystemHealth,
  getSecurityAlerts,
  toggleWalletStatus
} from '../services/admin.service';

const router = express.Router();

// Extend Request interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * GET /admin-panel
 * Serve admin panel HTML
 */
router.get('/admin-panel', adminPanelLimiter, (req: Request, res: Response): void => {
  res.sendFile(path.join(__dirname, '../../public/admin/index.html'));
});

/**
 * GET /admin-panel/styles.css
 * Serve admin panel CSS
 */
router.get('/admin-panel/styles.css', (req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, '../../public/admin/styles.css'));
});

/**
 * GET /admin-panel/admin.js
 * Serve admin panel JavaScript
 */
router.get('/admin-panel/admin.js', (req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, '../../public/admin/admin.js'));
});

/**
 * POST /api/admin/signin
 * Admin authentication (NO AUTH REQUIRED)
 */
router.post('/api/admin/signin', adminOperationLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
      return;
    }

    const result = await adminSignin(email, password);

    // Set secure HTTP-only cookie for admin session
    res.cookie('adminToken', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    res.json({
      status: 'success',
      message: 'Admin login successful',
      data: result
    });
  } catch (error: any) {
    res.status(401).json({
      status: 'error',
      message: error.message
    });
  }
});

// Apply authentication and admin role requirement to all protected admin API routes
// Note: signin route is already defined above and won't be affected by this middleware
router.use('/api/admin', (req: Request, res: Response, next) => {
  // Skip authentication for signin route
  if (req.path === '/api/admin/signin') {
    return next();
  }
  // Apply authentication for all other admin routes
  authenticateToken(req, res, (err) => {
    if (err) return next(err);
    requireRole(['admin'])(req, res, next);
  });
});

/**
 * GET /api/admin/dashboard-stats
 * Get dashboard statistics
 */
router.get('/api/admin/dashboard-stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getDashboardStats();

    res.json({
      status: 'success',
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/users
 * Get all users with pagination
 */
router.get('/api/admin/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const role = req.query.role as string;

    const { users, total } = await getAllUsers(limit, offset, role);

    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/transactions
 * Get all transactions with pagination and filtering
 */
router.get('/api/admin/transactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;
    const type = req.query.type as string;

    const { transactions, total } = await getAllTransactions(limit, offset, status, type);

    res.json({
      status: 'success',
      data: {
        transactions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/wallet/:userId/toggle-status
 * Freeze/unfreeze user wallet
 */
router.post('/api/admin/wallet/:userId/toggle-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'frozen', 'suspended'].includes(status)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid wallet status'
      });
      return;
    }

    const wallet = await toggleWalletStatus(userId, status);

    res.json({
      status: 'success',
      message: `Wallet ${status} successfully`,
      data: {
        walletId: wallet._id,
        status: wallet.status
      }
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/system-health
 * Get system health metrics
 */
router.get('/api/admin/system-health', async (req: Request, res: Response): Promise<void> => {
  try {
    const health = await getSystemHealth();

    res.json({
      status: 'success',
      data: health
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/security-alerts
 * Get security alerts
 */
router.get('/api/admin/security-alerts', async (req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await getSecurityAlerts();

    res.json({
      status: 'success',
      data: alerts
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/export/:type
 * Export data as CSV
 */
router.post('/api/admin/export/:type', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const { startDate, endDate, filters } = req.body;

    // This would implement CSV export functionality
    // For now, return a placeholder response

    res.json({
      status: 'success',
      message: `${type} export initiated`,
      data: {
        downloadUrl: `/api/admin/download/${type}-export-${Date.now()}.csv`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/reports/generate
 * Generate comprehensive reports
 */
router.post('/api/admin/reports/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportType, dateRange, format } = req.body;

    // This would implement report generation
    // For now, return a placeholder response

    res.json({
      status: 'success',
      message: `${reportType} report generation started`,
      data: {
        reportId: `report-${Date.now()}`,
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        downloadUrl: `/api/admin/download/report-${Date.now()}.${format}`
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;
