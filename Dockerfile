# Dockerfile
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy source code
COPY . .

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S flowtest -u 1001

# Change ownership
RUN chown -R flowtest:nodejs /app
USER flowtest

# Expose port (if needed)
# EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node --version || exit 1

# Run tests by default
CMD ["npm", "test"]