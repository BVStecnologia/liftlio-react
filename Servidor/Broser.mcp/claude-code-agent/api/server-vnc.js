/**
 * =============================================================================
 * LIFTLIO BROWSER AGENT v4 - API Server with VNC + Session Persistence
 * =============================================================================
 * Claude Code Max + Playwright MCP (CDP) + VNC Control + Supabase Sessions
 * =============================================================================
 */

const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 10100;
const PROJECT_ID = process.env.PROJECT_ID || 'default';
const CDP_PORT = 9222;
const CHROME_USER_DATA_DIR = '/home/claude/.chrome-persistent';
const STORAGE_STATE_FILE = '/tmp/playwright-storage-state.json';

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// State
let currentTask = null;
let taskHistory = [];
let sessionRestored = false;

// VNC State
let vncInactivityTimer = null;
let vncLastActivity = null;
const VNC_TIMEOUT_MS = parseInt(process.env.VNC_TIMEOUT_MINUTES || '5') * 60 * 1000;

// =============================================================================
// SESSION PERSISTENCE FUNCTIONS
// =============================================================================

/**
 * Verifica se tem sessão Google válida nos cookies
 * Cookies necessários: SID, HSID, __Secure-1PSID
 */
function hasValidGoogleSession(cookies) {
  const requiredCookies = ['SID', 'HSID', '__Secure-1PSID'];
  const googleCookies = (cookies || []).filter(c =>
    c.domain?.includes('google.com') || c.domain?.includes('.google.com')
  );

  const hasAll = requiredCookies.every(name =>
    googleCookies.some(c => c.name === name && c.value && c.value.length > 10)
  );

  if (hasAll) {
    console.log('[SESSION] Valid Google session detected (SID, HSID, __Secure-1PSID present)');
  }

  return hasAll;
}

/**
 * Garante que sessão está restaurada antes de executar task
 */
async function ensureSessionBeforeTask() {
  try {
    const session = await getCurrentSession();

    if (!session || !hasValidGoogleSession(session.cookies || [])) {
      console.log('[SESSION] No valid Google session, attempting restore...');

      const savedSession = await fetchSessionFromSupabase(PROJECT_ID);
      if (savedSession?.cookies && hasValidGoogleSession(savedSession.cookies)) {
        await restoreSessionToChrome(savedSession);
        console.log('[SESSION] Restored from Supabase');
        sessionRestored = true;
        return { restored: true, source: 'supabase' };
      } else {
        console.log('[SESSION] No saved session or invalid - login required');
        return { restored: false, loginRequired: true };
      }
    }

    console.log('[SESSION] Valid Google session already exists');
    return { restored: false, alreadyValid: true };
  } catch (error) {
    console.error('[SESSION] Error ensuring session:', error.message);
    return { restored: false, error: error.message };
  }
}

/**
 * Inicia watchdog que salva sessão automaticamente a cada 60s
 */
let sessionWatchdog = null;

function startSessionWatchdog() {
  if (sessionWatchdog) {
    console.log('[WATCHDOG] Already running, skipping');
    return;
  }

  console.log('[WATCHDOG] Starting session auto-save (60s interval)');

  sessionWatchdog = setInterval(async () => {
    try {
      const session = await getCurrentSession();
      if (session?.cookies?.length > 5 && hasValidGoogleSession(session.cookies)) {
        const saved = await saveSessionToSupabase(PROJECT_ID, session);
        if (saved) {
          console.log(`[WATCHDOG] Auto-saved ${session.cookies.length} cookies`);
        }
      }
    } catch (error) {
      console.error('[WATCHDOG] Auto-save failed:', error.message);
    }
  }, 60000); // 60 segundos
}

/**
 * Fetch session data from Supabase
 */
async function fetchSessionFromSupabase(projectId) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('[SESSION] Supabase not configured, skipping restore');
    return null;
  }

  try {
    const axios = require('axios');
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/Projeto?id=eq.${projectId}&select=browser_session_data`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (response.data && response.data[0] && response.data[0].browser_session_data) {
      console.log('[SESSION] Found session data in Supabase');
      return response.data[0].browser_session_data;
    }
  } catch (error) {
    console.error('[SESSION] Error fetching from Supabase:', error.message);
  }
  return null;
}

/**
 * Save session data to Supabase using RPC function
 */
async function saveSessionToSupabase(projectId, sessionData) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('[SESSION] Supabase not configured, skipping save');
    return false;
  }

  try {
    const axios = require('axios');
    const response = await axios.post(
      `${SUPABASE_URL}/rest/v1/rpc/update_browser_session`,
      {
        p_project_id: parseInt(projectId),
        p_session_data: sessionData
      },
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('[SESSION] Saved to Supabase successfully via RPC');
    return response.data === true;
  } catch (error) {
    console.error('[SESSION] Error saving to Supabase:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Update browser_tasks in Supabase after task execution
 * Called when CRON sends taskId with the request
 */
async function updateTaskInSupabase(taskId, result) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !taskId) {
    console.log('[TASK] Supabase not configured or taskId not provided, skipping update');
    return false;
  }

  try {
    const axios = require('axios');
    await axios.patch(
      `${SUPABASE_URL}/rest/v1/browser_tasks?id=eq.${taskId}`,
      {
        status: result.success ? 'completed' : 'failed',
        response: {
          result: result.result,
          success: result.success,
          duration: result.duration
        },
        completed_at: new Date().toISOString(),
        error_message: result.success ? null : (result.error || result.result)
      },
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      }
    );
    console.log(`[TASK] Updated browser_tasks ${taskId}: ${result.success ? 'completed' : 'failed'}`);
    return true;
  } catch (err) {
    console.error(`[TASK] Error updating browser_tasks: ${err.message}`);
    return false;
  }
}

/**
 * Get current session from Chrome via CDP
 */
async function getCurrentSession() {
  try {
    const axios = require('axios');

    // Get CDP targets
    const targetsResponse = await axios.get(`http://localhost:${CDP_PORT}/json/list`);
    const targets = targetsResponse.data;

    if (!targets || targets.length === 0) {
      console.log('[SESSION] No Chrome targets found');
      return null;
    }

    // Find active page
    const page = targets.find(t => t.type === 'page') || targets[0];
    const wsUrl = page.webSocketDebuggerUrl;

    if (!wsUrl) {
      console.log('[SESSION] No WebSocket URL available');
      return null;
    }

    // Use CDP to get cookies
    const WebSocket = require('ws');
    const ws = new WebSocket(wsUrl);

    return new Promise((resolve) => {
      let messageId = 1;
      const cookies = [];
      const localStorage = {};
      let currentUrl = page.url;

      ws.on('open', () => {
        // Get all cookies
        ws.send(JSON.stringify({
          id: messageId++,
          method: 'Network.getAllCookies'
        }));
      });

      ws.on('message', (data) => {
        const response = JSON.parse(data);

        if (response.result && response.result.cookies) {
          // Got cookies
          const sessionData = {
            cookies: response.result.cookies,
            localStorage: {},
            lastUrl: currentUrl,
            savedAt: new Date().toISOString()
          };
          ws.close();
          resolve(sessionData);
        }
      });

      ws.on('error', (err) => {
        console.error('[SESSION] WebSocket error:', err.message);
        ws.close();
        resolve(null);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        ws.close();
        resolve(null);
      }, 5000);
    });
  } catch (error) {
    console.error('[SESSION] Error getting current session:', error.message);
    return null;
  }
}

