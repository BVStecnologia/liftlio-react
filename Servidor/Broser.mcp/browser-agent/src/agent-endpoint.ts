/**
 * Agent endpoint handler
 * Separate file to avoid file sync issues
 */

import express from 'express';
import { BrowserManager } from './browser-manager';
import { BrowserAgent } from './agent';
import { FastModeExecutor } from './fast-mode';
import { executeYouTubeEngage, YouTubeEngageParams } from './youtube-workflow';

export function setupAgentEndpoint(
  app: express.Application,
  getBrowserManager: () => BrowserManager | null,
  setBrowserManager: (bm: BrowserManager) => void,
  config: {
    projectId: string;
    projectIndex: number;
    profilesDir: string;
    headless: boolean;
  },
  broadcastEvent: (event: string, data: any) => void
) {
  /**
   * AI Agent: Execute task with natural language
   * Uses Claude Haiku for cost-effective browser automation
   */
  app.post('/agent/task', async (req, res) => {
    try {
      const { task, model, verbose, taskId, projectId: reqProjectId } = req.body;

      if (!task) {
        return res.status(400).json({ error: 'Task is required' });
      }

      // Check for API key
      if (!process.env.CLAUDE_API_KEY) {
        return res.status(500).json({
          error: 'CLAUDE_API_KEY not configured',
          message: 'Set CLAUDE_API_KEY environment variable to use the AI agent'
        });
      }

      let browserManager = getBrowserManager();

      // Initialize browser if needed
      if (!browserManager?.isRunning()) {
        browserManager = new BrowserManager({
          projectId: config.projectId,
          projectIndex: config.projectIndex,
          profilesDir: config.profilesDir,
          headless: config.headless
        });
        await browserManager.initialize();
        setBrowserManager(browserManager);
      }

      // Parse projectId (can come from config or request)
      const numericProjectId = reqProjectId
        ? parseInt(reqProjectId, 10)
        : parseInt(config.projectId, 10);

      // Create and run agent with humanization context
      const agent = new BrowserAgent(browserManager, {
        model: model || 'claude-haiku-4-5-20251001',
        maxIterations: req.body.maxIterations || 1000,
        verbose: verbose || false,
        onProgress: (progress) => {
          broadcastEvent('agent_progress', progress);
        },
        // Pass context for anti-detection behavior tracking
        projectId: isNaN(numericProjectId) ? undefined : numericProjectId,
        taskId: taskId || undefined
      });

      console.log(`Starting AI agent task: "${task.slice(0, 100)}..."`);
      if (taskId) console.log(`Task ID: ${taskId}, Project ID: ${numericProjectId}`);
      broadcastEvent('agent_started', { task, taskId });

      const result = await agent.runTask(task);

      broadcastEvent('agent_completed', { result });

      res.json({
        success: result.success,
        result: result.result,
        iterations: result.iterations,
        actions: result.actions,
        behaviorUsed: result.behaviorUsed
      });
    } catch (error: any) {
      console.error('Agent task failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * AI Agent: Execute a list of tasks sequentially
   * Agent will work through all tasks until completed
   */
  app.post('/agent/task-list', async (req, res) => {
    try {
      const { tasks, model, verbose, maxIterationsPerTask } = req.body;

      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: 'tasks array is required' });
      }

      // Check for API key
      if (!process.env.CLAUDE_API_KEY) {
        return res.status(500).json({
          error: 'CLAUDE_API_KEY not configured',
          message: 'Set CLAUDE_API_KEY environment variable to use the AI agent'
        });
      }

      let browserManager = getBrowserManager();

      // Initialize browser if needed
      if (!browserManager?.isRunning()) {
        browserManager = new BrowserManager({
          projectId: config.projectId,
          projectIndex: config.projectIndex,
          profilesDir: config.profilesDir,
          headless: config.headless
        });
        await browserManager.initialize();
        setBrowserManager(browserManager);
      }

      // Create agent with progress callback for SSE updates
      const agent = new BrowserAgent(browserManager, {
        model: model || 'claude-haiku-4-5-20251001',
        maxIterations: maxIterationsPerTask || 1000,
        verbose: verbose || false,
        onProgress: (progress) => {
          broadcastEvent('agent_progress', progress);
        }
      });

      console.log(`Starting AI agent task list: ${tasks.length} tasks`);
      broadcastEvent('agent_task_list_started', { tasks, count: tasks.length });

      const result = await agent.runTaskList(tasks);

      broadcastEvent('agent_task_list_completed', { result });

      res.json(result);
    } catch (error: any) {
      console.error('Agent task list failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * FAST MODE V2: ariaSnapshot + Single-Shot Planning + Ref-Based Execution
   *
   * Architecture:
   * 1. Capture ariaSnapshot (Playwright accessibility tree with refs)
   * 2. Call Haiku ONCE with snapshot to get complete plan with refs
   * 3. Execute all actions using clickByRef (no more API calls)
   * 4. Fallback: Re-capture snapshot and replan if action fails
   *
   * Result: ~90% token reduction, 10x faster than iterative approach
   */
  app.post('/agent/task-fast', async (req, res) => {
    try {
      const { task, model, maxRetries } = req.body;

      if (!task) {
        return res.status(400).json({ error: 'Task is required' });
      }

      // Check for API key
      if (!process.env.CLAUDE_API_KEY) {
        return res.status(500).json({
          error: 'CLAUDE_API_KEY not configured',
          message: 'Set CLAUDE_API_KEY environment variable to use the AI agent'
        });
      }

      let browserManager = getBrowserManager();

      // Initialize browser if needed
      if (!browserManager?.isRunning()) {
        browserManager = new BrowserManager({
          projectId: config.projectId,
          projectIndex: config.projectIndex,
          profilesDir: config.profilesDir,
          headless: config.headless
        });
        await browserManager.initialize();
        setBrowserManager(browserManager);
      }

      // Create FAST MODE executor
      const fastExecutor = new FastModeExecutor(
        browserManager,
        model || 'claude-haiku-4-5-20251001'
      );

      console.log(`[FAST MODE] Starting task: "${task.slice(0, 100)}..."`);
      broadcastEvent('agent_fast_started', { task });

      const result = await fastExecutor.run(task, maxRetries || 2);

      broadcastEvent('agent_fast_completed', { result });

      res.json(result);
    } catch (error: any) {
      console.error('[FAST MODE] Task failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * YOUTUBE ENGAGE: Hybrid workflow for YouTube engagement
   *
   * Architecture:
   * 1. AI makes ONE decision: which video to click (single API call ~$0.01)
   * 2. Pre-defined code executes all actions (watch, like, comment)
   * 3. Uses humanization from humanization.ts for anti-detection
   *
   * Cost: 92% reduction vs full mode ($0.01 vs $0.12 per task)
   */
  app.post('/agent/youtube-engage', async (req, res) => {
    try {
      const {
        keyword,
        watchSeconds,
        playbackSpeed,
        like,
        comment,
        projectId: reqProjectId
      } = req.body;

      if (!keyword) {
        return res.status(400).json({ error: 'keyword is required' });
      }

      // Check for API key
      if (!process.env.CLAUDE_API_KEY) {
        return res.status(500).json({
          error: 'CLAUDE_API_KEY not configured',
          message: 'Set CLAUDE_API_KEY environment variable to use the AI agent'
        });
      }

      let browserManager = getBrowserManager();

      // Initialize browser if needed
      if (!browserManager?.isRunning()) {
        browserManager = new BrowserManager({
          projectId: config.projectId,
          projectIndex: config.projectIndex,
          profilesDir: config.profilesDir,
          headless: config.headless
        });
        await browserManager.initialize();
        setBrowserManager(browserManager);
      }

      // Parse projectId
      const numericProjectId = reqProjectId
        ? parseInt(reqProjectId, 10)
        : parseInt(config.projectId, 10);

      // Build params
      const params: YouTubeEngageParams = {
        keyword,
        watchSeconds: watchSeconds || 30,
        playbackSpeed: playbackSpeed || 2,
        like: like !== false, // default true
        comment: comment || undefined,
        projectId: isNaN(numericProjectId) ? undefined : numericProjectId
      };

      console.log(`[YOUTUBE ENGAGE] Starting: "${keyword}"`);
      broadcastEvent('youtube_engage_started', { keyword, params });

      const result = await executeYouTubeEngage(browserManager, params);

      broadcastEvent('youtube_engage_completed', { result });

      res.json(result);
    } catch (error: any) {
      console.error('[YOUTUBE ENGAGE] Failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}
