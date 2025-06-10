# í³Š Qmart API Monitoring with Prometheus & Grafana

## íº€ Quick Start

### 1. Start the Monitoring Stack
```bash
# Start Prometheus, Grafana, and Node Exporter
docker-compose -f docker-compose.monitoring.yml up -d

# Check if containers are running
docker ps
```

### 2. Start Your Qmart API
```bash
# Start the API server with Prometheus metrics
npm run dev
```

### 3. Access the Monitoring Tools

**Prometheus**: http://localhost:9090
- Query metrics directly
- Check targets status
- View raw metrics data

**Grafana**: http://localhost:3001
- Username: `admin`
- Password: `qmart123`
- Pre-configured Qmart API dashboard

**API Metrics Endpoint**: http://localhost:5000/metrics
- Raw Prometheus metrics from your API

## í³ˆ Available Metrics

### **HTTP Metrics**
- `qmart_api_http_requests_total` - Total HTTP requests
- `qmart_api_http_request_duration_seconds` - Request duration histogram
- `qmart_api_active_connections` - Current active connections

### **Authentication Metrics**
- `qmart_api_auth_attempts_total` - Authentication attempts (success/failure)
- `qmart_api_jwt_tokens_issued_total` - JWT tokens issued

### **Business Logic Metrics**
- `qmart_api_otp_generated_total` - OTP codes generated
- `qmart_api_wallet_operations_total` - Wallet operations
- `qmart_api_emails_sent_total` - Emails sent

### **System Metrics**
- `qmart_api_health_status` - API health status
- `qmart_api_rate_limit_hits_total` - Rate limit violations
- `qmart_api_errors_total` - API errors
- `qmart_api_database_operation_duration_seconds` - Database operation times

### **Default Node.js Metrics**
- CPU usage, memory usage, garbage collection, etc.

## í¾¯ Key Dashboard Panels

### **1. API Health Status**
- Real-time health indicator
- Green (1) = Healthy, Red (0) = Unhealthy

### **2. HTTP Requests per Second**
- Request rate by method and route
- Identify traffic patterns

### **3. Response Time Distribution**
- 95th and 50th percentile response times
- Performance monitoring

### **4. Authentication Attempts**
- Success vs failure rates
- Customer vs merchant auth patterns

### **5. Active Connections**
- Current concurrent connections
- Load monitoring

### **6. Rate Limit Hits**
- Rate limiting effectiveness
- Abuse detection

### **7. OTP Generation Rate**
- Email verification patterns
- Password reset frequency

### **8. Wallet Operations**
- Wallet creation and updates
- Business metrics

## í´§ Configuration

### **Prometheus Configuration** (`monitoring/prometheus.yml`)
- Scrapes API metrics every 5 seconds
- Includes system metrics via Node Exporter
- Configurable retention and alerting

### **Grafana Configuration**
- Auto-provisioned Prometheus datasource
- Pre-built Qmart API dashboard
- Customizable panels and alerts

## í³Š Sample Queries

### **Request Rate**
```promql
rate(qmart_api_http_requests_total[5m])
```

### **Error Rate**
```promql
rate(qmart_api_errors_total[5m])
```

### **Authentication Success Rate**
```promql
rate(qmart_api_auth_attempts_total{status="success"}[5m]) / 
rate(qmart_api_auth_attempts_total[5m])
```

### **95th Percentile Response Time**
```promql
histogram_quantile(0.95, rate(qmart_api_http_request_duration_seconds_bucket[5m]))
```

## íº¨ Alerting (Optional)

### **High Error Rate Alert**
```yaml
- alert: HighErrorRate
  expr: rate(qmart_api_errors_total[5m]) > 0.1
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "High error rate detected"
```

### **High Response Time Alert**
```yaml
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(qmart_api_http_request_duration_seconds_bucket[5m])) > 1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High response time detected"
```

## í» ï¸ Troubleshooting

### **Metrics Not Showing**
1. Check if API is running: `curl http://localhost:5000/metrics`
2. Verify Prometheus targets: http://localhost:9090/targets
3. Check Docker containers: `docker ps`

### **Grafana Dashboard Empty**
1. Verify Prometheus datasource connection
2. Check if metrics are being scraped
3. Refresh dashboard or adjust time range

### **Docker Issues**
```bash
# Stop and restart monitoring stack
docker-compose -f docker-compose.monitoring.yml down
docker-compose -f docker-compose.monitoring.yml up -d

# Check logs
docker logs qmart-prometheus
docker logs qmart-grafana
```

## í³ File Structure
```
backend/
â”œâ”€â”€ monitoring/
â”‚   â”œâ”€â”€ prometheus.yml
â”‚   â””â”€â”€ grafana/
â”‚       â”œâ”€â”€ provisioning/
â”‚       â”‚   â”œâ”€â”€ datasources/
â”‚       â”‚   â””â”€â”€ dashboards/
â”‚       â””â”€â”€ dashboards/
â”‚           â””â”€â”€ qmart-api-dashboard.json
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ monitoring/
â”‚   â”‚   â””â”€â”€ metrics.ts
â”‚   â””â”€â”€ middleware/
â”‚       â””â”€â”€ prometheus.middleware.ts
â””â”€â”€ docker-compose.monitoring.yml
```

## í¾¯ Next Steps

1. **Custom Alerts**: Set up alerting rules for critical metrics
2. **Log Aggregation**: Add ELK stack for log analysis
3. **Distributed Tracing**: Implement Jaeger for request tracing
4. **Performance Testing**: Use metrics to optimize API performance
5. **Business Dashboards**: Create dashboards for business KPIs

## í´— Useful Links

- **Prometheus Documentation**: https://prometheus.io/docs/
- **Grafana Documentation**: https://grafana.com/docs/
- **PromQL Guide**: https://prometheus.io/docs/prometheus/latest/querying/basics/
- **Node.js Metrics**: https://github.com/siimon/prom-client

Your Qmart API now has enterprise-grade monitoring! íº€
