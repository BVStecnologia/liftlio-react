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
const { createClient } = require('@supabase/supabase-js');

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

// Supabase client (para crons)
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// Sessoes ativas (em memoria)
const sessions = new Map();

// Flag para evitar execucoes concorrentes dos crons
let isProcessingTasks = false;

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
 * Obter info de um container (formato esperado pelo frontend)
 */
app.get('/containers/:projectId/info', (req, res) => {
  const { projectId } = req.params;
  const session = sessions.get(projectId);

  if (!session) {
    return res.status(404).json({ error: 'Not found', message: `Container for project ${projectId} not found` });
  }

  res.json({
    projectId: session.projectId,
    apiPort: session.mcpPort,
    vncPort: session.vncPort,
    status: session.status,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    mcpUrl: session.mcpUrl,
    vncUrl: session.vncUrl
  });
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

    // Atualizar Supabase com info do container
    await updateProjectBrowserStatus(projectId, 'running', mcpPort, vncPort, containerName);

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

    // Limpar status no Supabase
    await updateProjectBrowserStatus(projectId, 'inactive', null, null, null);

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

// =============================================================================
// PROXY ROUTES - Forward requests to containers
// =============================================================================

const axios = require('axios');

/**
 * Proxy helper function
 */
async function proxyToContainer(session, path, method, body, res) {
  try {
    // Container name on same Docker network - use internal port 10100
    const containerUrl = `http://${session.containerName}:10100${path}`;
    log(`[PROXY] ${method} ${path} -> ${containerUrl}`);

    session.lastActivity = new Date();

    const response = await axios({
      method,
      url: containerUrl,
      data: body,
      timeout: 120000, // 2 min timeout for tasks
      validateStatus: () => true // Don't throw on any status
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    log(`[PROXY] Error: ${error.message}`);
    res.status(502).json({ error: 'Proxy error', message: error.message });
  }
}

/**
 * Proxy: POST /containers/:projectId/agent/task
 */
app.post('/containers/:projectId/agent/task', async (req, res) => {
  const { projectId } = req.params;
  const session = sessions.get(projectId);

  if (!session || session.status !== 'running') {
    return res.status(404).json({ error: 'Container not found or not running' });
  }

  await proxyToContainer(session, '/agent/task', 'POST', req.body, res);
});

/**
 * Proxy: GET /containers/:projectId/mcp/screenshot
 */
app.get('/containers/:projectId/mcp/screenshot', async (req, res) => {
  const { projectId } = req.params;
  const session = sessions.get(projectId);

  if (!session || session.status !== 'running') {
    return res.status(404).json({ error: 'Container not found or not running' });
  }

  await proxyToContainer(session, '/mcp/screenshot', 'GET', null, res);
});

/**
 * Proxy: GET /containers/:projectId/health
 */
app.get('/containers/:projectId/health', async (req, res) => {
  const { projectId } = req.params;
  const session = sessions.get(projectId);

  if (!session || session.status !== 'running') {
    return res.status(404).json({ error: 'Container not found or not running' });
  }

  await proxyToContainer(session, '/health', 'GET', null, res);
});

/**
 * Proxy: POST /containers/:projectId/vnc/start
 */
app.post('/containers/:projectId/vnc/start', async (req, res) => {
  const { projectId } = req.params;
  const session = sessions.get(projectId);

  if (!session || session.status !== 'running') {
    return res.status(404).json({ error: 'Container not found or not running' });
  }

  await proxyToContainer(session, '/vnc/start', 'POST', req.body, res);
});

/**
 * Proxy: POST /containers/:projectId/vnc/stop
 */
app.post('/containers/:projectId/vnc/stop', async (req, res) => {
  const { projectId } = req.params;
  const session = sessions.get(projectId);

  if (!session || session.status !== 'running') {
    return res.status(404).json({ error: 'Container not found or not running' });
  }

  await proxyToContainer(session, '/vnc/stop', 'POST', req.body, res);
});

/**
 * Proxy: GET /containers/:projectId/vnc/status
 */
app.get('/containers/:projectId/vnc/status', async (req, res) => {
  const { projectId } = req.params;
  const session = sessions.get(projectId);

  if (!session || session.status !== 'running') {
    return res.status(404).json({ error: 'Container not found or not running' });
  }

  await proxyToContainer(session, '/vnc/status', 'GET', null, res);
});

/**
 * Proxy: POST /containers/:projectId/browser/init
 */
app.post('/containers/:projectId/browser/init', async (req, res) => {
  const { projectId } = req.params;
  const session = sessions.get(projectId);

  if (!session || session.status !== 'running') {
    return res.status(404).json({ error: 'Container not found or not running' });
  }

  await proxyToContainer(session, '/browser/init', 'POST', req.body, res);
});

// =============================================================================
// SUPABASE HELPERS
// =============================================================================

/**
 * Atualiza status do browser na tabela Projeto
 */
async function updateProjectBrowserStatus(projectId, status, mcpPort, vncPort, containerName) {
  if (!supabase) {
    log('[SUPABASE] Cliente nao configurado, pulando update...');
    return;
  }

  try {
    const updateData = {
      browser_session_status: status
    };

    if (status === 'running') {
      updateData.browser_mcp_url = mcpPort ? `http://${HOST_IP}:${mcpPort}` : null;
      updateData.browser_vnc_url = vncPort ? `http://${HOST_IP}:${vncPort}/vnc.html?autoconnect=true` : null;
      updateData.browser_container_id = containerName;
      updateData.browser_session_started_at = new Date().toISOString();
    } else if (status === 'inactive') {
      updateData.browser_mcp_url = null;
      updateData.browser_vnc_url = null;
      updateData.browser_container_id = null;
      updateData.browser_session_started_at = null;
    }

    const { error } = await supabase
      .from('Projeto')
      .update(updateData)
      .eq('id', projectId);

    if (error) {
      log(`[SUPABASE] Erro ao atualizar Projeto ${projectId}: ${error.message}`);
    } else {
      log(`[SUPABASE] Projeto ${projectId} atualizado: ${status}`);
    }
  } catch (err) {
    log(`[SUPABASE] Erro inesperado: ${err.message}`);
  }
}

// =============================================================================
// CRON 1: Container Manager (Youtube Active)
// =============================================================================

/**
 * Sincroniza containers com o campo Youtube Active da tabela Projeto
 * - Youtube Active = true  -> cria container se nao existir
 * - Youtube Active = false -> deleta container se existir
 */
async function syncContainersWithYoutubeActive() {
  if (!supabase) {
    return;
  }

  try {
    // 1. Buscar projetos que precisam de container (Youtube Active = true E sem container running)
    const { data: needContainer, error: err1 } = await supabase
      .from('Projeto')
      .select('id, "Youtube Active", browser_session_status')
      .eq('Youtube Active', true)
      .or('browser_session_status.is.null,browser_session_status.neq.running');

    if (err1) {
      log(`[CRON1] Erro ao buscar projetos: ${err1.message}`);
      return;
    }

    // 2. Criar containers faltantes
    for (const projeto of (needContainer || [])) {
      const projectId = String(projeto.id);
      const existingSession = sessions.get(projectId);

      // Se nao tem sessao ou nao esta running, criar
      if (!existingSession || existingSession.status !== 'running') {
        log(`[CRON1] Criando container para projeto ${projectId} (Youtube Active = true)`);
        await createContainerForProject(projeto.id);
      }
    }

    // 3. Buscar projetos que NAO precisam mais de container
    const { data: dontNeedContainer, error: err2 } = await supabase
      .from('Projeto')
      .select('id, browser_session_status')
      .eq('Youtube Active', false)
      .eq('browser_session_status', 'running');

    if (err2) {
      log(`[CRON1] Erro ao buscar projetos inativos: ${err2.message}`);
      return;
    }

    // 4. Deletar containers desnecessarios
    for (const projeto of (dontNeedContainer || [])) {
      const projectId = String(projeto.id);
      if (sessions.has(projectId)) {
        log(`[CRON1] Deletando container do projeto ${projectId} (Youtube Active = false)`);
        await deleteContainerForProject(projeto.id);
      }
    }

  } catch (error) {
    log(`[CRON1] Erro geral: ${error.message}`);
  }
}

/**
 * Helper: Criar container para projeto (usado pelo CRON)
 */
async function createContainerForProject(projectId) {
  const projectIdStr = String(projectId);

  try {
    // Verificar se ja existe e esta running
    const existing = sessions.get(projectIdStr);
    if (existing && existing.status === 'running') {
      log(`[CRON1] Container ja existe para projeto ${projectId}`);
      return;
    }

    // Verificar limite
    const runningCount = Array.from(sessions.values()).filter(s => s.status === 'running').length;
    if (runningCount >= MAX_CONTAINERS) {
      log(`[CRON1] Limite de containers atingido (${MAX_CONTAINERS})`);
      return;
    }

    // Alocar portas
    const portIndex = getNextPortIndex();
    const mcpPort = MCP_PORT_BASE + portIndex;
    const vncPort = VNC_PORT_BASE + portIndex;
    const containerName = `liftlio-browser-${projectId}`;

    log(`[CRON1] Criando container ${containerName} (MCP: ${mcpPort}, VNC: ${vncPort})`);

    // Criar sessao
    const session = {
      containerId: '',
      containerName,
      projectId: projectIdStr,
      userId: 'cron',
      portIndex,
      mcpPort,
      vncPort,
      status: 'creating',
      mcpUrl: `http://${HOST_IP}:${mcpPort}`,
      vncUrl: `http://${HOST_IP}:${vncPort}/vnc.html?autoconnect=true`,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    sessions.set(projectIdStr, session);

    // Remover container existente se houver
    try {
      const existingContainer = docker.getContainer(containerName);
      await existingContainer.remove({ force: true });
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
        Memory: 2 * 1024 * 1024 * 1024,
        ShmSize: 2 * 1024 * 1024 * 1024,
        RestartPolicy: { Name: 'unless-stopped' },
        NetworkMode: 'liftlio-browser-network',
        IpcMode: 'host'
      },
      Labels: {
        'liftlio.project': projectIdStr,
        'liftlio.user': 'cron',
        'liftlio.type': 'browser-agent',
        'liftlio.managed': 'true'
      }
    });

    await container.start();

    session.containerId = container.id;
    session.status = 'running';

    // Atualizar Supabase
    await updateProjectBrowserStatus(projectId, 'running', mcpPort, vncPort, containerName);

    log(`[CRON1] Container criado: ${containerName}`);

  } catch (error) {
    log(`[CRON1] Erro ao criar container para ${projectId}: ${error.message}`);
    sessions.delete(projectIdStr);
  }
}

/**
 * Helper: Deletar container para projeto (usado pelo CRON)
 */
async function deleteContainerForProject(projectId) {
  const projectIdStr = String(projectId);
  const session = sessions.get(projectIdStr);

  if (!session) {
    return;
  }

  try {
    log(`[CRON1] Removendo container ${session.containerName}`);

    const container = docker.getContainer(session.containerName);
    await container.stop().catch(() => {});
    await container.remove({ force: true });

    sessions.delete(projectIdStr);

    // Atualizar Supabase
    await updateProjectBrowserStatus(projectId, 'inactive', null, null, null);

    log(`[CRON1] Container removido: ${session.containerName}`);

  } catch (error) {
    log(`[CRON1] Erro ao remover container ${projectId}: ${error.message}`);
  }
}

// =============================================================================
// CRON 2: Task Processor (Fila)
// =============================================================================

/**
 * Processa tasks pendentes da tabela browser_tasks
 * - Busca 1 task pending por vez
 * - Inicia container se parado
 * - Envia task para execucao
 */
async function processPendingTasks() {
  if (!supabase || isProcessingTasks) {
    return;
  }

  isProcessingTasks = true;

  try {
    // 1. Buscar proxima task pendente
    const { data: tasks, error } = await supabase
      .from('browser_tasks')
      .select('id, project_id, task, task_type, priority')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      log(`[CRON2] Erro ao buscar tasks: ${error.message}`);
      isProcessingTasks = false;
      return;
    }

    if (!tasks || tasks.length === 0) {
      isProcessingTasks = false;
      return;
    }

    const task = tasks[0];
    const projectId = String(task.project_id);
    log(`[CRON2] Processando task ${task.id} do projeto ${projectId}`);

    // 2. Verificar se container existe
    let session = sessions.get(projectId);

    if (!session) {
      log(`[CRON2] Sem container para projeto ${projectId}, criando...`);
      await createContainerForProject(task.project_id);
      // Aguardar container ficar pronto
      await new Promise(resolve => setTimeout(resolve, 15000));
      session = sessions.get(projectId);
    }

    if (!session) {
      log(`[CRON2] Falha ao criar container para ${projectId}`);
      // Marcar task como failed
      await supabase
        .from('browser_tasks')
        .update({
          status: 'failed',
          error_message: 'Failed to create container',
          completed_at: new Date().toISOString()
        })
        .eq('id', task.id);
      isProcessingTasks = false;
      return;
    }

    // 3. Se container esta parado, iniciar
    if (session.status === 'stopped') {
      log(`[CRON2] Container ${projectId} parado, iniciando...`);
      try {
        const container = docker.getContainer(session.containerName);
        await container.start();
        session.status = 'running';
        session.lastActivity = new Date();
        // Aguardar startup
        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (startErr) {
        log(`[CRON2] Erro ao iniciar container: ${startErr.message}`);
        isProcessingTasks = false;
        return;
      }
    }

    // 4. Marcar task como running
    await supabase
      .from('browser_tasks')
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', task.id);

    // 5. Enviar task para container
    try {
      log(`[CRON2] Enviando task para ${session.containerName}`);

      await axios.post(
        `http://${session.containerName}:10100/agent/task`,
        {
          task: task.task,
          taskId: task.id  // Container usa isso para atualizar Supabase
        },
        { timeout: 300000 } // 5 min timeout
      );

      // Atualizar lastActivity
      session.lastActivity = new Date();
      log(`[CRON2] Task ${task.id} enviada com sucesso`);

    } catch (taskErr) {
      log(`[CRON2] Erro ao enviar task: ${taskErr.message}`);
      // Marcar como failed
      await supabase
        .from('browser_tasks')
        .update({
          status: 'failed',
          error_message: taskErr.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', task.id);
    }

  } catch (error) {
    log(`[CRON2] Erro geral: ${error.message}`);
  }

  isProcessingTasks = false;
}

// =============================================================================
// CRON 3: Auto-Stop (5 min idle)
// =============================================================================

/**
 * Para containers inativos ha mais de 5 minutos
 * Usa docker stop (nao remove) - preserva volumes
 */
async function autoStopInactiveContainers() {
  const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos
  const now = Date.now();

  for (const [projectId, session] of sessions.entries()) {
    if (session.status !== 'running') continue;

    const lastActivity = new Date(session.lastActivity).getTime();
    const idleTime = now - lastActivity;

    if (idleTime > IDLE_TIMEOUT_MS) {
      const idleMinutes = Math.round(idleTime / 1000 / 60);
      log(`[CRON3] Container ${projectId} inativo ha ${idleMinutes} min, parando...`);

      try {
        const container = docker.getContainer(session.containerName);
        await container.stop();
        session.status = 'stopped';

        // Atualizar Supabase
        if (supabase) {
          await supabase
            .from('Projeto')
            .update({ browser_session_status: 'stopped' })
            .eq('id', projectId);
        }

        log(`[CRON3] Container ${projectId} parado com sucesso`);
      } catch (err) {
        log(`[CRON3] Erro ao parar container ${projectId}: ${err.message}`);
      }
    }
  }
}

// =============================================================================
// SYNC E CLEANUP EXISTENTES
// =============================================================================

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
 * Cleanup de containers inativos (funcao legada - SESSION_TIMEOUT_MINUTES)
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

        // Limpar Supabase
        await updateProjectBrowserStatus(projectId, 'inactive', null, null, null);

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

// =============================================================================
// INICIALIZACAO
// =============================================================================

async function start() {
  log('============================================');
  log('  LIFTLIO BROWSER ORCHESTRATOR');
  log('============================================');
  log(`Port: ${PORT}`);
  log(`Max containers: ${MAX_CONTAINERS}`);
  log(`Session timeout: ${SESSION_TIMEOUT_MINUTES} minutes`);
  log(`Cleanup interval: ${CLEANUP_INTERVAL_MINUTES} minutes`);
  log(`Browser image: ${BROWSER_AGENT_IMAGE}`);
  log(`Supabase: ${supabase ? 'CONFIGURADO' : 'NAO CONFIGURADO'}`);
  log('============================================');

  // Restaurar sessoes existentes
  await restoreExistingSessions();

  // Crons existentes
  setInterval(syncWithDocker, 30 * 1000); // A cada 30 segundos
  setInterval(cleanupInactiveSessions, CLEANUP_INTERVAL_MINUTES * 60 * 1000);

  // NOVOS CRONS (apenas se Supabase configurado)
  if (supabase) {
    setInterval(syncContainersWithYoutubeActive, 60 * 1000);  // CRON 1: 1 min
    setInterval(processPendingTasks, 30 * 1000);              // CRON 2: 30s
    setInterval(autoStopInactiveContainers, 60 * 1000);       // CRON 3: 1 min

    log('[CRONS] Registrados:');
    log('  - syncContainersWithYoutubeActive: cada 1 min');
    log('  - processPendingTasks: cada 30s');
    log('  - autoStopInactiveContainers: cada 1 min');
  } else {
    log('[CRONS] Supabase nao configurado - crons inteligentes desabilitados');
  }

  app.listen(PORT, () => {
    log(`Orchestrator listening on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start orchestrator:', err);
  process.exit(1);
});
