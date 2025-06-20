# Qmart Backend Deployment Guide

## 🚀 Render Deployment

### Prerequisites
- GitHub repository with the Qmart backend code
- Render account
- MongoDB Atlas database (or other MongoDB instance)
- Environment variables configured

### Deployment Steps

#### 1. **Prepare Environment Variables**
In your Render dashboard, set the following environment variables:

**Required:**
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/qmart-prod
JWT_SECRET=your-super-secure-jwt-secret-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Optional but Recommended:**
```
CORS_ORIGIN=https://your-frontend-domain.com
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5
BCRYPT_ROUNDS=12
```

#### 2. **Deploy to Render**

**Option A: Using render.yaml (Recommended)**
1. Ensure `render.yaml` is in your repository root
2. Connect your GitHub repository to Render
3. Render will automatically use the configuration from `render.yaml`

**Option B: Manual Configuration**
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the following settings:
   - **Build Command:** `npm install && npm run build:render`
   - **Start Command:** `npm run start:prod`
   - **Environment:** Node
   - **Node Version:** 18 or higher

#### 3. **Verify Deployment**
After deployment, check these endpoints:
- Health Check: `https://your-app.onrender.com/health`
- API Info: `https://your-app.onrender.com/api`
- Documentation: `https://your-app.onrender.com/api/docs`

### Build Process

The deployment uses a robust build process:

1. **Install Dependencies:** `npm install`
2. **TypeScript Compilation:** `tsc`
3. **Post-Build Tasks:** Copy Swagger files and verify build
4. **Verification:** Ensure all critical files exist

### Troubleshooting

#### Common Issues:

**1. Module Resolution Errors**
- ✅ **Fixed:** Updated tsconfig.json with proper module resolution
- ✅ **Fixed:** Simplified build process to avoid path issues

**2. Missing Files**
- ✅ **Fixed:** Post-build script copies all necessary files
- ✅ **Fixed:** Verification step ensures critical files exist

**3. Database Connection Issues**
- Check MongoDB URI format
- Ensure database user has proper permissions
- Verify network access from Render

**4. Environment Variable Issues**
- Double-check all required environment variables are set
- Ensure no typos in variable names
- Check that sensitive values are properly escaped

### Performance Optimization

**For Production:**
1. Enable MongoDB connection pooling
2. Configure proper rate limiting
3. Set up monitoring with Prometheus metrics
4. Use CDN for static assets if needed

### Monitoring

The application includes built-in monitoring:
- **Health Check:** `/health`
- **Metrics:** `/metrics` (Prometheus format)
- **API Status:** `/api`

### Security

Production security features:
- Rate limiting on all endpoints
- Helmet.js security headers
- CORS configuration
- JWT token authentication
- Bcrypt password hashing
- Input validation with Zod schemas

### Scaling

For high-traffic scenarios:
1. Upgrade Render plan
2. Implement Redis for session storage
3. Use MongoDB Atlas clusters
4. Consider microservices architecture

## 🔧 Local Development

### Setup
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Build Testing
```bash
# Test production build locally
npm run build:render
npm run start:prod
```

### Available Scripts
- `npm run dev` - Development server with hot reload
- `npm run build` - Production build
- `npm run build:render` - Render-specific build with verification
- `npm run start` - Start production server
- `npm run start:prod` - Start with NODE_ENV=production
- `npm test` - Run tests
- `npm run lint` - Code linting

## 📚 API Documentation

After deployment, access the comprehensive API documentation:
- **Main Hub:** `/api/docs`
- **Customer API:** `/api/docs/customers`
- **Merchant API:** `/api/docs/merchants`
- **Admin API:** `/api/docs/admin`

## 🆘 Support

If you encounter deployment issues:
1. Check Render build logs
2. Verify environment variables
3. Test the build process locally
4. Check database connectivity
5. Review the troubleshooting section above
