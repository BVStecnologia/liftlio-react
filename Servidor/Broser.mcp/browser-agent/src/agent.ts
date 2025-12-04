/**
 * Claude AI Agent for Browser Automation
 *
 * Uses Claude Haiku (claude-haiku-4-5-20251001) for cost-effective browser control.
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
    name: 'browser_wait',
    description: 'Wait for a specified number of seconds. Use this to wait for page loads, animations, or to simulate watching video content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        seconds: {
          type: 'number',
          description: 'Number of seconds to wait (max 60)'
        }
      },
      required: ['seconds']
    }
  },
  {
    name: 'browser_scroll',
    description: 'Scroll the page up or down by a specified amount. Use this to load more content or navigate long pages.',
    input_schema: {
      type: 'object' as const,
      properties: {
        direction: {
          type: 'string',
          description: 'Direction to scroll: up or down',
          enum: ['up', 'down']
        },
        amount: {
          type: 'number',
          description: 'Amount to scroll in pixels (default 500)'
        }
      },
      required: ['direction']
    }
  },
  {
    name: 'browser_press_key',
    description: 'Press a keyboard key. Use for Enter, Escape, Tab, ArrowDown, ArrowUp, Backspace, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        key: {
          type: 'string',
          description: 'The key to press (e.g., Enter, Escape, Tab, ArrowDown, ArrowUp, Backspace, Delete, Space, F1-F12)'
        }
      },
      required: ['key']
    }
  },
  {
    name: 'browser_hover',
    description: 'Hover the mouse over an element. Useful for triggering dropdown menus or tooltips.',
    input_schema: {
      type: 'object' as const,
      properties: {
        target: {
          type: 'string',
          description: 'The text content of the element or CSS selector to hover over'
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
    name: 'browser_select_option',
    description: 'Select an option from a dropdown/select element.',
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the select element'
        },
        value: {
          type: 'string',
          description: 'The value or visible text of the option to select'
        },
        by_value: {
          type: 'boolean',
          description: 'If true, selects by value attribute. If false, selects by visible text.',
          default: false
        }
      },
      required: ['selector', 'value']
    }
  },
  {
    name: 'browser_tabs',
    description: 'Manage browser tabs: list, create new, close, or switch between tabs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          description: 'Action to perform: list, new, close, switch',
          enum: ['list', 'new', 'close', 'switch']
        },
        index: {
          type: 'number',
          description: 'Tab index for switch/close actions (0-based)'
        },
        url: {
          type: 'string',
          description: 'URL to open in new tab (optional, for new action)'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'browser_evaluate',
    description: 'Execute JavaScript code in the browser context. Returns the result of the expression.',
    input_schema: {
      type: 'object' as const,
      properties: {
        script: {
          type: 'string',
          description: 'JavaScript code to execute in the browser'
        }
      },
      required: ['script']
    }
  },
  {
    name: 'browser_drag',
    description: 'Drag an element from one position to another.',
    input_schema: {
      type: 'object' as const,
      properties: {
        source: {
          type: 'string',
          description: 'CSS selector or text of the element to drag'
        },
        target: {
          type: 'string',
          description: 'CSS selector or text of the target element to drop on'
        }
      },
      required: ['source', 'target']
    }
  },
  {
    name: 'browser_file_upload',
    description: 'Upload a file to a file input element.',
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the file input element'
        },
        filepath: {
          type: 'string',
          description: 'Path to the file to upload'
        }
      },
      required: ['selector', 'filepath']
    }
  },
  {
    name: 'browser_wait_for',
    description: 'Wait for an element to appear, text to be visible, or element to disappear.',
    input_schema: {
      type: 'object' as const,
      properties: {
        target: {
          type: 'string',
          description: 'CSS selector or text to wait for'
        },
        state: {
          type: 'string',
          description: 'Wait for element to be: visible, hidden, attached, detached',
          enum: ['visible', 'hidden', 'attached', 'detached']
        },
        timeout: {
          type: 'number',
          description: 'Maximum time to wait in milliseconds (default 30000)'
        }
      },
      required: ['target']
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
- browser_wait: Wait for specified seconds (page loads, watching video)
- browser_scroll: Scroll page up or down by pixel amount
- browser_press_key: Press keyboard keys (Enter, Escape, Tab, ArrowDown, etc.)
- browser_hover: Hover mouse over an element (for dropdown menus, tooltips)
- browser_select_option: Select an option from a dropdown
- browser_tabs: Manage browser tabs (list, new, close, switch)
- browser_evaluate: Execute JavaScript in the browser
- browser_drag: Drag and drop elements
- browser_file_upload: Upload files to file inputs
- browser_wait_for: Wait for an element to appear or disappear
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

CRITICAL - CLICKING ON YOUTUBE VIDEOS:
On YouTube, to click on a video result:
- Use browser_click with the EXACT video title text as target and by_text=true
- Example: browser_click({ target: "The Amazing Video Title", by_text: true })
- NEVER use CSS selectors like #video-title or div[id="video-title"]
- Read the video titles from browser_get_content first, then use the exact title text
- The first video title in search results is usually what you want

CRITICAL - CLICKING BEST PRACTICES:
- ALWAYS prefer visible text over CSS selectors
- When clicking links, buttons, or videos: use by_text=true with the exact visible text
- Only use CSS selectors as a last resort when visible text is not available
- If click fails with visible text, try a shorter/partial version of the text

CRITICAL - YOUTUBE INTERACTION GUIDE:
When interacting with YouTube videos, use these EXACT patterns:

1. **LIKE BUTTON** (thumbs up icon):
   - Use: browser_click({ target: "like this video", by_text: false })
   - This finds the button by aria-label containing "like this video"
   - DO NOT use "Like" as target - it won't work!

2. **DISLIKE BUTTON**:
   - Use: browser_click({ target: "dislike this video", by_text: false })

3. **SUBSCRIBE BUTTON**:
   - Use: browser_click({ target: "Subscribe", by_text: true })

4. **VIEW COMMENTS**:
   - First scroll down to load comments: browser_scroll({ direction: "down", amount: 800 })
   - Wait for comments: browser_wait({ seconds: 3 })
   - Scroll more if needed: browser_scroll({ direction: "down", amount: 400 })

5. **WRITE A COMMENT** (requires being logged in):
   - Click comment box: browser_click({ target: "Add a comment", by_text: true })
   - Wait: browser_wait({ seconds: 1 })
   - Type comment: browser_type({ selector: "#contenteditable-root", text: "Your comment text" })
   - Submit: browser_click({ target: "Comment", by_text: true })

6. **WATCH VIDEO** (simulate watching):
   - Use browser_wait({ seconds: 30 }) to watch for 30 seconds
   - YouTube counts views after about 30 seconds

7. **CHANNEL PAGE**:
   - Navigate directly: browser_navigate({ url: "https://www.youtube.com/@channelname" })
   - Or click channel name below video title

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

Important: Always call task_complete when done with your final answer containing all collected data IN THE USER'S LANGUAGE.

CRITICAL - EFFICIENCY & FOCUS:
You have LIMITED iterations (typically 30-50). Be EXTREMELY efficient:
1. **NO WANDERING** - Go directly to the goal. Don't explore, don't check multiple pages unless asked.
2. **ONE TOOL PER STEP** - Make one action, observe result, decide next action.
3. **DON'T REPEAT ACTIONS** - If an action fails twice, try a different approach immediately.
4. **FINISH FAST** - Once goal is achieved, call task_complete immediately.
5. **STAY FOCUSED** - If asked to "like a video", don't browse comments unless asked.

EFFICIENCY EXAMPLES:
- Task: "Like a video about AI" → Navigate → Search → Click first video → Like → Done (5 steps)
- Task: "Comment on a video" → Navigate → Find video → Click → Scroll to comments → Type → Submit → Done (7 steps)

BAD PATTERNS (AVOID):
- Reading page content repeatedly without taking action
- Scrolling up and down multiple times
- Clicking same element repeatedly
- Going to related videos when task is about specific video
- Taking screenshots unnecessarily
- Using browser_screenshot more than once per task (use browser_get_content instead)

YOUTUBE SPECIFIC - LANGUAGE AGNOSTIC SELECTORS:
YouTube interface may be in ANY language (PT, EN, ES, etc.). NEVER rely on text for YouTube actions.
Use ARIA labels and CSS selectors instead:

1. **LIKE BUTTON** (works in any language):
   - Use: browser_click({ target: "like this video", by_text: false })
   - This uses aria-label which is consistent

2. **DISLIKE BUTTON**:
   - Use: browser_click({ target: "Dislike this video", by_text: false })

3. **SUBSCRIBE BUTTON**:
   - Use: browser_click({ target: "Subscribe", by_text: true }) OR
   - Use: browser_click({ target: "#subscribe-button", by_text: false })

4. **COMMENT BOX** (CRITICAL - use JavaScript for reliability):
   - First scroll down: browser_scroll({ direction: "down", amount: 800 })
   - Wait: browser_wait({ seconds: 2 })
   - Use browser_evaluate to click and focus the comment box:
     browser_evaluate({ script: "document.querySelector('#placeholder-area, #simplebox-placeholder, ytd-comment-simplebox-renderer #placeholder-area')?.click(); 'clicked'" })
   - Then type using: browser_type({ selector: "#contenteditable-root", text: "your comment", submit: false })
   - Submit with: browser_press_key({ key: "Tab" }) then browser_press_key({ key: "Enter" })
   - OR click submit: browser_click({ target: "#submit-button", by_text: false })

5. **SEARCH BAR**:
   - Use: browser_type({ selector: "input[name='search_query']", text: "query", submit: true })
   - OR: browser_click({ target: "Pesquisar", by_text: true }) for PT
   - OR: browser_click({ target: "Search", by_text: true }) for EN

6. **VIDEO PLAYER - PLAY/PAUSE**:
   - Use: browser_evaluate({ script: "document.querySelector('.html5-video-player video')?.play(); 'playing'" })
   - OR: browser_click({ target: ".ytp-play-button", by_text: false })

7. **FILTER RESULTS BY TODAY**:
   - After search, add &sp=EgIIAxgB to URL for "uploaded today" filter
   - Example: browser_navigate({ url: "https://www.youtube.com/results?search_query=AI&sp=EgIIAxgB" })

IMPORTANT FOR COMMENTS:
- User MUST be logged in to comment
- If you see "Sign in" or "Fazer login" when trying to comment, the task cannot be completed
- Always scroll to comments section BEFORE trying to click comment box
- The comment box only becomes active after clicking on it`;

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
    this.model = config.model || 'claude-haiku-4-5-20251001';
    this.maxIterations = config.maxIterations || 50; // Reasonable default for most tasks
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

          // Human-like delay after navigation (3-6 seconds as recommended by research)
          const navDelay = 3000 + Math.random() * 3000;
          await new Promise(r => setTimeout(r, navDelay));

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
          const targetLower = target.toLowerCase();

          // ============================================================
          // DOCKER-OPTIMIZED CLICK STRATEGY (2024 YouTube Selectors)
          // Based on research: dispatchEvent > evaluate > force > coords
          // ============================================================

          /**
           * Helper: Click using dispatchEvent (most reliable in Docker)
           */
          const clickViaDispatchEvent = async (selector: string): Promise<boolean> => {
            try {
              const clicked = await page.evaluate((sel: string) => {
                const el = document.querySelector(sel) as HTMLElement;
                if (el && el.offsetParent !== null) {
                  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                  return true;
                }
                return false;
              }, selector);
              return clicked;
            } catch {
              return false;
            }
          };

          /**
           * Helper: Click using page.evaluate el.click() (browser context)
           */
          const clickViaEvaluate = async (selector: string): Promise<boolean> => {
            try {
              const clicked = await page.evaluate((sel: string) => {
                const el = document.querySelector(sel) as HTMLElement;
                if (el && el.offsetParent !== null) {
                  el.click();
                  return true;
                }
                return false;
              }, selector);
              return clicked;
            } catch {
              return false;
            }
          };

          /**
           * Helper: Click using Playwright with force:true
           */
          const clickViaForce = async (selector: string): Promise<boolean> => {
            try {
              await page.locator(selector).first().click({ force: true, timeout: 3000 });
              return true;
            } catch {
              return false;
            }
          };

          /**
           * Helper: Human-like delay (500ms-2s between clicks as recommended)
           */
          const humanClickDelay = async (): Promise<void> => {
            const delay = 500 + Math.random() * 1500;
            await new Promise(r => setTimeout(r, delay));
          };

          /**
           * Helper: Hierarchical click - tries all methods
           */
          const hierarchicalClick = async (selectors: string[], description: string): Promise<string | null> => {
            for (const selector of selectors) {
              console.log(`  🎯 Trying ${description}: ${selector}`);

              // Strategy 1: dispatchEvent (most reliable in Docker)
              if (await clickViaDispatchEvent(selector)) {
                console.log(`    ✅ dispatchEvent worked!`);
                await humanClickDelay(); // Human-like delay after successful click
                return `Clicked "${description}" via dispatchEvent [${selector}]`;
              }

              // Strategy 2: page.evaluate el.click()
              if (await clickViaEvaluate(selector)) {
                console.log(`    ✅ evaluate.click() worked!`);
                await humanClickDelay(); // Human-like delay after successful click
                return `Clicked "${description}" via evaluate [${selector}]`;
              }

              // Strategy 3: Playwright force click
              if (await clickViaForce(selector)) {
                console.log(`    ✅ force click worked!`);
                await humanClickDelay(); // Human-like delay after successful click
                return `Clicked "${description}" via force [${selector}]`;
              }
            }
            return null;
          };

          // ============================================================
          // YOUTUBE 2024 SELECTORS (Updated from research)
          // ============================================================

          // YOUTUBE LIKE BUTTON (multiple selector patterns)
          if (targetLower.includes('like') && !targetLower.includes('dislike')) {
            console.log(`  🎬 YouTube Like Button detected`);
            const likeSelectors = [
              // 2024 YouTube selectors (from research)
              'like-button-view-model button',
              '#segmented-like-button button',
              'ytd-menu-renderer yt-button-shape button[aria-label*="like" i]',
              'button[aria-label*="like this video" i]',
              '#top-level-buttons-computed like-button-view-model button',
              'ytd-segmented-like-dislike-button-renderer #segmented-like-button button',
              // Legacy selectors
              '#like-button button',
              'ytd-toggle-button-renderer:has(#button[aria-label*="like" i]) button',
              '[aria-label*="like" i]:not([aria-label*="dislike" i])'
            ];

            const result = await hierarchicalClick(likeSelectors, 'Like button');
            if (result) {
              await page.waitForLoadState('domcontentloaded').catch(() => {});
              return result;
            }
          }

          // YOUTUBE DISLIKE BUTTON
          if (targetLower.includes('dislike')) {
            console.log(`  🎬 YouTube Dislike Button detected`);
            const dislikeSelectors = [
              'dislike-button-view-model button',
              '#segmented-dislike-button button',
              'button[aria-label*="dislike" i]',
              'ytd-segmented-like-dislike-button-renderer #segmented-dislike-button button'
            ];

            const result = await hierarchicalClick(dislikeSelectors, 'Dislike button');
            if (result) {
              await page.waitForLoadState('domcontentloaded').catch(() => {});
              return result;
            }
          }

          // YOUTUBE SUBSCRIBE BUTTON
          if (targetLower.includes('subscribe') || targetLower.includes('inscrever')) {
            console.log(`  🎬 YouTube Subscribe Button detected`);
            const subscribeSelectors = [
              'yt-subscribe-button-view-model button',
              '#subscribe-button button',
              'ytd-subscribe-button-renderer button',
              '#subscribe-button yt-button-shape button',
              'button[aria-label*="subscribe" i]',
              'button[aria-label*="inscrever" i]'
            ];

            const result = await hierarchicalClick(subscribeSelectors, 'Subscribe button');
            if (result) {
              await page.waitForLoadState('domcontentloaded').catch(() => {});
              return result;
            }
          }

          // YOUTUBE COMMENT SUBMIT BUTTON (MUST be checked BEFORE comment box!)
          // This handles clicking the "Comment" button to SUBMIT a comment
          // Target is exactly "Comment" or "Comentar" (the submit button text)
          const isSubmitComment = (
            target.toLowerCase() === 'comment' ||
            target.toLowerCase() === 'comentar' ||
            target.toLowerCase() === 'comentário' ||
            targetLower.includes('submit') ||
            target === '#submit-button'
          );

          if (isSubmitComment) {
            console.log(`  🎬 YouTube Comment SUBMIT Button detected`);
            const submitSelectors = [
              // 2024 YouTube comment submit button selectors
              '#submit-button button',
              '#submit-button',
              'ytd-button-renderer#submit-button button',
              'ytd-comments #submit-button button',
              '#comment-dialog #submit-button button',
              // Reply submit button
              '#reply-button-end #submit-button button',
              // Aria-label based (language agnostic)
              'button[aria-label*="Comment" i]:not([aria-label*="Add" i])',
              'button[aria-label*="Comentar" i]',
              // Class-based fallback
              '.ytd-commentbox #submit-button button',
              'ytd-comment-simplebox-renderer #submit-button button'
            ];

            const result = await hierarchicalClick(submitSelectors, 'Comment Submit button');
            if (result) {
              // Wait for comment to be posted
              await new Promise(r => setTimeout(r, 2000));
              await page.waitForLoadState('domcontentloaded').catch(() => {});
              return result;
            }

            // If hierarchical click failed, try JavaScript click as last resort
            console.log(`  ⚠️ Trying JavaScript fallback for submit button`);
            const jsClicked = await page.evaluate(() => {
              // Find submit button by multiple strategies
              const selectors = [
                '#submit-button button',
                '#submit-button',
                'ytd-button-renderer#submit-button button'
              ];
              for (const sel of selectors) {
                const btn = document.querySelector(sel) as HTMLElement;
                if (btn && btn.offsetParent !== null) {
                  btn.click();
                  return true;
                }
              }
              // Try finding by text content
              const buttons = Array.from(document.querySelectorAll('button, ytd-button-renderer'));
              for (const btn of buttons) {
                const text = btn.textContent?.trim().toLowerCase();
                if (text === 'comment' || text === 'comentar') {
                  (btn as HTMLElement).click();
                  return true;
                }
              }
              return false;
            });

            if (jsClicked) {
              await new Promise(r => setTimeout(r, 2000));
              return `Clicked "Comment Submit" via JavaScript fallback`;
            }
          }

          // YOUTUBE COMMENT BOX (for OPENING/FOCUSING the comment input)
          // Only triggers for "add a comment", "adicionar comentário", etc.
          const isOpenCommentBox = (
            targetLower.includes('add a comment') ||
            targetLower.includes('adicionar') ||
            targetLower.includes('escrever') ||
            targetLower.includes('placeholder') ||
            targetLower.includes('comment box') ||
            targetLower.includes('caixa de comentário')
          );

          if (isOpenCommentBox) {
            console.log(`  🎬 YouTube Comment Box (OPEN/FOCUS) detected`);
            const commentSelectors = [
              '#contenteditable-root',
              '#placeholder-area',
              '#simplebox-placeholder',
              'ytd-comment-simplebox-renderer #placeholder-area',
              '[contenteditable="true"]',
              '#contenteditable-textarea'
            ];

            // First scroll to comments
            await page.evaluate(() => {
              const comments = document.querySelector('#comments, ytd-comments');
              if (comments) comments.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            await new Promise(r => setTimeout(r, 1000));

            const result = await hierarchicalClick(commentSelectors, 'Comment box');
            if (result) {
              return result;
            }
          }

          // YOUTUBE VIDEO CLICK (search results, thumbnails)
          if (targetLower.includes('video') || targetLower.includes('first') || targetLower.includes('primeiro')) {
            console.log(`  🎬 YouTube Video Click detected`);

            // Strategy 1: Extract URL and navigate (most reliable)
            const videoUrl = await page.evaluate(() => {
              // Find first visible video result
              const videoRenderers = Array.from(document.querySelectorAll('ytd-video-renderer, ytd-rich-item-renderer'));
              for (const renderer of videoRenderers) {
                const link = renderer.querySelector('a#thumbnail, a#video-title-link, a#video-title') as HTMLAnchorElement;
                if (link && link.href && link.offsetParent !== null) {
                  return link.href;
                }
              }
              // Fallback: any video link
              const anyVideo = document.querySelector('a#thumbnail[href*="/watch"]') as HTMLAnchorElement;
              return anyVideo?.href || null;
            });

            if (videoUrl) {
              console.log(`    ✅ Found video URL: ${videoUrl}`);
              await page.goto(videoUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
              return `Clicked video via URL navigation: ${videoUrl}`;
            }

            // Strategy 2: dispatchEvent on thumbnail
            const thumbnailSelectors = [
              'ytd-video-renderer a#thumbnail',
              'ytd-rich-item-renderer a#thumbnail',
              'ytd-video-renderer #dismissible',
              '#contents ytd-video-renderer:first-child a#thumbnail'
            ];

            const result = await hierarchicalClick(thumbnailSelectors, 'Video thumbnail');
            if (result) {
              await page.waitForLoadState('domcontentloaded').catch(() => {});
              return result;
            }
          }

          // YOUTUBE WATCH LATER
          if (targetLower.includes('watch later') || targetLower.includes('assistir mais tarde')) {
            console.log(`  🎬 YouTube Watch Later detected`);
            const watchLaterSelectors = [
              'button[aria-label*="Watch later" i]',
              'button[aria-label*="assistir mais tarde" i]',
              '#menu button[aria-label*="save" i]',
              'ytd-menu-renderer button:first-child'
            ];

            const result = await hierarchicalClick(watchLaterSelectors, 'Watch Later');
            if (result) {
              return result;
            }
          }

          // ============================================================
          // GENERIC CLICK STRATEGIES (fallback for non-YouTube elements)
          // ============================================================

          // Detect if target looks like a CSS selector
          const looksLikeCSSSelector =
            target.includes('[') ||
            target.startsWith('#') ||
            target.includes('#') ||
            target.startsWith('.') ||
            target.includes('.') ||
            target.includes('>') ||
            target.includes(':') ||
            target.startsWith('role=') ||
            target.startsWith('text=') ||
            /^e\d+$/.test(target) ||
            /^[a-z]+#[a-z-]+$/i.test(target) ||
            /^ytd-[a-z-]+$/i.test(target);

          // If it's a CSS selector, try hierarchical click first
          if (looksLikeCSSSelector) {
            console.log(`  Target "${target}" looks like CSS selector`);
            const result = await hierarchicalClick([target], 'CSS selector');
            if (result) {
              await page.waitForLoadState('domcontentloaded').catch(() => {});
              return result;
            }

            // Try semantic ref if hierarchical failed
            try {
              await this.browserManager.clickByRef(target);
              return `Clicked element [${target}] (via semantic ref)`;
            } catch (e) {
              console.log(`  Semantic ref also failed for "${target}"`);
            }
          }

          // Generic fallback strategies
          const strategies: Array<{ name: string; fn: () => Promise<void> }> = [];

          // Strategy: Link containing text
          strategies.push({
            name: 'link',
            fn: async () => {
              await page.locator(`a:has-text("${target}")`).first().click({ timeout: 5000 });
            }
          });

          // Strategy: Click by visible text with dispatchEvent
          strategies.push({
            name: 'text-dispatchEvent',
            fn: async () => {
              const clicked = await page.evaluate((searchText: string) => {
                const elements = Array.from(document.querySelectorAll('button, a, [role="button"], [onclick]'));
                for (const el of elements) {
                  if (el.textContent?.toLowerCase().includes(searchText.toLowerCase()) && (el as HTMLElement).offsetParent !== null) {
                    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    return true;
                  }
                }
                return false;
              }, target);
              if (!clicked) throw new Error('Text not found');
            }
          });

          // Strategy: Click by visible text (Playwright)
          strategies.push({
            name: 'text',
            fn: async () => {
              await page.getByText(target, { exact: false }).first().click({ timeout: 5000 });
            }
          });

          // Strategy: Click by role (button/link)
          strategies.push({
            name: 'role',
            fn: async () => {
              await page.getByRole('button', { name: target }).or(
                page.getByRole('link', { name: target })
              ).first().click({ timeout: 5000 });
            }
          });

          // Strategy: Click by aria-label
          strategies.push({
            name: 'aria-label',
            fn: async () => {
              await page.locator(`[aria-label*="${target}" i]`).first().click({ timeout: 5000 });
            }
          });

          // Strategy: Click by title attribute
          strategies.push({
            name: 'title',
            fn: async () => {
              await page.locator(`[title*="${target}" i]`).first().click({ timeout: 5000 });
            }
          });

          // Strategy: Any clickable element
          strategies.push({
            name: 'clickable',
            fn: async () => {
              await page.locator(`button:has-text("${target}"), a:has-text("${target}"), [role="button"]:has-text("${target}")`).first().click({ timeout: 5000 });
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

          // Smart typing: try multiple strategies to find the input element
          const strategies = [
            // 1. Try as CSS selector if it looks like one
            async () => {
              if (input.selector && (input.selector.includes('[') || input.selector.includes('.') || input.selector.includes('#') || input.selector.includes('input') || input.selector.includes('textarea'))) {
                const element = page.locator(input.selector).first();
                await element.click({ timeout: 3000 });
                await element.fill(input.text);
                return element;
              }
              throw new Error('Not a CSS selector');
            },
            // 2. Try to find input by placeholder text
            async () => {
              const element = page.locator(`input[placeholder*="${input.selector}" i], textarea[placeholder*="${input.selector}" i]`).first();
              await element.click({ timeout: 3000 });
              await element.fill(input.text);
              return element;
            },
            // 3. Try to find by aria-label
            async () => {
              const element = page.locator(`[aria-label*="${input.selector}" i]`).first();
              await element.click({ timeout: 3000 });
              await element.fill(input.text);
              return element;
            },
            // 4. Find any visible textarea (for search boxes like Google, YouTube)
            async () => {
              const element = page.locator('textarea:visible').first();
              await element.click({ timeout: 3000 });
              await element.fill(input.text);
              return element;
            },
            // 5. Find search input
            async () => {
              const element = page.locator('input[type="search"]:visible, input[name="q"]:visible, input[name="search_query"]:visible').first();
              await element.click({ timeout: 3000 });
              await element.fill(input.text);
              return element;
            },
            // 6. Find any visible text input
            async () => {
              const element = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
              await element.click({ timeout: 3000 });
              await element.fill(input.text);
              return element;
            }
          ];

          let element: any = null;
          let lastError = '';
          for (const strategy of strategies) {
            try {
              element = await strategy();
              break;
            } catch (e: any) {
              lastError = e.message;
              // Continue to next strategy
            }
          }

          if (!element) {
            throw new Error(`Could not find input element for "${input.selector}": ${lastError}`);
          }

          if (input.submit) {
            await element.press('Enter');
            await page.waitForLoadState('domcontentloaded').catch(() => {});
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
          // Use Playwright's native ariaSnapshot - 70-80% more efficient than custom tree
          // This is exactly what Browser MCP uses for high reliability
          try {
            const ariaSnapshot = await this.browserManager.getAriaSnapshot();
            const url = this.browserManager.getCurrentUrl();
            const page = this.browserManager.getPage();
            const title = page ? await page.title() : '';

            // Truncate to save tokens but keep enough context
            const truncated = ariaSnapshot.slice(0, 4000);
            return `URL: ${url}\nTitle: ${title}\n\nAccessibility Tree:\n${truncated}`;
          } catch (e) {
            // Fallback to custom tree if ariaSnapshot fails
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

        case 'browser_wait': {
          const seconds = Math.min(parseInt(input.seconds) || 2, 60);
          await new Promise(resolve => setTimeout(resolve, seconds * 1000));
          return `Waited ${seconds} seconds`;
        }

        case 'browser_scroll': {
          const page = this.browserManager.getPage();
          if (!page) throw new Error('Browser not initialized');
          const direction = input.direction || 'down';
          const amount = parseInt(input.amount) || 500;
          await page.evaluate((scrollY) => window.scrollBy(0, scrollY), direction === 'up' ? -amount : amount);
          return `Scrolled ${direction} by ${amount}px`;
        }


        case 'browser_press_key': {
          const page = this.browserManager.getPage();
          if (!page) throw new Error('Browser not initialized');
          await page.keyboard.press(input.key);
          return `Pressed key: ${input.key}`;
        }

        case 'browser_hover': {
          const page = this.browserManager.getPage();
          if (!page) throw new Error('Browser not initialized');
          const target = input.target;
          const byText = input.by_text !== false;
          
          if (byText) {
            await page.getByText(target, { exact: false }).first().hover({ timeout: 5000 });
          } else {
            await page.locator(target).first().hover({ timeout: 5000 });
          }
          return `Hovered over "${target}"`;
        }

        case 'browser_select_option': {
          const page = this.browserManager.getPage();
          if (!page) throw new Error('Browser not initialized');
          const selector = input.selector;
          const value = input.value;
          const byValue = input.by_value === true;
          
          if (byValue) {
            await page.locator(selector).selectOption({ value });
          } else {
            await page.locator(selector).selectOption({ label: value });
          }
          return `Selected "${value}" from ${selector}`;
        }

        case 'browser_tabs': {
          const page = this.browserManager.getPage();
          const context = page?.context();
          if (!context) throw new Error('Browser not initialized');
          
          const action = input.action;
          const pages = context.pages();
          
          switch (action) {
            case 'list':
              const tabInfo = pages.map((p, i) => `[${i}] ${p.url()}`).join('\n');
              return `Open tabs:\n${tabInfo}`;
            case 'new':
              const newPage = await context.newPage();
              if (input.url) await newPage.goto(input.url);
              return `Opened new tab${input.url ? ' at ' + input.url : ''}`;
            case 'close':
              const indexToClose = input.index ?? pages.length - 1;
              if (indexToClose >= 0 && indexToClose < pages.length) {
                await pages[indexToClose].close();
                return `Closed tab ${indexToClose}`;
              }
              throw new Error(`Invalid tab index: ${indexToClose}`);
            case 'switch':
              const indexToSwitch = input.index ?? 0;
              if (indexToSwitch >= 0 && indexToSwitch < pages.length) {
                await pages[indexToSwitch].bringToFront();
                // Note: Page reference is managed internally by BrowserManager
                return `Switched to tab ${indexToSwitch}: ${pages[indexToSwitch].url()}`;
              }
              throw new Error(`Invalid tab index: ${indexToSwitch}`);
            default:
              throw new Error(`Unknown tab action: ${action}`);
          }
        }

        case 'browser_evaluate': {
          const page = this.browserManager.getPage();
          if (!page) throw new Error('Browser not initialized');
          const result = await page.evaluate(input.script);
          return `JavaScript result: ${JSON.stringify(result)}`;
        }

        case 'browser_drag': {
          const page = this.browserManager.getPage();
          if (!page) throw new Error('Browser not initialized');
          const source = page.locator(input.source).first();
          const target = page.locator(input.target).first();
          await source.dragTo(target);
          return `Dragged ${input.source} to ${input.target}`;
        }

        case 'browser_file_upload': {
          const page = this.browserManager.getPage();
          if (!page) throw new Error('Browser not initialized');
          await page.locator(input.selector).setInputFiles(input.filepath);
          return `Uploaded file ${input.filepath} to ${input.selector}`;
        }

        case 'browser_wait_for': {
          const page = this.browserManager.getPage();
          if (!page) throw new Error('Browser not initialized');
          const timeout = input.timeout || 30000;
          const state = input.state || 'visible';
          
          // Try as selector first, then as text
          try {
            await page.locator(input.target).waitFor({ state, timeout });
          } catch {
            await page.getByText(input.target).waitFor({ state, timeout });
          }
          return `Waited for "${input.target}" to be ${state}`;
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
   * Keeps first message (task) + recent messages, creates intelligent summary
   */
  private truncateHistory(messages: Message[]): Message[] {
    if (messages.length <= 15) return messages;

    // Keep first message (original task) + last 12 messages (more context)
    const first = messages[0];
    const recent = messages.slice(-12);

    // Extract key actions from skipped messages for intelligent summary
    const skippedMessages = messages.slice(1, -12);
    const keyActions: string[] = [];
    let lastUrl = '';

    for (const msg of skippedMessages) {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

      // Extract navigation URLs
      const urlMatch = content.match(/navigate.*?["']([^"']+youtube[^"']+)["']/i);
      if (urlMatch) lastUrl = urlMatch[1];

      // Extract key completed actions
      if (content.includes('browser_click') && content.includes('like')) {
        keyActions.push('✓ Clicked like button');
      }
      if (content.includes('browser_click') && content.includes('comment')) {
        keyActions.push('✓ Clicked comment box');
      }
      if (content.includes('browser_type') && !content.includes('search')) {
        const typeMatch = content.match(/browser_type.*?text["':\s]+["']([^"']+)["']/i);
        if (typeMatch) keyActions.push(`✓ Typed: "${typeMatch[1].substring(0, 30)}"`);
      }
      if (content.includes('browser_scroll')) {
        keyActions.push('✓ Scrolled page');
      }
      if (content.includes('play') && content.includes('click')) {
        keyActions.push('✓ Started video playback');
      }
    }

    // Create intelligent summary with progress
    const skipped = messages.length - 13;
    const uniqueActions = [...new Set(keyActions)].slice(-5); // Last 5 unique actions
    const progressSummary = uniqueActions.length > 0
      ? `\nCompleted steps:\n${uniqueActions.join('\n')}`
      : '';
    const urlInfo = lastUrl ? `\nCurrent URL: ${lastUrl}` : '';

    const summary: Message = {
      role: 'user',
      content: `[PROGRESS SUMMARY - ${skipped} iterations completed]${urlInfo}${progressSummary}\n\nIMPORTANT: Continue from where you left off. Check current page state and complete remaining steps.`
    };

    console.log(`📊 Token optimization: Truncated ${skipped} messages, preserved ${uniqueActions.length} key actions`);
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

    // Save browser session (cookies, localStorage) after each task
    // This ensures session persistence even if container crashes
    try {
      await this.browserManager.saveSession();
      console.log(`💾 Session saved after task completion`);
    } catch (e) {
      console.log('⚠️ Could not save session:', (e as Error).message);
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
