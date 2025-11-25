/**
 * Browser Orchestrator Service
 * Creates and manages Browser Agent containers per project
 *
 * Each project gets:
 * - Its own Docker container
 * - Its own Playwright browser with persistent profile
 * - Its own residential IP (DataImpulse sticky port)
 * - Its own MCP endpoint
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import dotenv from 'dotenv';
import {
  createContainer,
  destroyContainer,
  getSession,
  getAllSessions,
  cleanupInactiveSessions,
  syncWithDocker,
  getStats
} from './container-manager';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '8080');
const API_SECRET_KEY = process.env.API_SECRET_KEY;
const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '5');
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30');

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${Date.now() - start}ms`);
  });
  next();
});

// Authentication middleware
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Skip auth for health check
  if (req.path === '/health') {
    return next();
  }

  // Check API key
  const providedKey = req.headers['x-api-key'] as string;

  if (!API_SECRET_KEY) {
    console.warn('WARNING: API_SECRET_KEY not set - auth disabled');
    return next();
  }

  if (!providedKey || providedKey !== API_SECRET_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
  }

  next();
}

app.use(authenticate);

/**
 * Health check
 */
app.get('/health', (req, res) => {
  const stats = getStats();

  res.json({
    status: 'healthy',
    service: 'browser-orchestrator',
    timestamp: new Date().toISOString(),
    stats
  });
});

/**
 * Get orchestrator stats
 */
app.get('/stats', (req, res) => {
  const stats = getStats();
  const sessions = getAllSessions();

  res.json({
    stats,
    sessions: sessions.map(s => ({
      projectId: s.projectId,
      userId: s.userId,
      status: s.status,
      mcpUrl: s.mcpUrl,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity
    }))
  });
});

/**
 * Create a new browser agent container for a project
 */
app.post('/containers', async (req, res) => {
  try {
    const { projectId, userId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'projectId is required'
      });
    }

    console.log(`Creating container for project: ${projectId}, user: ${userId || 'anonymous'}`);

    const session = await createContainer({
      projectId,
      userId: userId || 'anonymous'
    });

    res.status(201).json({
      success: true,
      container: {
        projectId: session.projectId,
        containerId: session.containerId,
        containerName: session.containerName,
        status: session.status,
        mcpUrl: session.mcpUrl,
        mcpPort: session.mcpPort,
        proxyPort: session.proxyPort
      }
    });
  } catch (error: any) {
    console.error('Failed to create container:', error);

    const statusCode = error.message.includes('Maximum containers') ? 503 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get container status for a project
 */
app.get('/containers/:projectId', (req, res) => {
  const { projectId } = req.params;

  const session = getSession(projectId);

  if (!session) {
    return res.status(404).json({
      error: 'Not Found',
      message: `No container found for project ${projectId}`
    });
  }

  res.json({
    projectId: session.projectId,
    containerId: session.containerId,
    containerName: session.containerName,
    status: session.status,
    mcpUrl: session.mcpUrl,
    mcpPort: session.mcpPort,
    proxyPort: session.proxyPort,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity
  });
});

/**
 * Destroy container for a project
 */
app.delete('/containers/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    console.log(`Destroying container for project: ${projectId}`);

    await destroyContainer(projectId);

    res.json({
      success: true,
      message: `Container for project ${projectId} destroyed`
    });
  } catch (error: any) {
    console.error('Failed to destroy container:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Proxy MCP request to the project's container
 */
app.all('/containers/:projectId/mcp/*', async (req, res) => {
  const { projectId } = req.params;

  const session = getSession(projectId);

  if (!session) {
    return res.status(404).json({
      error: 'Not Found',
      message: `No container found for project ${projectId}`
    });
  }

  if (session.status !== 'running') {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: `Container for project ${projectId} is not running`
    });
  }

  // Get the MCP path (everything after /mcp/)
  const mcpPath = req.path.replace(`/containers/${projectId}/mcp`, '');
  const targetUrl = `${session.mcpUrl}/mcp${mcpPath}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_SECRET_KEY || ''
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error: any) {
    console.error(`MCP proxy error for project ${projectId}:`, error);

    res.status(502).json({
      error: 'Bad Gateway',
      message: `Failed to proxy request to container: ${error.message}`
    });
  }
});

/**
 * Keep session alive (heartbeat)
 */
app.post('/containers/:projectId/heartbeat', (req, res) => {
  const { projectId } = req.params;

  const session = getSession(projectId);

  if (!session) {
    return res.status(404).json({
      error: 'Not Found',
      message: `No container found for project ${projectId}`
    });
  }

  // getSession already updates lastActivity
  res.json({
    success: true,
    lastActivity: session.lastActivity
  });
});

/**
 * List all containers
 */
app.get('/containers', (req, res) => {
  const sessions = getAllSessions();

  res.json({
    count: sessions.length,
    containers: sessions.map(s => ({
      projectId: s.projectId,
      userId: s.userId,
      containerName: s.containerName,
      status: s.status,
      mcpUrl: s.mcpUrl,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity
    }))
  });
});

/**
 * Manual cleanup trigger
 */
app.post('/cleanup', async (req, res) => {
  try {
    const { maxInactiveMinutes } = req.body;

    console.log('Manual cleanup triggered');

    await cleanupInactiveSessions(maxInactiveMinutes || SESSION_TIMEOUT);

    res.json({
      success: true,
      message: 'Cleanup completed',
      stats: getStats()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Startup
async function startup() {
  // Sync with existing containers
  await syncWithDocker();

  // Schedule cleanup job
  cron.schedule(`*/${CLEANUP_INTERVAL} * * * *`, async () => {
    console.log('Running scheduled cleanup...');
    await cleanupInactiveSessions(SESSION_TIMEOUT);
  });

  // Start server
  app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('Browser Orchestrator Service');
    console.log('='.repeat(60));
    console.log(`Port: ${PORT}`);
    console.log(`Max containers: ${process.env.MAX_CONTAINERS || 6}`);
    console.log(`Session timeout: ${SESSION_TIMEOUT} minutes`);
    console.log(`Cleanup interval: ${CLEANUP_INTERVAL} minutes`);
    console.log(`Auth: ${API_SECRET_KEY ? 'Enabled' : 'DISABLED (no API_SECRET_KEY)'}`);
    console.log('='.repeat(60));
    console.log(`API Endpoints:`);
    console.log(`  GET  /health                    - Health check`);
    console.log(`  GET  /stats                     - Orchestrator stats`);
    console.log(`  GET  /containers                - List all containers`);
    console.log(`  POST /containers                - Create container`);
    console.log(`  GET  /containers/:projectId     - Get container status`);
    console.log(`  DELETE /containers/:projectId   - Destroy container`);
    console.log(`  ALL  /containers/:projectId/mcp/* - Proxy to MCP`);
    console.log(`  POST /containers/:projectId/heartbeat - Keep alive`);
    console.log('='.repeat(60));
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  process.exit(0);
});

// Start
startup().catch(error => {
  console.error('Failed to start:', error);
  process.exit(1);
});
