FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
RUN apt-get update && apt-get install -y openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN npm ci && \
    npm cache clean --force

# Generate Prisma Client
RUN npx prisma generate

# Build stage
FROM base AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

# Install runtime dependencies including OpenSSL development libraries
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    dumb-init \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Set environment variable to help Prisma find OpenSSL
ENV LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs skyline

# Copy necessary files from builder
COPY --from=builder --chown=skyline:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=skyline:nodejs /app/prisma ./prisma
COPY --from=builder --chown=skyline:nodejs /app/package*.json ./
COPY --from=builder --chown=skyline:nodejs /app/dist ./dist

# Create upload directories
RUN mkdir -p uploads/payments uploads/kyc certs && \
    chown -R skyline:nodejs uploads certs

# Switch to non-root user
USER skyline

# Expose port
EXPOSE 5004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5004/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]