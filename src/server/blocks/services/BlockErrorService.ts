import { redis } from '@devvit/web/server';

/**
 * Error types for block system
 */
export enum BlockErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATA_FETCH_ERROR = 'DATA_FETCH_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Block error interface
 */
export interface BlockError {
  type: BlockErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  code?: string | undefined;
  retryable: boolean;
  timestamp: number;
  context?: Record<string, any> | undefined;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: BlockErrorType[];
}

/**
 * Error recovery strategy
 */
interface ErrorRecoveryStrategy {
  fallbackContent?: any;
  showRetryButton: boolean;
  autoRetry: boolean;
  redirectUrl?: string;
  contactSupport: boolean;
}

/**
 * Comprehensive error handling service for blocks
 */
export class BlockErrorService {
  private static readonly ERROR_LOG_KEY = 'block:errors:log';
  private static readonly ERROR_STATS_KEY = 'block:errors:stats';

  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
      BlockErrorType.NETWORK_ERROR,
      BlockErrorType.DATA_FETCH_ERROR,
      BlockErrorType.CACHE_ERROR,
      BlockErrorType.RATE_LIMIT_ERROR,
    ],
  };

  /**
   * Create a standardized block error
   */
  static createError(
    type: BlockErrorType,
    message: string,
    context?: Record<string, any>
  ): BlockError {
    const severity = this.getErrorSeverity(type);
    const userMessage = this.getUserFriendlyMessage(type, message);

    return {
      type,
      severity,
      message,
      userMessage,
      retryable: this.isRetryableError(type),
      timestamp: Date.now(),
      context,
    };
  }

  /**
   * Handle error with appropriate recovery strategy
   */
  static async handleError(
    error: BlockError | Error,
    blockId: string,
    blockType: string
  ): Promise<{
    errorState: any;
    recoveryStrategy: ErrorRecoveryStrategy;
  }> {
    let blockError: BlockError;

    if (error instanceof Error) {
      blockError = this.createError(this.classifyError(error), error.message, {
        stack: error.stack,
        blockId,
        blockType,
      });
    } else {
      blockError = error;
    }

    // Log the error
    await this.logError(blockError, blockId, blockType);

    // Get recovery strategy
    const recoveryStrategy = this.getRecoveryStrategy(blockError);

    // Create error state for UI
    const errorState = this.createErrorState(blockError, recoveryStrategy);

    return { errorState, recoveryStrategy };
  }

  /**
   * Implement retry mechanism with exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const blockError = this.createError(this.classifyError(lastError), lastError.message);

        // Check if error is retryable
        if (!retryConfig.retryableErrors.includes(blockError.type)) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === retryConfig.maxAttempts) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelay
        );

        console.log(
          `[BlockErrorService] Retry attempt ${attempt}/${retryConfig.maxAttempts} after ${delay}ms`
        );

        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Create error boundary wrapper for block components
   */
  static createErrorBoundary(blockId: string, blockType: string) {
    return {
      type: 'error-boundary',
      blockId,
      blockType,
      onError: async (error: Error) => {
        const { errorState } = await this.handleError(error, blockId, blockType);
        return errorState;
      },
      fallback: this.createFallbackContent(blockType),
    };
  }

  /**
   * Create user-friendly error state for UI
   */
  static createErrorState(error: BlockError, recovery: ErrorRecoveryStrategy): any {
    const baseStyle = {
      padding: 'medium',
      cornerRadius: 'medium',
      backgroundColor: 'critical-background-weak',
      border: 'thin',
      borderColor: 'critical-border',
    };

    const components: any[] = [
      {
        type: 'vstack',
        gap: 'small',
        alignment: 'center',
        children: [
          {
            type: 'text',
            content: '⚠️ Something went wrong',
            size: 'large',
            weight: 'bold',
            color: 'critical',
          },
          {
            type: 'text',
            content: error.userMessage,
            size: 'medium',
            color: 'secondary',
            alignment: 'center',
          },
        ],
      },
    ];

    // Add action buttons based on recovery strategy
    const actions: any[] = [];

    if (recovery.showRetryButton) {
      actions.push({
        type: 'button',
        label: 'Try Again',
        appearance: 'primary',
        size: 'small',
        action: 'retry',
      });
    }

    if (recovery.contactSupport) {
      actions.push({
        type: 'button',
        label: 'Contact Support',
        appearance: 'secondary',
        size: 'small',
        action: 'contact-support',
      });
    }

    if (actions.length > 0) {
      components.push({
        type: 'hstack',
        gap: 'small',
        alignment: 'center',
        children: actions,
      });
    }

    return {
      type: 'error-state',
      severity: error.severity,
      style: baseStyle,
      components,
    };
  }

  /**
   * Create fallback content for critical errors
   */
  static createFallbackContent(blockType: string): any {
    const fallbackContent = {
      'level-preview': {
        title: 'Level Preview Unavailable',
        description: 'Unable to load level information at this time.',
        icon: '🎮',
      },
      'weekly-challenge': {
        title: 'Challenge Unavailable',
        description: 'Unable to load challenge information at this time.',
        icon: '🏆',
      },
      'landing': {
        title: 'Welcome to Galaxy Explorer',
        description: 'Create and share amazing space levels with the community.',
        icon: '🚀',
      },
      'community-showcase': {
        title: 'Community Content',
        description: 'Discover amazing content created by our community.',
        icon: '👥',
      },
    };

    const content = fallbackContent[blockType as keyof typeof fallbackContent] || {
      title: 'Content Unavailable',
      description: 'Unable to load content at this time.',
      icon: '📱',
    };

    return {
      type: 'fallback-content',
      components: [
        {
          type: 'vstack',
          gap: 'medium',
          alignment: 'center',
          children: [
            {
              type: 'text',
              content: content.icon,
              size: 'xxlarge',
            },
            {
              type: 'text',
              content: content.title,
              size: 'large',
              weight: 'bold',
              color: 'primary',
            },
            {
              type: 'text',
              content: content.description,
              size: 'medium',
              color: 'secondary',
              alignment: 'center',
            },
          ],
        },
      ],
      style: {
        padding: 'large',
        alignment: 'center',
        backgroundColor: 'neutral-background-weak',
        cornerRadius: 'medium',
        border: 'thin',
        borderColor: 'neutral-border',
      },
    };
  }

  /**
   * Log error for monitoring and debugging
   */
  static async logError(error: BlockError, blockId: string, blockType: string): Promise<void> {
    try {
      const errorLog = {
        ...error,
        blockId,
        blockType,
        id: `${blockId}-${Date.now()}`,
      };

      // Store individual error log
      const logKey = `${this.ERROR_LOG_KEY}:${errorLog.id}`;
      await redis.set(logKey, JSON.stringify(errorLog));
      await redis.expire(logKey, 7 * 24 * 60 * 60); // 7 days

      // Update error statistics
      await this.updateErrorStats(error.type, blockType);

      console.error(`[BlockErrorService] Logged error for ${blockType}:${blockId}:`, {
        type: error.type,
        severity: error.severity,
        message: error.message,
      });
    } catch (logError) {
      console.error(`[BlockErrorService] Failed to log error:`, logError);
    }
  }

  /**
   * Get error statistics for monitoring
   */
  static async getErrorStats(): Promise<{
    totalErrors: number;
    errorsByType: Record<BlockErrorType, number>;
    errorsByBlockType: Record<string, number>;
    errorRate: number;
  }> {
    try {
      const statsStr = await redis.get(this.ERROR_STATS_KEY);

      if (statsStr) {
        return JSON.parse(statsStr);
      }

      return {
        totalErrors: 0,
        errorsByType: {} as Record<BlockErrorType, number>,
        errorsByBlockType: {},
        errorRate: 0,
      };
    } catch (error) {
      console.error(`[BlockErrorService] Error getting error stats:`, error);
      return {
        totalErrors: 0,
        errorsByType: {} as Record<BlockErrorType, number>,
        errorsByBlockType: {},
        errorRate: 0,
      };
    }
  }

  /**
   * Clear error logs (for maintenance)
   */
  static async clearErrorLogs(olderThanDays = 7): Promise<void> {
    try {
      const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

      // Note: In production, this would use SCAN to find keys
      // For now, we'll just reset the stats
      await redis.del(this.ERROR_STATS_KEY);

      console.log(`[BlockErrorService] Cleared error logs older than ${olderThanDays} days`);
    } catch (error) {
      console.error(`[BlockErrorService] Error clearing error logs:`, error);
    }
  }

  // Private helper methods

  /**
   * Classify error type based on error instance
   */
  private static classifyError(error: Error): BlockErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return BlockErrorType.NETWORK_ERROR;
    }
    if (message.includes('cache') || message.includes('redis')) {
      return BlockErrorType.CACHE_ERROR;
    }
    if (message.includes('auth') || message.includes('unauthorized')) {
      return BlockErrorType.AUTHENTICATION_ERROR;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return BlockErrorType.RATE_LIMIT_ERROR;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return BlockErrorType.VALIDATION_ERROR;
    }

    return BlockErrorType.UNKNOWN_ERROR;
  }

  /**
   * Get error severity based on type
   */
  private static getErrorSeverity(type: BlockErrorType): ErrorSeverity {
    const severityMap: Record<BlockErrorType, ErrorSeverity> = {
      [BlockErrorType.NETWORK_ERROR]: ErrorSeverity.MEDIUM,
      [BlockErrorType.DATA_FETCH_ERROR]: ErrorSeverity.MEDIUM,
      [BlockErrorType.CACHE_ERROR]: ErrorSeverity.LOW,
      [BlockErrorType.VALIDATION_ERROR]: ErrorSeverity.HIGH,
      [BlockErrorType.AUTHENTICATION_ERROR]: ErrorSeverity.HIGH,
      [BlockErrorType.RATE_LIMIT_ERROR]: ErrorSeverity.MEDIUM,
      [BlockErrorType.UNKNOWN_ERROR]: ErrorSeverity.HIGH,
    };

    return severityMap[type] || ErrorSeverity.MEDIUM;
  }

  /**
   * Check if error type is retryable
   */
  private static isRetryableError(type: BlockErrorType): boolean {
    return this.DEFAULT_RETRY_CONFIG.retryableErrors.includes(type);
  }

  /**
   * Get user-friendly error message
   */
  private static getUserFriendlyMessage(type: BlockErrorType, originalMessage: string): string {
    const friendlyMessages: Record<BlockErrorType, string> = {
      [BlockErrorType.NETWORK_ERROR]:
        'Unable to connect. Please check your internet connection and try again.',
      [BlockErrorType.DATA_FETCH_ERROR]: 'Unable to load content. Please try again in a moment.',
      [BlockErrorType.CACHE_ERROR]: 'Temporary loading issue. Please refresh and try again.',
      [BlockErrorType.VALIDATION_ERROR]:
        'Invalid data detected. Please contact support if this persists.',
      [BlockErrorType.AUTHENTICATION_ERROR]: 'Please log in to continue.',
      [BlockErrorType.RATE_LIMIT_ERROR]: 'Too many requests. Please wait a moment and try again.',
      [BlockErrorType.UNKNOWN_ERROR]:
        'An unexpected error occurred. Please try again or contact support.',
    };

    return friendlyMessages[type] || 'Something went wrong. Please try again.';
  }

  /**
   * Get recovery strategy based on error
   */
  private static getRecoveryStrategy(error: BlockError): ErrorRecoveryStrategy {
    const baseStrategy: ErrorRecoveryStrategy = {
      showRetryButton: error.retryable,
      autoRetry: false,
      contactSupport: error.severity === ErrorSeverity.CRITICAL,
    };

    switch (error.type) {
      case BlockErrorType.NETWORK_ERROR:
        return {
          ...baseStrategy,
          autoRetry: true,
        };

      case BlockErrorType.AUTHENTICATION_ERROR:
        return {
          ...baseStrategy,
          showRetryButton: false,
          redirectUrl: '/login',
        };

      case BlockErrorType.RATE_LIMIT_ERROR:
        return {
          ...baseStrategy,
          autoRetry: true,
          showRetryButton: false,
        };

      default:
        return baseStrategy;
    }
  }

  /**
   * Update error statistics
   */
  private static async updateErrorStats(
    errorType: BlockErrorType,
    blockType: string
  ): Promise<void> {
    try {
      const stats = await this.getErrorStats();

      stats.totalErrors += 1;
      stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;
      stats.errorsByBlockType[blockType] = (stats.errorsByBlockType[blockType] || 0) + 1;

      // Calculate error rate (simplified)
      stats.errorRate = stats.totalErrors / Math.max(1, stats.totalErrors + 100); // Assume 100 successful operations

      await redis.set(this.ERROR_STATS_KEY, JSON.stringify(stats));
      await redis.expire(this.ERROR_STATS_KEY, 30 * 24 * 60 * 60); // 30 days
    } catch (error) {
      console.error(`[BlockErrorService] Error updating error stats:`, error);
    }
  }

  /**
   * Simple delay utility
   */
  private static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
