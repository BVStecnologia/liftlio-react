/**
 * Agent endpoint handler
 * Separate file to avoid file sync issues
 */

import express from 'express';
import { BrowserManager } from './browser-manager';
import { BrowserAgent } from './agent';
import { FastModeExecutor } from './fast-mode';

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
   * 1. Capture ariaSnapshot (Playwright's accessibility tree with refs)
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
}
