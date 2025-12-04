/**
 * FAST MODE V3: Two-Phase Architecture for Search + Click Tasks
 *
 * Key insight: Tasks like "search X and click result" REQUIRE two API calls:
 * 1. First call: Execute navigation + search (page doesn't have results yet)
 * 2. Second call: After page loads with results, plan the click
 *
 * This version:
 * - Detects search+click pattern and splits into phases automatically
 * - Extracts YouTube video titles directly via JavaScript (not from snapshot)
 * - Uses intelligent click strategies for YouTube
 * - Waits for actual page changes before replanning
 */

import Anthropic from '@anthropic-ai/sdk';
import { BrowserManager } from './browser-manager';

// Plan types
interface PlanAction {
  action: 'click' | 'type' | 'navigate' | 'wait' | 'scroll' | 'get_content' | 'click_video';
  ref?: string;
  text?: string;
  url?: string;
  seconds?: number;
  direction?: string;
  submit?: boolean;
  videoIndex?: number;  // For click_video action (0 = first, 1 = second, etc.)
}

interface ActionPlan {
  actions: PlanAction[];
  reasoning?: string;
  needsReplan?: boolean;  // Haiku can signal it needs fresh data
}

interface FastModeResult {
  success: boolean;
  result: string;
  apiCalls: number;
  actionsExecuted: number;
  actions: string[];
  timeMs: number;
  snapshot?: string;
}

// Optimized system prompt for two-phase execution
const SYSTEM_PROMPT_V3 = `You are a browser automation agent. Generate action plans in JSON.

RESPOND WITH ONLY VALID JSON:
{
  "actions": [...],
  "reasoning": "Brief explanation",
  "needsReplan": false
}

AVAILABLE ACTIONS:
- navigate: {"action": "navigate", "url": "https://..."}
- type: {"action": "type", "text": "search term", "submit": true}
- click: {"action": "click", "ref": "exact element text"}
- click_video: {"action": "click_video", "videoIndex": 0}  // Click video by position (0=first)
- wait: {"action": "wait", "seconds": 2}
- scroll: {"action": "scroll", "direction": "down"}

CRITICAL RULES FOR SEARCH TASKS:
1. If task involves "search X and click result" but NO video list is visible in page state:
   - ONLY generate navigate + type + submit actions
   - Set "needsReplan": true (you'll get fresh snapshot with results)

2. If video list IS visible (you see [VIDEO 1: ...], [VIDEO 2: ...]):
   - Use click_video with videoIndex (0 for first, 1 for second)
   - This is MORE RELIABLE than clicking by title

3. For YouTube:
   - Type with submit:true auto-focuses search box and presses Enter
   - After submit, page will reload with results - set needsReplan:true

EXAMPLE - Search task on homepage (no videos visible):
{
  "actions": [
    {"action": "navigate", "url": "https://youtube.com"},
    {"action": "wait", "seconds": 2},
    {"action": "type", "text": "AI tutorial", "submit": true}
  ],
  "reasoning": "Navigate and search. Need replan to see results.",
  "needsReplan": true
}

EXAMPLE - After replan (videos visible):
{
  "actions": [
    {"action": "wait", "seconds": 1},
    {"action": "click_video", "videoIndex": 0}
  ],
  "reasoning": "Click first video from search results"
}`;

export class FastModeExecutor {
  private client: Anthropic;
  private browserManager: BrowserManager;
  private model: string;

