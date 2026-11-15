// === Error Handling Service ===
// Centralized error management & retry logic

export class ApiError extends Error {
  public statusCode: number;
  public originalError?: Error;

  constructor(
    statusCode: number,
    originalError?: Error,
    message?: string
  ) {
    super(message || `API Error: ${statusCode}`);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }

  isNetworkError(): boolean {
    return !this.statusCode || this.statusCode === 0;
  }

  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  isRetryable(): boolean {
    // Retry on network errors, server errors, and timeouts
    return (
      this.isNetworkError() ||
      this.isServerError() ||
      this.statusCode === 408 || // Request Timeout
      this.statusCode === 429    // Too Many Requests
    );
  }

  getUserMessage(): string {
    switch (this.statusCode) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'You are not authenticated. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 408:
        return 'Request timed out. Please try again.';
      case 429:
        return 'Too many requests. Please wait a moment.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        if (this.isNetworkError()) {
          return 'Network error. Please check your connection.';
        }
        return this.message || 'An error occurred. Please try again.';
    }
  }
}

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: ApiError, nextDelayMs: number) => void;
}

/**
 * Retry a failed request with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    maxDelayMs = 10000,
    onRetry = () => {},
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (error instanceof ApiError && !error.isRetryable()) {
        throw error;
      }

      // No more retries
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        delayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );

      if (error instanceof ApiError) {
        onRetry(attempt + 1, error, delay);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Create an API error from a response
 */
export function createApiError(
  statusCode: number,
  responseData?: { error?: string; message?: string },
  originalError?: Error
): ApiError {
  const message =
    responseData?.error ||
    responseData?.message ||
    `HTTP ${statusCode}`;

  return new ApiError(statusCode, originalError, message);
}

/**
 * Format error for logging
 */
export function formatErrorLog(error: unknown): string {
  if (error instanceof ApiError) {
    return `[API Error] ${error.statusCode}: ${error.message}`;
  }
  if (error instanceof Error) {
    return `[Error] ${error.name}: ${error.message}`;
  }
  return `[Error] ${String(error)}`;
}

/**
 * Error boundary hook for React
 */
export class ErrorBoundary extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorBoundary';
  }
}