/**
 * Export current session to Playwright storage-state format
 * This file is passed to Playwright MCP via --storage-state to share cookies
 */
async function exportStorageStateFile() {
  try {
    const sessionData = await getCurrentSession();
    if (!sessionData || !sessionData.cookies || sessionData.cookies.length === 0) {
      console.log('[STORAGE-STATE] No cookies to export');
      return false;
    }

    // Convert CDP cookies to Playwright storage-state format
    const playwrightCookies = sessionData.cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      expires: cookie.expires || -1,
      httpOnly: cookie.httpOnly || false,
      secure: cookie.secure || false,
      sameSite: cookie.sameSite || 'Lax'
    }));

    const storageState = {
      cookies: playwrightCookies,
      origins: []
    };

    // Write to file
    await fsPromises.writeFile(STORAGE_STATE_FILE, JSON.stringify(storageState, null, 2));
    console.log(`[STORAGE-STATE] Exported ${playwrightCookies.length} cookies to ${STORAGE_STATE_FILE}`);
    return true;
  } catch (error) {
    console.error('[STORAGE-STATE] Error exporting:', error.message);
    return false;
  }
}

/**
 * Restore session to Chrome via CDP
 */
async function restoreSessionToChrome(sessionData) {
  if (!sessionData || !sessionData.cookies) {
    console.log('[SESSION] No valid session data to restore');
    return false;
  }

  try {
    const axios = require('axios');
    const WebSocket = require('ws');

    // Get CDP targets
    const targetsResponse = await axios.get(`http://localhost:${CDP_PORT}/json/list`);
    const targets = targetsResponse.data;

    if (!targets || targets.length === 0) {
      console.log('[SESSION] No Chrome targets found for restore');
      return false;
    }

    const page = targets.find(t => t.type === 'page') || targets[0];
    const wsUrl = page.webSocketDebuggerUrl;

    if (!wsUrl) {
      return false;
    }

    const ws = new WebSocket(wsUrl);

    return new Promise((resolve) => {
      let messageId = 1;

      ws.on('open', () => {
        console.log(`[SESSION] Restoring ${sessionData.cookies.length} cookies...`);

        // Clear existing cookies first
        ws.send(JSON.stringify({
          id: messageId++,
          method: 'Network.clearBrowserCookies'
        }));

        // Set each cookie
        sessionData.cookies.forEach((cookie) => {
          ws.send(JSON.stringify({
            id: messageId++,
            method: 'Network.setCookie',
            params: {
              name: cookie.name,
              value: cookie.value,
              domain: cookie.domain,
              path: cookie.path || '/',
              secure: cookie.secure || false,
              httpOnly: cookie.httpOnly || false,
              sameSite: cookie.sameSite || 'Lax',
              expires: cookie.expires || undefined
            }
          }));
        });

        // Navigate to last URL if available
        if (sessionData.lastUrl && sessionData.lastUrl !== 'about:blank') {
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: messageId++,
              method: 'Page.navigate',
              params: { url: sessionData.lastUrl }
            }));
            console.log(`[SESSION] Navigating to last URL: ${sessionData.lastUrl}`);
          }, 1000);
        }

        setTimeout(() => {
          ws.close();
          console.log('[SESSION] Session restored successfully');
          resolve(true);
        }, 3000);
      });

      ws.on('error', (err) => {
        console.error('[SESSION] WebSocket error during restore:', err.message);
        ws.close();
        resolve(false);
      });

      // Timeout
      setTimeout(() => {
        ws.close();
        resolve(false);
      }, 10000);
    });
  } catch (error) {
    console.error('[SESSION] Error restoring session:', error.message);
    return false;
  }
}

/**
 * Wait for Chrome CDP to be ready
 */
async function waitForChromeCDP(maxWaitMs = 30000) {
  const axios = require('axios');
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await axios.get(`http://localhost:${CDP_PORT}/json/version`, { timeout: 1000 });
      if (response.status === 200) {
        console.log('[CDP] Chrome is ready');
        return true;
      }
    } catch (e) {
      // Not ready yet
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.error('[CDP] Timeout waiting for Chrome');
  return false;
}

/**
 * Execute task using Claude Code CLI
 */
