# í´§ Grafana Dashboard Troubleshooting Guide

## **Issue Identified: Dashboard JSON Format Error**

The Grafana logs show: `"Dashboard title cannot be empty"`

This means the dashboard JSON structure is incorrect. Let me fix this step by step.

## **Step 1: Fix Dashboard JSON Structure**

The issue is that Grafana expects the dashboard JSON to be at the root level, not wrapped in a "dashboard" object.

### **Create Correct Dashboard File**
```bash
# Remove the old file and create a new one
rm monitoring/grafana/dashboards/qmart-api-dashboard.json

# Create the correct format
cat > monitoring/grafana/dashboards/qmart-api-dashboard.json << 'DASHBOARD_EOF'
{
  "id": null,
  "uid": "qmart-api-001",
  "title": "Qmart Fintech API Dashboard",
  "tags": ["qmart", "fintech", "api", "monitoring"],
  "style": "dark",
  "timezone": "browser",
  "editable": true,
  "graphTooltip": 0,
  "time": {
    "from": "now-1h",
    "to": "now"
  },
  "timepicker": {
    "refresh_intervals": ["5s", "10s", "30s", "1m", "5m", "15m", "30m", "1h", "2h", "1d"],
    "time_options": ["5m", "15m", "1h", "6h", "12h", "24h", "2d", "7d", "30d"]
  },
  "refresh": "5s",
  "schemaVersion": 27,
  "version": 1,
  "panels": [
    {
      "id": 1,
      "title": "API Health Status",
      "type": "stat",
      "targets": [
        {
          "expr": "qmart_api_health_status",
          "legendFormat": "Health Status",
          "refId": "A"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "red",
                "value": null
              },
              {
                "color": "red",
                "value": 0
              },
              {
                "color": "green",
                "value": 1
              }
            ]
          },
          "unit": "none",
          "min": 0,
          "max": 1
        }
      },
      "options": {
        "reduceOptions": {
          "values": false,
          "calcs": ["lastNotNull"],
          "fields": ""
        },
        "orientation": "auto",
        "textMode": "auto",
        "colorMode": "background"
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 0
      }
    },
    {
      "id": 2,
      "title": "HTTP Requests per Second",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(qmart_api_http_requests_total[5m])",
          "legendFormat": "{{method}} {{route}} ({{status_code}})",
          "refId": "A"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "unit": "reqps"
        }
      },
      "options": {
        "legend": {
          "displayMode": "visible",
          "placement": "bottom"
        }
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 0
      }
    },
    {
      "id": 3,
      "title": "Response Time Distribution",
      "type": "timeseries",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, rate(qmart_api_http_request_duration_seconds_bucket[5m]))",
          "legendFormat": "95th percentile",
          "refId": "A"
        },
        {
          "expr": "histogram_quantile(0.50, rate(qmart_api_http_request_duration_seconds_bucket[5m]))",
          "legendFormat": "50th percentile",
          "refId": "B"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "unit": "s"
        }
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 8
      }
    },
    {
      "id": 4,
      "title": "Authentication Attempts",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(qmart_api_auth_attempts_total[5m])",
          "legendFormat": "{{type}} - {{status}}",
          "refId": "A"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "unit": "ops"
        }
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 8
      }
    },
    {
      "id": 5,
      "title": "Active Connections",
      "type": "timeseries",
      "targets": [
        {
          "expr": "qmart_api_active_connections",
          "legendFormat": "Active Connections",
          "refId": "A"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "unit": "short"
        }
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 16
      }
    },
    {
      "id": 6,
      "title": "Rate Limit Hits",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(qmart_api_rate_limit_hits_total[5m])",
          "legendFormat": "{{endpoint_type}}",
          "refId": "A"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "unit": "ops"
        }
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 16
      }
    }
  ]
}
DASHBOARD_EOF
```

## **Step 2: Restart Grafana Container**

```bash
# Restart Grafana to reload the dashboard
docker restart qmart-grafana

# Wait for it to start (about 30 seconds)
sleep 30

# Check if it's running
docker ps | grep grafana
```

## **Step 3: Verify Dashboard Provisioning**

```bash
# Check Grafana logs for errors
docker logs qmart-grafana | tail -20

# Look for successful dashboard loading
docker logs qmart-grafana | grep -i dashboard
```

## **Step 4: Manual Dashboard Import (Backup Method)**

If auto-provisioning still doesn't work, import manually:

### **Method A: Through Grafana UI**
1. Open http://localhost:3001
2. Login: admin / qmart123
3. Click "+" â†’ "Import"
4. Copy the dashboard JSON content
5. Paste and click "Load"
6. Click "Import"

### **Method B: Using Grafana API**
```bash
# Import dashboard via API
curl -X POST \
  http://admin:qmart123@localhost:3001/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @monitoring/grafana/dashboards/qmart-api-dashboard.json
```

## **Step 5: Verify Prometheus Data Source**

```bash
# Check if Prometheus is connected
curl -X GET \
  http://admin:qmart123@localhost:3001/api/datasources \
  | jq '.[] | select(.type=="prometheus")'

# Test Prometheus connection
curl -X GET \
  "http://admin:qmart123@localhost:3001/api/datasources/proxy/1/api/v1/query?query=up"
```

## **Step 6: Generate Test Data**

```bash
# Generate some API traffic to populate metrics
for i in {1..10}; do
  curl http://localhost:5000/health
  curl http://localhost:5000/api
  sleep 1
done

# Check if metrics are being collected
curl http://localhost:5000/metrics | grep qmart_api_http_requests_total
```

## **Complete Troubleshooting Commands**

Run these commands in order to fix the dashboard:

```bash
# 1. Fix the dashboard JSON
rm monitoring/grafana/dashboards/qmart-api-dashboard.json
# (Create the new file with correct format - see above)

# 2. Restart Grafana
docker restart qmart-grafana

# 3. Wait and check
sleep 30
docker logs qmart-grafana | grep -i "dashboard.*success\|dashboard.*loaded"

# 4. Generate test traffic
curl http://localhost:5000/health
curl http://localhost:5000/metrics | head -20

# 5. Check Grafana
# Open http://localhost:3001 and look for "Qmart Fintech API Dashboard"
```

## **Expected Results**

After fixing:
- âœ… No more "Dashboard title cannot be empty" errors
- âœ… Dashboard appears in Grafana UI
- âœ… Panels show data when API traffic is generated
- âœ… Prometheus data source is connected

## **If Dashboard Still Missing**

### **Check File Permissions**
```bash
# Ensure files are readable
ls -la monitoring/grafana/dashboards/
chmod 644 monitoring/grafana/dashboards/qmart-api-dashboard.json
```

### **Verify Docker Volume Mounting**
```bash
# Check if volume is mounted correctly
docker inspect qmart-grafana | grep -A 10 "Mounts"
```

### **Manual Import as Last Resort**
```bash
# Copy dashboard content
cat monitoring/grafana/dashboards/qmart-api-dashboard.json

# Go to Grafana UI â†’ Import â†’ Paste JSON â†’ Import
```

Your dashboard should now appear and work correctly! í¾¯
