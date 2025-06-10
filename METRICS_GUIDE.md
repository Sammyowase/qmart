# í³Š Qmart API Metrics Guide

## 1. Viewing Raw Prometheus Metrics

### **Access the Metrics Endpoint**
```bash
# View all metrics
curl http://localhost:5000/metrics

# View specific metrics (filter)
curl http://localhost:5000/metrics | grep qmart_api_http_requests_total

# Save metrics to file for analysis
curl http://localhost:5000/metrics > metrics_snapshot.txt
```

### **What You Should See at `/metrics`**

**System Metrics (Node.js Default):**
```prometheus
# CPU Usage
qmart_api_process_cpu_user_seconds_total 29.07
qmart_api_process_cpu_system_seconds_total 13.62

# Memory Usage
qmart_api_process_resident_memory_bytes 19193856
qmart_api_process_heap_bytes 15728640

# Garbage Collection
qmart_api_nodejs_gc_duration_seconds_total{kind="major"} 0.123

# Event Loop Lag
qmart_api_nodejs_eventloop_lag_seconds 0.001
```

**Custom Qmart API Metrics:**
```prometheus
# HTTP Requests
qmart_api_http_requests_total{method="GET",route="/health",status_code="200"} 5
qmart_api_http_requests_total{method="POST",route="/api/auth/customer/signup",status_code="201"} 2

# Response Times (Histogram)
qmart_api_http_request_duration_seconds_bucket{method="GET",route="/health",status_code="200",le="0.1"} 5
qmart_api_http_request_duration_seconds_bucket{method="GET",route="/health",status_code="200",le="0.3"} 5
qmart_api_http_request_duration_seconds_sum{method="GET",route="/health",status_code="200"} 0.025
qmart_api_http_request_duration_seconds_count{method="GET",route="/health",status_code="200"} 5

# Authentication Attempts
qmart_api_auth_attempts_total{type="customer",status="success"} 3
qmart_api_auth_attempts_total{type="customer",status="failure"} 1

# Active Connections
qmart_api_active_connections 2

# Health Status
qmart_api_health_status 1

# OTP Generation
qmart_api_otp_generated_total{type="verification"} 5
qmart_api_otp_generated_total{type="password_reset"} 2

# Wallet Operations
qmart_api_wallet_operations_total{operation="create",user_type="customer"} 3
qmart_api_wallet_operations_total{operation="create",user_type="merchant"} 1

# Rate Limiting
qmart_api_rate_limit_hits_total{endpoint_type="auth"} 0
qmart_api_rate_limit_hits_total{endpoint_type="general"} 0

# Errors
qmart_api_errors_total{error_type="ValidationError",endpoint="/api/auth/customer/signup"} 1
```

### **Verifying Metrics Collection**

**1. Generate Some Traffic:**
```bash
# Health checks
curl http://localhost:5000/health
curl http://localhost:5000/health
curl http://localhost:5000/health

# API info
curl http://localhost:5000/api

# Customer signup (will generate auth metrics)
curl -X POST http://localhost:5000/api/auth/customer/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+1234567890"
  }'
```

**2. Check Metrics After Traffic:**
```bash
# Check HTTP request counts
curl http://localhost:5000/metrics | grep "qmart_api_http_requests_total"

# Check response times
curl http://localhost:5000/metrics | grep "qmart_api_http_request_duration"

# Check authentication attempts
curl http://localhost:5000/metrics | grep "qmart_api_auth_attempts"
```

**3. Verify Metrics Are Incrementing:**
```bash
# Before requests
curl http://localhost:5000/metrics | grep "qmart_api_http_requests_total.*health" | tail -1

# Make a request
curl http://localhost:5000/health

# After requests (should show incremented count)
curl http://localhost:5000/metrics | grep "qmart_api_http_requests_total.*health" | tail -1
```

### **Understanding Metric Types**

**Counter (Always Increasing):**
- `qmart_api_http_requests_total` - Total requests since startup
- `qmart_api_auth_attempts_total` - Total auth attempts
- `qmart_api_otp_generated_total` - Total OTPs generated

**Gauge (Can Go Up/Down):**
- `qmart_api_active_connections` - Current active connections
- `qmart_api_health_status` - Current health (1=healthy, 0=unhealthy)
- `qmart_api_process_resident_memory_bytes` - Current memory usage

**Histogram (Distribution):**
- `qmart_api_http_request_duration_seconds` - Response time distribution
- `qmart_api_database_operation_duration_seconds` - DB operation times

### **Troubleshooting Metrics**

**No Metrics Showing:**
```bash
# Check if server is running
curl http://localhost:5000/health

# Check if metrics endpoint exists
curl -I http://localhost:5000/metrics

# Check server logs for errors
# (Look at your npm run dev terminal)
```

**Metrics Not Updating:**
```bash
# Generate traffic and check immediately
curl http://localhost:5000/health && curl http://localhost:5000/metrics | grep health
```

**Missing Custom Metrics:**
- Check if middleware is properly imported in server.ts
- Verify metrics are being called in your route handlers
- Look for TypeScript compilation errors
