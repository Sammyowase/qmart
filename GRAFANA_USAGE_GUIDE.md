# í³ˆ Grafana Usage Guide for Qmart API

## **Step 1: Accessing Grafana Dashboard**

### **Login to Grafana**
1. **Open Browser**: Navigate to `http://localhost:3001`
2. **Login Credentials**:
   - Username: `admin`
   - Password: `qmart123`
3. **First Login**: You may be prompted to change password (optional for development)

### **Initial Setup Verification**
After login, you should see:
- **Home Dashboard**: Grafana welcome screen
- **Left Sidebar**: Navigation menu
- **Data Source**: Prometheus should be auto-configured

## **Step 2: Navigating to Qmart API Dashboard**

### **Method 1: Direct Access**
1. Click **"Dashboards"** in left sidebar
2. Look for **"Qmart Fintech API Dashboard"**
3. Click to open

### **Method 2: Search**
1. Click the **search icon** (magnifying glass) in top bar
2. Type **"Qmart"** or **"API"**
3. Select the dashboard from results

### **Method 3: Browse**
1. Click **"Browse"** in left sidebar
2. Navigate through folders to find your dashboard

## **Step 3: Understanding Dashboard Panels**

### **Panel 1: API Health Status**
**What it shows**: Current health of your API (1 = healthy, 0 = unhealthy)
**How to read**:
- **Green "1"**: API is healthy and responding
- **Red "0"**: API is down or unhealthy
- **No data**: API not running or metrics not being collected

**Troubleshooting**:
```bash
# If showing 0 or no data, check:
curl http://localhost:5000/health
curl http://localhost:5000/metrics | grep health_status
```

### **Panel 2: HTTP Requests per Second**
**What it shows**: Rate of incoming HTTP requests by method and route
**How to read**:
- **Y-axis**: Requests per second
- **X-axis**: Time
- **Lines**: Different colored lines for each endpoint
- **Legend**: Shows method + route (e.g., "GET /health", "POST /api/auth/customer/signup")

**What to look for**:
- **Spikes**: High traffic periods
- **Patterns**: Regular usage patterns
- **Flat lines**: No traffic to specific endpoints

### **Panel 3: Response Time Distribution**
**What it shows**: How fast your API responds (95th and 50th percentiles)
**How to read**:
- **50th percentile**: Half of requests are faster than this
- **95th percentile**: 95% of requests are faster than this
- **Higher values**: Slower response times

**Good values**:
- **50th percentile**: < 100ms for simple endpoints
- **95th percentile**: < 500ms for complex endpoints

### **Panel 4: Authentication Attempts**
**What it shows**: Customer and merchant login attempts (success vs failure)
**How to read**:
- **Green lines**: Successful authentications
- **Red lines**: Failed authentications
- **customer-success**: Successful customer logins
- **merchant-failure**: Failed merchant logins

**Security monitoring**:
- **High failure rates**: Potential brute force attacks
- **Unusual patterns**: Security concerns

### **Panel 5: Active Connections**
**What it shows**: Current number of active connections to your API
**How to read**:
- **Real-time gauge**: Current active connections
- **Normal range**: 0-50 for development, varies in production
- **Spikes**: High load periods

### **Panel 6: Rate Limit Hits**
**What it shows**: How often rate limiting is triggered
**How to read**:
- **auth**: Rate limits on authentication endpoints (5/15min)
- **general**: Rate limits on general endpoints (100/15min)
- **Spikes**: Potential abuse or legitimate high usage

### **Panel 7: OTP Generation Rate**
**What it shows**: How often OTP codes are generated
**How to read**:
- **verification**: Email verification OTPs
- **password_reset**: Password reset OTPs
- **Business insight**: User registration and password reset patterns

### **Panel 8: Wallet Operations**
**What it shows**: Wallet creation and update operations
**How to read**:
- **create-customer**: New customer wallets
- **create-merchant**: New merchant wallets
- **Business metrics**: Growth indicators

## **Step 4: Customizing and Adding Panels**

### **Adding a New Panel**
1. **Click "Add panel"** (+ icon) in top toolbar
2. **Select "Add a new panel"**
3. **Configure the panel**:

**Example: Error Rate Panel**
```promql
# Query for error rate
rate(qmart_api_errors_total[5m])
```

**Panel Settings**:
- **Title**: "API Error Rate"
- **Type**: "Time series"
- **Unit**: "errors/sec"
- **Thresholds**: Red > 0.1 errors/sec

