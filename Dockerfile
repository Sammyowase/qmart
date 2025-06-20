
FROM node:20.11.1-alpine3.19 AS builder

RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

WORKDIR /app


COPY package*.json ./

RUN npm ci --timeout=300000 || npm ci --timeout=300000


COPY . .


# Build TypeScript with Docker-specific configuration
RUN npm run build:docker

# Verify critical files exist
RUN echo "📁 Verifying Docker build output:" && \
    ls -la dist/ && \
    ls -la dist/config/ && \
    test -f dist/server.js && \
    test -f dist/config/database.js && \
    test -f dist/config/email.js && \
    test -f dist/routes/kyc.routes.js && \
    test -f dist/routes/admin.routes.js && \
    test -f dist/monitoring/metrics.js && \
    echo "✅ All critical files compiled successfully"

# Production stage
FROM node:20.11.1-alpine3.19 AS production

# Security: Update packages and install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Security: Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy package files
COPY package*.json ./

# Install only production dependencies with retry mechanism
RUN npm ci --only=production --timeout=300000 || npm ci --only=production --timeout=300000
RUN npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/swagger ./swagger

# Security: Set proper file permissions
RUN chown -R nodejs:nodejs /app && \
    chmod -R 755 /app

# Security: Switch to non-root user
USER nodejs

# Security: Use non-privileged port
EXPOSE 5000

# Security: Enhanced health check with timeout
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const http=require('http');const req=http.get('http://localhost:5000/health',{timeout:5000},(res)=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.on('timeout',()=>process.exit(1));"

# Security: Use dumb-init to handle signals properly and start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
