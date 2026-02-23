# Dockerfile for TestDino MCP Server
# A Model Context Protocol server for TestDino

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for TypeScript build)
RUN npm ci

# Copy source code and configuration
COPY src ./src
COPY tsconfig.json ./
COPY docs ./docs

# Build TypeScript to JavaScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docs ./docs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcpuser -u 1001 && \
    chown -R mcpuser:nodejs /app

# Switch to non-root user
USER mcpuser

# The MCP server runs on stdio, not HTTP
# So we don't EXPOSE any ports

# Start the MCP server
CMD ["node", "dist/index.js"]