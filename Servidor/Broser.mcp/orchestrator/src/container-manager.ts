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
  vncPort: number;
  status: 'creating' | 'running' | 'stopped' | 'error';
  mcpUrl: string;
  vncUrl: string;
  createdAt: Date;
  lastActivity: Date;
  // Neko (WebRTC real-time browser)
  nekoContainerId?: string;
  nekoContainerName?: string;
  nekoPort?: number;
  nekoUrl?: string;
  nekoStatus?: 'creating' | 'running' | 'stopped' | 'error';
}

export interface CreateContainerOptions {
  projectId: string;
  userId: string;
}

// Port allocation tracking
const BROWSER_AGENT_IMAGE = process.env.BROWSER_AGENT_IMAGE || 'liftlio/browser-agent:vnc';
const MCP_PORT_BASE = parseInt(process.env.MCP_BASE_PORT || '10100');
const VNC_PORT_BASE = parseInt(process.env.VNC_BASE_PORT || '16080');
const PROXY_PORT_BASE = parseInt(process.env.DATAIMPULSE_STICKY_BASE_PORT || '10000');
const MAX_CONTAINERS = parseInt(process.env.MAX_CONTAINERS || '6');
const CONTAINER_MEMORY = process.env.CONTAINER_MEMORY_LIMIT || '2g';
const CONTAINER_CPU = parseFloat(process.env.CONTAINER_CPU_LIMIT || '1');
const HOST_IP = process.env.HOST_IP || '173.249.22.2';

