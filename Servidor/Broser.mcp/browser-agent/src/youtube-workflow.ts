/**
 * YouTube Engagement Workflow - ISOLATED TEST
 *
 * This file is completely separate from existing code.
 * Can be deleted without affecting anything else.
 *
 * Uses: humanization.ts functions (no modifications)
 * Uses: browser-manager.ts (no modifications)
 *
 * ROLLBACK: Simply delete this file and remove the endpoint from agent-endpoint.ts
 */

import { Page } from 'patchright';
import { BrowserManager } from './browser-manager';
import {
  BehaviorProfile,
  createTaskBehavior,
  humanMouseMove,
  humanClick,
  humanType,
  humanScroll,
  humanDelay,
  getDelay
} from './humanization';
import Anthropic from '@anthropic-ai/sdk';

// ============================================
// TYPES
// ============================================

export interface YouTubeEngageParams {
  keyword: string;
  watchSeconds?: number;      // default: 30
  playbackSpeed?: 1 | 1.5 | 2; // default: 2
  like?: boolean;             // default: true
  comment?: string;           // optional
  projectId?: number;         // for behavior tracking
  videoIndex?: number;        // which video to click (0 = first), default: 0
}

export interface YouTubeEngageResult {
  success: boolean;
  videoTitle: string;
  videoUrl: string;
  actions: string[];
  cost: string;
  error?: string;
  timings: {
    total: number;
    search: number;
    watch: number;
    engage: number;
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// YOUTUBE-SPECIFIC FUNCTIONS
// ============================================

/**
 * Detect and skip YouTube ads
 * Waits for skip button to appear, then clicks it
 */
async function detectAndSkipAd(page: Page, profile: BehaviorProfile): Promise<boolean> {
  console.log('[YT-WORKFLOW] Checking for ads...');

  const skipSelectors = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    'button.ytp-ad-skip-button-container',
    '[class*="skip-button"]'
  ];

  // Wait up to 10 seconds for ad skip button
  for (let i = 0; i < 20; i++) {
    for (const selector of skipSelectors) {
      try {
        const skipButton = await page.locator(selector).first();
        if (await skipButton.isVisible({ timeout: 100 })) {
          console.log('[YT-WORKFLOW] Ad skip button found, clicking...');
          await humanDelay(profile.delay);
          await skipButton.click();
          await sleep(500);
          console.log('[YT-WORKFLOW] Ad skipped!');
          return true;
        }
      } catch {
        // Button not found, continue
      }
    }

    // Check if we're past the ad (no ad indicator visible)
    try {
      const adIndicator = await page.locator('.ytp-ad-text').first();
      if (!await adIndicator.isVisible({ timeout: 100 })) {
        console.log('[YT-WORKFLOW] No ad detected');
        return false;
      }
    } catch {
      console.log('[YT-WORKFLOW] No ad detected');
      return false;
    }

    await sleep(500);
  }

  console.log('[YT-WORKFLOW] Ad timeout, continuing anyway');
  return false;
}

/**
 * Set playback speed (1, 1.5, 2)
 */
async function setPlaybackSpeed(page: Page, speed: 1 | 1.5 | 2, profile: BehaviorProfile): Promise<boolean> {
  console.log(`[YT-WORKFLOW] Setting playback speed to ${speed}x...`);

  try {
    // Click on video to ensure focus
    const player = await page.locator('#movie_player').first();
    await player.click();
    await sleep(randomBetween(300, 600));

    // Click settings button
    const settingsButton = await page.locator('.ytp-settings-button').first();
    await settingsButton.click();
    await sleep(randomBetween(400, 800));

    // Click on "Playback speed" option
    const speedOption = await page.locator('.ytp-menuitem:has-text("Playback speed"), .ytp-menuitem:has-text("Velocidade")').first();
    await speedOption.click();
    await sleep(randomBetween(300, 600));

    // Select the speed
    const speedMap: Record<number, string> = {
      1: '1',
      1.5: '1.5',
      2: '2'
    };
    const speedLabel = speedMap[speed];
    const speedButton = await page.locator(`.ytp-menuitem:has-text("${speedLabel}")`).first();
    await speedButton.click();
    await sleep(randomBetween(200, 400));

    // Click elsewhere to close menu
    await player.click();

    console.log(`[YT-WORKFLOW] Speed set to ${speed}x`);
    return true;
  } catch (error) {
    console.log('[YT-WORKFLOW] Failed to set playback speed:', error);
    return false;
  }
}

/**
 * Watch video with simulated attention
 * Occasionally scrolls and moves mouse to simulate a real viewer
 */
async function watchWithAttention(
  page: Page,
  seconds: number,
  profile: BehaviorProfile
): Promise<void> {
  console.log(`[YT-WORKFLOW] Watching video for ${seconds}s...`);

  const startTime = Date.now();
  const endTime = startTime + (seconds * 1000);

  while (Date.now() < endTime) {
    const remainingSeconds = Math.ceil((endTime - Date.now()) / 1000);

    // Random action every 5-15 seconds
    const actionInterval = randomBetween(5000, 15000);
    await sleep(Math.min(actionInterval, remainingSeconds * 1000));

    if (Date.now() >= endTime) break;

    // Random action: scroll slightly or move mouse
    const action = randomBetween(1, 3);
    switch (action) {
      case 1:
        // Small scroll to simulate reading description
        await humanScroll(page, 'down', randomBetween(50, 150), profile.scroll);
        break;
      case 2:
        // Move mouse randomly (simulates attention)
        await page.mouse.move(randomBetween(200, 800), randomBetween(200, 500));
        break;
      case 3:
        // Just wait (simulates focused watching)
        break;
    }
  }

  console.log('[YT-WORKFLOW] Finished watching');
}

/**
 * Like the video with humanization
 */
async function likeVideo(page: Page, profile: BehaviorProfile): Promise<boolean> {
  console.log('[YT-WORKFLOW] Liking video...');

  try {
    // Scroll up to make sure like button is visible
    await humanScroll(page, 'up', 200, profile.scroll);
    await sleep(randomBetween(500, 1000));

    // Find like button - multiple selectors for different YouTube versions
    const likeSelectors = [
      'like-button-view-model button',
      '#segmented-like-button button',
      'ytd-toggle-button-renderer#button:first-child button',
      '[aria-label*="like" i]:not([aria-label*="dislike" i])',
      'button[title*="like" i]:not([title*="dislike" i])'
    ];

    for (const selector of likeSelectors) {
      try {
        const likeButton = await page.locator(selector).first();
        if (await likeButton.isVisible({ timeout: 500 })) {
          // Check if already liked
          const ariaPressed = await likeButton.getAttribute('aria-pressed');
          if (ariaPressed === 'true') {
            console.log('[YT-WORKFLOW] Video already liked');
            return true;
          }

          // Human-like delay before clicking
          await humanDelay(profile.delay);
          await likeButton.click();
          await sleep(randomBetween(500, 1000));
          console.log('[YT-WORKFLOW] Video liked!');
          return true;
        }
      } catch {
        continue;
      }
    }

    console.log('[YT-WORKFLOW] Like button not found');
    return false;
  } catch (error) {
    console.log('[YT-WORKFLOW] Failed to like video:', error);
    return false;
  }
}

/**
 * Post a comment with humanization
 */
async function postComment(
  page: Page,
  comment: string,
  profile: BehaviorProfile
): Promise<boolean> {
  console.log('[YT-WORKFLOW] Posting comment...');

  try {
    // Scroll down to comments section
    await humanScroll(page, 'down', 500, profile.scroll);
    await sleep(randomBetween(1000, 2000));

    // Click on comment box to activate it
    const commentBoxSelectors = [
      '#placeholder-area',
      '#simplebox-placeholder',
      'ytd-comment-simplebox-renderer #placeholder-area',
      '[placeholder*="Add a comment" i]',
      '[placeholder*="Adicionar um comentário" i]'
    ];

    let clicked = false;
    for (const selector of commentBoxSelectors) {
      try {
        const commentBox = await page.locator(selector).first();
        if (await commentBox.isVisible({ timeout: 500 })) {
          await humanDelay(profile.delay);
          await commentBox.click();
          await sleep(randomBetween(500, 1000));
          clicked = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!clicked) {
      console.log('[YT-WORKFLOW] Comment box not found');
      return false;
    }

    // Find the actual input field and type
    const inputSelectors = [
      '#contenteditable-root',
      'ytd-comment-simplebox-renderer #contenteditable-root',
      '[contenteditable="true"]'
    ];

    for (const selector of inputSelectors) {
      try {
        const input = await page.locator(selector).first();
        if (await input.isVisible({ timeout: 500 })) {
          // Type the comment with human-like speed
          await humanType(page, selector, comment, profile);
          await sleep(randomBetween(1000, 2000));

          // Find and click the submit button
          const submitSelectors = [
            '#submit-button',
            'ytd-button-renderer#submit-button',
            'button[aria-label*="Comment" i]',
            'button[aria-label*="Comentar" i]'
          ];

          for (const submitSelector of submitSelectors) {
            try {
              const submitButton = await page.locator(submitSelector).first();
              if (await submitButton.isVisible({ timeout: 500 })) {
                await humanDelay(profile.delay);
                await submitButton.click();
                await sleep(randomBetween(2000, 3000));
                console.log('[YT-WORKFLOW] Comment posted!');
                return true;
              }
            } catch {
              continue;
            }
          }
        }
      } catch {
        continue;
      }
    }

    console.log('[YT-WORKFLOW] Failed to submit comment');
    return false;
  } catch (error) {
    console.log('[YT-WORKFLOW] Failed to post comment:', error);
    return false;
  }
}

/**
 * Use AI to decide which video to click
 * Makes a single API call to choose a video index
 */
async function decideVideoWithAI(
  videoTitles: string[],
  keyword: string
): Promise<{ index: number; cost: number }> {
  console.log('[YT-WORKFLOW] Asking AI to choose video...');

  if (!process.env.CLAUDE_API_KEY) {
    // If no API key, just pick a random video from top 5
    console.log('[YT-WORKFLOW] No API key, choosing random video');
    return { index: randomBetween(0, Math.min(4, videoTitles.length - 1)), cost: 0 };
  }

  const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  const prompt = `Given these YouTube search results for "${keyword}":
${videoTitles.map((t, i) => `${i}: ${t}`).join('\n')}

Which video index (0-${videoTitles.length - 1}) would be most interesting to watch?
Reply with ONLY the number, nothing else.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '0';
  const index = parseInt(text.trim(), 10) || 0;

  // Estimate cost: ~100 input tokens, ~5 output tokens
  // Haiku: $0.80/1M input, $4.00/1M output
  const cost = (100 * 0.80 / 1_000_000) + (5 * 4.00 / 1_000_000);

  console.log(`[YT-WORKFLOW] AI chose video ${index}: "${videoTitles[index] || 'unknown'}"`);
  return { index, cost };
}

/**
 * Get list of video titles from search results
 */
async function getSearchResultTitles(page: Page): Promise<string[]> {
  const titles = await page.evaluate(() => {
    const results: string[] = [];
    const elements = document.querySelectorAll('ytd-video-renderer:not([hidden]) #video-title');

    for (let i = 0; i < elements.length && results.length < 10; i++) {
      const el = elements[i] as HTMLElement;
      // Skip mini-player and other overlays
      if (el.closest('ytd-miniplayer') || el.closest('ytd-player')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const text = el.textContent?.trim();
      if (text && text.length > 5) results.push(text);
    }

    return results;
  });

  return titles;
}

/**
 * Click on a video by index in search results
 */
async function clickVideoByIndex(page: Page, index: number): Promise<string> {
  const result = await page.evaluate((videoIndex: number) => {
    const elements = document.querySelectorAll('ytd-video-renderer:not([hidden]) #video-title');
    let validCount = 0;

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      if (el.closest('ytd-miniplayer') || el.closest('ytd-player')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const text = el.textContent?.trim();
      if (text && text.length > 5) {
        if (validCount === videoIndex) {
          el.click();
          return { success: true, title: text };
        }
        validCount++;
      }
    }

    return { success: false, title: '' };
  }, index);

  if (result.success) {
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await sleep(2000);
    return result.title;
  }

  throw new Error(`Video not found at index ${index}`);
}

// ============================================
// MAIN WORKFLOW
// ============================================

/**
 * Execute the complete YouTube engagement workflow
 */
export async function executeYouTubeEngage(
  browserManager: BrowserManager,
  params: YouTubeEngageParams
): Promise<YouTubeEngageResult> {
  const startTime = Date.now();
  const actions: string[] = [];
  let videoTitle = '';
  let videoUrl = '';
  let totalCost = 0;

  const timings = { total: 0, search: 0, watch: 0, engage: 0 };

  try {
    const page = browserManager.getPage();
    if (!page) {
      throw new Error('Browser not initialized');
    }

    // Get or create behavior profile for anti-detection
    const profile = await createTaskBehavior(params.projectId || 0);
    console.log(`[YT-WORKFLOW] Using behavior profile: mouse=${profile.mouse}, typing=${profile.typing}`);

    // Default values
    const watchSeconds = params.watchSeconds || 30;
    const playbackSpeed = params.playbackSpeed || 2;
    const shouldLike = params.like !== false;

    // ===== PHASE 1: SEARCH =====
    const searchStart = Date.now();

    // Navigate to YouTube
    await page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded' });
    actions.push('navigate_youtube');
    await humanDelay(profile.delay);

    // Search for keyword - YouTube now uses input[name="search_query"]
    const searchSelector = 'input[name="search_query"], input[role="combobox"]';
    const searchBox = await page.locator(searchSelector).first();
    await searchBox.click();
    await humanType(page, searchSelector, params.keyword, profile);
    await page.keyboard.press('Enter');
    actions.push(`search: ${params.keyword}`);
    await page.waitForLoadState('domcontentloaded');
    await sleep(2000);

    // Click the video at specified index (default: 0 = first result) - NO API CALL
    const videoIndex = params.videoIndex ?? 0;
    console.log();
    videoTitle = await clickVideoByIndex(page, videoIndex);
    // REMOVED AI DECISION:

    actions.push(`click_video: ${videoTitle.slice(0, 50)}`);
    videoUrl = page.url();

    timings.search = Date.now() - searchStart;

    // ===== PHASE 2: WATCH =====
    const watchStart = Date.now();

    // Handle ads if present
    const adSkipped = await detectAndSkipAd(page, profile);
    if (adSkipped) actions.push('skip_ad');

    // Set playback speed
    const speedSet = await setPlaybackSpeed(page, playbackSpeed, profile);
    if (speedSet) actions.push(`set_speed_${playbackSpeed}x`);

    // Watch video with attention simulation
    await watchWithAttention(page, watchSeconds, profile);
    actions.push(`watch_${watchSeconds}s`);

    timings.watch = Date.now() - watchStart;

    // ===== PHASE 3: ENGAGE =====
    const engageStart = Date.now();

    // Like video
    if (shouldLike) {
      const liked = await likeVideo(page, profile);
      if (liked) actions.push('like_video');
    }

    // Post comment if provided
    if (params.comment) {
      const commented = await postComment(page, params.comment, profile);
      if (commented) actions.push(`comment: ${params.comment.slice(0, 30)}...`);
    }

    timings.engage = Date.now() - engageStart;
    timings.total = Date.now() - startTime;

    return {
      success: true,
      videoTitle,
      videoUrl,
      actions,
      cost: `$${totalCost.toFixed(4)}`,
      timings
    };

  } catch (error: any) {
    timings.total = Date.now() - startTime;
    return {
      success: false,
      videoTitle,
      videoUrl,
      actions,
      cost: `$${totalCost.toFixed(4)}`,
      error: error.message,
      timings
    };
  }
}

export default {
  executeYouTubeEngage
};
