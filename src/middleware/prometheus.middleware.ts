import { Request, Response, NextFunction } from 'express';
import responseTime from 'response-time';
import {
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
  apiErrors,
  rateLimitHits,
} from '../monitoring/metrics';

// Track active connections
let activeConnectionsCount = 0;

export const trackActiveConnections = (req: Request, res: Response, next: NextFunction) => {
  activeConnectionsCount++;
  activeConnections.set(activeConnectionsCount);

  res.on('finish', () => {
    activeConnectionsCount--;
    activeConnections.set(activeConnectionsCount);
  });

  next();
};

// Track HTTP requests and response times
export const trackHttpRequests = responseTime((req: Request, res: Response, time: number) => {
  const route = req.route?.path || req.path;
  const method = req.method;
  const statusCode = res.statusCode.toString();

  // Track request duration
  httpRequestDuration
    .labels(method, route, statusCode)
    .observe(time / 1000); // Convert to seconds

  // Track total requests
  httpRequestTotal
    .labels(method, route, statusCode)
    .inc();
});

// Track API errors
export const trackApiErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  const route = req.route?.path || req.path;
  const errorType = err.name || 'UnknownError';

  apiErrors
    .labels(errorType, route)
    .inc();

  next(err);
};

// Track rate limit hits
export const trackRateLimitHits = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  res.send = function(data: any) {
    if (res.statusCode === 429) {
      const endpointType = req.path.includes('/auth') ? 'auth' : 'general';
      rateLimitHits.labels(endpointType).inc();
    }
    return originalSend.call(this, data);
  };

  next();
};

// Custom metrics tracking for business logic
export const createMetricsTracker = () => {
  return {
    trackAuthAttempt: (type: 'customer' | 'merchant', status: 'success' | 'failure') => {
      const { authenticationAttempts } = require('../monitoring/metrics');
      authenticationAttempts.labels(type, status).inc();
    },

    trackOtpGeneration: (type: 'verification' | 'password_reset') => {
      const { otpGenerated } = require('../monitoring/metrics');
      otpGenerated.labels(type).inc();
    },

    trackWalletOperation: (operation: 'create' | 'update', userType: 'customer' | 'merchant') => {
      const { walletOperations } = require('../monitoring/metrics');
      walletOperations.labels(operation, userType).inc();
    },

    trackDatabaseOperation: async <T>(
      operation: string,
      collection: string,
      dbOperation: () => Promise<T>
    ): Promise<T> => {
      const { databaseOperations } = require('../monitoring/metrics');
      const timer = databaseOperations.labels(operation, collection).startTimer();
      
      try {
        const result = await dbOperation();
        timer();
        return result;
      } catch (error) {
        timer();
        throw error;
      }
    },

    trackEmailSent: (type: 'otp' | 'reset', status: 'success' | 'failure') => {
      const { emailsSent } = require('../monitoring/metrics');
      emailsSent.labels(type, status).inc();
    },

    trackJwtIssued: (userType: 'customer' | 'merchant') => {
      const { jwtTokensIssued } = require('../monitoring/metrics');
      jwtTokensIssued.labels(userType).inc();
    },
  };
};

export const metricsTracker = createMetricsTracker();