### **Editing Existing Panels**
1. **Hover over panel** title
2. **Click the dropdown arrow**
3. **Select "Edit"**
4. **Modify**:
   - **Query**: Change the PromQL query
   - **Visualization**: Change chart type
   - **Thresholds**: Set warning/critical levels
   - **Time range**: Adjust time window

### **Useful Custom Queries**

**Database Response Time**:
```promql
histogram_quantile(0.95, rate(qmart_api_database_operation_duration_seconds_bucket[5m]))
```

**Email Success Rate**:
```promql
rate(qmart_api_emails_sent_total{status="success"}[5m]) / 
rate(qmart_api_emails_sent_total[5m])
```

**Memory Usage Trend**:
```promql
qmart_api_process_resident_memory_bytes / 1024 / 1024
```

**Request Error Percentage**:
```promql
(
  rate(qmart_api_http_requests_total{status_code=~"4..|5.."}[5m]) /
  rate(qmart_api_http_requests_total[5m])
) * 100
```

## **Step 5: Dashboard Management**

### **Saving Changes**
1. **Click "Save dashboard"** (disk icon) in top toolbar
2. **Add description** of changes
3. **Click "Save"**

### **Creating Dashboard Copies**
1. **Click "Dashboard settings"** (gear icon)
2. **Select "Save As"**
3. **Give new name**: e.g., "Qmart API - Production"

### **Sharing Dashboards**
1. **Click "Share"** (share icon) in top toolbar
2. **Options**:
   - **Link**: Direct URL to dashboard
   - **Snapshot**: Static snapshot
   - **Export**: JSON file for backup

### **Setting Time Ranges**
1. **Top-right time picker**: Click to change range
2. **Common ranges**:
   - **Last 5 minutes**: Real-time monitoring
   - **Last 1 hour**: Recent performance
   - **Last 24 hours**: Daily patterns
   - **Last 7 days**: Weekly trends

### **Auto-refresh**
1. **Click refresh dropdown** (next to time picker)
2. **Select interval**: 5s, 10s, 30s, 1m, 5m
3. **For production**: Use 30s or 1m to reduce load

## **Step 6: Alerting (Optional)**

### **Setting Up Alerts**
1. **Edit a panel** (e.g., Error Rate)
2. **Go to "Alert" tab**
3. **Create alert rule**:

**Example: High Error Rate Alert**
```yaml
Condition: 
  Query: rate(qmart_api_errors_total[5m])
  Threshold: IS ABOVE 0.1
  For: 2m

Notification:
  Message: "High error rate detected in Qmart API"
  Channels: email, slack
```

### **Notification Channels**
1. **Go to Alerting > Notification channels**
2. **Add channel**:
   - **Email**: SMTP configuration
   - **Slack**: Webhook URL
   - **Discord**: Webhook URL

## **Step 7: Troubleshooting Common Issues**

### **No Data in Panels**
**Check**:
1. **Prometheus connection**: Grafana > Configuration > Data Sources
2. **API running**: `curl http://localhost:5000/metrics`
3. **Time range**: Ensure it covers when API was running
4. **Query syntax**: Verify PromQL queries are correct

### **Panels Showing Errors**
**Common fixes**:
1. **Refresh browser**: Clear cache
2. **Check Prometheus**: `http://localhost:9090/targets`
3. **Verify metrics**: `curl http://localhost:5000/metrics | grep metric_name`

### **Dashboard Not Loading**
**Solutions**:
1. **Check Grafana logs**: `docker logs qmart-grafana`
2. **Restart Grafana**: `docker restart qmart-grafana`
3. **Check permissions**: Ensure dashboard files are readable

## **Step 8: Best Practices**

### **Monitoring Workflow**
1. **Daily**: Check health status and error rates
2. **Weekly**: Review performance trends and capacity
3. **Monthly**: Analyze business metrics and growth patterns

### **Performance Optimization**
1. **Use appropriate time ranges**: Don't query months of data unnecessarily
2. **Limit concurrent users**: Grafana can be resource-intensive
3. **Regular cleanup**: Remove unused dashboards and alerts

### **Security**
1. **Change default password**: Use strong passwords in production
2. **Enable HTTPS**: Configure SSL certificates
3. **Restrict access**: Use authentication and authorization
4. **Regular updates**: Keep Grafana updated

Your Grafana dashboard is now ready for comprehensive API monitoring! íº€
