/**
 * Humanization System for Browser Automation
 *
 * Implements human-like behaviors to avoid detection:
 * - Mouse movements with curves
 * - Variable typing speeds
 * - Natural scroll patterns
 * - Random delays
 *
 * Each task records what patterns were used, and the next task
 * chooses DIFFERENT patterns to avoid repetition.
 *
 * UPDATED: Now tracks start_position and click_positions from last 30 tasks
 * to ensure mouse movements don't repeat patterns.
 */

import { Page } from 'patchright';

// ============================================
// PATTERN DEFINITIONS
// ============================================

export const MOUSE_PATTERNS = [
  'bezier_smooth',    // Smooth curve, calm user
  'bezier_fast',      // Direct curve, hurried user
  'overshoot',        // Goes past target, comes back
  'zigzag_subtle',    // Small deviations
  'linear_jitter'     // Almost straight with tremor
] as const;

export const TYPING_PATTERNS = [
  'hunt_peck',        // Slow, 150-300ms between keys
  'touch_typist',     // Fast, 50-100ms
  'variable',         // Varies during typing
  'burst',            // Types in bursts with pauses
  'with_typos'        // Occasionally makes and corrects errors
] as const;

export const SCROLL_PATTERNS = [
  'smooth',           // Continuous smooth
  'stepped',          // Stops to "read"
  'fast_scan',        // Quick scanning
  'mouse_wheel'       // Small increments
] as const;

export const DELAY_PATTERNS = [
  'impatient',        // 500-1500ms
  'thoughtful',       // 2000-4000ms
  'erratic',          // Varies wildly
  'natural'           // Based on content
] as const;

export type MousePattern = typeof MOUSE_PATTERNS[number];
export type TypingPattern = typeof TYPING_PATTERNS[number];
export type ScrollPattern = typeof SCROLL_PATTERNS[number];
export type DelayPattern = typeof DELAY_PATTERNS[number];

