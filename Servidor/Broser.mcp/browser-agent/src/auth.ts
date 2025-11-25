/**
 * Authentication Middleware
 * Protects MCP endpoints with API key authentication
 */

import { Request, Response, NextFunction } from 'express';

const API_SECRET_KEY = process.env.API_SECRET_KEY;

/**
 * API Key authentication middleware
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  // Skip auth for health check
  if (req.path === '/health') {
    return next();
  }

  // Skip auth in development mode if no key is set
  if (!API_SECRET_KEY && process.env.NODE_ENV === 'development') {
    console.warn('WARNING: API_SECRET_KEY not set - auth disabled in development');
    return next();
  }

  const providedKey = req.headers['x-api-key'] as string;

  if (!providedKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key required. Provide X-API-Key header.'
    });
  }

  if (providedKey !== API_SECRET_KEY) {
    console.warn(`Invalid API key attempt from ${req.ip}`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }

  next();
}

/**
 * Rate limiting configuration
 */
export const rateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
};

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Unhandled error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
}
