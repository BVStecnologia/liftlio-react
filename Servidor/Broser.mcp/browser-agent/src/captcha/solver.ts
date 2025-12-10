/**
 * CAPTCHA Solver Module
 * Integrates with CapMonster Cloud API for solving CAPTCHAs
 */

import { CaptchaInfo } from './detector';

const CAPMONSTER_API_URL = 'https://api.capmonster.cloud';

interface CreateTaskResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  taskId?: number;
}

interface TaskResultResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  status: 'processing' | 'ready';
  solution?: {
    gRecaptchaResponse?: string;
    token?: string;
  };
}

interface BalanceResponse {
  errorId: number;
  balance?: number;
  errorCode?: string;
  errorDescription?: string;
}

/**
 * Get CapMonster API key from environment
 */
function getApiKey(): string {
  const key = process.env.CAPMONSTER_API_KEY;
  if (!key) {
    throw new Error('CAPMONSTER_API_KEY environment variable is not set');
  }
  return key;
}

/**
 * Check account balance
 */
export async function getBalance(): Promise<number> {
  const response = await fetch(`${CAPMONSTER_API_URL}/getBalance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientKey: getApiKey() })
  });

  const data: BalanceResponse = await response.json();

  if (data.errorId !== 0) {
    throw new Error(`CapMonster API error: ${data.errorCode} - ${data.errorDescription}`);
  }

  return data.balance || 0;
}

/**
 * Create a CAPTCHA solving task
 */
async function createTask(captchaInfo: CaptchaInfo, pageUrl: string): Promise<number> {
  let taskType: string;
  let taskData: Record<string, unknown>;

  switch (captchaInfo.type) {
    case 'recaptcha_v2':
      taskType = 'RecaptchaV2TaskProxyless';
      taskData = {
        type: taskType,
        websiteURL: pageUrl,
        websiteKey: captchaInfo.siteKey
      };
      break;

    case 'recaptcha_v3':
      taskType = 'RecaptchaV3TaskProxyless';
      taskData = {
        type: taskType,
        websiteURL: pageUrl,
        websiteKey: captchaInfo.siteKey,
        minScore: 0.3, // Default score
        pageAction: 'verify' // Default action
      };
      break;

    case 'hcaptcha':
      taskType = 'HCaptchaTaskProxyless';
      taskData = {
        type: taskType,
        websiteURL: pageUrl,
        websiteKey: captchaInfo.siteKey
      };
      break;

    case 'turnstile':
      taskType = 'TurnstileTaskProxyless';
      taskData = {
        type: taskType,
        websiteURL: pageUrl,
        websiteKey: captchaInfo.siteKey
      };
      break;

    default:
      throw new Error(`Unsupported CAPTCHA type: ${captchaInfo.type}`);
  }

  console.log(`[CAPTCHA SOLVER] Creating task: ${taskType} for ${pageUrl}`);

  const response = await fetch(`${CAPMONSTER_API_URL}/createTask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientKey: getApiKey(),
      task: taskData
    })
  });

  const data: CreateTaskResponse = await response.json();

  if (data.errorId !== 0) {
    throw new Error(`Failed to create task: ${data.errorCode} - ${data.errorDescription}`);
  }

  if (!data.taskId) {
    throw new Error('No taskId returned from CapMonster');
  }

  console.log(`[CAPTCHA SOLVER] Task created: ${data.taskId}`);
  return data.taskId;
}

/**
 * Poll for task result
 */
async function getTaskResult(taskId: number, maxAttempts: number = 60): Promise<string> {
  const pollInterval = 2000; // 2 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${CAPMONSTER_API_URL}/getTaskResult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey: getApiKey(),
        taskId
      })
    });

    const data: TaskResultResponse = await response.json();

    if (data.errorId !== 0) {
      throw new Error(`Task result error: ${data.errorCode} - ${data.errorDescription}`);
    }

    if (data.status === 'ready') {
      const token = data.solution?.gRecaptchaResponse || data.solution?.token;
      if (!token) {
        throw new Error('No token in solution');
      }
      console.log(`[CAPTCHA SOLVER] Task solved after ${attempt + 1} attempts`);
      return token;
    }

    // Still processing, wait and try again
    console.log(`[CAPTCHA SOLVER] Task still processing (attempt ${attempt + 1}/${maxAttempts})...`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Task timed out after ${maxAttempts} attempts`);
}

/**
 * Solve a CAPTCHA and return the token
 */
export async function solveCaptcha(captchaInfo: CaptchaInfo, pageUrl: string): Promise<string> {
  console.log(`[CAPTCHA SOLVER] Solving ${captchaInfo.type} CAPTCHA...`);
  const startTime = Date.now();

  try {
    // Check balance first
    const balance = await getBalance();
    console.log(`[CAPTCHA SOLVER] Account balance: $${balance.toFixed(2)}`);

    if (balance < 0.01) {
      throw new Error('Insufficient CapMonster balance');
    }

    // Create task
    const taskId = await createTask(captchaInfo, pageUrl);

    // Wait for result
    const token = await getTaskResult(taskId);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[CAPTCHA SOLVER] CAPTCHA solved in ${elapsed}s`);

    return token;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[CAPTCHA SOLVER] Failed after ${elapsed}s:`, error);
    throw error;
  }
}

/**
 * Check if CapMonster is properly configured
 */
export async function isConfigured(): Promise<boolean> {
  try {
    getApiKey();
    const balance = await getBalance();
    return balance > 0;
  } catch {
    return false;
  }
}