export interface BehaviorProfile {
  mouse: MousePattern;
  typing: TypingPattern;
  scroll: ScrollPattern;
  delay: DelayPattern;
  click_offset: { x: number; y: number };
  typing_speed_ms: number;
  // Anti-detection: Track mouse positions to avoid repetition
  start_position: { x: number; y: number };
  click_positions: Array<{ x: number; y: number }>;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Select a pattern that's DIFFERENT from recent ones
 */
export function selectDifferentPattern<T extends string>(
  patterns: readonly T[],
  recentlyUsed: T[]
): T {
  // Filter out recently used patterns
  const available = patterns.filter(p => !recentlyUsed.includes(p));

  // If all patterns were used, pick any
  if (available.length === 0) {
    return patterns[randomBetween(0, patterns.length - 1)];
  }

  // Pick random from available
  return available[randomBetween(0, available.length - 1)];
}

/**
 * Generate a new behavior profile that's different from recent ones
 * Now includes start_position that avoids last 30 tasks' positions
 */
export function generateBehaviorProfile(recentBehaviors: BehaviorProfile[]): BehaviorProfile {
  const recentMouse = recentBehaviors.map(b => b.mouse);
  const recentTyping = recentBehaviors.map(b => b.typing);
  const recentScroll = recentBehaviors.map(b => b.scroll);
  const recentDelay = recentBehaviors.map(b => b.delay);

  const mouse = selectDifferentPattern(MOUSE_PATTERNS, recentMouse);
  const typing = selectDifferentPattern(TYPING_PATTERNS, recentTyping);
  const scroll = selectDifferentPattern(SCROLL_PATTERNS, recentScroll);
  const delay = selectDifferentPattern(DELAY_PATTERNS, recentDelay);

  // Generate random click offset (-5 to +5 pixels)
  const click_offset = {
    x: randomBetween(-5, 5),
    y: randomBetween(-5, 5)
  };

  // Typing speed based on pattern
  let typing_speed_ms: number;
  switch (typing) {
    case 'hunt_peck':
      typing_speed_ms = randomBetween(150, 300);
      break;
    case 'touch_typist':
      typing_speed_ms = randomBetween(50, 100);
      break;
    case 'variable':
      typing_speed_ms = randomBetween(80, 200);
      break;
    case 'burst':
      typing_speed_ms = randomBetween(30, 80);
      break;
    case 'with_typos':
      typing_speed_ms = randomBetween(100, 180);
      break;
    default:
      typing_speed_ms = randomBetween(80, 150);
  }

  // NEW: Generate start_position different from last 30 tasks
  const recentStartPositions = recentBehaviors
    .map(b => b.start_position)
    .filter(Boolean);

  let start_position: { x: number; y: number };
  let attempts = 0;
  const MIN_DISTANCE = 30; // Minimum pixels apart from recent positions

  do {
    start_position = {
      x: randomBetween(50, 400),
      y: randomBetween(50, 400)
    };
    attempts++;
  } while (
    recentStartPositions.some(p =>
      p && Math.abs(p.x - start_position.x) < MIN_DISTANCE &&
      Math.abs(p.y - start_position.y) < MIN_DISTANCE
    ) && attempts < 20
  );

  return {
    mouse,
    typing,
    scroll,
    delay,
    click_offset,
    typing_speed_ms,
    start_position,
    click_positions: [] // Will be populated during task execution
  };
}


// ============================================
// MOUSE MOVEMENT FUNCTIONS
// ============================================

interface Point {
  x: number;
  y: number;
}

/**
 * Generate bezier curve points for smooth mouse movement
 */
function generateBezierPath(
  start: Point,
  end: Point,
  pattern: MousePattern,
  steps: number = 20
): Point[] {
  const points: Point[] = [];

  // Control points vary based on pattern
  let cp1: Point, cp2: Point;

  switch (pattern) {
    case 'bezier_smooth':
      // Gentle curve
      cp1 = {
        x: start.x + (end.x - start.x) * 0.3 + randomBetween(-20, 20),
        y: start.y + (end.y - start.y) * 0.1 + randomBetween(-30, 30)
      };
      cp2 = {
        x: start.x + (end.x - start.x) * 0.7 + randomBetween(-20, 20),
        y: start.y + (end.y - start.y) * 0.9 + randomBetween(-30, 30)
      };
      break;

    case 'bezier_fast':
      // More direct
      cp1 = {
        x: start.x + (end.x - start.x) * 0.4,
        y: start.y + (end.y - start.y) * 0.4
      };
      cp2 = {
        x: start.x + (end.x - start.x) * 0.6,
        y: start.y + (end.y - start.y) * 0.6
      };
      break;

    case 'overshoot':
      // Goes past target
      const overshootX = end.x + (end.x - start.x) * 0.15;
      const overshootY = end.y + (end.y - start.y) * 0.15;
      cp1 = {
        x: start.x + (end.x - start.x) * 0.5,
        y: start.y + (end.y - start.y) * 0.5
      };
      cp2 = { x: overshootX, y: overshootY };
      break;

    case 'zigzag_subtle':
      // Small zigzag deviations
      cp1 = {
        x: start.x + (end.x - start.x) * 0.25 + randomBetween(-40, 40),
        y: start.y + (end.y - start.y) * 0.25 + randomBetween(-40, 40)
      };
      cp2 = {
        x: start.x + (end.x - start.x) * 0.75 + randomBetween(-40, 40),
        y: start.y + (end.y - start.y) * 0.75 + randomBetween(-40, 40)
      };
      break;

    case 'linear_jitter':
    default:
      // Almost straight with small tremors
      cp1 = {
        x: start.x + (end.x - start.x) * 0.33 + randomBetween(-10, 10),
        y: start.y + (end.y - start.y) * 0.33 + randomBetween(-10, 10)
      };
      cp2 = {
        x: start.x + (end.x - start.x) * 0.66 + randomBetween(-10, 10),
        y: start.y + (end.y - start.y) * 0.66 + randomBetween(-10, 10)
      };
  }

  // Generate bezier curve points
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    points.push({
      x: Math.round(mt3 * start.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * end.x),
      y: Math.round(mt3 * start.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * end.y)
    });
  }

  return points;
}

/**
 * Move mouse along a human-like path
 * Now accepts optional startPos and returns final position for tracking
 */
