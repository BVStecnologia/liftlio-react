/**
 * Test script for Humanization System
 * Run: npx ts-node test-humanization.ts
 */

import {
  MOUSE_PATTERNS,
  TYPING_PATTERNS,
  SCROLL_PATTERNS,
  DELAY_PATTERNS,
  generateBehaviorProfile,
  selectDifferentPattern,
  BehaviorProfile
} from './src/humanization';

console.log('===========================================');
console.log('  HUMANIZATION SYSTEM TEST');
console.log('===========================================\n');

// Test 1: Generate profile with no history
console.log('TEST 1: Generate profile with NO history');
console.log('-----------------------------------------');
const profile1 = generateBehaviorProfile([]);
console.log('Generated:', JSON.stringify(profile1, null, 2));
console.log('✅ Profile generated successfully\n');

// Test 2: Generate profile avoiding previous patterns
console.log('TEST 2: Generate profile AVOIDING previous patterns');
console.log('----------------------------------------------------');

const previousProfiles: BehaviorProfile[] = [
  { mouse: 'bezier_smooth', typing: 'hunt_peck', scroll: 'smooth', delay: 'impatient', click_offset: { x: 0, y: 0 }, typing_speed_ms: 150 },
  { mouse: 'overshoot', typing: 'touch_typist', scroll: 'stepped', delay: 'thoughtful', click_offset: { x: 0, y: 0 }, typing_speed_ms: 75 },
];

console.log('Previous patterns used:');
previousProfiles.forEach((p, i) => {
  console.log(`  Task ${i + 1}: mouse=${p.mouse}, typing=${p.typing}`);
});

const profile2 = generateBehaviorProfile(previousProfiles);
console.log('\nNew profile (should be DIFFERENT):');
console.log('  mouse:', profile2.mouse, previousProfiles.some(p => p.mouse === profile2.mouse) ? '❌ REPEATED!' : '✅ Different!');
console.log('  typing:', profile2.typing, previousProfiles.some(p => p.typing === profile2.typing) ? '❌ REPEATED!' : '✅ Different!');
console.log('  scroll:', profile2.scroll, previousProfiles.some(p => p.scroll === profile2.scroll) ? '❌ REPEATED!' : '✅ Different!');
console.log('  delay:', profile2.delay, previousProfiles.some(p => p.delay === profile2.delay) ? '❌ REPEATED!' : '✅ Different!');

// Test 3: Pattern selection with exclusions
console.log('\nTEST 3: Pattern selection with exclusions');
console.log('-----------------------------------------');

const usedMouse = ['bezier_smooth', 'overshoot', 'zigzag_subtle'] as const;
console.log('Already used mouse patterns:', usedMouse);

const newMouse = selectDifferentPattern(MOUSE_PATTERNS, [...usedMouse]);
console.log('Selected new pattern:', newMouse);
console.log(usedMouse.includes(newMouse as any) ? '❌ ERROR: Pattern repeated!' : '✅ Correctly chose different pattern!');

// Test 4: Simulate 10 consecutive tasks
console.log('\n\nTEST 4: Simulate 10 consecutive tasks');
console.log('======================================');

let history: BehaviorProfile[] = [];

for (let i = 1; i <= 10; i++) {
  const newProfile = generateBehaviorProfile(history.slice(-5)); // Last 5 only
  console.log(`Task ${i}: mouse=${newProfile.mouse.padEnd(15)} typing=${newProfile.typing.padEnd(12)} scroll=${newProfile.scroll.padEnd(10)} delay=${newProfile.delay}`);
  history.push(newProfile);
}

// Analyze repetition
console.log('\n📊 ANALYSIS:');
const mousePatterns = history.map(h => h.mouse);
const uniqueMouse = new Set(mousePatterns);
console.log(`Mouse patterns used: ${uniqueMouse.size}/${MOUSE_PATTERNS.length} unique`);
console.log(`Patterns:`, [...uniqueMouse].join(', '));

// Check consecutive repetitions
let consecutiveRepeats = 0;
for (let i = 1; i < history.length; i++) {
  if (history[i].mouse === history[i-1].mouse) consecutiveRepeats++;
}
console.log(`Consecutive mouse repetitions: ${consecutiveRepeats}`);

console.log('\n===========================================');
console.log('  TEST COMPLETE');
console.log('===========================================');