async function executeTask(task, options = {}) {
  // Export storage state BEFORE task execution to share cookies with Playwright MCP
  const storageExported = await exportStorageStateFile();
  console.log(`[TASK] Storage state exported: ${storageExported}`);

  // Get CDP WebSocket URL dynamically BEFORE Promise to avoid await issues
  let cdpEndpoint = null;
  try {
    const axios = require('axios');
    const versionResponse = await axios.get(`http://localhost:${CDP_PORT}/json/version`, { timeout: 2000 });
    cdpEndpoint = versionResponse.data.webSocketDebuggerUrl;
    console.log(`[PLAYWRIGHT] CDP endpoint: ${cdpEndpoint}`);
  } catch (e) {
    console.log(`[PLAYWRIGHT] CDP not available: ${e.message}, will launch new browser`);
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[TASK] ${new Date().toISOString()}`);
    console.log(`Project: ${PROJECT_ID}`);
    console.log(`Task: ${task.substring(0, 100)}${task.length > 100 ? '...' : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    // Add CAPTCHA solver instruction if CapMonster is configured
    let enhancedTask = task;
    if (CAPMONSTER_API_KEY) {
      const captchaInstruction = `
IMPORTANT - CAPTCHA HANDLING:
If you encounter a CAPTCHA (Google "Select all images with...", reCAPTCHA challenge, /sorry page, or any verification prompt), do NOT try to solve it visually. Instead:
1. Call POST http://localhost:10100/captcha/solve
2. Wait for the response
3. If success, continue with your task
4. If failed, report the error

This uses CapMonster to solve CAPTCHAs automatically and is much cheaper than visual solving.

Now proceed with the task:
`;
      enhancedTask = captchaInstruction + task;
    }

    // Add auto-consent instruction for cookies/popups (ALWAYS)
    const autoConsentInstruction = `
IMPORTANT - AUTO-CONSENT FOR POPUPS:
Before executing any task, check for and dismiss any blocking popups:
1. Cookie consent banners - Click "Accept", "Accept All", "Aceitar", "Aceito", "I agree", "OK", "Got it"
2. GDPR/Privacy popups - Click the accept/agree button
3. Newsletter popups - Click "X", "Close", "Fechar", or dismiss button
4. Age verification - Click "Yes, I am over 18" or similar if appropriate
5. Notification permission dialogs - Click "Block" or dismiss

Do this SILENTLY without mentioning it in your response. Just dismiss and continue with the main task.
If a popup blocks interaction, dismiss it first then proceed.

`;
    enhancedTask = autoConsentInstruction + enhancedTask;

    // Escape task for shell
    const escapedTask = enhancedTask.replace(/'/g, "'\\''");

    // Build command with MCP config for Playwright
    // Using CDP to connect to the EXISTING persistent Chrome instead of launching new browser
    // cdpEndpoint was fetched before Promise to use await properly

    // Build MCP args - Use CDP endpoint to connect to existing Chrome
    // Per Playwright MCP PR #984, --storage-state works with --cdp-endpoint
    const mcpArgs = [
      "@playwright/mcp@latest"
    ];

    // If CDP available, connect to existing Chrome (has cookies already)
    if (cdpEndpoint) {
      mcpArgs.push("--cdp-endpoint", cdpEndpoint);
      console.log(`[PLAYWRIGHT] Using CDP connection to existing Chrome`);
    } else {
      // Fallback: launch new browser with Chrome for Docker
      mcpArgs.push("--browser", "chrome");
      console.log(`[PLAYWRIGHT] Launching new Chrome browser`);
    }

    // Always add storage-state to load cookies into any new contexts
    if (storageExported && fs.existsSync(STORAGE_STATE_FILE)) {
      mcpArgs.push("--storage-state", STORAGE_STATE_FILE);
      console.log(`[PLAYWRIGHT] Added --storage-state: ${STORAGE_STATE_FILE}`);
    }

    const mcpConfig = JSON.stringify({
      mcpServers: {
        playwright: {
          command: "npx",
          args: mcpArgs,
          env: {
            DISPLAY: ":99"
          }
        }
      }
    });

    let cmd = `claude --dangerously-skip-permissions --print --output-format json --mcp-config '${mcpConfig}' -p '${escapedTask}'`;

    if (options.maxIterations) {
      cmd += ` --max-turns ${options.maxIterations}`;
    }

    console.log(`[CMD] ${cmd.substring(0, 150)}...`);

    const claude = spawn(cmd, [], {
      env: {
        ...process.env,
        HOME: process.env.HOME || '/home/claude',
        DISPLAY: ':99',
        FORCE_COLOR: '0',
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
        PLAYWRIGHT_BROWSERS_PATH: '/ms-playwright'
      },
      cwd: '/workspace',
      shell: '/bin/bash',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Task timeout - kill process after 10 minutes to prevent stuck tasks
    const TASK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
    const taskTimeout = setTimeout(() => {
      console.log('[TASK TIMEOUT] Killing Claude process after 10 minutes');
      claude.kill('SIGTERM');
      setTimeout(() => {
        if (!claude.killed) {
          console.log('[TASK TIMEOUT] Force killing with SIGKILL');
          claude.kill('SIGKILL');
        }
      }, 5000);
    }, TASK_TIMEOUT_MS);

    let stdout = '';
    let stderr = '';

    claude.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    claude.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    claude.on('close', (code) => {
      // Clear the task timeout since task completed
      clearTimeout(taskTimeout);

      const duration = Date.now() - startTime;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`[COMPLETED] Exit code: ${code}, Duration: ${duration}ms`);
      console.log(`${'='.repeat(60)}\n`);

      let result = null;
      try {
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // Not JSON
      }

      const taskResult = {
        success: code === 0,
        exitCode: code,
        duration,
        output: result || stdout,
        stderr: stderr || null,
        timestamp: new Date().toISOString()
      };

      taskHistory.push({
        task: task.substring(0, 200),
        result: taskResult,
        projectId: PROJECT_ID,
        timestamp: new Date().toISOString()
      });

      if (taskHistory.length > 50) {
        taskHistory = taskHistory.slice(-50);
      }

      if (code === 0) {
        resolve(taskResult);
      } else {
        reject(new Error(`Task failed with exit code ${code}: ${stderr || stdout}`));
      }
    });

    claude.on('error', (err) => {
      clearTimeout(taskTimeout);
      reject(err);
    });
  });
}

// =============================================================================
// VNC CONTROL ENDPOINTS
// =============================================================================

/**
 * Reset VNC inactivity timer
 */
function resetVncTimer() {
  vncLastActivity = new Date();

  if (vncInactivityTimer) {
    clearTimeout(vncInactivityTimer);
  }

  vncInactivityTimer = setTimeout(async () => {
    console.log(`[VNC] Timeout (${VNC_TIMEOUT_MS / 60000} min) - auto-stopping`);
    await stopVnc();
    vncInactivityTimer = null;
    vncLastActivity = null;
  }, VNC_TIMEOUT_MS);

  console.log(`[VNC] Timer reset - auto-stop in ${VNC_TIMEOUT_MS / 60000} min`);
}

/**
 * Stop VNC services - Also saves session on auto-timeout
 */
async function stopVnc(saveSession = true) {
  try {
    // Save session to Supabase if configured (for auto-timeout)
    if (saveSession && PROJECT_ID !== 'default') {
      console.log('[VNC] Auto-saving session before stop...');
      const sessionData = await getCurrentSession();
      if (sessionData) {
        await saveSessionToSupabase(PROJECT_ID, sessionData);
      }
    }

    await execAsync('supervisorctl stop novnc').catch(() => {});
    await execAsync('supervisorctl stop x11vnc').catch(() => {});
    console.log('[VNC] Services stopped');
  } catch (error) {
    console.error('[VNC] Error stopping:', error.message);
  }
}

/**
 * VNC Status
 */
app.get('/vnc/status', async (req, res) => {
  try {
    const { stdout } = await execAsync('supervisorctl status x11vnc novnc 2>/dev/null || echo "not available"');

    const x11vncRunning = stdout.includes('x11vnc') && stdout.includes('RUNNING');
    const novncRunning = stdout.includes('novnc') && stdout.includes('RUNNING');

    res.json({
      success: true,
      vnc: {
        enabled: x11vncRunning && novncRunning,
        x11vnc: x11vncRunning ? 'running' : 'stopped',
        novnc: novncRunning ? 'running' : 'stopped',
        port: process.env.NOVNC_PORT || '6080',
        autoTimeout: {
          active: vncInactivityTimer !== null,
          timeoutMinutes: VNC_TIMEOUT_MS / 60000,
          lastActivity: vncLastActivity?.toISOString() || null
        }
      }
    });
  } catch (error) {
    res.json({
      success: true,
      vnc: { enabled: false, error: error.message }
    });
  }
});

/**
 * VNC Start - Also restores session from Supabase if available
 */
app.post('/vnc/start', async (req, res) => {
  try {
    console.log('[VNC] Starting services...');

    await execAsync('supervisorctl start x11vnc');
    await new Promise(r => setTimeout(r, 1000));
    await execAsync('supervisorctl start novnc');
    await new Promise(r => setTimeout(r, 1000));

    const { stdout } = await execAsync('supervisorctl status x11vnc novnc');
    const x11vncRunning = stdout.includes('x11vnc') && stdout.includes('RUNNING');
    const novncRunning = stdout.includes('novnc') && stdout.includes('RUNNING');

    if (x11vncRunning && novncRunning) {
      console.log('[VNC] Services started successfully');
      resetVncTimer();

      // Restore session from Supabase if not already restored
      let sessionInfo = { restored: false };
      if (!sessionRestored && PROJECT_ID !== 'default') {
        console.log('[VNC] Attempting to restore session from Supabase...');

        // Wait for Chrome CDP
        const cdpReady = await waitForChromeCDP(15000);
        if (cdpReady) {
          const sessionData = await fetchSessionFromSupabase(PROJECT_ID);
          if (sessionData) {
            const restored = await restoreSessionToChrome(sessionData);
            if (restored) {
              sessionRestored = true;
              sessionInfo = {
                restored: true,
                cookieCount: sessionData.cookies?.length || 0,
                lastUrl: sessionData.lastUrl
              };
              console.log(`[VNC] Session restored: ${sessionInfo.cookieCount} cookies, URL: ${sessionInfo.lastUrl}`);
            }
          }
        }
      }

      res.json({
        success: true,
        message: 'VNC started',
        vnc: {
          enabled: true,
          port: process.env.NOVNC_PORT || '6080',
          autoTimeoutMinutes: VNC_TIMEOUT_MS / 60000
        },
        session: sessionInfo
      });
    } else {
      throw new Error('VNC services failed to start');
    }
  } catch (error) {
    console.error('[VNC] Failed to start:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * VNC Stop - Also saves session to Supabase
 */
app.post('/vnc/stop', async (req, res) => {
  try {
    console.log('[VNC] Stopping services (manual)...');

    if (vncInactivityTimer) {
      clearTimeout(vncInactivityTimer);
      vncInactivityTimer = null;
    }
    vncLastActivity = null;

    // Save session to Supabase before stopping
    let sessionInfo = { saved: false };
    if (PROJECT_ID !== 'default') {
      console.log('[VNC] Saving session to Supabase before stop...');
      const sessionData = await getCurrentSession();
      if (sessionData) {
        const saved = await saveSessionToSupabase(PROJECT_ID, sessionData);
        if (saved) {
          sessionInfo = {
            saved: true,
            cookieCount: sessionData.cookies?.length || 0,
            lastUrl: sessionData.lastUrl
          };
          console.log(`[VNC] Session saved: ${sessionInfo.cookieCount} cookies, URL: ${sessionInfo.lastUrl}`);
        }
      }
    }

    await stopVnc(false); // Pass false since we already saved above

    res.json({
      success: true,
      message: 'VNC stopped',
      vnc: { enabled: false },
      session: sessionInfo
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * VNC Heartbeat
 */
app.post('/vnc/heartbeat', (req, res) => {
  if (vncInactivityTimer) {
    resetVncTimer();
    res.json({
      success: true,
      vnc: {
        lastActivity: vncLastActivity?.toISOString(),
        timeoutMinutes: VNC_TIMEOUT_MS / 60000
      }
    });
  } else {
    res.json({ success: false, message: 'VNC not running' });
  }
});

/**
 * VNC Warm-up - Navigate to Google on start
 * Call this after VNC starts to have browser ready on Google
 */
let warmupInProgress = false;

app.post('/vnc/warmup', async (req, res) => {
  if (warmupInProgress) {
    return res.json({ success: false, message: 'Warmup already in progress' });
  }

  if (currentTask) {
    return res.json({ success: false, message: 'Another task is running' });
  }

  try {
    warmupInProgress = true;
    console.log('[VNC] Starting warmup - navigating to Google...');

    const result = await executeTask('Navigate to https://www.google.com and wait for the page to fully load. Just navigate there and confirm you see the Google search page.', { maxIterations: 10 });

    warmupInProgress = false;
    console.log('[VNC] Warmup completed - browser ready on Google');

    res.json({
      success: true,
      message: 'Browser warmed up and ready on Google',
      duration: result.duration
    });
  } catch (error) {
    warmupInProgress = false;
    console.error('[VNC] Warmup failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * VNC Warmup status
 */
app.get('/vnc/warmup/status', (req, res) => {
  res.json({
    warmupInProgress,
    currentTask: currentTask ? currentTask.substring(0, 100) : null
  });
});

// =============================================================================
// SESSION MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * Get current session (cookies, localStorage, URL)
 */
app.get('/session', async (req, res) => {
  try {
    const sessionData = await getCurrentSession();
    if (sessionData) {
      res.json({
        success: true,
        session: {
          cookieCount: sessionData.cookies?.length || 0,
          lastUrl: sessionData.lastUrl,
          savedAt: sessionData.savedAt
        }
      });
    } else {
      res.json({ success: false, message: 'No session available' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Save current session to Supabase
 */
app.post('/session/save', async (req, res) => {
  try {
    if (PROJECT_ID === 'default') {
      return res.status(400).json({ success: false, error: 'PROJECT_ID not configured' });
    }

    const sessionData = await getCurrentSession();
    if (!sessionData) {
      return res.status(500).json({ success: false, error: 'Could not get current session' });
    }

    const saved = await saveSessionToSupabase(PROJECT_ID, sessionData);
    if (saved) {
      res.json({
        success: true,
        message: 'Session saved to Supabase',
        session: {
          cookieCount: sessionData.cookies?.length || 0,
          lastUrl: sessionData.lastUrl
        }
      });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save to Supabase' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Restore session from Supabase
 */
app.post('/session/restore', async (req, res) => {
  try {
    if (PROJECT_ID === 'default') {
      return res.status(400).json({ success: false, error: 'PROJECT_ID not configured' });
    }

    const sessionData = await fetchSessionFromSupabase(PROJECT_ID);
    if (!sessionData) {
      return res.json({ success: false, message: 'No session found in Supabase' });
    }

    const restored = await restoreSessionToChrome(sessionData);
    if (restored) {
      sessionRestored = true;
      res.json({
        success: true,
        message: 'Session restored from Supabase',
        session: {
          cookieCount: sessionData.cookies?.length || 0,
          lastUrl: sessionData.lastUrl
        }
      });
    } else {
      res.status(500).json({ success: false, error: 'Failed to restore session to Chrome' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Clear session (cookies, localStorage)
 */
app.post('/session/clear', async (req, res) => {
  try {
    const axios = require('axios');
    const WebSocket = require('ws');

    const targetsResponse = await axios.get(`http://localhost:${CDP_PORT}/json/list`);
    const targets = targetsResponse.data;

    if (!targets || targets.length === 0) {
      return res.status(500).json({ success: false, error: 'No Chrome targets found' });
    }

    const page = targets.find(t => t.type === 'page') || targets[0];
    const wsUrl = page.webSocketDebuggerUrl;

    if (!wsUrl) {
      return res.status(500).json({ success: false, error: 'No WebSocket URL' });
    }

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Network.clearBrowserCookies' }));
      ws.send(JSON.stringify({ id: 2, method: 'Network.clearBrowserCache' }));
      ws.send(JSON.stringify({ id: 3, method: 'Page.navigate', params: { url: 'https://www.google.com' } }));

      setTimeout(() => {
        ws.close();
        sessionRestored = false;
        res.json({ success: true, message: 'Session cleared, navigated to Google' });
      }, 2000);
    });

    ws.on('error', (err) => {
      ws.close();
      res.status(500).json({ success: false, error: err.message });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Browser Initialize - Initialize browser for frontend
 * Called by LiftlioBrowser.tsx when page loads
 */
app.post('/browser/init', async (req, res) => {
  try {
    const axios = require('axios');

    // Check CDP availability
    let cdpReady = false;
    let browserInfo = {};

    try {
      const versionResponse = await axios.get(`http://localhost:${CDP_PORT}/json/version`, { timeout: 2000 });
      const targetsResponse = await axios.get(`http://localhost:${CDP_PORT}/json/list`, { timeout: 2000 });

      cdpReady = true;
      browserInfo = {
        browser: versionResponse.data.Browser || 'Chrome',
        userAgent: versionResponse.data['User-Agent'],
        targets: targetsResponse.data.length,
        currentUrl: targetsResponse.data[0]?.url || 'about:blank'
      };
    } catch (e) {
      console.log('[BROWSER] CDP not available yet:', e.message);
    }

    // Check VNC status
    let vncRunning = false;
    try {
      const { stdout } = await execAsync('supervisorctl status x11vnc novnc 2>/dev/null || echo "not available"');
      vncRunning = stdout.includes('x11vnc') && stdout.includes('RUNNING') &&
                   stdout.includes('novnc') && stdout.includes('RUNNING');
    } catch (e) {
      // VNC check failed
    }

    console.log(`[BROWSER] Initialize - CDP: ${cdpReady}, VNC: ${vncRunning}`);

    res.json({
      success: true,
      browser: {
        running: cdpReady,
        cdpPort: CDP_PORT,
        ...browserInfo
      },
      vnc: {
        running: vncRunning,
        port: process.env.NOVNC_PORT || '6080'
      },
      session: {
        restored: sessionRestored,
        projectId: PROJECT_ID
      }
    });
  } catch (error) {
    console.error('[BROWSER] Initialize error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * CDP Status - Check if Chrome CDP is available
 */
app.get('/cdp/status', async (req, res) => {
  try {
    const axios = require('axios');
    const versionResponse = await axios.get(`http://localhost:${CDP_PORT}/json/version`, { timeout: 2000 });
    const targetsResponse = await axios.get(`http://localhost:${CDP_PORT}/json/list`, { timeout: 2000 });

    res.json({
      success: true,
      cdp: {
        available: true,
        port: CDP_PORT,
        browser: versionResponse.data.Browser || 'unknown',
        userAgent: versionResponse.data['User-Agent'] || 'unknown',
        targets: targetsResponse.data.length
      }
    });
  } catch (error) {
    res.json({
      success: false,
      cdp: {
        available: false,
        port: CDP_PORT,
        error: error.message
      }
    });
  }
});

// =============================================================================
// CAPTCHA SOLVER ENDPOINTS (CapMonster Integration)
// =============================================================================

const CAPMONSTER_API_KEY = process.env.CAPMONSTER_API_KEY;
const CAPMONSTER_API_URL = 'https://api.capmonster.cloud';

/**
 * Get CapMonster account balance
 */
async function getCapMonsterBalance() {
  if (!CAPMONSTER_API_KEY) return null;

  try {
    const axios = require('axios');
    const response = await axios.post(`${CAPMONSTER_API_URL}/getBalance`, {
      clientKey: CAPMONSTER_API_KEY
    });
    return response.data.balance || 0;
  } catch (e) {
    console.error('[CAPTCHA] Balance check failed:', e.message);
    return null;
  }
}

/**
 * Take screenshot via CDP and return as base64
 */
async function takeScreenshotCDP() {
  try {
    const axios = require('axios');
    const WebSocket = require('ws');

    const targetsResponse = await axios.get(`http://localhost:${CDP_PORT}/json/list`);
    const page = targetsResponse.data.find(t => t.type === 'page') || targetsResponse.data[0];

    if (!page?.webSocketDebuggerUrl) {
      throw new Error('No WebSocket URL available');
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);

    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      });

      ws.on('message', (data) => {
        const response = JSON.parse(data);
        if (response.id === 1 && response.result?.data) {
          ws.close();
          resolve(response.result.data);
        }
      });

      ws.on('error', (err) => {
        ws.close();
        reject(err);
      });

      setTimeout(() => {
        ws.close();
        reject(new Error('Screenshot timeout'));
      }, 10000);
    });
  } catch (error) {
    console.error('[CAPTCHA] Screenshot failed:', error.message);
    throw error;
  }
}

/**
 * Click at coordinates via CDP
 */
async function clickAtCoordinates(x, y) {
  try {
    const axios = require('axios');
    const WebSocket = require('ws');

    const targetsResponse = await axios.get(`http://localhost:${CDP_PORT}/json/list`);
    const page = targetsResponse.data.find(t => t.type === 'page') || targetsResponse.data[0];

    if (!page?.webSocketDebuggerUrl) {
      throw new Error('No WebSocket URL available');
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);

    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        // Mouse down
        ws.send(JSON.stringify({
          id: 1,
          method: 'Input.dispatchMouseEvent',
          params: { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }
        }));

        // Mouse up
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 2,
            method: 'Input.dispatchMouseEvent',
            params: { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }
          }));

          setTimeout(() => {
            ws.close();
            resolve(true);
          }, 100);
        }, 50);
      });

      ws.on('error', (err) => {
        ws.close();
        reject(err);
      });

      setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);
    });
  } catch (error) {
    console.error('[CAPTCHA] Click failed:', error.message);
    return false;
  }
}

/**
 * Solve Google Image CAPTCHA using CapMonster ComplexImageTask
 */
async function solveGoogleImageCaptcha(screenshotBase64) {
  if (!CAPMONSTER_API_KEY) {
    throw new Error('CAPMONSTER_API_KEY not configured');
  }

  const axios = require('axios');

  console.log('[CAPTCHA] Sending to CapMonster (ComplexImageTask)...');

  // Create task
  const createResponse = await axios.post(`${CAPMONSTER_API_URL}/createTask`, {
    clientKey: CAPMONSTER_API_KEY,
    task: {
      type: 'ComplexImageTask',
      class: 'recaptcha',
      imageUrls: [`data:image/png;base64,${screenshotBase64}`]
    }
  });

  if (createResponse.data.errorId !== 0) {
    throw new Error(`CapMonster error: ${createResponse.data.errorCode} - ${createResponse.data.errorDescription}`);
  }

  const taskId = createResponse.data.taskId;
  console.log(`[CAPTCHA] Task created: ${taskId}`);

  // Poll for result
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise(r => setTimeout(r, 2000));

    const resultResponse = await axios.post(`${CAPMONSTER_API_URL}/getTaskResult`, {
      clientKey: CAPMONSTER_API_KEY,
      taskId
    });

    if (resultResponse.data.errorId !== 0) {
      throw new Error(`CapMonster error: ${resultResponse.data.errorCode}`);
    }

    if (resultResponse.data.status === 'ready') {
      console.log(`[CAPTCHA] Solved after ${attempt + 1} attempts`);
      return resultResponse.data.solution;
    }

    console.log(`[CAPTCHA] Processing... (${attempt + 1}/60)`);
  }

  throw new Error('CAPTCHA solving timeout');
}

/**
 * API: Get CAPTCHA solver status
 */
app.get('/captcha/status', async (req, res) => {
  const balance = await getCapMonsterBalance();

  res.json({
    configured: !!CAPMONSTER_API_KEY,
    balance: balance,
    apiUrl: CAPMONSTER_API_URL,
    supportedTypes: ['ComplexImageTask', 'RecaptchaV2', 'RecaptchaV3', 'hCaptcha', 'Turnstile']
  });
});

/**
 * API: Solve CAPTCHA on current page
 *
 * Claude can call this endpoint when it detects a CAPTCHA:
 * POST /captcha/solve
 *
 * Returns: { success: true, solved: true } or { success: false, error: "..." }
 */
app.post('/captcha/solve', async (req, res) => {
  console.log('[CAPTCHA] Solve request received');

  if (!CAPMONSTER_API_KEY) {
    return res.status(400).json({
      success: false,
      error: 'CAPMONSTER_API_KEY not configured. Set it in .env file.'
    });
  }

  try {
    // Check balance first
    const balance = await getCapMonsterBalance();
    console.log(`[CAPTCHA] CapMonster balance: $${balance?.toFixed(4) || 'unknown'}`);

    if (balance !== null && balance < 0.001) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient CapMonster balance',
        balance
      });
    }

    // Take screenshot
    console.log('[CAPTCHA] Taking screenshot...');
    const screenshotBase64 = await takeScreenshotCDP();
    console.log(`[CAPTCHA] Screenshot taken (${(screenshotBase64.length / 1024).toFixed(1)}KB)`);

    // Solve with CapMonster
    const solution = await solveGoogleImageCaptcha(screenshotBase64);

    // If solution has coordinates, click them
    if (solution?.answer) {
      console.log(`[CAPTCHA] Got ${solution.answer.length} click coordinates`);

      for (const coord of solution.answer) {
        console.log(`[CAPTCHA] Clicking at (${coord.x}, ${coord.y})`);
        await clickAtCoordinates(coord.x, coord.y);
        await new Promise(r => setTimeout(r, 300)); // Small delay between clicks
      }

      // Click verify/submit button (usually at bottom of CAPTCHA)
      await new Promise(r => setTimeout(r, 500));

      res.json({
        success: true,
        solved: true,
        clicks: solution.answer.length,
        message: 'CAPTCHA solved - clicked coordinates returned by CapMonster'
      });
    } else if (solution?.gRecaptchaResponse || solution?.token) {
      // Token-based solution (reCAPTCHA v2/v3, hCaptcha)
      console.log('[CAPTCHA] Got token solution');

      res.json({
        success: true,
        solved: true,
        token: solution.gRecaptchaResponse || solution.token,
        message: 'CAPTCHA solved - token returned (needs injection)'
      });
    } else {
      res.json({
        success: false,
        error: 'Unknown solution format',
        solution
      });
    }
  } catch (error) {
    console.error('[CAPTCHA] Solve failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * API: Manual screenshot for debugging
 */
app.get('/captcha/screenshot', async (req, res) => {
  try {
    const screenshotBase64 = await takeScreenshotCDP();
    res.json({
      success: true,
      screenshot: screenshotBase64.substring(0, 100) + '...',
      sizeKB: (screenshotBase64.length / 1024).toFixed(1)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// =============================================================================
// MCP COMPATIBILITY ENDPOINTS (for frontend)
// =============================================================================

/**
 * MCP Screenshot - Returns full base64 screenshot for frontend
 */
app.get('/mcp/screenshot', async (req, res) => {
  try {
    const screenshotBase64 = await takeScreenshotCDP();
    res.json({
      success: true,
      screenshot: screenshotBase64
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SSE clients
const sseClients = new Set();

/**
 * SSE Endpoint - Server-Sent Events stream for real-time updates
 */
app.get('/sse', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Add client to set
  sseClients.add(res);
  console.log('[SSE] Client connected (total: ' + sseClients.size + ')');

  // Send initial status
  const initialData = {
    type: 'connected',
    projectId: PROJECT_ID,
    timestamp: new Date().toISOString()
  };
  res.write('data: ' + JSON.stringify(initialData) + '\n\n');

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write('data: ' + JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }) + '\n\n');
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
    console.log('[SSE] Client disconnected (remaining: ' + sseClients.size + ')');
  });
});

/**
 * Broadcast event to all SSE clients
 */
function broadcastSSE(eventData) {
  const data = JSON.stringify(eventData);
  sseClients.forEach(client => {
    try {
      client.write('data: ' + data + '\n\n');
    } catch (e) {
      sseClients.delete(client);
    }
  });
}

// =============================================================================
// DIRECT LOGIN ENDPOINTS (Bypasses Claude - Direct CDP automation)
// =============================================================================

/**
 * Type text via CDP
 */
async function typeTextCDP(text) {
  try {
    const axios = require('axios');
    const WebSocket = require('ws');

    const targetsResponse = await axios.get(`http://localhost:${CDP_PORT}/json/list`);
    const page = targetsResponse.data.find(t => t.type === 'page') || targetsResponse.data[0];

    if (!page?.webSocketDebuggerUrl) {
      throw new Error('No WebSocket URL available');
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);

    return new Promise((resolve, reject) => {
      ws.on('open', async () => {
        // Type each character
        for (const char of text) {
          ws.send(JSON.stringify({
            id: Math.floor(Math.random() * 10000),
            method: 'Input.dispatchKeyEvent',
            params: { type: 'keyDown', text: char }
          }));
          ws.send(JSON.stringify({
            id: Math.floor(Math.random() * 10000),
            method: 'Input.dispatchKeyEvent',
            params: { type: 'keyUp', text: char }
          }));
          await new Promise(r => setTimeout(r, 50)); // Delay between keys
        }

        setTimeout(() => {
          ws.close();
          resolve(true);
        }, 100);
      });

      ws.on('error', (err) => {
        ws.close();
        reject(err);
      });

      setTimeout(() => {
        ws.close();
        resolve(false);
      }, 30000);
    });
  } catch (error) {
    console.error('[LOGIN] Type failed:', error.message);
    return false;
  }
}

/**
 * Navigate to URL via CDP
 */
async function navigateCDP(url) {
  try {
    const axios = require('axios');
    const WebSocket = require('ws');

    const targetsResponse = await axios.get(`http://localhost:${CDP_PORT}/json/list`);
    const page = targetsResponse.data.find(t => t.type === 'page') || targetsResponse.data[0];

    if (!page?.webSocketDebuggerUrl) {
      throw new Error('No WebSocket URL available');
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);

    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Page.navigate',
          params: { url }
        }));
      });

      ws.on('message', (data) => {
        const response = JSON.parse(data);
        if (response.id === 1) {
          setTimeout(() => {
            ws.close();
            resolve(true);
          }, 2000); // Wait for navigation
        }
      });

      ws.on('error', (err) => {
        ws.close();
        reject(err);
      });

      setTimeout(() => {
        ws.close();
        resolve(false);
      }, 30000);
    });
  } catch (error) {
    console.error('[LOGIN] Navigate failed:', error.message);
    return false;
  }
}

/**
 * Press Enter key via CDP
 */
async function pressEnterCDP() {
  try {
    const axios = require('axios');
    const WebSocket = require('ws');

    const targetsResponse = await axios.get(`http://localhost:${CDP_PORT}/json/list`);
    const page = targetsResponse.data.find(t => t.type === 'page') || targetsResponse.data[0];

    if (!page?.webSocketDebuggerUrl) {
      throw new Error('No WebSocket URL available');
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);

    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Input.dispatchKeyEvent',
          params: { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }
        }));
        ws.send(JSON.stringify({
          id: 2,
          method: 'Input.dispatchKeyEvent',
          params: { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }
        }));

        setTimeout(() => {
          ws.close();
          resolve(true);
        }, 100);
      });

      ws.on('error', (err) => {
        ws.close();
        reject(err);
      });

      setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);
    });
  } catch (error) {
    console.error('[LOGIN] Press Enter failed:', error.message);
    return false;
  }
}

/**
 * API: Direct Google Login (bypasses Claude)
 * POST /login/google
 * Body: { email: "...", password: "..." }
 */
app.post('/login/google', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'email and password are required'
    });
  }

  console.log(`[LOGIN] Starting Google login for ${email}...`);

  try {
    // Step 1: Navigate to Google login
    console.log('[LOGIN] Step 1: Navigating to accounts.google.com...');
    await navigateCDP('https://accounts.google.com/');
    await new Promise(r => setTimeout(r, 3000)); // Wait for page load

    // Step 2: Type email
    console.log('[LOGIN] Step 2: Typing email...');
    await typeTextCDP(email);
    await new Promise(r => setTimeout(r, 500));

    // Step 3: Press Enter (Next button)
    console.log('[LOGIN] Step 3: Pressing Enter for Next...');
    await pressEnterCDP();
    await new Promise(r => setTimeout(r, 3000)); // Wait for password page

    // Step 4: Type password
    console.log('[LOGIN] Step 4: Typing password...');
    await typeTextCDP(password);
    await new Promise(r => setTimeout(r, 500));

    // Step 5: Press Enter (Sign in)
    console.log('[LOGIN] Step 5: Pressing Enter for Sign in...');
    await pressEnterCDP();

    console.log('[LOGIN] Credentials entered. Waiting for 2FA approval...');

    res.json({
      success: true,
      message: 'Credentials entered. Please approve 2FA on your phone. After login completes, call POST /session/save to persist the session.',
      nextStep: 'POST /session/save'
    });

  } catch (error) {
    console.error('[LOGIN] Failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * API: Get current page URL via CDP
 */
app.get('/browser/url', async (req, res) => {
  try {
    const axios = require('axios');
    const WebSocket = require('ws');

    const targetsResponse = await axios.get(`http://localhost:${CDP_PORT}/json/list`);
    const page = targetsResponse.data.find(t => t.type === 'page') || targetsResponse.data[0];

    res.json({
      success: true,
      url: page?.url || 'unknown',
      title: page?.title || 'unknown'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================================================
// TASK ENDPOINTS
// =============================================================================

/**
 * Health check - Enhanced with CDP and session info
 */
app.get('/health', async (req, res) => {
  // Check CDP availability
  let cdpStatus = { available: false };
  try {
    const axios = require('axios');
    const response = await axios.get(`http://localhost:${CDP_PORT}/json/version`, { timeout: 1000 });
    cdpStatus = { available: true, browser: response.data.Browser };
  } catch (e) {
    cdpStatus = { available: false, error: e.message };
  }

  res.json({
    status: 'healthy',
    version: '4.1.0',
    projectId: PROJECT_ID,
    uptime: process.uptime(),
    currentTask: currentTask ? 'running' : null,
    hasProxy: !!process.env.PROXY_URL,
    hasCapMonster: !!process.env.CAPMONSTER_API_KEY,
    hasSupabase: !!SUPABASE_URL && !!SUPABASE_KEY,
    vnc: {
      enabled: vncInactivityTimer !== null
    },
    cdp: cdpStatus,
    session: {
      restored: sessionRestored,
      userDataDir: CHROME_USER_DATA_DIR
    }
  });
});

/**
 * Container compatibility endpoints (for frontend)
 */
app.get('/containers', (req, res) => {
  res.json({
    count: 1,
    containers: [{
      projectId: PROJECT_ID,
      status: 'running',
      mcpUrl: `http://localhost:${PORT}`,
      mcpPort: PORT
    }]
  });
});

app.get('/containers/:projectId', (req, res) => {
  res.json({
    projectId: req.params.projectId || PROJECT_ID,
    status: 'running',
    mcpUrl: `http://localhost:${PORT}`,
    mcpPort: PORT
  });
});

// NEW: /containers/:projectId/info - Returns apiPort and vncPort for frontend
// Uses EXTERNAL mapped ports (10000 + PROJECT_ID for API, 16000 + PROJECT_ID for VNC)
app.get('/containers/:projectId/info', (req, res) => {
  const pid = parseInt(req.params.projectId) || parseInt(PROJECT_ID) || 117;
  const externalApiPort = process.env.EXTERNAL_API_PORT || (10000 + pid);
  const externalVncPort = process.env.EXTERNAL_VNC_PORT || (16000 + pid);

  res.json({
    projectId: req.params.projectId || PROJECT_ID,
    apiPort: externalApiPort,
    vncPort: externalVncPort,
    status: 'running',
    createdAt: new Date().toISOString(),
    lastActivity: vncLastActivity || new Date().toISOString()
  });
});

app.post('/containers', (req, res) => {
  res.status(201).json({
    success: true,
    container: {
      projectId: req.body.projectId || PROJECT_ID,
      status: 'running',
      mcpUrl: `http://localhost:${PORT}`
    }
  });
});

app.post('/containers/:projectId/heartbeat', (req, res) => {
  res.json({ success: true, lastActivity: new Date().toISOString() });
});

/**
 * Execute task
 * Now ensures Google session is valid before executing
 */
app.post('/agent/task', async (req, res) => {
  const { task, maxIterations, projectId, taskId } = req.body;

  if (!task) {
    return res.status(400).json({ error: 'task is required' });
  }

  if (currentTask) {
    return res.status(409).json({
      error: 'Another task is running',
      currentTask: currentTask.substring(0, 100)
    });
  }

  try {
    currentTask = task;

    // Ensure Google session is restored before executing task
    const sessionStatus = await ensureSessionBeforeTask();
    console.log('[TASK] Session status before task:', JSON.stringify(sessionStatus));

    const result = await executeTask(task, { maxIterations: maxIterations || 30 });

    // Save session after task completes
    const postTaskSession = await getCurrentSession();
    if (postTaskSession?.cookies?.length > 5) {
      await saveSessionToSupabase(PROJECT_ID, postTaskSession);
      console.log('[TASK] Session saved after task completion');
    }

    currentTask = null;

    // Extract Claude's actual response from the output
    let claudeResponse = null;
    if (result.output) {
      // If output is already an object with result/message
      if (typeof result.output === 'object' && result.output.result) {
        claudeResponse = result.output.result;
      } else if (typeof result.output === 'string') {
        // Try to extract text response from Claude's output
        claudeResponse = result.output;
      } else {
        claudeResponse = JSON.stringify(result.output);
      }
    }

    // Update browser_tasks if taskId was provided (from CRON)
    if (taskId) {
      await updateTaskInSupabase(taskId, {
        success: true,
        result: claudeResponse,
        duration: result.duration
      });
    }

    res.json({
      success: true,
      projectId: projectId || PROJECT_ID,
      sessionStatus,
      result: claudeResponse,  // Frontend expects 'result' field with Claude's response
      output: result.output,   // Keep original output for debugging
      exitCode: result.exitCode,
      duration: result.duration,
      timestamp: result.timestamp
    });
  } catch (error) {
    currentTask = null;

    // Update browser_tasks with failure if taskId was provided
    if (taskId) {
      await updateTaskInSupabase(taskId, {
        success: false,
        result: null,
        error: error.message
      });
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Fast task (fewer iterations)
 * Now ensures Google session is valid before executing
 */
app.post('/agent/task-fast', async (req, res) => {
  const { task, projectId } = req.body;

  if (!task) {
    return res.status(400).json({ error: 'task is required' });
  }

  if (currentTask) {
    return res.status(409).json({
      error: 'Another task is running',
      currentTask: currentTask.substring(0, 100)
    });
  }

  try {
    currentTask = task;

    // Ensure Google session is restored before executing task
    const sessionStatus = await ensureSessionBeforeTask();
    console.log('[TASK-FAST] Session status before task:', JSON.stringify(sessionStatus));

    const result = await executeTask(task, { maxIterations: 15 });

    // Save session after task completes
    const postTaskSession = await getCurrentSession();
    if (postTaskSession?.cookies?.length > 5) {
      await saveSessionToSupabase(PROJECT_ID, postTaskSession);
      console.log('[TASK-FAST] Session saved after task completion');
    }

    currentTask = null;

    // Extract Claude's actual response from the output
    let claudeResponse = null;
    if (result.output) {
      // If output is already an object with result/message
      if (typeof result.output === 'object' && result.output.result) {
        claudeResponse = result.output.result;
      } else if (typeof result.output === 'string') {
        // Try to extract text response from Claude's output
        claudeResponse = result.output;
      } else {
        claudeResponse = JSON.stringify(result.output);
      }
    }

    res.json({
      success: true,
      projectId: projectId || PROJECT_ID,
      sessionStatus,
      result: claudeResponse,  // Frontend expects 'result' field with Claude's response
      output: result.output,   // Keep original output for debugging
      exitCode: result.exitCode,
      duration: result.duration,
      timestamp: result.timestamp
    });
  } catch (error) {
    currentTask = null;
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Status
 */
app.get('/status', (req, res) => {
  res.json({
    running: currentTask !== null,
    currentTask: currentTask ? currentTask.substring(0, 200) : null,
    projectId: PROJECT_ID,
    hasProxy: !!process.env.PROXY_URL,
    hasCapMonster: !!process.env.CAPMONSTER_API_KEY
  });
});

/**
 * History
 */
app.get('/history', (req, res) => {
  res.json({
    count: taskHistory.length,
    tasks: taskHistory.slice(-20).reverse()
  });
});

/**
 * Cancel (soft)
 */
app.post('/cancel', (req, res) => {
  if (currentTask) {
    console.log('[CANCEL] Task cancellation requested');
    res.json({ message: 'Cancel requested (task may still complete)' });
  } else {
    res.json({ message: 'No task running' });
  }
});

/**
 * Force cleanup stuck task
 * Use this when a task has been running too long and is stuck
 */
app.post('/agent/force-cleanup', (req, res) => {
  console.log('[FORCE CLEANUP] Clearing stuck task');

  const wasRunning = currentTask !== null;
  currentTask = null;

  res.json({
    success: true,
    wasTaskRunning: wasRunning,
    message: wasRunning ? 'Task cleared successfully' : 'No task was running'
  });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
+==============================================================+
|  LIFTLIO BROWSER AGENT v4.1 - Persistent Sessions            |
|  Claude Code Max + Playwright MCP (CDP) + VNC                |
+==============================================================+
|  Port: ${PORT}                                                   |
|  Project: ${PROJECT_ID.padEnd(47)}|
|  CDP Port: ${CDP_PORT}                                               |
|  User Data Dir: ${CHROME_USER_DATA_DIR.padEnd(40)}|
|  Proxy: ${(process.env.PROXY_URL ? 'Configured' : 'Not configured').padEnd(49)}|
|  CapMonster: ${(process.env.CAPMONSTER_API_KEY ? 'Configured' : 'Not configured').padEnd(44)}|
|  Supabase: ${(SUPABASE_URL ? 'Configured' : 'Not configured').padEnd(46)}|
+==============================================================+
|  Task Endpoints:                                             |
|  - POST /agent/task       Execute task (30 turns)            |
|  - POST /agent/task-fast  Fast execution (15 turns)          |
|  - GET  /status           Current status                     |
|  - GET  /health           Health check + CDP status          |
|  - GET  /history          Task history                       |
+--------------------------------------------------------------+
|  VNC Endpoints:                                              |
|  - GET  /vnc/status       VNC service status                 |
|  - POST /vnc/start        Start VNC + restore session        |
|  - POST /vnc/stop         Stop VNC + save session            |
|  - POST /vnc/heartbeat    Keep VNC alive                     |
+--------------------------------------------------------------+
|  Session Endpoints:                                          |
|  - GET  /session          Get current session info           |
|  - POST /session/save     Save session to Supabase           |
|  - POST /session/restore  Restore session from Supabase      |
|  - POST /session/clear    Clear cookies and cache            |
|  - GET  /cdp/status       Chrome CDP status                  |
+--------------------------------------------------------------+
|  CAPTCHA Endpoints (CapMonster):                             |
|  - POST /captcha/solve    Solve CAPTCHA on current page      |
|  - GET  /captcha/status   CapMonster config + balance        |
|  - GET  /captcha/screenshot Debug screenshot                 |
+==============================================================+
  `);

  // Start session watchdog (auto-save every 60s)
  if (SUPABASE_URL && SUPABASE_KEY && PROJECT_ID !== 'default') {
    setTimeout(() => {
      startSessionWatchdog();
      console.log('[STARTUP] Session watchdog started (auto-save every 60s)');
    }, 10000); // Wait 10s for Chrome to be ready
  } else {
    console.log('[STARTUP] Session watchdog NOT started (Supabase not configured or PROJECT_ID not set)');
  }
});
