/**
 * =============================================================================
 * LIFTLIO BROWSER ORCHESTRATOR
 * =============================================================================
 * Cria e gerencia containers de Browser Agent por projeto
 * Cada projeto recebe seu proprio container isolado com:
 * - Claude Code + Playwright MCP
 * - VNC para visualizacao
 * - IP residencial (DataImpulse)
 * - CapMonster para CAPTCHA
 * - Credenciais OAuth compartilhadas
 * =============================================================================
 */

const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');

// Docker client via socket
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const app = express();
app.use(cors());
app.use(express.json());

// Configuracao
const PORT = parseInt(process.env.PORT || '8080');
const API_SECRET_KEY = process.env.API_SECRET_KEY || '';
const BROWSER_AGENT_IMAGE = process.env.BROWSER_AGENT_IMAGE || 'claude-code-agent-browser-agent:latest';
const MCP_PORT_BASE = parseInt(process.env.MCP_PORT_BASE || '10100');
const VNC_PORT_BASE = parseInt(process.env.VNC_PORT_BASE || '16000');
const MAX_CONTAINERS = parseInt(process.env.MAX_CONTAINERS || '10');
const HOST_IP = process.env.HOST_IP || 'localhost';
const CLEANUP_INTERVAL_MINUTES = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '5');
const SESSION_TIMEOUT_MINUTES = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '60');

// Variaveis passadas para containers
const CAPMONSTER_API_KEY = process.env.CAPMONSTER_API_KEY || '';
const PROXY_URL = process.env.PROXY_URL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// Sessoes ativas (em memoria)
const sessions = new Map();

/**
 * Logging com timestamp
 */
function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

/**
 * Middleware de autenticacao
 */
function authenticate(req, res, next) {
  if (req.path === '/health') return next();

  if (!API_SECRET_KEY) {
    log('WARNING: API_SECRET_KEY not set - auth disabled');
    return next();
  }

  const providedKey = req.headers['x-api-key'];
  if (!providedKey || providedKey !== API_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
  }

  next();
}

app.use(authenticate);

/**
 * Encontrar proximo indice de porta disponivel
 */
function getNextPortIndex() {
  const usedIndices = new Set(
    Array.from(sessions.values()).map(s => s.portIndex)
  );

  for (let i = 0; i < MAX_CONTAINERS; i++) {
    if (!usedIndices.has(i)) return i;
  }

  throw new Error(`Maximum containers (${MAX_CONTAINERS}) reached`);
}

/**
 * Health check
 */
app.get('/health', (req, res) => {
  const runningCount = Array.from(sessions.values()).filter(s => s.status === 'running').length;

  res.json({
    status: 'healthy',
    service: 'liftlio-browser-orchestrator',
    timestamp: new Date().toISOString(),
    stats: {
      totalContainers: sessions.size,
      runningContainers: runningCount,
      maxContainers: MAX_CONTAINERS,
      availableSlots: MAX_CONTAINERS - runningCount
    }
  });
});

/**
 * Listar todos os containers
 */
app.get('/containers', (req, res) => {
  const containers = Array.from(sessions.values()).map(s => ({
    projectId: s.projectId,
    status: s.status,
    mcpUrl: s.mcpUrl,
    vncUrl: s.vncUrl,
    createdAt: s.createdAt,
    lastActivity: s.lastActivity
  }));

  res.json({ containers });
});

/**
 * Obter status de um container especifico
 */
app.get('/containers/:projectId', (req, res) => {
  const { projectId } = req.params;
  const session = sessions.get(projectId);

  if (!session) {
    return res.status(404).json({ error: 'Not found', message: `Container for project ${projectId} not found` });
  }

  res.json(session);
});

/**
 * Criar novo container para projeto
 */
