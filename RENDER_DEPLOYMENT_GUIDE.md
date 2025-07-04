# νΊ Render.com Deployment Guide for Qmart API

## **β What Can Be Deployed to Render**

### **API Deployment: FULLY SUPPORTED β**
- Your Node.js/Express API with Prometheus metrics
- MongoDB Atlas integration
- Environment variables and secrets
- Custom domains and SSL
- Auto-scaling and health checks

### **Monitoring Stack: LIMITED SUPPORT β οΈ**
- **Prometheus**: Not directly supported (requires persistent storage)
- **Grafana**: Not directly supported (Docker Compose limitations)
- **Alternative**: Use Render's built-in metrics + external monitoring

## **Step 1: Prepare Your Repository**

### **Required Files for Render**
```bash
# Ensure these files exist in your repo root:
βββ Dockerfile                 # β Created above
βββ package.json              # β Updated above  
βββ tsconfig.json             # β Created above
βββ src/                      # β Your source code
βββ swagger.yaml              # β API documentation
βββ .env.example              # β Environment template
```

### **Create .env.example**
```bash
cat > .env.example << 'EOF'
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@qmart.com

# OTP Configuration
OTP_EXPIRES_IN=15
OTP_LENGTH=6

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5

# Security
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://your-frontend-domain.com
