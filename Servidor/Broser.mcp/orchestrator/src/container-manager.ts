/**
 * Container Manager
 * Creates and manages Docker containers for each project's Browser Agent
 */

import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';

// Docker client - connects to Docker daemon via socket
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export interface ContainerSession {
  containerId: string;
  containerName: string;
  projectId: string;
  userId: string;
  mcpPort: number;
  proxyPort: number;
  status: 'creating' | 'running' | 'stopped' | 'error';
  mcpUrl: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface CreateContainerOptions {
  projectId: string;
  userId: string;
}

// Port allocation tracking
const BROWSER_AGENT_IMAGE = process.env.BROWSER_AGENT_IMAGE || 'liftlio/browser-agent:latest';
const MCP_PORT_BASE = parseInt(process.env.MCP_BASE_PORT || '10100');
const PROXY_PORT_BASE = parseInt(process.env.DATAIMPULSE_STICKY_BASE_PORT || '10000');
const MAX_CONTAINERS = parseInt(process.env.MAX_CONTAINERS || '6');
const CONTAINER_MEMORY = process.env.CONTAINER_MEMORY_LIMIT || '2g';
const CONTAINER_CPU = parseFloat(process.env.CONTAINER_CPU_LIMIT || '1');
const HOST_IP = process.env.HOST_IP || '173.249.22.2';

// Active sessions
const sessions = new Map<string, ContainerSession>();
let nextPortIndex = 0;

/**
 * Get next available port index
 */
function getNextPortIndex(): number {
  // Find first available slot
  const usedIndices = new Set(
    Array.from(sessions.values()).map(s => s.mcpPort - MCP_PORT_BASE)
  );

  for (let i = 0; i < MAX_CONTAINERS; i++) {
    if (!usedIndices.has(i)) {
      return i;
    }
  }

  throw new Error(`Maximum containers (${MAX_CONTAINERS}) reached`);
}

/**
 * Create a new browser agent container for a project
 */
export async function createContainer(options: CreateContainerOptions): Promise<ContainerSession> {
  const { projectId, userId } = options;

  // Check if container already exists for this project
  const existing = sessions.get(projectId);
  if (existing && existing.status === 'running') {
    console.log(`Container already exists for project ${projectId}`);
    existing.lastActivity = new Date();
    return existing;
  }

  // Check max containers
  const runningCount = Array.from(sessions.values()).filter(s => s.status === 'running').length;
  if (runningCount >= MAX_CONTAINERS) {
    throw new Error(`Maximum containers (${MAX_CONTAINERS}) reached. Please wait or stop other sessions.`);
  }

  // Allocate ports
  const portIndex = getNextPortIndex();
  const mcpPort = MCP_PORT_BASE + portIndex;
  const proxyPort = PROXY_PORT_BASE + portIndex;
  const containerName = `browser-agent-${projectId}`;

  console.log(`Creating container for project ${projectId} (MCP: ${mcpPort}, Proxy: ${proxyPort})`);

  // Create session record
  const session: ContainerSession = {
    containerId: '',
    containerName,
    projectId,
    userId,
    mcpPort,
    proxyPort,
    status: 'creating',
    mcpUrl: `http://${HOST_IP}:${mcpPort}`,
    createdAt: new Date(),
    lastActivity: new Date()
  };

  sessions.set(projectId, session);

  try {
    // Remove existing container with same name (if stopped)
    try {
      const existingContainer = docker.getContainer(containerName);
      await existingContainer.remove({ force: true });
      console.log(`Removed existing container: ${containerName}`);
    } catch (e) {
      // Container doesn't exist, that's fine
    }

    // Create container
    const container = await docker.createContainer({
      Image: BROWSER_AGENT_IMAGE,
      name: containerName,
      Env: [
        `NODE_ENV=production`,
        `MCP_PORT=3000`,
        `PROJECT_ID=${projectId}`,
        `PROJECT_INDEX=${portIndex}`,
        `PROFILES_DIR=/data/profiles`,
        `HEADLESS=true`,
        `API_SECRET_KEY=${process.env.API_SECRET_KEY || ''}`,
        `DATAIMPULSE_LOGIN=${process.env.DATAIMPULSE_LOGIN || ''}`,
        `DATAIMPULSE_PASSWORD=${process.env.DATAIMPULSE_PASSWORD || ''}`,
        `DATAIMPULSE_HOST=${process.env.DATAIMPULSE_HOST || 'gw.dataimpulse.com'}`,
        `DATAIMPULSE_STICKY_BASE_PORT=${proxyPort}`
      ],
      ExposedPorts: {
        '3000/tcp': {}
      },
      HostConfig: {
        PortBindings: {
          '3000/tcp': [{ HostPort: String(mcpPort) }]
        },
        Binds: [
          `liftlio-browser-profiles:/data/profiles`,
          `liftlio-browser-screenshots:/data/screenshots`
        ],
        Memory: parseMemoryLimit(CONTAINER_MEMORY),
        NanoCpus: CONTAINER_CPU * 1e9,
        RestartPolicy: {
          Name: 'unless-stopped'
        },
        NetworkMode: 'liftlio-browser-network'
      },
      Labels: {
        'liftlio.project': projectId,
        'liftlio.user': userId,
        'liftlio.type': 'browser-agent'
      }
    });

    // Start container
    await container.start();

    // Update session
    session.containerId = container.id;
    session.status = 'running';

    console.log(`Container created and started: ${containerName} (ID: ${container.id})`);

    // Wait for health check
    await waitForHealthy(session);

    return session;
  } catch (error: any) {
    console.error(`Failed to create container for project ${projectId}:`, error);
    session.status = 'error';
    sessions.delete(projectId);
    throw error;
  }
}

/**
 * Parse memory limit string (e.g., "2g", "512m") to bytes
 */
function parseMemoryLimit(limit: string): number {
  const match = limit.match(/^(\d+)([gmk]?)$/i);
  if (!match) return 2 * 1024 * 1024 * 1024; // Default 2GB

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'g': return value * 1024 * 1024 * 1024;
    case 'm': return value * 1024 * 1024;
    case 'k': return value * 1024;
    default: return value;
  }
}

