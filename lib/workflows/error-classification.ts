/**
 * Error Classification for Workflows
 *
 * Determines whether errors should be retried (RetryableError)
 * or treated as fatal (FatalError) based on error type and context.
 */

import { RetryableError, FatalError } from 'workflow';
import { calculateRetryDelay, WORKFLOW_CONFIG } from './workflow-config';

/**
 * Error types that can be classified
 */
export type ErrorType =
  | 'provider_error'      // AI provider (Gemini, Context7) errors
  | 'timeout'             // Operation timed out
  | 'rate_limit'          // Rate limiting from external APIs
  | 'network_error'       // Network/connectivity issues
  | 'server_error'        // 5xx HTTP errors
  | 'client_error'        // 4xx HTTP errors (usually fatal)
  | 'validation_error'    // Code/input validation failures (fatal)
  | 'compilation_error'   // Code compilation failures (fatal)
  | 'unknown';            // Unknown error type

/**
 * Error context for classification
 */
export interface ErrorContext {
  operation: string;
  attemptNumber: number;
  stepType?: string;
  statusCode?: number;
  errorMessage?: string;
}

/**
 * Classify error type from error object
 */
export function classifyError(error: any, context: ErrorContext): ErrorType {
  const message = error?.message?.toLowerCase() || '';
  const status = context.statusCode || error?.status || error?.statusCode;

  // Rate limiting (429 or specific messages)
  if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
    return 'rate_limit';
  }

  // Timeout errors
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    error?.code === 'ETIMEDOUT'
  ) {
    return 'timeout';
  }

  // Network errors
  if (
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ENOTFOUND' ||
    error?.code === 'ECONNRESET' ||
    message.includes('network') ||
    message.includes('fetch failed')
  ) {
    return 'network_error';
  }

  // Server errors (5xx)
  if (status && status >= 500 && status < 600) {
    return 'server_error';
  }

  // AI Provider errors
  if (
    message.includes('provider') ||
    message.includes('gemini') ||
    message.includes('context7') ||
    message.includes('mcp')
  ) {
    return 'provider_error';
  }

  // Validation errors (fatal)
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('missing') ||
    (status && status === 400)
  ) {
    return 'validation_error';
  }

  // Compilation errors (fatal)
  if (
    message.includes('compilation failed') ||
    message.includes('syntax error') ||
    message.includes('import error') ||
    message.includes('class not found')
  ) {
    return 'compilation_error';
  }

  // Client errors (mostly fatal, except specific cases)
  if (status && status >= 400 && status < 500 && status !== 429) {
    return 'client_error';
  }

  return 'unknown';
}

/**
 * Determine if an error should be retried
 */
export function isRetryable(errorType: ErrorType): boolean {
  const retryableTypes: ErrorType[] = [
    'provider_error',
    'timeout',
    'rate_limit',
    'network_error',
    'server_error',
    'unknown' // Retry unknown errors cautiously
  ];

  return retryableTypes.includes(errorType);
}

/**
 * Get retry delay for error type
 */
function getRetryDelayForError(
  errorType: ErrorType,
  context: ErrorContext
): string {
  const stepConfig = context.stepType
    ? WORKFLOW_CONFIG[context.stepType as keyof typeof WORKFLOW_CONFIG]
    : null;

  if (!stepConfig || !('retryDelays' in stepConfig)) {
    // Default delays if no step config
    switch (errorType) {
      case 'rate_limit':
        return context.attemptNumber === 1 ? '10s' : '30s';
      case 'timeout':
        return '60s';
      case 'network_error':
        return '15s';
      case 'server_error':
        return '30s';
      case 'provider_error':
        return '30s';
      default:
        return '30s';
    }
  }

  const delays = stepConfig.retryDelays as Record<string, string>;

  switch (errorType) {
    case 'rate_limit':
      return context.attemptNumber === 1
        ? (delays.rateLimitInitial || '10s')
        : (delays.rateLimitSubsequent || '30s');
    case 'timeout':
      return delays.timeout || delays.modalTimeout || '60s';
    case 'network_error':
      return delays.networkError || '15s';
    case 'server_error':
      return delays.modalServerError || delays.blobServiceError || '30s';
    case 'provider_error':
      return delays.providerError || '30s';
    default:
      return '30s';
  }
}

/**
 * Create appropriate error for workflow
 *
 * This is the main function to use in workflow steps.
 * It analyzes the error and returns either a RetryableError or FatalError.
 */
export function createWorkflowError(
  error: any,
  context: ErrorContext
): RetryableError | FatalError {
  const errorType = classifyError(error, context);
  const isRetry = isRetryable(errorType);

  // Extract error message
  const message = error?.message || error?.error || String(error);
  const fullMessage = `${context.operation} failed: ${message}`;

  console.log(`[WORKFLOW-ERROR] ${context.operation}:`, {
    errorType,
    isRetryable: isRetry,
    attemptNumber: context.attemptNumber,
    message: message
  });

  if (!isRetry) {
    // Fatal error - don't retry
    return new FatalError(fullMessage);
  }

  // Retryable error - calculate delay
  const baseDelay = getRetryDelayForError(errorType, context);
  const retryDelay = calculateRetryDelay(baseDelay, context.attemptNumber);

  console.log(`[WORKFLOW-ERROR] Retry scheduled after ${retryDelay}`);

  return new RetryableError(fullMessage, {
    retryAfter: retryDelay
  });
}

/**
 * Convenience functions for specific error scenarios
 */

export function createRateLimitError(
  operation: string,
  attemptNumber: number,
  retryAfterHeader?: string
): RetryableError {
  const delay = retryAfterHeader
    ? `${retryAfterHeader}s`
    : attemptNumber === 1 ? '10s' : '30s';

  return new RetryableError(`${operation}: Rate limited`, {
    retryAfter: delay
  });
}

export function createTimeoutError(
  operation: string,
  attemptNumber: number
): RetryableError {
  const delay = calculateRetryDelay('60s', attemptNumber);

  return new RetryableError(`${operation}: Timeout`, {
    retryAfter: delay
  });
}

export function createValidationError(
  operation: string,
  validationMessage: string
): FatalError {
  return new FatalError(`${operation}: ${validationMessage}`);
}

export function createCompilationError(
  operation: string,
  compilationError: string
): FatalError {
  return new FatalError(`${operation}: Compilation failed - ${compilationError}`);
}

/**
 * Extract retry-after header from HTTP response
 */
export function extractRetryAfter(response: Response): string | undefined {
  const retryAfter = response.headers.get('Retry-After');
  if (!retryAfter) return undefined;

  // Could be seconds or HTTP date
  const seconds = parseInt(retryAfter);
  if (!isNaN(seconds)) {
    return `${seconds}s`;
  }

  // Try parsing as date
  try {
    const date = new Date(retryAfter);
    const now = new Date();
    const diffSeconds = Math.max(0, Math.floor((date.getTime() - now.getTime()) / 1000));
    return `${diffSeconds}s`;
  } catch {
    return undefined;
  }
}
