/**
 * Claude AI Agent for Browser Automation
 *
 * Uses Claude Haiku (claude-haiku-4-5-20251001) for cost-effective browser control.
 * Receives natural language tasks and executes them step by step.
 *
 * Cost: ~$0.80/1M input tokens, ~$4.00/1M output tokens
 */

import Anthropic from '@anthropic-ai/sdk';
import { BrowserManager } from './browser-manager';

// Types for tool use
interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

interface TextBlock {
  type: 'text';
  text: string;
}

type ContentBlock = ToolUseBlock | TextBlock;

interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[] | ToolResult[];
}

interface ToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

// Agent configuration
interface AgentConfig {
  model?: string;
  maxIterations?: number;
  verbose?: boolean;
  onProgress?: (progress: TaskProgress) => void;
}

// Task progress callback
interface TaskProgress {
  taskIndex: number;
  totalTasks: number;
  currentTask: string;
  iteration: number;
  maxIterations: number;
  lastAction: string;
  status: 'running' | 'completed' | 'failed';
}

// Task result
interface TaskResult {
  success: boolean;
  result: string;
  iterations: number;
  actions: string[];
}

// Task list result
interface TaskListResult {
  success: boolean;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  results: Array<{
    task: string;
    result: TaskResult;
  }>;
  totalIterations: number;
  totalTime: number;
}

// Browser tools definition for Claude
const BROWSER_TOOLS = [
  {
    name: 'browser_navigate',
    description: 'Navigate the browser to a specific URL. Use this to go to websites.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          description: 'The full URL to navigate to (include https://)'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'browser_click',
    description: 'Click on an element on the page. Can click by visible text or CSS selector.',
    input_schema: {
      type: 'object' as const,
      properties: {
        target: {
          type: 'string',
          description: 'The text content of the element to click, or a CSS selector'
        },
        by_text: {
          type: 'boolean',
          description: 'If true, finds element by visible text. If false, uses CSS selector.',
          default: true
        }
      },
      required: ['target']
    }
  },
  {
    name: 'browser_type',
    description: 'Type text into an input field. Can optionally submit (press Enter) after typing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or placeholder text of the input field'
        },
        text: {
          type: 'string',
          description: 'The text to type into the field'
        },
        submit: {
          type: 'boolean',
          description: 'If true, press Enter after typing to submit',
          default: false
        }
      },
      required: ['selector', 'text']
    }
  },
  {
    name: 'browser_get_content',
    description: 'Get the visible text content from the current page. Use this to read what\'s on the page.',
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: {
          type: 'string',
          description: 'Optional CSS selector to scope the content extraction',
          default: 'body'
        }
      }
    }
  },
  {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current page. Returns the path to the saved image.',
    input_schema: {
      type: 'object' as const,
      properties: {}
    }
  },
  {
    name: 'browser_back',
    description: 'Go back to the previous page in browser history.',
    input_schema: {
      type: 'object' as const,
      properties: {}
    }
  },
  {
    name: 'task_complete',
    description: 'Call this when you have completed the task. Provide your final answer.',
    input_schema: {
      type: 'object' as const,
      properties: {
        result: {
          type: 'string',
          description: 'The final result or answer to the user\'s task'
        }
      },
      required: ['result']
    }
  }
];

// System prompt for the agent
const SYSTEM_PROMPT = `You are a browser automation agent. Your job is to complete tasks by controlling a web browser.

Available tools:
- browser_navigate: Go to a URL
- browser_click: Click elements (by text or selector)
- browser_type: Type into input fields
- browser_get_content: Read page content
- browser_screenshot: Take a screenshot
- browser_back: Go back in history
- task_complete: Report your final answer

Guidelines:
1. Start by navigating to the relevant website
2. Read page content to understand what's on screen
3. Take actions step by step
4. Use browser_click with by_text=true when clicking links or buttons by their visible text
5. After completing the task, call task_complete with your result
6. Be concise and efficient - minimize unnecessary actions
7. If something fails, try an alternative approach

Important: Always call task_complete when done with your final answer.`;

export class BrowserAgent {
  private client: Anthropic;
  private browserManager: BrowserManager;
  private model: string;
  private maxIterations: number;
  private verbose: boolean;
  private onProgress?: (progress: TaskProgress) => void;

