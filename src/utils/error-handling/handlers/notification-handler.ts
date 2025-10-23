import { BaseErrorHandler } from "../error-handler.interface";
import { ErrorContext } from "../error-context";
import { ErrorHandlingResult } from "../error-result";
import { LoggerService } from "../../../services/logger.service";
import { TYPES } from "../../../di/identifiers";
import { container } from "../../../di/container";

/**
 * Error handler that sends notifications for critical errors
 * Can be extended to integrate with Slack, Email, PagerDuty, etc.
 */
export class NotificationErrorHandler extends BaseErrorHandler {
  private logger: LoggerService;
  private notificationsSent = new Set<string>();

  constructor() {
    super();
    this.logger = container.get<LoggerService>(TYPES.ILogger);
  }

  /**
   * Handle error by sending notification for critical errors
   */
  async handle(
    error: Error,
    context: ErrorContext
  ): Promise<ErrorHandlingResult> {
    // Only notify for critical and high severity errors
    if (context.severity === "critical" || context.severity === "high") {
      const shouldNotify = this.shouldNotify(error, context);

      if (shouldNotify) {
        await this.sendNotification(error, context);
      }
    }

    // Always pass to next handler
    return this.passToNext(error, context);
  }

  /**
   * Determine if notification should be sent
   * Implements deduplication to avoid spam
   */
  private shouldNotify(error: Error, context: ErrorContext): boolean {
    // Create unique key for deduplication
    const key = this.getDeduplicationKey(error, context);

    // Check if already notified for this error
    if (this.notificationsSent.has(key)) {
      return false;
    }

    // Mark as notified (with TTL cleanup after 5 minutes)
    this.notificationsSent.add(key);
    setTimeout(() => {
      this.notificationsSent.delete(key);
    }, 5 * 60 * 1000);

    return true;
  }

  /**
   * Generate deduplication key
   */
  private getDeduplicationKey(error: Error, context: ErrorContext): string {
    return `${context.service}:${context.operation}:${error.name}:${error.message}`;
  }

  /**
   * Send notification about the error
   * Override this method to integrate with external services
   */
  private async sendNotification(
    error: Error,
    context: ErrorContext
  ): Promise<void> {
    const notification = this.formatNotification(error, context);

    // Log the notification (can be replaced with actual notification service)
    this.logger.error("🚨 CRITICAL ERROR NOTIFICATION", notification);

    // TODO: Integrate with external services
    // - Slack: await slackClient.send(notification);
    // - Email: await emailService.send(notification);
    // - PagerDuty: await pagerDuty.trigger(notification);
    // - Sentry: Sentry.captureException(error, { contexts: notification });
  }

  /**
   * Format notification message
   */
  private formatNotification(
    error: Error,
    context: ErrorContext
  ): Record<string, any> {
    return {
      title: `🚨 ${context.severity?.toUpperCase()} Error in ${
        context.service
      }`,
      message: error.message,
      details: {
        service: context.service,
        operation: context.operation,
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
        metadata: context.metadata,
        timestamp: new Date(context.timestamp || Date.now()).toISOString(),
        environment: process.env.NODE_ENV || "unknown",
        attemptInfo: context.attemptCount
          ? `Attempt ${context.attemptCount}/${context.maxRetries}`
          : undefined,
      },
      severity: context.severity,
      tags: [
        context.service,
        context.operation,
        error.name,
        context.severity || "unknown",
      ],
    };
  }

  /**
   * Clear notification deduplication cache
   * Useful for testing or manual intervention
   */
  clearCache(): void {
    this.notificationsSent.clear();
  }
}