app.post('/containers', async (req, res) => {
  const { projectId, userId } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'Bad request', message: 'projectId is required' });
  }

  try {
    // Verificar se ja existe
    const existing = sessions.get(projectId);
    if (existing && existing.status === 'running') {
      log(`Container already exists for project ${projectId}`);
      existing.lastActivity = new Date();
      return res.json(existing);
    }

    // Verificar limite
    const runningCount = Array.from(sessions.values()).filter(s => s.status === 'running').length;
    if (runningCount >= MAX_CONTAINERS) {
      return res.status(429).json({
        error: 'Too many containers',
        message: `Maximum containers (${MAX_CONTAINERS}) reached`
      });
    }

    // Alocar portas
    const portIndex = getNextPortIndex();
    const mcpPort = MCP_PORT_BASE + portIndex;
    const vncPort = VNC_PORT_BASE + portIndex;
    const containerName = `liftlio-browser-${projectId}`;

    log(`Creating container for project ${projectId} (MCP: ${mcpPort}, VNC: ${vncPort})`);

    // Criar sessao
    const session = {
      containerId: '',
      containerName,
      projectId,
      userId: userId || 'unknown',
      portIndex,
      mcpPort,
      vncPort,
      status: 'creating',
      mcpUrl: `http://${HOST_IP}:${mcpPort}`,
      vncUrl: `http://${HOST_IP}:${vncPort}/vnc.html?autoconnect=true`,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    sessions.set(projectId, session);

    // Remover container existente se houver
    try {
      const existingContainer = docker.getContainer(containerName);
      await existingContainer.remove({ force: true });
      log(`Removed existing container: ${containerName}`);
    } catch (e) {
      // Container nao existe, ok
    }

    // Criar container
    const container = await docker.createContainer({
      Image: BROWSER_AGENT_IMAGE,
      name: containerName,
      Env: [
        `PORT=10100`,
        `PROJECT_ID=${projectId}`,
        `CAPMONSTER_API_KEY=${CAPMONSTER_API_KEY}`,
        `PROXY_URL=${PROXY_URL}`,
        `SUPABASE_URL=${SUPABASE_URL}`,
        `SUPABASE_KEY=${SUPABASE_KEY}`,
        `VNC_TIMEOUT_MINUTES=60`,
        `SCREEN_WIDTH=1920`,
        `SCREEN_HEIGHT=1080`,
        `SCREEN_DEPTH=24`,
        `NOVNC_PORT=6080`
      ],
      ExposedPorts: {
        '10100/tcp': {},
        '6080/tcp': {}
      },
      HostConfig: {
        PortBindings: {
          '10100/tcp': [{ HostPort: String(mcpPort) }],
          '6080/tcp': [{ HostPort: String(vncPort) }]
        },
        Binds: [
          'claude-credentials:/opt/claude-credentials:ro',
          'claude-config:/opt/claude-config:ro',
          `browser-workspace-${projectId}:/workspace`,
          `browser-chrome-${projectId}:/home/claude/.chrome-persistent`
        ],
        Memory: 2 * 1024 * 1024 * 1024, // 2GB
        ShmSize: 2 * 1024 * 1024 * 1024, // 2GB shared memory
        RestartPolicy: { Name: 'unless-stopped' },
        NetworkMode: 'liftlio-browser-network',
        IpcMode: 'host'
      },
      Labels: {
        'liftlio.project': projectId,
        'liftlio.user': userId || 'unknown',
        'liftlio.type': 'browser-agent',
        'liftlio.managed': 'true'
      }
    });

    // Iniciar container
    await container.start();

    // Atualizar sessao
    session.containerId = container.id;
    session.status = 'running';

    log(`Container created and started: ${containerName} (ID: ${container.id.substring(0, 12)})`);

    res.status(201).json(session);

  } catch (error) {
    log(`ERROR creating container: ${error.message}`);

    // Limpar sessao em caso de erro
    if (sessions.get(projectId)?.status === 'creating') {
      sessions.delete(projectId);
    }

    res.status(500).json({ error: 'Internal error', message: error.message });
  }
});

/**
 * Destruir container
 */
app.delete('/containers/:projectId', async (req, res) => {
  const { projectId } = req.params;

  const session = sessions.get(projectId);
  if (!session) {
    return res.status(404).json({ error: 'Not found', message: `Container for project ${projectId} not found` });
  }

  try {
    log(`Destroying container for project ${projectId}`);

    const container = docker.getContainer(session.containerName);
    await container.stop().catch(() => {});
    await container.remove({ force: true });

    sessions.delete(projectId);

    log(`Container destroyed: ${session.containerName}`);

    res.json({ success: true, message: `Container for project ${projectId} destroyed` });

  } catch (error) {
    log(`ERROR destroying container: ${error.message}`);
    res.status(500).json({ error: 'Internal error', message: error.message });
  }
});

/**
 * Atualizar lastActivity de um container (keepalive)
 */
app.post('/containers/:projectId/keepalive', (req, res) => {
  const { projectId } = req.params;
  const session = sessions.get(projectId);

  if (!session) {
    return res.status(404).json({ error: 'Not found' });
  }

  session.lastActivity = new Date();
  res.json({ success: true, lastActivity: session.lastActivity });
});

