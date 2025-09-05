# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev for build)
RUN npm ci && npm cache clean --force

# Copy source code and startup script
COPY src ./src
COPY start.sh ./start.sh

# Make startup script executable
RUN chmod +x start.sh

# Build application
RUN npm run build

# Remove source code and dev dependencies
RUN rm -rf src
RUN npm ci --only=production && npm cache clean --force

# Remove build dependencies
RUN apk del python3 make g++

# Create directories for logs and data
RUN mkdir -p /app/logs
RUN chown -R backend:nodejs /app

# Switch to non-root user
USER backend

# Expose default port (Cloud Run will override with its own PORT env var)
EXPOSE 8080

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start application using startup script
CMD ["/bin/sh", "./start.sh"]
