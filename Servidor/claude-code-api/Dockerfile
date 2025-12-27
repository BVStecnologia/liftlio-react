# =============================================================================
# LIFTLIO CLAUDE CODE API - Lightweight Container
# =============================================================================
# Claude Code CLI only - No browser, No VNC, No Playwright
# Size: ~200MB (vs 2GB+ with browser)
# =============================================================================

FROM node:20-slim

LABEL maintainer="Liftlio"
LABEL description="Claude Code API - Lightweight"
LABEL version="1.0.2"

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Create claude user (non-root for security)
RUN useradd -m -s /bin/bash claude

# Create directories
RUN mkdir -p /home/claude/.claude \
             /home/claude/.config \
             /credentials \
             /app \
    && chown -R claude:claude /home/claude /app /credentials

# Environment variables
ENV HOME=/home/claude
ENV PORT=10100
ENV NODE_ENV=production

# Copy API server and entrypoint
WORKDIR /app
COPY --chown=claude:claude package.json server.js entrypoint.sh ./
RUN chmod +x /app/entrypoint.sh

# Install API dependencies
RUN npm install --production

# Switch to non-root user
USER claude

# Expose API port
EXPOSE 10100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:10100/health || exit 1

# Use entrypoint to setup credentials
ENTRYPOINT ["/app/entrypoint.sh"]
