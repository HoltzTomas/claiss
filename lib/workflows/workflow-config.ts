/**
 * Workflow Configuration
 *
 * Centralized configuration for Vercel Workflows including:
 * - Retry strategies per step type
 * - Timeout configurations
 * - Idempotency key generation
 * - Error handling policies
 */

export const WORKFLOW_CONFIG = {
  // AI Generation Step
  aiGeneration: {
    maxRetries: 3,
    retryDelays: {
      providerError: '30s',
      timeout: '60s',
      rateLimitInitial: '10s',
      rateLimitSubsequent: '30s'
    },
    timeout: 300000, // 5 minutes
  },

  // Code Validation Step
  codeValidation: {
    maxRetries: 0, // Don't retry validation failures - they're fatal
    timeout: 10000, // 10 seconds
  },

  // Compilation Step
  compilation: {
    maxRetries: 5,
    retryDelays: {
      modalServerError: '30s',
      modalTimeout: '60s',
      networkError: '15s',
      rateLimitInitial: '30s',
      rateLimitSubsequent: '60s'
    },
    timeout: 180000, // 3 minutes
  },

  // Video Upload Step
  videoUpload: {
    maxRetries: 5,
    retryDelays: {
      networkError: '10s',
      blobServiceError: '20s',
      timeout: '30s'
    },
    timeout: 120000, // 2 minutes
  },

  // Video Merge Step
  videoMerge: {
    maxRetries: 3,
    retryDelays: {
      modalServerError: '45s',
      modalTimeout: '90s',
      networkError: '20s'
    },
    timeout: 300000, // 5 minutes
  },

  // Status Update Step
  statusUpdate: {
    maxRetries: 3,
    retryDelays: {
      storageError: '5s',
      networkError: '10s'
    },
    timeout: 30000, // 30 seconds
  }
} as const;

/**
 * Generate idempotency key for external API calls
 * Uses workflow metadata to ensure uniqueness per step execution
 */
export function generateIdempotencyKey(
  stepId: string,
  operation: string,
  resourceId?: string
): string {
  const parts = [operation, stepId];
  if (resourceId) {
    parts.push(resourceId);
  }
  return parts.join(':');
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  baseDelay: string,
  attemptNumber: number,
  maxDelay: string = '5m'
): string {
  // Parse time strings (e.g., "30s", "2m")
  const parseTime = (timeStr: string): number => {
    const match = timeStr.match(/^(\d+)([smh])$/);
    if (!match) return 30; // default 30 seconds

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      default: return 30;
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const baseSeconds = parseTime(baseDelay);
  const maxSeconds = parseTime(maxDelay);

  // Exponential backoff: baseDelay * (2 ^ (attemptNumber - 1))
  const delaySeconds = Math.min(
    baseSeconds * Math.pow(2, attemptNumber - 1),
    maxSeconds
  );

  return formatTime(Math.floor(delaySeconds));
}

/**
 * Workflow execution policies
 */
export const EXECUTION_POLICIES = {
  // Whether to continue on partial failures
  continueOnPartialFailure: true,

  // Whether to save partial results
  savePartialResults: true,

  // Maximum workflow execution time (before considered stuck)
  maxWorkflowDuration: 3600000, // 1 hour

  // Logging verbosity
  logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
} as const;

/**
 * Step function metadata
 */
export type StepType =
  | 'aiGeneration'
  | 'codeValidation'
  | 'compilation'
  | 'videoUpload'
  | 'videoMerge'
  | 'statusUpdate';

export interface StepConfig {
  maxRetries: number;
  retryDelays: Record<string, string>;
  timeout: number;
}

export function getStepConfig(stepType: StepType): StepConfig {
  return WORKFLOW_CONFIG[stepType];
}
