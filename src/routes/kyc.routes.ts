import express, { Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateSchema, validateQuery, sanitizeInput } from '../middleware/validation.middleware';
import { kycSubmissionLimiter, adminOperationLimiter } from '../middleware/enhanced-rate-limit.middleware';
import { submitKYCSchema, rejectKYCSchema, pendingKYCSchema, tierRequirementsSchema } from '../schemas/kyc.schemas';
import {
  submitKYCRequest,
  approveKYC,
  rejectKYC,
  getKYCStatus,
  getPendingKYCRequests,
  getKYCStatistics,
  getKYCRequirements,
  markKYCUnderReview,
  getKYCHistory
} from '../services/kyc.service';

const router = express.Router();

// Extend Request interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Apply authentication and sanitization to all KYC routes
router.use(authenticateToken);
router.use(sanitizeInput);

/**
 * POST /api/kyc/submit
 * Submit KYC documents for tier upgrade
 */
router.post('/submit', kycSubmissionLimiter, validateSchema(submitKYCSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { tier, documents } = req.body;

    if (!tier || !documents) {
      res.status(400).json({
        status: 'error',
        message: 'Tier and documents are required'
      });
      return;
    }

    // Validate tier
    if (![2, 3].includes(tier)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid tier. Only tiers 2 and 3 can be requested'
      });
      return;
    }

    const kycRequest = await submitKYCRequest(req.user.userId, tier, documents);

    res.status(201).json({
      status: 'success',
      message: 'KYC request submitted successfully',
      data: {
        kycId: kycRequest._id,
        requestedTier: kycRequest.requestedTier,
        status: kycRequest.status,
        submittedAt: kycRequest.submittedAt
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
 * GET /api/kyc/status
 * Get current KYC status
 */
router.get('/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const kycStatus = await getKYCStatus(req.user.userId);

    if (!kycStatus) {
      res.json({
        status: 'success',
        data: {
          currentTier: 1,
          status: 'none',
          message: 'No KYC requests found'
        }
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        kycId: kycStatus._id,
        currentTier: kycStatus.currentTier,
        requestedTier: kycStatus.requestedTier,
        status: kycStatus.status,
        submittedAt: kycStatus.submittedAt,
        reviewedAt: kycStatus.reviewedAt,
        rejectionReason: kycStatus.rejectionReason
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
 * GET /api/kyc/requirements/:tier
 * Get requirements for specific tier
 */
router.get('/requirements/:tier', async (req: Request, res: Response): Promise<void> => {
  try {
    const tier = parseInt(req.params.tier);

    if (![1, 2, 3].includes(tier)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid tier. Must be 1, 2, or 3'
      });
      return;
    }

    const requirements = getKYCRequirements(tier);

    res.json({
      status: 'success',
      data: requirements
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/kyc/history
 * Get user's KYC history
 */
router.get('/history', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const history = await getKYCHistory(req.user.userId);

    res.json({
      status: 'success',
      data: {
        history: history.map(kyc => ({
          kycId: kyc._id,
          currentTier: kyc.currentTier,
          requestedTier: kyc.requestedTier,
          status: kyc.status,
          submittedAt: kyc.submittedAt,
          reviewedAt: kyc.reviewedAt,
          rejectionReason: kyc.rejectionReason,
          reviewedBy: kyc.reviewedBy
        }))
      }
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Admin routes - require admin role
router.use('/admin', requireRole(['admin']));

/**
 * GET /api/kyc/admin/pending
 * Get pending KYC requests (admin only)
 */
router.get('/admin/pending', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const { requests, total } = await getPendingKYCRequests(limit, offset);

    res.json({
      status: 'success',
      data: {
        requests: requests.map(kyc => ({
          kycId: kyc._id,
          user: kyc.userId,
          currentTier: kyc.currentTier,
          requestedTier: kyc.requestedTier,
          status: kyc.status,
          documents: kyc.documents,
          submittedAt: kyc.submittedAt
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
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
 * POST /api/kyc/admin/:id/approve
 * Approve KYC request (admin only)
 */
router.post('/admin/:id/approve', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const kycRequest = await approveKYC(req.params.id, req.user.userId);

    res.json({
      status: 'success',
      message: 'KYC request approved successfully',
      data: {
        kycId: kycRequest._id,
        newTier: kycRequest.currentTier,
        approvedAt: kycRequest.reviewedAt
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
 * POST /api/kyc/admin/:id/reject
 * Reject KYC request (admin only)
 */
router.post('/admin/:id/reject', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        status: 'error',
        message: 'Rejection reason is required'
      });
      return;
    }

    const kycRequest = await rejectKYC(req.params.id, req.user.userId, reason);

    res.json({
      status: 'success',
      message: 'KYC request rejected',
      data: {
        kycId: kycRequest._id,
        rejectionReason: kycRequest.rejectionReason,
        rejectedAt: kycRequest.reviewedAt
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
 * POST /api/kyc/admin/:id/review
 * Mark KYC request as under review (admin only)
 */
router.post('/admin/:id/review', async (req: Request, res: Response): Promise<void> => {
  try {
    const kycRequest = await markKYCUnderReview(req.params.id);

    res.json({
      status: 'success',
      message: 'KYC request marked as under review',
      data: {
        kycId: kycRequest._id,
        status: kycRequest.status
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
 * GET /api/kyc/admin/statistics
 * Get KYC statistics (admin only)
 */
router.get('/admin/statistics', async (req: Request, res: Response): Promise<void> => {
  try {
    const statistics = await getKYCStatistics();

    res.json({
      status: 'success',
      data: statistics
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;
