// Network error handler utility
export class NetworkError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'NetworkError';
  }
}

export function isNetworkError(error: any): boolean {
  if (error instanceof NetworkError) return true;
  
  // Check for common network error patterns
  const errorMessage = error?.message?.toLowerCase() || '';
  const networkErrorPatterns = [
    'failed to fetch',
    'network error',
    'networkerror',
    'fetch failed',
    'net::err_',
    'cors',
    'cross-origin',
  ];
  
  return networkErrorPatterns.some(pattern => errorMessage.includes(pattern));
}

export function handleNetworkError(error: any): string {
  console.error('Network error detected:', error);
  
  // Check if it's a CORS error
  if (error?.message?.toLowerCase().includes('cors') || 
      error?.message?.toLowerCase().includes('cross-origin')) {
    return 'Cross-origin request blocked. This might be due to browser extensions or network policies.';
  }
  
  // Check if it's a generic network error
  if (isNetworkError(error)) {
    return 'Network connection failed. Please check your internet connection and try again.';
  }
  
  // Check for extension-related errors
  if (error?.message?.includes('chrome-extension://') || 
      error?.message?.includes('moz-extension://') ||
      error?.message?.includes('extension://')) {
    return 'A browser extension is interfering with the connection. Please try:\n' +
           '• Disabling browser extensions temporarily\n' +
           '• Using incognito/private browsing mode\n' +
           '• Using a different browser\n' +
           'The extension causing issues appears to be: ' + 
           (error.message.match(/[a-z]+-extension:\/\/[a-zA-Z0-9]+/)?.[0] || 'unknown');
  }
  
  // Default error message
  return error?.message || 'An unexpected error occurred. Please try again.';
}

// Retry logic for network requests
export async function retryNetworkRequest<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's not a network error
      if (!isNetworkError(error)) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw new NetworkError('Failed after multiple retries', lastError);
}