// Enhanced fetch wrapper to handle browser extension interference
import { retryNetworkRequest } from './networkErrorHandler';

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

// Check if the error is caused by a browser extension
function isExtensionError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  return errorMessage.includes('chrome-extension://') || 
         errorMessage.includes('moz-extension://') ||
         errorMessage.includes('extension://');
}

// Check if we're running in a browser with problematic extensions
function hasProblematicExtensions(): boolean {
  // Check if certain known problematic extensions are present
  // This is a heuristic approach since we can't directly query extensions
  try {
    // Check for common extension injected globals
    const suspiciousGlobals = [
      '__REACT_DEVTOOLS_GLOBAL_HOOK__',
      '__REDUX_DEVTOOLS_EXTENSION__',
      '_metamask',
      'ethereum',
    ];
    
    for (const global of suspiciousGlobals) {
      if (global in window) {
        // Using debug level to reduce console noise - these are just informative
        console.debug(`Detected potential extension: ${global}`);
      }
    }
  } catch (e) {
    // Ignore errors in detection
  }
  
  return false;
}

// Enhanced fetch wrapper with extension error handling
export async function safeFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
    ...fetchOptions
  } = options;

  // Add default headers to help with CORS and extension issues
  const headers = new Headers(fetchOptions.headers || {});
  
  // Ensure we have proper content-type
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json');
  }

  const enhancedOptions: RequestInit = {
    ...fetchOptions,
    headers,
    // Ensure credentials are included for Supabase
    credentials: fetchOptions.credentials || 'same-origin',
    // Add cache control to prevent extension interference
    cache: 'no-cache',
  };

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Use the retry wrapper
    const response = await retryNetworkRequest(
      async () => {
        try {
          const response = await fetch(url, {
            ...enhancedOptions,
            signal: controller.signal,
          });
          
          return response;
        } catch (error: any) {
          // Check if it's an abort error
          if (error.name === 'AbortError') {
            // Don't log abort errors - they're expected when requests are cancelled
            throw error;
          }
          
          // Check if it's an extension error
          if (isExtensionError(error)) {
            console.warn('Browser extension interference detected. Attempting workaround...');
            
            // Try alternative approach: use XMLHttpRequest as fallback
            return await xmlHttpRequestFallback(url, enhancedOptions);
          }
          
          throw error;
        }
      },
      retries,
      retryDelay
    );
    
    return response;
  } catch (error: any) {
    // Handle abort errors silently
    if (error.name === 'AbortError') {
      // Create a synthetic response for aborted requests
      return new Response(null, {
        status: 499,
        statusText: 'Client Closed Request'
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// XMLHttpRequest fallback for when fetch is intercepted by extensions
function xmlHttpRequestFallback(url: string, options: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.open(options.method || 'GET', url, true);
    
    // Set headers
    if (options.headers) {
      const headers = options.headers instanceof Headers 
        ? options.headers 
        : new Headers(options.headers);
        
      headers.forEach((value, key) => {
        xhr.setRequestHeader(key, value);
      });
    }
    
    // Set credentials
    if (options.credentials === 'include') {
      xhr.withCredentials = true;
    }
    
    // Handle response
    xhr.onload = () => {
      const headers = xhr.getAllResponseHeaders()
        .split('\r\n')
        .reduce((acc, current) => {
          const [name, value] = current.split(': ');
          if (name) acc[name] = value;
          return acc;
        }, {} as Record<string, string>);
        
      // Create a Response-like object
      const response = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: new Headers(headers),
        text: () => Promise.resolve(xhr.responseText),
        json: () => Promise.resolve(JSON.parse(xhr.responseText)),
        blob: () => Promise.resolve(new Blob([xhr.response])),
        clone: () => response,
        body: xhr.response,
        bodyUsed: false,
        arrayBuffer: () => Promise.resolve(xhr.response),
        formData: () => Promise.reject(new Error('FormData not supported in fallback')),
        url: url,
        type: 'basic' as ResponseType,
        redirected: false,
      } as Response;
      
      resolve(response);
    };
    
    xhr.onerror = () => {
      reject(new Error('Network request failed'));
    };
    
    xhr.ontimeout = () => {
      reject(new Error('Request timeout'));
    };
    
    // Send request
    xhr.send(options.body as any);
  });
}

// Export a pre-configured fetch for Supabase API calls
export function createSupabaseFetch(supabaseUrl: string, supabaseAnonKey: string) {
  return async (endpoint: string, options: FetchOptions = {}) => {
    const url = `${supabaseUrl}${endpoint}`;
    
    // Add Supabase headers
    const headers = new Headers(options.headers || {});
    headers.set('apikey', supabaseAnonKey);
    headers.set('Authorization', `Bearer ${supabaseAnonKey}`);
    
    return safeFetch(url, {
      ...options,
      headers,
    });
  };
}

// Utility to detect and warn about extension issues
export function detectExtensionIssues(): void {
  // Monitor for extension errors
  window.addEventListener('error', (event) => {
    if (isExtensionError(event.error)) {
      console.warn(
        'Browser extension is interfering with network requests. ' +
        'Consider disabling extensions or using incognito mode for better performance.'
      );
    }
  });
  
  // Check for problematic extensions on load
  if (hasProblematicExtensions()) {
    console.info(
      'Detected browser extensions that might affect app performance. ' +
      'If you experience issues, try disabling extensions.'
    );
  }
}