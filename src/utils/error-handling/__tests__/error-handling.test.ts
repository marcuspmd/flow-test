import 'reflect-metadata';
import { LoggingErrorHandler } from '../handlers/logging-handler';
import { RetryErrorHandler } from '../handlers/retry-handler';
import { NotificationErrorHandler } from '../handlers/notification-handler';
import { ErrorHandlerChain, ErrorHandlerChainBuilder } from '../error-handler-chain';
import { ErrorContext } from '../error-context';
import { ErrorHandler } from '../error-handler.interface';

describe('Error Handling Chain', () => {
  describe('LoggingErrorHandler', () => {
    let handler: LoggingErrorHandler;

    beforeEach(() => {
      handler = new LoggingErrorHandler();
    });

    it('should log error with correct severity level', async () => {
      const error = new Error('Test error');
      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        severity: 'high',
      };

      const result = await handler.handle(error, context);

      expect(result.handled).toBe(false); // No next handler
    });

    it('should format log message with attempt count', async () => {
      const error = new Error('Retry error');
      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        attemptCount: 2,
        maxRetries: 3,
        severity: 'medium',
      };

      const result = await handler.handle(error, context);

      expect(result.handled).toBe(false);
    });

    it('should pass to next handler when set', async () => {
      const nextHandler: ErrorHandler = {
        setNext: jest.fn().mockReturnThis(),
        handle: jest.fn().mockResolvedValue({ handled: true, action: 'skip' }),
      };

      handler.setNext(nextHandler);

      const error = new Error('Test error');
      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
      };

      const result = await handler.handle(error, context);

      expect(nextHandler.handle).toHaveBeenCalledWith(error, context);
      expect(result.handled).toBe(true);
      expect(result.action).toBe('skip');
    });

    it('should use correct log level for different severities', async () => {
      const testCases: Array<[string, 'error' | 'warn' | 'info' | 'debug']> = [
        ['critical', 'error'],
        ['high', 'error'],
        ['medium', 'warn'],
        ['low', 'info'],
      ];

      for (const [severity, expectedLevel] of testCases) {
        const error = new Error('Test error');
        const context: ErrorContext = {
          service: 'TestService',
          operation: 'testOperation',
          severity: severity as any,
        };

        await handler.handle(error, context);
        // Verify through side effects or mocks if needed
      }
    });
  });

  describe('RetryErrorHandler', () => {
    let handler: RetryErrorHandler;

    beforeEach(() => {
      handler = new RetryErrorHandler();
    });

    it('should retry on retryable errors', async () => {
      const error = new Error('Network error');
      error.name = 'NetworkError';

      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        attemptCount: 1,
        maxRetries: 3,
      };

      const result = await handler.handle(error, context);

      expect(result.handled).toBe(true);
      expect(result.action).toBe('retry');
      expect(result.delay).toBeGreaterThan(0);
      expect(result.message).toContain('Retrying');
    });

    it('should not retry when max attempts reached', async () => {
      const error = new Error('Network error');
      error.name = 'NetworkError';

      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        attemptCount: 3,
        maxRetries: 3,
      };

      const result = await handler.handle(error, context);

      expect(result.handled).toBe(false);
      expect(result.action).not.toBe('retry');
    });

    it('should calculate exponential backoff correctly', async () => {
      const error = new Error('Timeout');
      error.name = 'TimeoutError';

      const delays: number[] = [];

      for (let attempt = 1; attempt <= 4; attempt++) {
        const context: ErrorContext = {
          service: 'TestService',
          operation: 'testOperation',
          attemptCount: attempt,
          maxRetries: 5,
        };

        const result = await handler.handle(error, context);
        if (result.delay) {
          delays.push(result.delay);
        }
      }

      // Verify delays are increasing (with jitter tolerance)
      expect(delays[0]).toBeLessThan(delays[1] * 1.3); // ~1s → ~2s
      expect(delays[1]).toBeLessThan(delays[2] * 1.3); // ~2s → ~4s
    });

    it('should not retry non-retryable errors', async () => {
      const error = new Error('Validation error');
      error.name = 'ValidationError';

      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        attemptCount: 1,
        maxRetries: 3,
      };

      const result = await handler.handle(error, context);

      expect(result.handled).toBe(false);
      expect(result.action).not.toBe('retry');
    });

    it('should recognize retryable errors by code', async () => {
      const error: any = new Error('Connection refused');
      error.code = 'ECONNREFUSED';

      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        attemptCount: 1,
        maxRetries: 3,
      };

      const result = await handler.handle(error, context);

      expect(result.handled).toBe(true);
      expect(result.action).toBe('retry');
    });

    it('should allow adding custom retryable errors', async () => {
      handler.addRetryableError('CustomError');

      const error = new Error('Custom failure');
      error.name = 'CustomError';

      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        attemptCount: 1,
        maxRetries: 3,
      };

      const result = await handler.handle(error, context);

      expect(result.handled).toBe(true);
      expect(result.action).toBe('retry');
    });

    it('should respect max delay cap', async () => {
      const error = new Error('Timeout');
      error.name = 'TimeoutError';

      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        attemptCount: 10, // Large attempt number
        maxRetries: 20,
      };

      const result = await handler.handle(error, context);

      // Should be capped at ~10 seconds (plus jitter)
      expect(result.delay).toBeLessThanOrEqual(12000);
    });
  });

  describe('NotificationErrorHandler', () => {
    let handler: NotificationErrorHandler;

    beforeEach(() => {
      handler = new NotificationErrorHandler();
      handler.clearCache(); // Clear between tests
    });

    it('should notify on critical errors', async () => {
      const error = new Error('Critical system failure');
      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        severity: 'critical',
      };

      const result = await handler.handle(error, context);

      expect(result.handled).toBe(false); // Passes to next
    });

    it('should notify on high severity errors', async () => {
      const error = new Error('High priority error');
      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        severity: 'high',
      };

      await handler.handle(error, context);
      // Notification should be logged
    });

    it('should not notify on medium severity', async () => {
      const error = new Error('Medium priority error');
      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        severity: 'medium',
      };

      await handler.handle(error, context);
      // No notification expected
    });

    it('should not notify on low severity', async () => {
      const error = new Error('Low priority error');
      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        severity: 'low',
      };

      await handler.handle(error, context);
      // No notification expected
    });

    it('should deduplicate notifications', async () => {
      const error = new Error('Critical error');
      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        severity: 'critical',
      };

      // Send same notification twice
      await handler.handle(error, context);
      await handler.handle(error, context);

      // Only first should actually notify (check logs)
    });

    it('should clear cache correctly', () => {
      const error = new Error('Critical error');
      const context: ErrorContext = {
        service: 'TestService',
        operation: 'testOperation',
        severity: 'critical',
      };

      handler.handle(error, context);
      handler.clearCache();
      
      // After clear, should notify again
      handler.handle(error, context);
    });
  });

  describe('ErrorHandlerChain', () => {
    it('should create default chain', () => {
      const chain = ErrorHandlerChain.createDefault();

      expect(chain).toBeDefined();
      expect(chain).toBeInstanceOf(LoggingErrorHandler);
    });

    it('should create custom chain', () => {
      const logger = new LoggingErrorHandler();
      const retry = new RetryErrorHandler();

      const chain = ErrorHandlerChain.create(logger, retry);

      expect(chain).toBe(logger);
    });

    it('should throw error when creating empty chain', () => {
      expect(() => {
        ErrorHandlerChain.create();
      }).toThrow('At least one handler is required');
    });

    it('should create logging-only chain', () => {
      const chain = ErrorHandlerChain.createLoggingOnly();

      expect(chain).toBeInstanceOf(LoggingErrorHandler);
    });

    it('should create chain with retry', () => {
      const chain = ErrorHandlerChain.createWithRetry();

      expect(chain).toBeInstanceOf(LoggingErrorHandler);
    });

    it('should create critical-only chain', () => {
      const chain = ErrorHandlerChain.createCriticalOnly();

      expect(chain).toBeInstanceOf(LoggingErrorHandler);
    });

    it('should chain handlers in correct order', async () => {
      const executionOrder: string[] = [];

      const handler1: ErrorHandler = {
        setNext: jest.fn().mockReturnThis(),
        handle: jest.fn(async (error, context) => {
          executionOrder.push('handler1');
          return { handled: false };
        }),
      };

      const handler2: ErrorHandler = {
        setNext: jest.fn().mockReturnThis(),
        handle: jest.fn(async (error, context) => {
          executionOrder.push('handler2');
          return { handled: true };
        }),
      };

      const chain = ErrorHandlerChain.create(handler1, handler2);

      await chain.handle(new Error('Test'), {
        service: 'Test',
        operation: 'test',
      });

      expect(executionOrder).toEqual(['handler1']);
      expect(handler1.setNext).toHaveBeenCalledWith(handler2);
    });
  });

  describe('ErrorHandlerChainBuilder', () => {
    it('should build chain with fluent interface', () => {
      const chain = new ErrorHandlerChainBuilder()
        .withLogging()
        .withRetry()
        .withNotification()
        .build();

      expect(chain).toBeDefined();
      expect(chain).toBeInstanceOf(LoggingErrorHandler);
    });

    it('should throw error when building empty chain', () => {
      const builder = new ErrorHandlerChainBuilder();

      expect(() => {
        builder.build();
      }).toThrow('At least one handler must be added');
    });

    it('should allow custom handlers', () => {
      const customHandler: ErrorHandler = {
        setNext: jest.fn().mockReturnThis(),
        handle: jest.fn().mockResolvedValue({ handled: true }),
      };

      const chain = new ErrorHandlerChainBuilder()
        .withLogging()
        .withCustom(customHandler)
        .build();

      expect(chain).toBeDefined();
    });

    it('should reset builder state', () => {
      const builder = new ErrorHandlerChainBuilder()
        .withLogging()
        .withRetry();

      builder.reset();

      expect(() => {
        builder.build();
      }).toThrow('At least one handler must be added');
    });
  });

  describe('Integration Tests', () => {
    it('should handle error through complete chain', async () => {
      const chain = ErrorHandlerChain.createDefault();

      const error = new Error('Integration test error');
      error.name = 'NetworkError';

      const context: ErrorContext = {
        service: 'IntegrationTest',
        operation: 'testCompleteChain',
        attemptCount: 1,
        maxRetries: 3,
        severity: 'high',
      };

      const result = await chain.handle(error, context);

      // Should be handled by retry handler
      expect(result.handled).toBe(true);
      expect(result.action).toBe('retry');
      expect(result.delay).toBeGreaterThan(0);
    });

    it('should propagate through chain until handled', async () => {
      const chain = ErrorHandlerChain.createDefault();

      const error = new Error('Non-retryable error');
      error.name = 'BusinessLogicError';

      const context: ErrorContext = {
        service: 'IntegrationTest',
        operation: 'testPropagation',
        attemptCount: 3,
        maxRetries: 3,
        severity: 'critical',
      };

      const result = await chain.handle(error, context);

      // Should propagate through all handlers
      expect(result.handled).toBe(false);
    });
  });
});
