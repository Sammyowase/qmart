# ÌæØ Complete Qmart API Monitoring Guide

## **Quick Reference Summary**

### **Ì¥ó Access Points (Development)**
- **API**: http://localhost:5000
- **Metrics**: http://localhost:5000/metrics
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/qmart123)

### **Ì∫Ä Quick Start Commands**
```bash
# 1. Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# 2. Start API
npm run dev

# 3. Generate test traffic
curl http://localhost:5000/health
curl http://localhost:5000/api
curl -X POST http://localhost:5000/api/auth/customer/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User","phone":"+1234567890"}'

# 4. View metrics
curl http://localhost:5000/metrics | grep qmart_api

# 5. Open Grafana dashboard
# Browser: http://localhost:3001
```

## **Ì≥ä 1. Viewing Metrics - What to Expect**

### **Raw Metrics Format**
When you visit `http://localhost:5000/metrics`, you'll see:

```prometheus
# HELP qmart_api_http_requests_total Total number of HTTP requests
# TYPE qmart_api_http_requests_total counter
qmart_api_http_requests_total{method="GET",route="/health",status_code="200"} 15

# HELP qmart_api_http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE qmart_api_http_request_duration_seconds histogram
qmart_api_http_request_duration_seconds_bucket{method="GET",route="/health",status_code="200",le="0.1"} 15
qmart_api_http_request_duration_seconds_sum{method="GET",route="/health",status_code="200"} 0.045
qmart_api_http_request_duration_seconds_count{method="GET",route="/health",status_code="200"} 15

# HELP qmart_api_active_connections Number of active connections
# TYPE qmart_api_active_connections gauge
qmart_api_active_connections 2

# HELP qmart_api_health_status Health status of the API (1 = healthy, 0 = unhealthy)
# TYPE qmart_api_health_status gauge
qmart_api_health_status 1
```

### **Verification Checklist**
‚úÖ **Metrics endpoint responds**: `curl http://localhost:5000/metrics`
‚úÖ **Health status shows 1**: `curl http://localhost:5000/metrics | grep health_status`
‚úÖ **Request counts increment**: Make requests and check counters increase
‚úÖ **Response times recorded**: Check histogram buckets have data

## **Ì≥à 2. Using Grafana Dashboard**

### **Step-by-Step Access**
1. **Open**: http://localhost:3001
2. **Login**: admin / qmart123
3. **Navigate**: Dashboards ‚Üí Browse ‚Üí "Qmart Fintech API Dashboard"
4. **Time Range**: Set to "Last 5 minutes" for real-time monitoring

### **Panel Interpretation Guide**

#### **Ìø¢ API Health Status Panel**
- **Green "1"**: API is healthy ‚úÖ
- **Red "0"**: API is down ‚ùå
- **No data**: Check if API is running

#### **Ì≥ä HTTP Requests per Second Panel**
- **Multiple lines**: Different endpoints (GET /health, POST /signup, etc.)
- **Y-axis**: Requests per second rate
- **Spikes**: High traffic periods
- **Flat lines**: No activity on those endpoints

#### **‚è±Ô∏è Response Time Distribution Panel**
- **Blue line (50th percentile)**: Half of requests are faster than this
- **Orange line (95th percentile)**: 95% of requests are faster than this
- **Good values**: 50th < 100ms, 95th < 500ms

#### **Ì¥ê Authentication Attempts Panel**
- **Green**: Successful logins
- **Red**: Failed attempts
- **Monitor for**: Unusual failure spikes (potential attacks)

### **Customization Examples**

#### **Add Error Rate Panel**
1. Click **"+ Add panel"**
2. **Query**: `rate(qmart_api_errors_total[5m])`
3. **Title**: "API Error Rate"
4. **Unit**: "errors/sec"
5. **Threshold**: Red if > 0.1

#### **Add Memory Usage Panel**
1. **Query**: `qmart_api_process_resident_memory_bytes / 1024 / 1024`
2. **Title**: "Memory Usage (MB)"
3. **Unit**: "MB"

## **Ì∫Ä 3. Production Deployment Strategy**

### **‚ùå What WON'T Work in Production**
- Docker Compose files we created (development only)
- localhost URLs in configurations
- Default passwords and security settings
- Local file storage for metrics data

### **‚úÖ Recommended Production Approach**

#### **Option A: Cloud-Managed (Easiest)**
```bash
# AWS Example
- Deploy API: AWS ECS/EKS
- Monitoring: Amazon Managed Grafana + Prometheus
- Cost: ~$73-208/month depending on scale
- Benefits: Fully managed, auto-scaling, enterprise security
```

#### **Option B: Self-Managed Cloud VMs**
```bash
# Production setup on cloud VMs
1. Deploy API container with production config
2. Set up Prometheus with persistent storage
3. Configure Grafana with HTTPS and authentication
4. Set up automated backups
5. Configure alerting and notifications
```

