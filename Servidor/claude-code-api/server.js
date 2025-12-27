/**
 * =============================================================================
 * LIFTLIO CLAUDE CODE API - Lightweight Server
 * =============================================================================
 * Simple HTTP API for Claude Code CLI
 * No browser, No VNC, No Playwright - Just Claude
 * =============================================================================
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 10100;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// State
let currentTask = null;
let taskHistory = [];
let claudeSessionId = null;

// =============================================================================
// ENDPOINTS
// =============================================================================

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    type: 'claude-code-api-lite',
    uptime: process.uptime(),
    currentTask: currentTask ? 'running' : null,
    hasSession: !!claudeSessionId
  });
});

/**
 * Status
 */
app.get('/status', (req, res) => {
  res.json({
    running: currentTask !== null,
    currentTask: currentTask ? currentTask.substring(0, 200) : null,
    sessionId: claudeSessionId
  });
});

/**
 * Task history
 */
app.get('/history', (req, res) => {
  res.json({
    count: taskHistory.length,
    tasks: taskHistory.slice(-20).reverse()
  });
});

/**
 * Execute Claude task
 * POST /chat
 * Body: {
 *   message: "...",
 *   maxTurns?: 10,
 *   continueSession?: false,
 *   model?: "opus" | "sonnet" | "haiku"  // Default: opus (Claude Max default)
 * }
 *
 * Models:
 * - haiku: Fastest, cheapest - good for simple tasks
 * - sonnet: Balanced - good for most tasks
 * - opus: Most capable - good for complex tasks (default)
 */
