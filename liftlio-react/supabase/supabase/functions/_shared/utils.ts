/**
 * Shared utility functions for Edge Functions
 */

/**
 * Format error for consistent error responses
 */
export function formatError(error: any): { error: string } {
  const errorMessage = error?.message || String(error);
  return {
    error: errorMessage
  };
}

/**
 * Validate required parameter and throw if missing
 */
export function validateRequiredParam(value: any, paramName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required parameter: ${paramName}`);
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  return input.trim().replace(/[<>]/g, '');
}