// Neko (WebRTC real-time browser) configuration
const NEKO_IMAGE = process.env.NEKO_IMAGE || 'ghcr.io/m1k1o/neko/firefox:latest';
const NEKO_PORT_BASE = parseInt(process.env.NEKO_PORT_BASE || '10200');
const NEKO_UDP_PORT_BASE = parseInt(process.env.NEKO_UDP_PORT_BASE || '52100'); // Each Neko needs ~10 UDP ports
const NEKO_MEMORY = process.env.NEKO_MEMORY_LIMIT || '2g';
const NEKO_CPU = parseFloat(process.env.NEKO_CPU_LIMIT || '1');
const NEKO_ADMIN_PASSWORD = process.env.NEKO_ADMIN_PASSWORD || 'liftlioadmin';
const NEKO_USER_PASSWORD = process.env.NEKO_USER_PASSWORD || 'liftlio';

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
  const vncPort = VNC_PORT_BASE + portIndex;
  const proxyPort = PROXY_PORT_BASE + portIndex;
  const containerName = `browser-agent-${projectId}`;

  console.log(`Creating container for project ${projectId} (MCP: ${mcpPort}, VNC: ${vncPort}, Proxy: ${proxyPort})`);

  // Create session record
  const session: ContainerSession = {
    containerId: '',
    containerName,
    projectId,
    userId,
    mcpPort,
    proxyPort,
    vncPort,
    status: 'creating',
    mcpUrl: `http://${HOST_IP}:${mcpPort}`,
    vncUrl: `http://${HOST_IP}:${vncPort}/vnc.html?autoconnect=true&password=liftlio`,
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

    // Create container with VNC support
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
        `DISPLAY=:99`,
        `VNC_PORT=5900`,
        `NOVNC_PORT=6080`,
        `VNC_PASSWORD=liftlio`,
        `SCREEN_WIDTH=1920`,
        `SCREEN_HEIGHT=1080`,
        `SCREEN_DEPTH=24`,
        `API_SECRET_KEY=${process.env.API_SECRET_KEY || ''}`,
        // Claude API for AI agent
        `CLAUDE_API_KEY=${process.env.CLAUDE_API_KEY || ''}`,
        // Supabase for behavior tracking
        `SUPABASE_URL=${process.env.SUPABASE_URL || ''}`,
        `SUPABASE_ANON_KEY=${process.env.SUPABASE_ANON_KEY || ''}`,
        // DataImpulse proxy
        `DATAIMPULSE_LOGIN=${process.env.DATAIMPULSE_LOGIN || ''}`,
        `DATAIMPULSE_PASSWORD=${process.env.DATAIMPULSE_PASSWORD || ''}`,
        `DATAIMPULSE_HOST=${process.env.DATAIMPULSE_HOST || 'gw.dataimpulse.com'}`,
        `DATAIMPULSE_STICKY_BASE_PORT=${proxyPort}`
      ],
      ExposedPorts: {
        '3000/tcp': {},
        '6080/tcp': {}
      },
      HostConfig: {
        PortBindings: {
          '3000/tcp': [{ HostPort: String(mcpPort) }],
          '6080/tcp': [{ HostPort: String(vncPort) }]
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
        'com.docker.compose.project': 'brosermcp',
        'com.docker.compose.service': `browser-agent-${projectId}`,
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
      const vncBinding = containerInfo.Ports.find(p => p.PrivatePort === 6080);
      const mcpPort = portBinding?.PublicPort || 0;
      const vncPort = vncBinding?.PublicPort || (VNC_PORT_BASE + (mcpPort - MCP_PORT_BASE));
      const proxyPort = PROXY_PORT_BASE + (mcpPort - MCP_PORT_BASE);

      const session: ContainerSession = {
        containerId: containerInfo.Id,
        containerName: containerInfo.Names[0]?.replace('/', '') || '',
        projectId,
        userId: userId || 'unknown',
        mcpPort,
        proxyPort,
        vncPort,
        status: containerInfo.State === 'running' ? 'running' : 'stopped',
        mcpUrl: `http://${HOST_IP}:${mcpPort}`,
        vncUrl: `http://${HOST_IP}:${vncPort}/vnc.html?autoconnect=true&password=liftlio`,
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
 * Create Neko container for real-time browser viewing
 */
export async function createNekoContainer(projectId: string): Promise<ContainerSession> {
  const session = sessions.get(projectId);
  if (!session) {
    throw new Error(`No session found for project ${projectId}. Create browser agent first.`);
  }

  // Check if Neko already exists
  if (session.nekoStatus === 'running' && session.nekoContainerId) {
    console.log(`Neko already running for project ${projectId}`);
    return session;
  }

  // Calculate Neko ports based on project's port index
  const portIndex = session.mcpPort - MCP_PORT_BASE;
  const nekoPort = NEKO_PORT_BASE + portIndex;
  const nekoUdpStart = NEKO_UDP_PORT_BASE + (portIndex * 10); // Each Neko gets 10 UDP ports
  const nekoUdpEnd = nekoUdpStart + 9;
  const nekoContainerName = `neko-${projectId}`;

  console.log(`Creating Neko container for project ${projectId} (TCP: ${nekoPort}, UDP: ${nekoUdpStart}-${nekoUdpEnd})`);

  session.nekoStatus = 'creating';

  try {
    // Remove existing Neko container with same name
    try {
      const existingContainer = docker.getContainer(nekoContainerName);
      await existingContainer.remove({ force: true });
      console.log(`Removed existing Neko container: ${nekoContainerName}`);
    } catch (e) {
      // Container doesn't exist, that's fine
    }

    // Create UDP port bindings
    const udpPortBindings: { [key: string]: Array<{ HostPort: string }> } = {};
    const exposedPorts: { [key: string]: {} } = { '8080/tcp': {} };

    for (let udpPort = nekoUdpStart; udpPort <= nekoUdpEnd; udpPort++) {
      const containerUdpPort = 52000 + (udpPort - nekoUdpStart);
      exposedPorts[`${containerUdpPort}/udp`] = {};
      udpPortBindings[`${containerUdpPort}/udp`] = [{ HostPort: String(udpPort) }];
    }

    // Create Neko container
    const container = await docker.createContainer({
      Image: NEKO_IMAGE,
      name: nekoContainerName,
      Env: [
        `NEKO_DESKTOP_SCREEN=1920x1080@30`,
        `NEKO_MEMBER_MULTIUSER_USER_PASSWORD=${NEKO_USER_PASSWORD}`,
        `NEKO_MEMBER_MULTIUSER_ADMIN_PASSWORD=${NEKO_ADMIN_PASSWORD}`,
        `NEKO_WEBRTC_EPR=52000-52009`,
        `NEKO_WEBRTC_ICELITE=1`,
        `NEKO_WEBRTC_NAT1TO1=${HOST_IP}`
      ],
      ExposedPorts: exposedPorts,
      HostConfig: {
        PortBindings: {
          '8080/tcp': [{ HostPort: String(nekoPort) }],
          ...udpPortBindings
        },
        ShmSize: 2 * 1024 * 1024 * 1024, // 2GB shared memory for browser
        Memory: parseMemoryLimit(NEKO_MEMORY),
        NanoCpus: NEKO_CPU * 1e9,
        RestartPolicy: {
          Name: 'unless-stopped'
        },
        NetworkMode: 'liftlio-browser-network'
      },
      Labels: {
        'com.docker.compose.project': 'brosermcp',
        'com.docker.compose.service': `neko-${projectId}`,
        'liftlio.project': projectId,
        'liftlio.type': 'neko'
      }
    });

    // Start container
    await container.start();

    // Update session with Neko info
    session.nekoContainerId = container.id;
    session.nekoContainerName = nekoContainerName;
    session.nekoPort = nekoPort;
    session.nekoUrl = `http://${HOST_IP}:${nekoPort}`;
    session.nekoStatus = 'running';

    console.log(`Neko container created and started: ${nekoContainerName} (ID: ${container.id})`);

    // Wait for Neko to be ready
    await waitForNekoHealthy(session);

    return session;
  } catch (error: any) {
    console.error(`Failed to create Neko container for project ${projectId}:`, error);
    session.nekoStatus = 'error';
    throw error;
  }
}

/**
 * Wait for Neko container to be healthy
 */
async function waitForNekoHealthy(session: ContainerSession, timeoutMs: number = 30000): Promise<void> {
  if (!session.nekoUrl) return;

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(session.nekoUrl);
      if (response.ok) {
        console.log(`Neko container ${session.nekoContainerName} is healthy`);
        return;
      }
    } catch (e) {
      // Not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.warn(`Neko container ${session.nekoContainerName} health check timeout`);
}

/**
 * Stop and remove Neko container
 */
export async function destroyNekoContainer(projectId: string): Promise<void> {
  const session = sessions.get(projectId);
  if (!session || !session.nekoContainerId) {
    console.log(`No Neko container found for project ${projectId}`);
    return;
  }

  console.log(`Destroying Neko container for project ${projectId}`);

  try {
    const container = docker.getContainer(session.nekoContainerId);
    await container.stop({ t: 5 });
    await container.remove();
    console.log(`Neko container ${session.nekoContainerName} destroyed`);
  } catch (error: any) {
    console.error(`Error destroying Neko container:`, error.message);
  }

  // Clear Neko info from session
  session.nekoContainerId = undefined;
  session.nekoContainerName = undefined;
  session.nekoPort = undefined;
  session.nekoUrl = undefined;
  session.nekoStatus = undefined;
}

/**
 * Get Neko status for a project
 */
export function getNekoStatus(projectId: string): {
  status: string;
  url?: string;
  port?: number;
} | null {
  const session = sessions.get(projectId);
  if (!session) return null;

  return {
    status: session.nekoStatus || 'not_created',
    url: session.nekoUrl,
    port: session.nekoPort
  };
}

/**
 * Get container stats
 */
export function getStats(): {
  totalContainers: number;
  runningContainers: number;
  maxContainers: number;
  availableSlots: number;
  nekoContainers: number;
} {
  const running = Array.from(sessions.values()).filter(s => s.status === 'running').length;
  const nekoRunning = Array.from(sessions.values()).filter(s => s.nekoStatus === 'running').length;

  return {
    totalContainers: sessions.size,
    runningContainers: running,
    maxContainers: MAX_CONTAINERS,
    availableSlots: MAX_CONTAINERS - running,
    nekoContainers: nekoRunning
  };
}
