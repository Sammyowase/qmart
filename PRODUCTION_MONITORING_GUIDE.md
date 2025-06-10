# Ì∫Ä Production Deployment Guide for Qmart API Monitoring

## **Will Monitoring Deploy Automatically?**

**‚ùå NO** - The Docker Compose monitoring stack we created is designed for **local development only**. 

For production, you need a different approach because:
- Docker Compose isn't suitable for production scaling
- Cloud providers have managed monitoring services
- Security, persistence, and high availability requirements differ

## **Production Deployment Strategies**

### **Option 1: Cloud-Managed Services (Recommended)**

#### **AWS Deployment**
```yaml
# Infrastructure as Code (Terraform/CloudFormation)
API_Deployment:
  - ECS/EKS: Container orchestration for your API
  - CloudWatch: Metrics collection and alerting
  - Application Load Balancer: Traffic distribution
  - RDS: Managed MongoDB/PostgreSQL

Monitoring_Stack:
  - Amazon Managed Grafana: $9/month per active user
  - Amazon Managed Prometheus: $0.30 per million samples
  - CloudWatch Logs: $0.50 per GB ingested
```

**Setup Commands:**
```bash
# 1. Deploy API to ECS
aws ecs create-service --service-name qmart-api \
  --task-definition qmart-api:1 \
  --desired-count 2

# 2. Configure CloudWatch metrics
aws logs create-log-group --log-group-name /aws/ecs/qmart-api

# 3. Set up Managed Grafana
aws grafana create-workspace --workspace-name qmart-monitoring \
  --account-access-type CURRENT_ACCOUNT \
  --authentication-providers AWS_SSO
```

#### **Google Cloud Platform**
```yaml
API_Deployment:
  - Cloud Run: Serverless container deployment
  - Cloud Monitoring: Metrics and alerting
  - Cloud Load Balancing: Traffic management

Monitoring_Stack:
  - Google Cloud Monitoring: $0.258 per million data points
  - Grafana on GKE: Self-managed on Kubernetes
```

#### **Azure Deployment**
```yaml
API_Deployment:
  - Container Instances: Simple container hosting
  - Azure Monitor: Comprehensive monitoring
  - Application Gateway: Load balancing

Monitoring_Stack:
  - Azure Monitor: $2.30 per GB ingested
  - Grafana on AKS: Kubernetes-managed
```

### **Option 2: Self-Managed on Cloud VMs**

#### **Production Docker Compose Setup**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  qmart-api:
    image: your-registry/qmart-api:latest
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
    networks:
      - qmart-network

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.prod.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    networks:
      - qmart-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_SERVER_DOMAIN=${DOMAIN_NAME}
      - GF_SERVER_ROOT_URL=https://${DOMAIN_NAME}/grafana
      - GF_SECURITY_COOKIE_SECURE=true
    restart: unless-stopped
    networks:
      - qmart-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - qmart-api
      - grafana
    restart: unless-stopped
    networks:
      - qmart-network

volumes:
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

networks:
  qmart-network:
    driver: bridge
```

#### **Production Prometheus Configuration**
```yaml
# monitoring/prometheus.prod.yml
global:
  scrape_interval: 30s
  evaluation_interval: 30s
  external_labels:
    cluster: 'qmart-production'
    environment: 'prod'

rule_files:
  - "/etc/prometheus/rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'qmart-api'
    static_configs:
      - targets: ['qmart-api:5000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    scrape_timeout: 10s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### **Option 3: Kubernetes Deployment**

#### **Kubernetes Manifests**
```yaml
# k8s/qmart-api-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qmart-api
  labels:
    app: qmart-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: qmart-api
  template:
    metadata:
      labels:
        app: qmart-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "5000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: qmart-api
        image: your-registry/qmart-api:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: qmart-secrets
              key: mongodb-uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: qmart-api-service
spec:
  selector:
    app: qmart-api
  ports:
  - port: 80
    targetPort: 5000
  type: LoadBalancer
```

#### **Prometheus Operator Setup**
```bash
# Install Prometheus Operator
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml

# Create ServiceMonitor for your API
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: qmart-api-monitor
spec:
  selector:
    matchLabels:
      app: qmart-api
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