/**
 * Sincronizar sessoes com containers Docker reais
 */
async function syncWithDocker() {
  try {
    const containers = await docker.listContainers({ all: true });

    for (const containerInfo of containers) {
      const labels = containerInfo.Labels || {};

      if (labels['liftlio.managed'] === 'true') {
        const projectId = labels['liftlio.project'];
        const session = sessions.get(projectId);

        if (session) {
          const isRunning = containerInfo.State === 'running';
          if (session.status === 'running' && !isRunning) {
            log(`Container ${session.containerName} stopped externally`);
            session.status = 'stopped';
          } else if (session.status !== 'running' && isRunning) {
            session.status = 'running';
          }
        }
      }
    }
  } catch (error) {
    log(`ERROR syncing with Docker: ${error.message}`);
  }
}

/**
 * Cleanup de containers inativos
 */
async function cleanupInactiveSessions() {
  const now = new Date();
  const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;

  for (const [projectId, session] of sessions.entries()) {
    const inactiveTime = now - new Date(session.lastActivity);

    if (inactiveTime > timeoutMs && session.status === 'running') {
      log(`Container ${session.containerName} inactive for ${Math.round(inactiveTime / 60000)} minutes, cleaning up`);

      try {
        const container = docker.getContainer(session.containerName);
        await container.stop().catch(() => {});
        await container.remove({ force: true });
        sessions.delete(projectId);
        log(`Cleaned up inactive container: ${session.containerName}`);
      } catch (error) {
        log(`ERROR cleaning up container: ${error.message}`);
      }
    }
  }
}

/**
 * Restaurar sessoes de containers existentes no startup
 */
async function restoreExistingSessions() {
  try {
    const containers = await docker.listContainers({ all: true });

    for (const containerInfo of containers) {
      const labels = containerInfo.Labels || {};

      if (labels['liftlio.managed'] === 'true' && labels['liftlio.project']) {
        const projectId = labels['liftlio.project'];
        const containerName = containerInfo.Names[0].replace('/', '');

        // Extrair portas
        const ports = containerInfo.Ports || [];
        const mcpPortInfo = ports.find(p => p.PrivatePort === 10100);
        const vncPortInfo = ports.find(p => p.PrivatePort === 6080);

        const mcpPort = mcpPortInfo?.PublicPort || 0;
        const vncPort = vncPortInfo?.PublicPort || 0;
        const portIndex = mcpPort ? mcpPort - MCP_PORT_BASE : 0;

        const session = {
          containerId: containerInfo.Id,
          containerName,
          projectId,
          userId: labels['liftlio.user'] || 'unknown',
          portIndex,
          mcpPort,
          vncPort,
          status: containerInfo.State === 'running' ? 'running' : 'stopped',
          mcpUrl: `http://${HOST_IP}:${mcpPort}`,
          vncUrl: `http://${HOST_IP}:${vncPort}/vnc.html?autoconnect=true`,
          createdAt: new Date(containerInfo.Created * 1000),
          lastActivity: new Date()
        };

        sessions.set(projectId, session);
        log(`Restored session for project ${projectId} (${session.status})`);
      }
    }

    log(`Restored ${sessions.size} existing sessions`);
  } catch (error) {
    log(`ERROR restoring sessions: ${error.message}`);
  }
}

// Iniciar servidor
async function start() {
  log('============================================');
  log('  LIFTLIO BROWSER ORCHESTRATOR');
  log('============================================');
  log(`Port: ${PORT}`);
  log(`Max containers: ${MAX_CONTAINERS}`);
  log(`Session timeout: ${SESSION_TIMEOUT_MINUTES} minutes`);
  log(`Cleanup interval: ${CLEANUP_INTERVAL_MINUTES} minutes`);
  log(`Browser image: ${BROWSER_AGENT_IMAGE}`);
  log('============================================');

  // Restaurar sessoes existentes
  await restoreExistingSessions();

  // Agendar sync e cleanup
  setInterval(syncWithDocker, 30 * 1000); // A cada 30 segundos
  setInterval(cleanupInactiveSessions, CLEANUP_INTERVAL_MINUTES * 60 * 1000);

  app.listen(PORT, () => {
    log(`Orchestrator listening on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start orchestrator:', err);
  process.exit(1);
});