#### **Option C: Kubernetes (Most Scalable)**
```bash
# K8s deployment
1. Deploy API as Kubernetes deployment
2. Use Prometheus Operator for monitoring
3. Grafana with persistent volumes
4. Horizontal pod autoscaling
5. Service mesh integration (optional)
```

### **Security Requirements for Production**
```yaml
Required_Changes:
  Grafana:
    - Strong admin password
    - HTTPS with SSL certificates
    - OAuth/LDAP authentication
    - Network security groups
  
  Prometheus:
    - Basic authentication
    - Network isolation
    - Encrypted storage
    - Access control lists
  
  API:
    - Production environment variables
    - Secure JWT secrets
    - Rate limiting configuration
    - CORS restrictions
```

### **Cost Estimates**
```
Small Production (AWS):
- ECS Fargate: $30/month
- Managed Grafana: $18/month
- Managed Prometheus: $0.30/month
- Load Balancer: $20/month
- Total: ~$68/month

Medium Production (Self-managed):
- EC2 instances: $100/month
- EBS storage: $20/month
- CloudWatch: $15/month
- Total: ~$135/month
```

## **Ìª†Ô∏è Troubleshooting Common Issues**

### **Metrics Not Showing**
```bash
# Check API is running
curl http://localhost:5000/health

# Check metrics endpoint
curl http://localhost:5000/metrics

# Check Prometheus targets
# Browser: http://localhost:9090/targets
# Should show "qmart-api" as UP
```

### **Grafana Dashboard Empty**
```bash
# Check Prometheus connection
# Grafana ‚Üí Configuration ‚Üí Data Sources ‚Üí Prometheus
# Test connection should be successful

# Check time range
# Set to "Last 5 minutes" and refresh

# Generate traffic
curl http://localhost:5000/health
curl http://localhost:5000/api
```

### **Docker Containers Not Starting**
```bash
# Check container status
docker ps

# Check logs
docker logs qmart-prometheus
docker logs qmart-grafana

# Restart if needed
docker-compose -f docker-compose.monitoring.yml restart
```

## **Ì≥ã Production Migration Checklist**

### **Pre-Migration Planning**
- [ ] Choose cloud provider (AWS/GCP/Azure)
- [ ] Plan infrastructure (ECS/EKS/VMs)
- [ ] Design security architecture
- [ ] Calculate costs and budget
- [ ] Plan data retention policies

### **Infrastructure Setup**
- [ ] Set up cloud infrastructure
- [ ] Configure networking and security groups
- [ ] Set up persistent storage
- [ ] Configure SSL certificates
- [ ] Set up backup strategies

### **Monitoring Deployment**
- [ ] Deploy Prometheus with production config
- [ ] Deploy Grafana with authentication
- [ ] Import and configure dashboards
- [ ] Set up alerting rules
- [ ] Configure notification channels

### **API Deployment**
- [ ] Build and push container images
- [ ] Deploy API with production environment
- [ ] Configure service discovery
- [ ] Test metrics collection
- [ ] Verify dashboard functionality

### **Post-Deployment**
- [ ] Set up monitoring alerts
- [ ] Configure log aggregation
- [ ] Test backup and recovery
- [ ] Document operational procedures
- [ ] Train team on monitoring tools

## **ÌæØ Next Steps**

### **Immediate (Development)**
1. **Explore Grafana**: Spend time with the dashboard, create custom panels
2. **Generate Traffic**: Use your API and watch metrics in real-time
3. **Test Alerting**: Set up simple alerts for learning

### **Short-term (Pre-Production)**
1. **Plan Production Architecture**: Choose cloud provider and services
2. **Security Review**: Plan authentication and access control
3. **Cost Analysis**: Calculate monitoring costs for your scale

### **Long-term (Production)**
1. **Advanced Monitoring**: Add distributed tracing, log aggregation
2. **Business Metrics**: Create dashboards for business KPIs
3. **Automation**: Set up automated deployment and scaling

## **Ì≥ö Additional Resources**

### **Documentation**
- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/
- **PromQL**: https://prometheus.io/docs/prometheus/latest/querying/

### **Learning**
- **PromQL Tutorial**: https://prometheus.io/docs/prometheus/latest/querying/basics/
- **Grafana Academy**: https://grafana.com/tutorials/
- **Monitoring Best Practices**: https://sre.google/sre-book/

### **Community**
- **Prometheus Community**: https://prometheus.io/community/
- **Grafana Community**: https://community.grafana.com/
- **CNCF Slack**: #prometheus and #grafana channels

**Your Qmart API now has enterprise-grade monitoring capabilities! Ì∫Ä**

The monitoring stack provides:
‚úÖ **Real-time performance insights**
‚úÖ **Business metrics tracking** 
‚úÖ **Security monitoring**
‚úÖ **Production-ready observability**
‚úÖ **Scalable architecture**

You're ready to monitor your fintech API like a pro! ÌæØ
