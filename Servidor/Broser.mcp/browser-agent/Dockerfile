# Browser Agent with Playwright MCP
# Base: Microsoft Playwright with Chromium

FROM mcr.microsoft.com/playwright:v1.56.1-jammy

# Set working directory
WORKDIR /app

# Install Node.js dependencies
RUN apt-get update && apt-get install -y \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/

# Create directories for profiles and data
RUN mkdir -p /data/profiles /data/screenshots

# Environment variables
ENV NODE_ENV=production
ENV MCP_PORT=3000
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Expose MCP port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start MCP server
CMD ["node", "dist/index.js"]
