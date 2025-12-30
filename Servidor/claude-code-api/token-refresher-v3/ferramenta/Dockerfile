# =============================================================================
# FERRAMENTA (Sub-container 1)
# Claude Code CLI + Chromium + VNC + API Express
# =============================================================================

FROM node:20-bookworm

# Install dependencies
RUN apt-get update && apt-get install -y \
    # VNC and desktop
    tigervnc-standalone-server \
    tigervnc-common \
    fluxbox \
    # Browser
    chromium \
    # System utilities
    supervisor \
    curl \
    procps \
    dbus-x11 \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash browseruser \
    && mkdir -p /home/browseruser/.vnc \
    && mkdir -p /home/browseruser/.claude \
    && mkdir -p /home/browseruser/.config/chromium \
    && mkdir -p /opt/claude-credentials

# Set VNC password (vncpass)
RUN echo "vncpass" | vncpasswd -f > /home/browseruser/.vnc/passwd \
    && chmod 600 /home/browseruser/.vnc/passwd \
    && chown -R browseruser:browseruser /home/browseruser

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Fix permissions
RUN chown -R browseruser:browseruser /app \
    && chown -R browseruser:browseruser /opt/claude-credentials

# Expose ports
# 5901 = VNC
# 3001 = API Express
EXPOSE 5901 3001

# Environment variables
ENV DISPLAY=:1
ENV HOME=/home/browseruser
ENV CHROME_BIN=/usr/bin/chromium

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