app.post('/chat', async (req, res) => {
  const { message, maxTurns = 10, continueSession = false, model = null } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'message is required' });
  }

  if (currentTask) {
    return res.status(409).json({
      success: false,
      error: 'Another task is running',
      currentTask: currentTask.substring(0, 100)
    });
  }

  try {
    currentTask = message;
    const startTime = Date.now();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[CHAT] ${new Date().toISOString()}`);
    console.log(`Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    // Build Claude command
    const args = [
      '--print',
      '--output-format', 'json',
      '--max-turns', String(maxTurns),
      '--dangerously-skip-permissions'
    ];

    // Add model if specified (haiku, sonnet, opus)
    const validModels = ['haiku', 'sonnet', 'opus'];
    if (model && validModels.includes(model.toLowerCase())) {
      args.push('--model', model.toLowerCase());
      console.log(`[CHAT] Using model: ${model.toLowerCase()}`);
    }

    // Resume session if requested and available
    if (continueSession && claudeSessionId) {
      args.push('--resume', claudeSessionId);
      console.log(`[SESSION] Resuming: ${claudeSessionId}`);
    }

    args.push('-p', message);

    const claude = spawn('claude', args, {
      env: {
        ...process.env,
        HOME: process.env.HOME || '/home/claude',
        FORCE_COLOR: '0'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

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
      const duration = Date.now() - startTime;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`[COMPLETED] Exit code: ${code}, Duration: ${duration}ms`);
      console.log(`${'='.repeat(60)}\n`);

      // Parse JSON output
      let result = null;
      try {
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // Not JSON, use raw output
      }

      // Extract session ID for --resume
      try {
        if (result && result.session_id) {
          claudeSessionId = result.session_id;
          console.log(`[SESSION] Stored: ${claudeSessionId}`);
        } else {
          const sessionMatch = stdout.match(/session[_\s-]?(?:id)?[:\s]+([a-zA-Z0-9_-]{10,})/i);
          if (sessionMatch) {
            claudeSessionId = sessionMatch[1];
            console.log(`[SESSION] Extracted: ${claudeSessionId}`);
          }
        }
      } catch (e) {
        // Ignore session extraction errors
      }

      // Extract response text
      let responseText = null;
      if (result) {
        responseText = result.result || result.message || result.response || JSON.stringify(result);
      } else {
        responseText = stdout;
      }

      // Save to history
      const taskResult = {
        message: message.substring(0, 200),
        response: responseText?.substring(0, 500),
        success: code === 0,
        duration,
        timestamp: new Date().toISOString()
      };
      taskHistory.push(taskResult);
      if (taskHistory.length > 50) {
        taskHistory = taskHistory.slice(-50);
      }

      currentTask = null;

      res.json({
        success: code === 0,
        response: responseText,
        output: result || stdout,
        exitCode: code,
        duration,
        sessionId: claudeSessionId,
        timestamp: new Date().toISOString()
      });
    });

    claude.on('error', (err) => {
      currentTask = null;
      res.status(500).json({ success: false, error: err.message });
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      if (currentTask) {
        console.log('[TIMEOUT] Killing Claude process after 5 minutes');
        claude.kill('SIGTERM');
      }
    }, 5 * 60 * 1000);

  } catch (error) {
    currentTask = null;
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Stream chat (Server-Sent Events)
 * POST /chat/stream
 */
app.post('/chat/stream', async (req, res) => {
  const { message, maxTurns = 10 } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'message is required' });
  }

  if (currentTask) {
    return res.status(409).json({
      success: false,
      error: 'Another task is running'
    });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  currentTask = message;
  const startTime = Date.now();

  const args = [
    '--print',
    '--max-turns', String(maxTurns),
    '--dangerously-skip-permissions',
    '-p', message
  ];

  const claude = spawn('claude', args, {
    env: {
      ...process.env,
      HOME: process.env.HOME || '/home/claude',
      FORCE_COLOR: '0'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  claude.stdout.on('data', (data) => {
    const text = data.toString();
    res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
  });

  claude.stderr.on('data', (data) => {
    const text = data.toString();
    res.write(`data: ${JSON.stringify({ type: 'stderr', text })}\n\n`);
  });

  claude.on('close', (code) => {
    const duration = Date.now() - startTime;
    currentTask = null;

    res.write(`data: ${JSON.stringify({
      type: 'done',
      success: code === 0,
      exitCode: code,
      duration
    })}\n\n`);
    res.end();
  });

  claude.on('error', (err) => {
    currentTask = null;
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  });

  // Handle client disconnect
  req.on('close', () => {
    if (currentTask) {
      console.log('[STREAM] Client disconnected, killing process');
      claude.kill('SIGTERM');
      currentTask = null;
    }
  });
});

/**
 * Reset session
 */
app.post('/session/reset', (req, res) => {
  const previousSessionId = claudeSessionId;
  claudeSessionId = null;

  console.log(`[SESSION] Reset. Previous: ${previousSessionId || 'none'}`);

  res.json({
    success: true,
    message: 'Session reset',
    previousSessionId
  });
});

/**
 * Cancel current task
 */
app.post('/cancel', (req, res) => {
  if (currentTask) {
    console.log('[CANCEL] Task cancellation requested');
    // Note: This only sets the flag, actual kill happens on timeout
    res.json({ success: true, message: 'Cancel requested' });
  } else {
    res.json({ success: false, message: 'No task running' });
  }
});

/**
 * Force cleanup stuck task
 */
app.post('/force-cleanup', (req, res) => {
  const wasRunning = currentTask !== null;
  currentTask = null;

  res.json({
    success: true,
    wasTaskRunning: wasRunning,
    message: wasRunning ? 'Task cleared' : 'No task was running'
  });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
+==============================================================+
|  LIFTLIO CLAUDE CODE API - Lightweight                       |
|  Version 1.0.0                                               |
+==============================================================+
|  Port: ${PORT}                                                   |
|  Mode: Standalone (No browser, No VNC)                       |
+--------------------------------------------------------------+
|  Endpoints:                                                  |
|  - POST /chat           Execute message, return response     |
|  - POST /chat/stream    Streaming response (SSE)             |
|  - GET  /status         Current status                       |
|  - GET  /health         Health check                         |
|  - GET  /history        Task history                         |
|  - POST /session/reset  Reset conversation session           |
|  - POST /cancel         Cancel current task                  |
|  - POST /force-cleanup  Force clear stuck task               |
+==============================================================+
  `);
});