export async function humanMouseMove(
  page: Page,
  targetX: number,
  targetY: number,
  pattern: MousePattern,
  offset: { x: number; y: number },
  startPos?: { x: number; y: number }
): Promise<{ x: number; y: number }> {
  // Use provided start position or default
  const currentPos = startPos || { x: 100, y: 100 };

  // Apply offset to target
  const finalX = targetX + offset.x;
  const finalY = targetY + offset.y;

  // Generate path
  const steps = pattern === 'bezier_fast' ? 10 : 20;
  const path = generateBezierPath(currentPos, { x: finalX, y: finalY }, pattern, steps);

  // Move along path with variable speed
  for (let i = 0; i < path.length; i++) {
    await page.mouse.move(path[i].x, path[i].y);

    // Variable delay between movements
    const baseDelay = pattern === 'bezier_fast' ? 5 : 15;
    await sleep(randomBetween(baseDelay, baseDelay * 2));
  }

  // Return final position for tracking
  return { x: finalX, y: finalY };
}

/**
 * Human-like click with mouse movement
 * Now tracks click positions in the behavior profile
 */
export async function humanClick(
  page: Page,
  selector: string,
  profile: BehaviorProfile,
  currentMousePos?: { x: number; y: number }
): Promise<{ x: number; y: number }> {
  // Get element bounding box
  const element = await page.locator(selector).first();
  const box = await element.boundingBox();

  if (!box) {
    throw new Error(`Element not found: ${selector}`);
  }

  // Calculate click position (center + random offset)
  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;

  // Use profile's start_position if no current position provided
  const startPos = currentMousePos || profile.start_position;

  // Move mouse humanly
  const finalPos = await humanMouseMove(page, targetX, targetY, profile.mouse, profile.click_offset, startPos);

  // Small delay before click
  await sleep(randomBetween(50, 150));

  // Click
  await page.mouse.click(targetX + profile.click_offset.x, targetY + profile.click_offset.y);

  // Track this click position
  profile.click_positions.push(finalPos);

  return finalPos;
}


// ============================================
// TYPING FUNCTIONS
// ============================================

/**
 * Human-like typing with variable speed
 */
export async function humanType(
  page: Page,
  selector: string,
  text: string,
  profile: BehaviorProfile
): Promise<void> {
  const element = await page.locator(selector).first();
  await element.click();

  // Clear existing content
  await element.fill('');

  const chars = text.split('');
  let typed = '';

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    // Simulate typo if pattern is 'with_typos' (5% chance)
    if (profile.typing === 'with_typos' && Math.random() < 0.05 && i > 0) {
      // Type wrong character
      const wrongChar = String.fromCharCode(char.charCodeAt(0) + randomBetween(-1, 1));
      await page.keyboard.type(wrongChar);
      await sleep(randomBetween(100, 300));

      // Delete it
      await page.keyboard.press('Backspace');
      await sleep(randomBetween(50, 150));
    }

    // Type the correct character
    await page.keyboard.type(char);
    typed += char;

    // Variable delay based on pattern
    let delay: number;
    switch (profile.typing) {
      case 'hunt_peck':
        delay = randomBetween(150, 300);
        break;
      case 'touch_typist':
        delay = randomBetween(50, 100);
        break;
      case 'variable':
        delay = randomBetween(50, 250);
        break;
      case 'burst':
        // Fast typing with occasional pauses
        delay = Math.random() < 0.1 ? randomBetween(300, 600) : randomBetween(30, 80);
        break;
      case 'with_typos':
      default:
        delay = randomBetween(80, 180);
    }

    // Extra delay after spaces or punctuation
    if (char === ' ' || char === '.' || char === ',') {
      delay += randomBetween(50, 150);
    }

    await sleep(delay);
  }
}

// ============================================
// SCROLL FUNCTIONS
// ============================================

/**
 * Human-like scrolling
 */