  constructor(browserManager: BrowserManager, model: string = 'claude-haiku-4-5-20251001') {
    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    });
    this.browserManager = browserManager;
    this.model = model;
  }

  /**
   * Extract YouTube video titles directly from page via JavaScript
   * This is MORE RELIABLE than parsing snapshot text
   */
  private async getYouTubeVideos(): Promise<string[]> {
    const page = this.browserManager.getPage();
    if (!page) return [];

    try {
      const videos = await page.evaluate(() => {
        const titles: string[] = [];
        // YouTube video title selectors
        const selectors = [
          '#video-title',                          // Standard video titles
          'a#video-title-link',                    // Alternative selector
          'ytd-video-renderer #video-title',       // Search results
          'ytd-rich-item-renderer #video-title'    // Homepage
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (let i = 0; i < elements.length && titles.length < 10; i++) {
            const el = elements[i];
            const text = el.textContent?.trim();
            if (text && text.length > 5 && !titles.includes(text)) {
              titles.push(text);
            }
          }
        }
        return titles;
      });
      return videos;
    } catch (e) {
      console.log('[FAST MODE] Failed to get YouTube videos:', e);
      return [];
    }
  }

  /**
   * Click a YouTube video by index (0 = first, 1 = second, etc.)
   * Uses JavaScript for reliability
   */
  private async clickVideoByIndex(index: number): Promise<string> {
    const page = this.browserManager.getPage();
    if (!page) throw new Error('Browser not initialized');

    const result = await page.evaluate((videoIndex: number) => {
      const selectors = [
        '#video-title',
        'ytd-video-renderer #video-title',
        'ytd-rich-item-renderer #video-title'
      ];

      let count = 0;
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i] as HTMLElement;
          const text = el.textContent?.trim();
          if (text && text.length > 5) {
            if (count === videoIndex) {
              el.click();
              return { success: true, title: text };
            }
            count++;
          }
        }
      }
      return { success: false, title: '' };
    }, index);

    if (result.success) {
      // Wait for navigation
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      return `Clicked video: "${result.title.slice(0, 50)}"`;
    }
    throw new Error(`No video found at index ${index}`);
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: PlanAction): Promise<string> {
    try {
      const page = this.browserManager.getPage();
      if (!page) throw new Error('Browser not initialized');

      switch (action.action) {
        case 'navigate': {
          if (!action.url) throw new Error('navigate requires url');
          await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await this.browserManager.autoHandleConsent();
          const title = await page.title();
          return `Navigated to ${action.url}. Title: ${title}`;
        }

        case 'click_video': {
          const index = action.videoIndex ?? 0;
          return await this.clickVideoByIndex(index);
        }

        case 'click': {
          if (!action.ref) throw new Error('click requires ref');
          const refText = action.ref;  // TypeScript narrowing

          // Try multiple strategies
          const strategies = [
            // Strategy 1: YouTube video title via JavaScript
            async () => {
              const clicked = await page.evaluate((text) => {
                if (!text) return false;
                const lowerText = text.toLowerCase();
                const titles = Array.from(document.querySelectorAll('#video-title'));
                for (let i = 0; i < titles.length; i++) {
                  const t = titles[i];
                  if (t.textContent?.toLowerCase().includes(lowerText)) {
                    (t as HTMLElement).click();
                    return true;
                  }
                }
                return false;
              }, refText);
              if (clicked) return `Clicked video "${refText}"`;
              throw new Error('Video not found');
            },
            // Strategy 2: getByText
            async () => {
              await page.getByText(refText, { exact: false }).first().click({ timeout: 5000 });
              return `Clicked text "${refText}"`;
            },
            // Strategy 3: getByRole link
            async () => {
              await page.getByRole('link', { name: refText }).first().click({ timeout: 3000 });
              return `Clicked link "${refText}"`;
            }
          ];

          for (const strategy of strategies) {
            try {
              return await strategy();
            } catch (e) {
              continue;
            }
          }
          throw new Error(`Could not click "${refText}" with any strategy`);
        }

        case 'type': {
          const text = action.text || '';

          // Auto-focus on search input
          const searchSelectors = [
            'input[name="search_query"]',  // YouTube
            'input[name="q"]',             // Google
            'input[type="search"]',
            'input[type="text"]:visible'
          ];

          for (const selector of searchSelectors) {
            try {
              const input = page.locator(selector).first();
              await input.click({ timeout: 3000 });
              console.log(`[FAST MODE] Focused on: ${selector}`);
              break;
            } catch {}
          }

          // Type with human-like delay
          await page.keyboard.type(text, { delay: 30 + Math.random() * 20 });

          if (action.submit) {
            await new Promise(r => setTimeout(r, 200));
            await page.keyboard.press('Enter');
            // Wait for page to start loading
            await page.waitForLoadState('domcontentloaded').catch(() => {});
            // Extra wait for YouTube to load results
            await new Promise(r => setTimeout(r, 3000));
          }

          return `Typed "${text}"${action.submit ? ' and submitted' : ''}`;
        }

        case 'wait': {
          const seconds = Math.min(action.seconds || 2, 30);
          await new Promise(r => setTimeout(r, seconds * 1000));
          return `Waited ${seconds}s`;
        }

        case 'scroll': {
          const direction = action.direction || 'down';
          const amount = 500;
          await page.evaluate((scrollY) => window.scrollBy(0, scrollY), direction === 'up' ? -amount : amount);
          return `Scrolled ${direction}`;
        }

        case 'get_content': {
          const snapshot = await this.browserManager.getSnapshot();
          return `Content: ${snapshot.content.slice(0, 2000)}`;
        }

        default:
          return `Unknown action: ${(action as any).action}`;
      }
    } catch (error: any) {
      return `ERROR: ${error.message}`;
    }
  }

  /**
   * Build enhanced snapshot with video list
   */
  private async buildEnhancedSnapshot(): Promise<string> {
    const page = this.browserManager.getPage();
    if (!page) return 'Browser not initialized';

    // Get basic info
    const url = page.url();
    const title = await page.title();

    // Get YouTube videos if on YouTube
    let videoSection = '';
    if (url.includes('youtube.com')) {
      const videos = await this.getYouTubeVideos();
      if (videos.length > 0) {
        videoSection = '\n\nVIDEO LIST (use click_video action with videoIndex):\n';
        videos.forEach((v, i) => {
          videoSection += `[VIDEO ${i}]: ${v}\n`;
        });
      }
    }

    // Get visible text (limited)
    const visibleText = await page.evaluate(() => {
      const body = document.body;
      return body.innerText?.slice(0, 3000) || '';
    }).catch(() => '');

    return `URL: ${url}
Title: ${title}
${videoSection}
Page content:
${visibleText.slice(0, 2000)}`;
  }

  /**
   * Run task with two-phase architecture
   */
  async run(task: string, maxRetries: number = 2): Promise<FastModeResult> {
    const startTime = Date.now();
    const actions: string[] = [];
    let apiCalls = 0;
    let retries = 0;
    let finalResult = '';
    let success = false;
    let currentSnapshot = '';
    let phase = 1;

    console.log(`\n[FAST MODE V3] Task: "${task.slice(0, 80)}..."`);

    // Initialize browser if not running
    if (!this.browserManager.isRunning()) {
      await this.browserManager.initialize();
    }

    while (retries <= maxRetries && !success) {
      try {
        // PHASE 1: Get current page state
        console.log(`[FAST MODE V3] Phase ${phase}: Capturing page state...`);
        currentSnapshot = await this.buildEnhancedSnapshot();
        console.log(`[FAST MODE V3] Snapshot size: ${currentSnapshot.length} chars`);

        // Check if we have videos (affects prompt strategy)
        const hasVideos = currentSnapshot.includes('[VIDEO ');
        console.log(`[FAST MODE V3] Videos visible: ${hasVideos}`);

        // PHASE 2: Get plan from Haiku
        console.log(`[FAST MODE V3] Getting plan from Haiku (API call ${apiCalls + 1})...`);

        const userMessage = `CURRENT PAGE STATE:
${currentSnapshot}

---
TASK: ${task}${retries > 0 ? '\n\n(Previous attempt failed, try different approach)' : ''}

${hasVideos ? 'VIDEOS ARE VISIBLE - use click_video action with videoIndex' : 'NO VIDEOS VISIBLE YET - if task needs to click a video, set needsReplan:true after search'}`;

        const planResponse = await this.client.messages.create({
          model: this.model,
          max_tokens: 1024,
          system: SYSTEM_PROMPT_V3,
          messages: [{ role: 'user', content: userMessage }]
        });
        apiCalls++;

        // Parse plan
        let planText = '';
        for (const block of planResponse.content) {
          if (block.type === 'text') {
            planText = block.text;
          }
        }

        let plan: ActionPlan;
        try {
          planText = planText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          const jsonMatch = planText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            plan = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found');
          }
        } catch (parseError) {
          console.error(`[FAST MODE V3] Parse error:`, planText.slice(0, 200));
          throw new Error(`Invalid plan JSON: ${parseError}`);
        }

        console.log(`[FAST MODE V3] Plan: ${plan.actions.length} actions, needsReplan: ${plan.needsReplan}`);
        if (plan.reasoning) {
          console.log(`[FAST MODE V3] Reasoning: ${plan.reasoning}`);
        }

        // PHASE 3: Execute actions
        let allActionsSucceeded = true;
        let failedAction = '';

        for (let i = 0; i < plan.actions.length; i++) {
          const action = plan.actions[i];
          const actionDesc = JSON.stringify(action).slice(0, 80);
          console.log(`  [${i + 1}/${plan.actions.length}] ${actionDesc}`);

          const result = await this.executeAction(action);
          actions.push(`${action.action} -> ${result.slice(0, 60)}`);

          if (result.startsWith('ERROR')) {
            console.log(`  FAILED: ${result}`);
            allActionsSucceeded = false;
            failedAction = result;
            break;
          } else {
            console.log(`  OK: ${result.slice(0, 50)}`);
          }

          // Small delay between actions
          await new Promise(r => setTimeout(r, 200 + Math.random() * 200));
        }

        // PHASE 4: Handle replan or completion
        if (allActionsSucceeded && plan.needsReplan) {
          console.log(`[FAST MODE V3] Haiku requested replan - waiting for page to stabilize...`);
          await new Promise(r => setTimeout(r, 3000));
          phase++;
          // Continue loop to get fresh snapshot and replan
          continue;
        }

        if (allActionsSucceeded) {
          success = true;
          finalResult = plan.reasoning || 'Task completed successfully';
          console.log(`[FAST MODE V3] All actions completed!`);

          // Get final snapshot
          currentSnapshot = await this.buildEnhancedSnapshot();
        } else {
          retries++;
          if (retries <= maxRetries) {
            console.log(`[FAST MODE V3] Retrying (${retries + 1}/${maxRetries + 1})...`);
            task = `${task}\n\nPREVIOUS FAILURE: ${failedAction}`;
          } else {
            finalResult = `Failed after ${retries} retries: ${failedAction}`;
          }
        }

      } catch (error: any) {
        console.error(`[FAST MODE V3] Error:`, error.message);
        retries++;
        if (retries > maxRetries) {
          finalResult = `Task failed: ${error.message}`;
        }
      }
    }

    const totalTime = Date.now() - startTime;

    console.log(`\n[FAST MODE V3] Summary:`);
    console.log(`  Phases: ${phase}`);
    console.log(`  API calls: ${apiCalls}`);
    console.log(`  Actions: ${actions.length}`);
    console.log(`  Time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`  Success: ${success}`);

    return {
      success,
      result: finalResult,
      apiCalls,
      actionsExecuted: actions.length,
      actions,
      timeMs: totalTime,
      snapshot: currentSnapshot
    };
  }
}

export default FastModeExecutor;