/**
 * Wait for container to be healthy
 */
async function waitForHealthy(session: ContainerSession, timeoutMs: number = 30000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${session.mcpUrl}/health`);
      if (response.ok) {
        console.log(`Container ${session.containerName} is healthy`);
        return;
      }
    } catch (e) {
      // Not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.warn(`Container ${session.containerName} health check timeout`);
}

/**
 * Stop and remove a container
 */
export async function destroyContainer(projectId: string): Promise<void> {
  const session = sessions.get(projectId);
  if (!session) {
    console.log(`No session found for project ${projectId}`);
    return;
  }

  console.log(`Destroying container for project ${projectId}`);

  try {
    const container = docker.getContainer(session.containerId);
    await container.stop({ t: 10 });
    await container.remove();
    console.log(`Container ${session.containerName} destroyed`);
  } catch (error: any) {
    console.error(`Error destroying container:`, error.message);
  }

  sessions.delete(projectId);
}

/**
 * Get session for a project
 */
export function getSession(projectId: string): ContainerSession | undefined {
  const session = sessions.get(projectId);
  if (session) {
    session.lastActivity = new Date();
  }
  return session;
}

/**
 * Get all active sessions
 */
export function getAllSessions(): ContainerSession[] {
  return Array.from(sessions.values());
}

/**
 * Cleanup inactive sessions
 */
export async function cleanupInactiveSessions(maxInactiveMinutes: number = 30): Promise<void> {
  const now = new Date();

  for (const [projectId, session] of sessions) {
    const inactiveMs = now.getTime() - session.lastActivity.getTime();
    const inactiveMinutes = inactiveMs / (1000 * 60);

    if (inactiveMinutes > maxInactiveMinutes) {
      console.log(`Cleaning up inactive session for project ${projectId} (inactive ${inactiveMinutes.toFixed(1)} minutes)`);
      await destroyContainer(projectId);
    }
  }
}

/**
 * Sync sessions with running containers on startup
 */
export async function syncWithDocker(): Promise<void> {
  console.log('Syncing with Docker...');

  try {
    const containers = await docker.listContainers({
      all: true,
      filters: { label: ['liftlio.type=browser-agent'] }
    });

    for (const containerInfo of containers) {
      const projectId = containerInfo.Labels['liftlio.project'];
      const userId = containerInfo.Labels['liftlio.user'];

      if (!projectId) continue;

      // Extract port from bindings
      const portBinding = containerInfo.Ports.find(p => p.PrivatePort === 3000);
      const mcpPort = portBinding?.PublicPort || 0;
      const proxyPort = PROXY_PORT_BASE + (mcpPort - MCP_PORT_BASE);

      const session: ContainerSession = {
        containerId: containerInfo.Id,
        containerName: containerInfo.Names[0]?.replace('/', '') || '',
        projectId,
        userId: userId || 'unknown',
        mcpPort,
        proxyPort,
        status: containerInfo.State === 'running' ? 'running' : 'stopped',
        mcpUrl: `http://${HOST_IP}:${mcpPort}`,
        createdAt: new Date(containerInfo.Created * 1000),
        lastActivity: new Date()
      };

      sessions.set(projectId, session);
      console.log(`Synced container: ${session.containerName} (Project: ${projectId})`);
    }

    console.log(`Synced ${sessions.size} containers from Docker`);
  } catch (error) {
    console.error('Failed to sync with Docker:', error);
  }
}

/**
 * Get container stats
 */
export function getStats(): {
  totalContainers: number;
  runningContainers: number;
  maxContainers: number;
  availableSlots: number;
} {
  const running = Array.from(sessions.values()).filter(s => s.status === 'running').length;

  return {
    totalContainers: sessions.size,
    runningContainers: running,
    maxContainers: MAX_CONTAINERS,
    availableSlots: MAX_CONTAINERS - running
  };
}