export async function humanScroll(
  page: Page,
  direction: 'up' | 'down',
  amount: number,
  pattern: ScrollPattern
): Promise<void> {
  const scrollAmount = direction === 'down' ? amount : -amount;

  switch (pattern) {
    case 'smooth':
      // Smooth continuous scroll
      const smoothSteps = 20;
      const smoothIncrement = scrollAmount / smoothSteps;
      for (let i = 0; i < smoothSteps; i++) {
        await page.mouse.wheel(0, smoothIncrement);
        await sleep(randomBetween(20, 40));
      }
      break;

    case 'stepped':
      // Scroll with pauses to "read"
      const stepCount = 4;
      const stepAmount = scrollAmount / stepCount;
      for (let i = 0; i < stepCount; i++) {
        await page.mouse.wheel(0, stepAmount);
        // Pause to read
        await sleep(randomBetween(500, 1500));
      }
      break;

    case 'fast_scan':
      // Quick scroll with occasional slowdown
      const fastSteps = 10;
      const fastIncrement = scrollAmount / fastSteps;
      for (let i = 0; i < fastSteps; i++) {
        await page.mouse.wheel(0, fastIncrement);
        const delay = Math.random() < 0.2 ? randomBetween(200, 400) : randomBetween(30, 80);
        await sleep(delay);
      }
      break;

    case 'mouse_wheel':
    default:
      // Small increments like mouse wheel
      const wheelSteps = 30;
      const wheelIncrement = scrollAmount / wheelSteps;
      for (let i = 0; i < wheelSteps; i++) {
        await page.mouse.wheel(0, wheelIncrement);
        await sleep(randomBetween(10, 30));
      }
  }
}

// ============================================
// DELAY FUNCTIONS
// ============================================

/**
 * Get delay based on pattern
 */
export function getDelay(pattern: DelayPattern): number {
  switch (pattern) {
    case 'impatient':
      return randomBetween(500, 1500);
    case 'thoughtful':
      return randomBetween(2000, 4000);
    case 'erratic':
      return randomBetween(300, 5000);
    case 'natural':
    default:
      return randomBetween(1000, 2500);
  }
}

/**
 * Wait with human-like delay
 */
export async function humanDelay(pattern: DelayPattern): Promise<void> {
  const delay = getDelay(pattern);
  await sleep(delay);
}


// ============================================
// BEHAVIOR MEMORY (Supabase Integration)
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || 'https://suqjifkhmekcdflwowiw.supabase.co';
    const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

/**
 * Get recent behavior profiles for a project
 * UPDATED: Now fetches 30 tasks instead of 5 for better anti-detection
 */
export async function getRecentBehaviors(projectId: number, limit: number = 30): Promise<BehaviorProfile[]> {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('browser_tasks')
      .select('behavior_used')
      .eq('project_id', projectId)
      .not('behavior_used', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent behaviors:', error);
      return [];
    }

    return (data || [])
      .map(row => row.behavior_used as BehaviorProfile)
      .filter(b => b && b.mouse); // Filter out empty/invalid
  } catch (err) {
    console.error('Error in getRecentBehaviors:', err);
    return [];
  }
}

/**
 * Save behavior profile for a task
 * Now includes start_position and click_positions
 */
export async function saveBehavior(taskId: string, behavior: BehaviorProfile): Promise<void> {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('browser_tasks')
      .update({ behavior_used: behavior })
      .eq('id', taskId);

    if (error) {
      console.error('Error saving behavior:', error);
    }
  } catch (err) {
    console.error('Error in saveBehavior:', err);
  }
}

/**
 * Create behavior profile for a new task
 * Automatically avoids patterns and positions used in recent 30 tasks
 */
export async function createTaskBehavior(projectId: number): Promise<BehaviorProfile> {
  const recentBehaviors = await getRecentBehaviors(projectId, 30);
  return generateBehaviorProfile(recentBehaviors);
}

export default {
  // Patterns
  MOUSE_PATTERNS,
  TYPING_PATTERNS,
  SCROLL_PATTERNS,
  DELAY_PATTERNS,

  // Core functions
  generateBehaviorProfile,
  selectDifferentPattern,

  // Human actions
  humanMouseMove,
  humanClick,
  humanType,
  humanScroll,
  humanDelay,
  getDelay,

  // Database integration
  getRecentBehaviors,
  saveBehavior,
  createTaskBehavior
};
