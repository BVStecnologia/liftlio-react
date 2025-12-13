# =============================================================================
# LIFTLIO BROWSER ORCHESTRATOR
# =============================================================================
# Gerencia containers de Browser Agent por projeto
# =============================================================================

FROM node:20-slim

LABEL maintainer="Liftlio"
LABEL description="Liftlio Browser Orchestrator"
LABEL version="1.0.0"

WORKDIR /app

# Instalar curl para healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar package.json e instalar dependencias
COPY package.json ./
RUN npm install --production

# Copiar codigo
COPY index.js ./

# Nota: Orchestrator roda como root para acessar Docker socket
# Em producao Linux, pode adicionar ao grupo docker se necessario

# Porta
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Iniciar
CMD ["node", "index.js"]