  constructor(browserManager: BrowserManager, config: AgentConfig = {}) {
    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    });
    this.browserManager = browserManager;
    this.model = config.model || 'claude-haiku-4-5-20251001';
    this.maxIterations = config.maxIterations || 30; // Increased default for longer tasks
    this.verbose = config.verbose || false;
    this.onProgress = config.onProgress;
  }

  /**
   * Execute a tool and return the result
   */
  private async executeTool(name: string, input: Record<string, any>): Promise<string> {
    try {
      switch (name) {
        case 'browser_navigate': {
          const snapshot = await this.browserManager.navigate(input.url);
          return `Navigated to ${input.url}. Page title: ${snapshot.title}`;
        }

        case 'browser_click': {
          const page = this.browserManager.getPage();
          if (!page) throw new Error('Browser not initialized');

          if (input.by_text !== false) {
            await page.getByText(input.target, { exact: false }).first().click();
          } else {
            await page.click(input.target);
          }
          await page.waitForLoadState('domcontentloaded');
          return `Clicked on "${input.target}"`;
        }

        case 'browser_type': {
          const page = this.browserManager.getPage();
          if (!page) throw new Error('Browser not initialized');

          const element = page.locator(input.selector).first();
          await element.fill(input.text);
          if (input.submit) {
            await element.press('Enter');
            await page.waitForLoadState('domcontentloaded');
          }
          return `Typed "${input.text}" into ${input.selector}${input.submit ? ' and submitted' : ''}`;
        }

        case 'browser_get_content': {
          const snapshot = await this.browserManager.getSnapshot();
          // Truncate to avoid token limits
          const content = snapshot.content.slice(0, 6000);
          return `Current URL: ${snapshot.url}\nTitle: ${snapshot.title}\n\nContent:\n${content}`;
        }

        case 'browser_screenshot': {
          const path = await this.browserManager.screenshot();
          return `Screenshot saved to: ${path}`;
        }

        case 'browser_back': {
          const page = this.browserManager.getPage();
          if (!page) throw new Error('Browser not initialized');
          await page.goBack();
          return 'Navigated back';
        }

        case 'task_complete': {
          return `TASK_COMPLETE: ${input.result}`;
        }

        default:
          return `Unknown tool: ${name}`;
      }
    } catch (error: any) {
      return `Error executing ${name}: ${error.message}`;
    }
  }

  /**
   * Run the agent with a task
   * @param task The task to execute
   * @param taskIndex Optional index when running as part of a task list
   * @param totalTasks Optional total number of tasks in the list
   */
  async runTask(task: string, taskIndex: number = 0, totalTasks: number = 1): Promise<TaskResult> {
    const messages: Message[] = [
      { role: 'user', content: task }
    ];
    const actions: string[] = [];
    let iterations = 0;
    let finalResult = '';
    let taskCompleted = false;
    let lastAction = 'Initializing';

    // Initialize browser if not running
    if (!this.browserManager.isRunning()) {
      await this.browserManager.initialize();
    }

    while (iterations < this.maxIterations && !taskCompleted) {
      iterations++;

      if (this.verbose) {
        console.log(`\n--- Iteration ${iterations}/${this.maxIterations} ---`);
      }

      // Report progress during iteration
      if (this.onProgress) {
        this.onProgress({
          taskIndex,
          totalTasks,
          currentTask: task,
          iteration: iterations,
          maxIterations: this.maxIterations,
          lastAction,
          status: 'running'
        });
      }

      // Call Claude
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: BROWSER_TOOLS,
        messages: messages as any
      });

      // Add assistant response to history
      messages.push({
        role: 'assistant',
        content: response.content as ContentBlock[]
      });

      // Check if we're done (no tool use)
      if (response.stop_reason === 'end_turn') {
        // Extract final text
        for (const block of response.content) {
          if (block.type === 'text') {
            finalResult = block.text;
          }
        }
        break;
      }

      // Process tool calls
      if (response.stop_reason === 'tool_use') {
        const toolResults: ToolResult[] = [];

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const toolName = block.name;
            const toolInput = block.input as Record<string, any>;

            if (this.verbose) {
              console.log(`Tool: ${toolName}`);
              console.log(`Input: ${JSON.stringify(toolInput)}`);
            }

            const result = await this.executeTool(toolName, toolInput);
            lastAction = `${toolName}: ${result.slice(0, 80)}`;
            actions.push(`${toolName}: ${JSON.stringify(toolInput)} -> ${result.slice(0, 100)}...`);

            if (this.verbose) {
              console.log(`Result: ${result.slice(0, 200)}...`);
            }

            // Check if task is complete
            if (result.startsWith('TASK_COMPLETE:')) {
              finalResult = result.replace('TASK_COMPLETE:', '').trim();
              taskCompleted = true;
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: result
            });
          }
        }

        messages.push({ role: 'user', content: toolResults });
      }
    }

    return {
      success: taskCompleted || finalResult.length > 0,
      result: finalResult,
      iterations,
      actions
    };
  }

  /**
   * Run multiple tasks sequentially
   * Agent continues working through the list until all tasks are completed
   */
  async runTaskList(tasks: string[]): Promise<TaskListResult> {
    const startTime = Date.now();
    const results: Array<{ task: string; result: TaskResult }> = [];
    let totalIterations = 0;
    let completedTasks = 0;
    let failedTasks = 0;

    console.log(`\n========================================`);
    console.log(`Starting task list: ${tasks.length} tasks`);
    console.log(`========================================\n`);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      console.log(`\n[Task ${i + 1}/${tasks.length}] Starting: "${task.slice(0, 80)}..."`);

      // Report progress
      if (this.onProgress) {
        this.onProgress({
          taskIndex: i,
          totalTasks: tasks.length,
          currentTask: task,
          iteration: 0,
          maxIterations: this.maxIterations,
          lastAction: 'Starting task',
          status: 'running'
        });
      }

      try {
        const result = await this.runTask(task, i, tasks.length);
        results.push({ task, result });
        totalIterations += result.iterations;

        if (result.success) {
          completedTasks++;
          console.log(`[Task ${i + 1}/${tasks.length}] ✅ Completed in ${result.iterations} iterations`);

          if (this.onProgress) {
            this.onProgress({
              taskIndex: i,
              totalTasks: tasks.length,
              currentTask: task,
              iteration: result.iterations,
              maxIterations: this.maxIterations,
              lastAction: result.result.slice(0, 100),
              status: 'completed'
            });
          }
        } else {
          failedTasks++;
          console.log(`[Task ${i + 1}/${tasks.length}] ❌ Failed after ${result.iterations} iterations`);

          if (this.onProgress) {
            this.onProgress({
              taskIndex: i,
              totalTasks: tasks.length,
              currentTask: task,
              iteration: result.iterations,
              maxIterations: this.maxIterations,
              lastAction: `Failed: ${result.result.slice(0, 100)}`,
              status: 'failed'
            });
          }
        }
      } catch (error: any) {
        failedTasks++;
        console.log(`[Task ${i + 1}/${tasks.length}] ❌ Error: ${error.message}`);

        results.push({
          task,
          result: {
            success: false,
            result: `Error: ${error.message}`,
            iterations: 0,
            actions: []
          }
        });

        if (this.onProgress) {
          this.onProgress({
            taskIndex: i,
            totalTasks: tasks.length,
            currentTask: task,
            iteration: 0,
            maxIterations: this.maxIterations,
            lastAction: `Error: ${error.message}`,
            status: 'failed'
          });
        }
      }
    }

    const totalTime = Date.now() - startTime;

    console.log(`\n========================================`);
    console.log(`Task list completed!`);
    console.log(`Total: ${tasks.length} | Success: ${completedTasks} | Failed: ${failedTasks}`);
    console.log(`Total iterations: ${totalIterations} | Time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`========================================\n`);

    return {
      success: failedTasks === 0,
      totalTasks: tasks.length,
      completedTasks,
      failedTasks,
      results,
      totalIterations,
      totalTime
    };
  }

  /**
   * Change the model being used
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Update max iterations for longer tasks
   */
  setMaxIterations(max: number): void {
    this.maxIterations = max;
  }
}

export default BrowserAgent;
