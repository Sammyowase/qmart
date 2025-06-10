import client from 'prom-client';

// Create a Registry to register the metrics
export const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'qmart_api_',
});

// Custom metrics for Qmart API
export const httpRequestDuration = new client.Histogram({
  name: 'qmart_api_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const httpRequestTotal = new client.Counter({
  name: 'qmart_api_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const activeConnections = new client.Gauge({
  name: 'qmart_api_active_connections',
  help: 'Number of active connections',
});

export const authenticationAttempts = new client.Counter({
  name: 'qmart_api_auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['type', 'status'], // type: customer/merchant, status: success/failure
});

export const otpGenerated = new client.Counter({
  name: 'qmart_api_otp_generated_total',
  help: 'Total OTP codes generated',
  labelNames: ['type'], // type: verification/password_reset
});

export const walletOperations = new client.Counter({
  name: 'qmart_api_wallet_operations_total',
  help: 'Total wallet operations',
  labelNames: ['operation', 'user_type'], // operation: create/update, user_type: customer/merchant
});

export const databaseOperations = new client.Histogram({
  name: 'qmart_api_database_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

export const rateLimitHits = new client.Counter({
  name: 'qmart_api_rate_limit_hits_total',
  help: 'Total rate limit hits',
  labelNames: ['endpoint_type'], // endpoint_type: general/auth
});

export const emailsSent = new client.Counter({
  name: 'qmart_api_emails_sent_total',
  help: 'Total emails sent',
  labelNames: ['type', 'status'], // type: otp/reset, status: success/failure
});

export const jwtTokensIssued = new client.Counter({
  name: 'qmart_api_jwt_tokens_issued_total',
  help: 'Total JWT tokens issued',
  labelNames: ['user_type'], // user_type: customer/merchant
});

export const apiErrors = new client.Counter({
  name: 'qmart_api_errors_total',
  help: 'Total API errors',
  labelNames: ['error_type', 'endpoint'],
});

// Register all custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(authenticationAttempts);
register.registerMetric(otpGenerated);
register.registerMetric(walletOperations);
register.registerMetric(databaseOperations);
register.registerMetric(rateLimitHits);
register.registerMetric(emailsSent);
register.registerMetric(jwtTokensIssued);
register.registerMetric(apiErrors);

// Health check metric
export const healthCheck = new client.Gauge({
  name: 'qmart_api_health_status',
  help: 'Health status of the API (1 = healthy, 0 = unhealthy)',
});

register.registerMetric(healthCheck);

// Set initial health status
healthCheck.set(1);
