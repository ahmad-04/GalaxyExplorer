import type { Context } from '@devvit/public-api';

/**
 * Error severity levels for categorizing different types of errors
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories for better error classification
 */
export enum ErrorCategory {
  NAVIGATION = 'navigation',
  WEBVIEW_LAUNCH = 'webview_launch',
  VALIDATION = 'validation',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

/**
 * Comprehensive error information interface
 */
export interface ErrorInfo {
  message: string;
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: number;
  context?: Record<string, unknown>;
  stack?: string;
  retryCount?: number;
  userMessage?: string;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  enableConsoleLogging?: boolean;
  enableUserNotifications?: boolean;
  maxLogEntries?: number;
}

/**
 * Centralized error handler for the Galaxy Explorer main menu
 */
export class ErrorHandler {
  private config: Required<ErrorHandlerConfig>;
  private errorLog: ErrorInfo[] = [];

  constructor(config: ErrorHandlerConfig = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableUserNotifications: true,
      maxLogEntries: 100,
      ...config,
    };
  }

  /**
   * Handle an error with comprehensive logging and user feedback
   */
  handleError(
    error: Error | string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context?: Context,
    additionalContext?: Record<string, unknown>
  ): ErrorInfo {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    // Create comprehensive error info
    const errorInfo: ErrorInfo = {
      message: errorMessage,
      code: this.generateErrorCode(category, severity),
      category,
      severity,
      timestamp: Date.now(),
      context: additionalContext,
      stack: errorStack,
      userMessage: this.generateUserMessage(errorMessage, category, severity),
    };

    // Log error to console if enabled
    if (this.config.enableConsoleLogging) {
      this.logToConsole(errorInfo);
    }

    // Add to error log
    this.addToErrorLog(errorInfo);

    // Show user notification if enabled and context is available
    if (this.config.enableUserNotifications && context) {
      this.showUserNotification(context, errorInfo);
    }

    return errorInfo;
  }

  /**
   * Generate a unique error code based on category and severity
   */
  private generateErrorCode(category: ErrorCategory, severity: ErrorSeverity): string {
    const categoryCode = category.toUpperCase().substring(0, 3);
    const severityCode = severity.toUpperCase().substring(0, 1);
    const timestamp = Date.now().toString().slice(-6);
    return `${categoryCode}_${severityCode}_${timestamp}`;
  }

  /**
   * Generate user-friendly error message
   */
  private generateUserMessage(
    errorMessage: string,
    category: ErrorCategory,
    severity: ErrorSeverity
  ): string {
    switch (category) {
      case ErrorCategory.WEBVIEW_LAUNCH:
        if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
          return 'Unable to launch Galaxy Explorer. Please check your connection and try again.';
        }
        return 'Having trouble launching the game. Please try again.';

      case ErrorCategory.NAVIGATION:
        return 'Navigation error occurred. Returning to main menu.';

      case ErrorCategory.NETWORK:
        return 'Network connection issue. Please check your internet connection.';

      case ErrorCategory.TIMEOUT:
        return 'Request timed out. Please try again.';

      case ErrorCategory.VALIDATION:
        return 'Invalid input detected. Please check your selection and try again.';

      default:
        if (severity === ErrorSeverity.CRITICAL) {
          return 'A critical error occurred. Please refresh the page or contact support.';
        }
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Log error information to console with structured format
   */
  private logToConsole(errorInfo: ErrorInfo): void {
    const logLevel = this.getConsoleLogLevel(errorInfo.severity);
    const logMessage = `[ErrorHandler] ${errorInfo.category.toUpperCase()} Error`;

    const logData = {
      code: errorInfo.code,
      message: errorInfo.message,
      category: errorInfo.category,
      severity: errorInfo.severity,
      timestamp: new Date(errorInfo.timestamp).toISOString(),
      context: errorInfo.context,
      stack: errorInfo.stack,
    };

    console[logLevel](logMessage, logData);
  }

  /**
   * Get appropriate console log level based on error severity
   */
  private getConsoleLogLevel(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'log';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'error';
    }
  }

  /**
   * Add error to internal error log with size management
   */
  private addToErrorLog(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo);

    // Maintain maximum log size
    if (this.errorLog.length > this.config.maxLogEntries) {
      this.errorLog = this.errorLog.slice(-this.config.maxLogEntries);
    }
  }

  /**
   * Show user notification based on error severity
   */
  private showUserNotification(context: Context, errorInfo: ErrorInfo): void {
    const { ui } = context;

    if (!ui || !ui.showToast) {
      console.warn('[ErrorHandler] UI toast not available for user notification');
      return;
    }

    try {
      ui.showToast({
        text: errorInfo.userMessage || errorInfo.message,
        appearance: 'neutral',
      });
    } catch (toastError) {
      console.error('[ErrorHandler] Failed to show user notification:', toastError);
    }
  }

  /**
   * Get recent error log entries
   */
  getErrorLog(limit?: number): ErrorInfo[] {
    if (limit) {
      return this.errorLog.slice(-limit);
    }
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recentErrors: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const byCategory = Object.values(ErrorCategory).reduce(
      (acc, category) => ({ ...acc, [category]: 0 }),
      {} as Record<ErrorCategory, number>
    );

    const bySeverity = Object.values(ErrorSeverity).reduce(
      (acc, severity) => ({ ...acc, [severity]: 0 }),
      {} as Record<ErrorSeverity, number>
    );

    let recentErrors = 0;

    this.errorLog.forEach((error) => {
      byCategory[error.category]++;
      bySeverity[error.severity]++;
      if (error.timestamp > oneHourAgo) {
        recentErrors++;
      }
    });

    return {
      total: this.errorLog.length,
      byCategory,
      bySeverity,
      recentErrors,
    };
  }
}

/**
 * Default error handler instance
 */
export const defaultErrorHandler = new ErrorHandler();

/**
 * Convenience functions for common error scenarios
 */
export const handleWebviewError = (
  error: Error | string,
  context?: Context,
  retryCount?: number
) => {
  return defaultErrorHandler.handleError(
    error,
    ErrorCategory.WEBVIEW_LAUNCH,
    retryCount && retryCount > 2 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
    context,
    { retryCount }
  );
};

export const handleNavigationError = (error: Error | string, context?: Context) => {
  return defaultErrorHandler.handleError(
    error,
    ErrorCategory.NAVIGATION,
    ErrorSeverity.MEDIUM,
    context
  );
};

export const handleValidationError = (error: Error | string, context?: Context) => {
  return defaultErrorHandler.handleError(
    error,
    ErrorCategory.VALIDATION,
    ErrorSeverity.LOW,
    context
  );
};

export const handleCriticalError = (error: Error | string, context?: Context) => {
  return defaultErrorHandler.handleError(
    error,
    ErrorCategory.UNKNOWN,
    ErrorSeverity.CRITICAL,
    context
  );
};
