/**
 * Claude AI Agent for Browser Automation
 *
 * Uses Claude Haiku (claude-haiku-4-5-20251015) for cost-effective browser control.
 * Receives natural language tasks and executes them step by step.
 *
 * Includes behavioral anti-detection system:
 * - Each task records patterns used
 * - Next tasks choose DIFFERENT patterns
 * - Avoids repetitive behavior that triggers detection
 *
 * Cost: ~$0.80/1M input tokens, ~$4.00/1M output tokens
 */

import Anthropic from '@anthropic-ai/sdk';
import { BrowserManager } from './browser-manager';
import {
  BehaviorProfile,
  createTaskBehavior,
  saveBehavior
} from './humanization';

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
  // For humanization anti-detection
  projectId?: number;
  taskId?: string;
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
  behaviorUsed?: BehaviorProfile;
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
    name: 'browser_get_tree',
    description: 'Get an accessibility tree of interactive elements on the page. More efficient than browser_get_content. Returns elements with refs (like e42) that can be clicked directly.',
    input_schema: {
      type: 'object' as const,
      properties: {}
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
    name: 'auto_handle_consent',
    description: 'Automatically detect and dismiss GDPR/cookie consent dialogs in any language. Call this if you see a consent popup blocking the page.',
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

CRITICAL - LANGUAGE MATCHING:
You MUST respond in the SAME LANGUAGE as the user's task.
- If the task is in Portuguese: respond in Portuguese
- If the task is in English: respond in English
- If the task is in Spanish: respond in Spanish
- Match the user's language exactly!

Available tools:
- browser_navigate: Go to a URL (automatically handles consent dialogs after navigation)
- browser_click: Click elements (by text or selector)
- browser_type: Type into input fields
- browser_get_content: Read page content
- browser_screenshot: Take a screenshot
- browser_back: Go back in history
- auto_handle_consent: Manually trigger consent dialog handling if needed
- task_complete: Report your final answer with ALL collected data (IN USER'S LANGUAGE!)

Guidelines:
1. Start by navigating to the relevant website
2. Read page content to understand what's on screen
3. Take actions step by step
4. Use browser_click with by_text=true when clicking links or buttons by their visible text
5. After completing the task, call task_complete with your result
6. Be concise and efficient - minimize unnecessary actions
7. If something fails, try an alternative approach

CRITICAL - Handle Cookie Consent & Popups Automatically:
Before starting any task, ALWAYS check for and dismiss cookie consent dialogs, privacy notices, or blocking popups.
Common accept buttons to click (try in order until one works):
- "Accept all" / "Accept All" / "Alle akzeptieren" / "Aceitar tudo" / "Akzeptieren"
- "I agree" / "Ich stimme zu" / "Concordo" / "Agree"
- "Got it" / "OK" / "Continue" / "Weiter"
- "Allow all cookies" / "Alle Cookies erlauben"
- Any button that dismisses the dialog to proceed

If you see a consent dialog or popup:
1. Immediately click the accept/agree button
2. Wait for the dialog to close
3. Then continue with the actual task

CRITICAL - DETAILED RESPONSES:
Your task_complete result MUST include specific details about what you did and found.
Never give vague answers. Always be specific and include:

1. **What you navigated to**: URLs, page titles
2. **What you found/collected**: Actual text, titles, numbers, names
3. **What actions you took**: Clicks, searches, scrolls
4. **Confirmation of completion**: Explicit statement of what was accomplished

EXAMPLES OF GOOD RESPONSES (match the task language!):

Task (PT): "navegue ate o youtube e pesquise sobre AI"
Good response: "Naveguei até youtube.com e pesquisei 'AI'. Os primeiros 5 resultados foram:
1. 'What is Artificial Intelligence?' - 2.3M views
2. 'AI Revolution 2024' - 890K views
3. 'ChatGPT Tutorial' - 1.5M views
..."

Task (EN): "go to google and search for Liftlio"
Good response: "I navigated to google.com and searched for 'Liftlio'. The search results showed:
1. Liftlio.com - Scale Word-of-Mouth Recommendations
2. Liftlio on LinkedIn
3. Reviews about Liftlio
..."

Task (PT): "comente no video X em ingles"
Good response: "Comentei no vídeo 'X' com o seguinte texto em inglês: 'Great video, very informative!'. O comentário foi publicado com sucesso."

Task (EN): "watch 5 videos about machine learning and tell me the titles"
Good response: "I watched 5 videos about machine learning. The titles were:
1. 'Machine Learning Basics' by TechChannel (12:34)
2. 'Neural Networks Explained' by AI Academy (18:22)
3. 'Python ML Tutorial' by CodeMaster (45:10)
4. 'Deep Learning 101' by Stanford Online (1:23:45)
5. 'ML for Beginners' by Google Developers (28:15)"

CRITICAL - Data Collection Tasks:
When the user asks you to collect data (read comments, get video info, extract text, etc.):
1. Use browser_get_content to read the actual content from the page
2. Parse and extract the requested information
3. In task_complete, include ALL the data you collected
4. Never just say "task completed" - always include the actual collected data

Format your result clearly and naturally. Use bullet points or numbered lists when listing multiple items.

Important: Always call task_complete when done with your final answer containing all collected data IN THE USER'S LANGUAGE.`;

export class BrowserAgent {
  private client: Anthropic;
  private browserManager: BrowserManager;
  private model: string;
  private maxIterations: number;
  private verbose: boolean;
  private onProgress?: (progress: TaskProgress) => void;
  private projectId?: number;
  private taskId?: string;
  private currentBehavior?: BehaviorProfile;

  constructor(browserManager: BrowserManager, config: AgentConfig = {}) {
    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    });
    this.browserManager = browserManager;
    this.model = config.model || 'claude-haiku-4-5-20251015';
    this.maxIterations = config.maxIterations || 200; // High default for long tasks (can take hours)
    this.verbose = config.verbose || false;
    this.onProgress = config.onProgress;
    this.projectId = config.projectId;
    this.taskId = config.taskId;
  }

  /**
   * Set project and task IDs for behavior tracking
   */
  setTaskContext(projectId: number, taskId: string): void {
    this.projectId = projectId;
    this.taskId = taskId;
  }

  /**
   * Execute a tool and return the result
   */
  private async executeTool(name: string, input: Record<string, any>): Promise<string> {
    try {
      switch (name) {
        case 'browser_navigate': {
          const snapshot = await this.browserManager.navigate(input.url);

          // Automatically try to handle consent dialogs after navigation
          const consentResult = await this.browserManager.autoHandleConsent();
          const consentMsg = consentResult.handled
            ? ` [Auto-dismissed consent dialog: "${consentResult.buttonClicked}"]`
            : '';

          return `Navigated to ${input.url}. Page title: ${snapshot.title}${consentMsg}`;
        }

        case 'auto_handle_consent': {
          const result = await this.browserManager.autoHandleConsent();
          if (result.handled) {
            return `Successfully dismissed consent dialog by clicking "${result.buttonClicked}"`;
          } else {
            return 'No consent dialog found or all attempts failed';
          }
        }

        case 'browser_click': {
          const page = this.browserManager.getPage();
          if (!page) throw new Error('Browser not initialized');

          const target = input.target;

          // Support clicking by semantic ref (e.g., 'button[aria-label="Compose"]', 'role=button:Compose', 'text=Compose')
          // Also supports fallback refs (e.g., 'e42')
          const isSemanticRef = target.includes('[') || target.startsWith('#') ||
                               target.startsWith('role=') || target.startsWith('text=') ||
                               /^e\d+$/.test(target);

          if (isSemanticRef) {
            try {
              await this.browserManager.clickByRef(target);
              return `Clicked element [${target}]`;
            } catch (e) {
              console.log(`Semantic ref click failed for "${target}", trying fallbacks...`);
            }
          }

          // Fallback cascade for when semantic refs fail or direct text/selector is provided
          const strategies: Array<{ name: string; fn: () => Promise<void> }> = [];

          // Strategy 1: Click by visible text (most reliable for SPAs)
          strategies.push({
            name: 'text',
            fn: async () => {
              await page.getByText(target, { exact: false }).first().click({ timeout: 5000 });
            }
          });

          // Strategy 2: Click by role (button/link) with name
          strategies.push({
            name: 'role',
            fn: async () => {
              await page.getByRole('button', { name: target }).or(
                page.getByRole('link', { name: target })
              ).first().click({ timeout: 5000 });
            }
          });

          // Strategy 3: Click by CSS selector
          strategies.push({
            name: 'selector',
            fn: async () => {
              await page.click(target, { timeout: 5000 });
            }
          });

          // Strategy 4: Click by aria-label
          strategies.push({
            name: 'aria-label',
            fn: async () => {
              await page.locator(`[aria-label*="${target}" i]`).first().click({ timeout: 5000 });
            }
          });

          // Execute strategies in cascade
          let lastError: Error | null = null;
          for (const strategy of strategies) {
            try {
              console.log(`  Trying click strategy: ${strategy.name}`);
              await strategy.fn();
              await page.waitForLoadState('domcontentloaded').catch(() => {});
              return `Clicked on "${target}" (via ${strategy.name})`;
            } catch (e) {
              lastError = e as Error;
              // Continue to next strategy
            }
          }

          throw lastError || new Error(`Failed to click: ${target}`);
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
          // Use accessibility tree for efficient token usage (~50% reduction)
          try {
            const tree = await this.browserManager.getAccessibilitySnapshot();
            const url = this.browserManager.getCurrentUrl();
            const page = this.browserManager.getPage();
            const title = page ? await page.title() : '';

            // Format tree compactly
            const formatTree = (node: any, indent: string = ''): string => {
              let result = '';
              if (node.text || node.tag === 'a' || node.tag === 'button' || node.tag === 'input') {
                result = `${indent}[${node.ref}] ${node.tag}`;
                if (node.text) result += `: "${node.text}"`;
                if (node.rect) result += ` @(${node.rect.x},${node.rect.y})`;
                result += '\n';
              }
              if (node.children) {
                for (const child of node.children) {
                  result += formatTree(child, indent + '  ');
                }
              }
              return result;
            };

            const treeContent = formatTree(tree).slice(0, 3000);
            return `URL: ${url}\nTitle: ${title}\n\nElements (use [ref] to click):\n${treeContent}`;
          } catch (e) {
            // Fallback to old method if tree fails
            const snapshot = await this.browserManager.getSnapshot();
            const content = snapshot.content.slice(0, 4000);
            return `Current URL: ${snapshot.url}\nTitle: ${snapshot.title}\n\nContent:\n${content}`;
          }
        }

        case 'browser_get_tree': {
          const tree = await this.browserManager.getAccessibilitySnapshot();
          const url = this.browserManager.getCurrentUrl();
          const page = this.browserManager.getPage();
          const title = page ? await page.title() : '';

          const formatTree = (node: any, indent: string = ''): string => {
            let result = '';
            if (node.text || node.tag === 'a' || node.tag === 'button' || node.tag === 'input') {
              result = `${indent}[${node.ref}] ${node.tag}`;
              if (node.text) result += `: "${node.text}"`;
              if (node.rect) result += ` @(${node.rect.x},${node.rect.y})`;
              result += '\n';
            }
            if (node.children) {
              for (const child of node.children) {
                result += formatTree(child, indent + '  ');
              }
            }
            return result;
          };

          const treeContent = formatTree(tree).slice(0, 3000);
          return `URL: ${url}\nTitle: ${title}\n\nElements (click by [ref]):\n${treeContent}`;
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
   * Truncate message history to reduce token usage
   * Keeps first message (task) + recent messages, summarizes middle
   */
  private truncateHistory(messages: Message[]): Message[] {
    if (messages.length <= 10) return messages;

    // Keep first message (original task) + last 8 messages
    const first = messages[0];
    const recent = messages.slice(-8);

    // Create summary of skipped iterations
    const skipped = messages.length - 9;
    const summary: Message = {
      role: 'user',
      content: `[Summary: ${skipped} previous iterations completed - navigation and interactions performed]`
    };

    console.log(`📊 Token optimization: Truncated ${skipped} messages from history`);
    return [first, summary, ...recent];
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

    // Setup humanization behavior profile (anti-detection)
    if (this.projectId) {
      try {
        this.currentBehavior = await createTaskBehavior(this.projectId);
        this.browserManager.setBehaviorProfile(this.currentBehavior);
        console.log(`🎭 Anti-detection: Using behavior profile different from last ${5} tasks`);
        console.log(`   Mouse: ${this.currentBehavior.mouse}, Typing: ${this.currentBehavior.typing}`);
        console.log(`   Scroll: ${this.currentBehavior.scroll}, Delay: ${this.currentBehavior.delay}`);
      } catch (e) {
        console.log('⚠️ Could not setup behavior profile, using defaults');
      }
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

      // Truncate history to save tokens on long tasks
      const optimizedMessages = this.truncateHistory(messages);

      // Call Claude
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: BROWSER_TOOLS,
        messages: optimizedMessages as any
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

    // Save behavior profile to database for anti-detection tracking
    if (this.taskId && this.currentBehavior) {
      try {
        await saveBehavior(this.taskId, this.currentBehavior);
        console.log(`💾 Saved behavior profile to task ${this.taskId}`);
      } catch (e) {
        console.log('⚠️ Could not save behavior profile');
      }
    }

    return {
      success: taskCompleted || finalResult.length > 0,
      result: finalResult,
      iterations,
      actions,
      behaviorUsed: this.currentBehavior
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
