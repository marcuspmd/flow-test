/**
 * @fileoverview Tests for ErrorHandler utility
 */

import { ErrorHandler, ErrorHandlerOptions } from "../error-handler";

class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomError";
  }
}

describe("ErrorHandler", () => {
  describe("handle", () => {
    it("should return result of successful operation", () => {
      const result = ErrorHandler.handle(
        () => 42,
        { message: "Test operation" }
      );
      expect(result).toBe(42);
    });

    it("should return default value on error", () => {
      const result = ErrorHandler.handle(
        () => {
          throw new Error("Test error");
        },
        { message: "Failed operation", defaultValue: -1 }
      );
      expect(result).toBe(-1);
    });

    it("should rethrow error when rethrow is true", () => {
      expect(() =>
        ErrorHandler.handle(
          () => {
            throw new Error("Test error");
          },
          { message: "Failed operation", rethrow: true }
        )
      ).toThrow("Failed operation: Test error");
    });

    it("should use custom error class when provided", () => {
      expect(() =>
        ErrorHandler.handle(
          () => {
            throw new Error("Original error");
          },
          {
            message: "Custom error",
            rethrow: true,
            errorClass: CustomError,
          }
        )
      ).toThrow(CustomError);
    });

    it("should transform error when errorTransform is provided", () => {
      const errorTransform = (err: Error) => {
        const transformed = new Error(`Transformed: ${err.message}`);
        return transformed;
      };

      expect(() =>
        ErrorHandler.handle(
          () => {
            throw new Error("Original");
          },
          {
            message: "Error",
            rethrow: true,
            errorTransform,
          }
        )
      ).toThrow("Error: Transformed: Original");
    });

    it("should handle context in error logging", () => {
      const context = { userId: 123, operation: "test" };
      ErrorHandler.handle(
        () => {
          throw new Error("Test");
        },
        {
          message: "Failed",
          defaultValue: null,
          context,
        }
      );
    });
  });

  describe("handleAsync", () => {
    it("should return result of successful async operation", async () => {
      const result = await ErrorHandler.handleAsync(
        async () => Promise.resolve(42),
        { message: "Test operation" }
      );
      expect(result).toBe(42);
    });

    it("should return default value on async error", async () => {
      const result = await ErrorHandler.handleAsync(
        async () => {
          throw new Error("Async error");
        },
        { message: "Failed async", defaultValue: null }
      );
      expect(result).toBe(null);
    });

    it("should rethrow async errors when rethrow is true", async () => {
      await expect(
        ErrorHandler.handleAsync(
          async () => {
            throw new Error("Async error");
          },
          { message: "Failed", rethrow: true }
        )
      ).rejects.toThrow("Failed: Async error");
    });

    it("should use custom error class for async operations", async () => {
      await expect(
        ErrorHandler.handleAsync(
          async () => {
            throw new Error("Async error");
          },
          {
            message: "Custom async error",
            rethrow: true,
            errorClass: CustomError,
          }
        )
      ).rejects.toThrow(CustomError);
    });

    it("should transform async errors", async () => {
      const errorTransform = (err: Error) => {
        return new Error(`Transformed: ${err.message}`);
      };

      await expect(
        ErrorHandler.handleAsync(
          async () => {
            throw new Error("Original");
          },
          {
            message: "Error",
            rethrow: true,
            errorTransform,
          }
        )
      ).rejects.toThrow("Error: Transformed: Original");
    });
  });

  describe("handleBatch", () => {
    it("should execute all successful operations", () => {
      const operations = [() => 1, () => 2, () => 3];

      const { results, errors } = ErrorHandler.handleBatch(operations, {
        message: "Batch operation",
      });

      expect(results).toEqual([1, 2, 3]);
      expect(errors).toHaveLength(0);
    });

    it("should collect errors without stopping", () => {
      const operations = [
        () => 1,
        () => {
          throw new Error("Error 2");
        },
        () => 3,
        () => {
          throw new Error("Error 4");
        },
        () => 5,
      ];

      const { results, errors } = ErrorHandler.handleBatch(operations, {
        message: "Batch with errors",
      });

      expect(results).toEqual([1, 3, 5]);
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toBe("Error 2");
      expect(errors[1].message).toBe("Error 4");
    });

    it("should handle all operations failing", () => {
      const operations = [
        () => {
          throw new Error("Error 1");
        },
        () => {
          throw new Error("Error 2");
        },
      ];

      const { results, errors } = ErrorHandler.handleBatch(operations, {
        message: "All fail",
      });

      expect(results).toHaveLength(0);
      expect(errors).toHaveLength(2);
    });
  });

  describe("handleBatchAsync", () => {
    it("should execute all successful async operations", async () => {
      const operations = [
        async () => Promise.resolve(1),
        async () => Promise.resolve(2),
        async () => Promise.resolve(3),
      ];

      const { results, errors } = await ErrorHandler.handleBatchAsync(
        operations,
        {
          message: "Async batch",
        }
      );

      expect(results).toEqual([1, 2, 3]);
      expect(errors).toHaveLength(0);
    });

    it("should collect async errors without stopping", async () => {
      const operations = [
        async () => Promise.resolve(1),
        async () => Promise.reject(new Error("Error 2")),
        async () => Promise.resolve(3),
        async () => Promise.reject(new Error("Error 4")),
      ];

      const { results, errors } = await ErrorHandler.handleBatchAsync(
        operations,
        {
          message: "Async batch with errors",
        }
      );

      expect(results).toEqual([1, 3]);
      expect(errors).toHaveLength(2);
    });

    it("should handle all async operations failing", async () => {
      const operations = [
        async () => Promise.reject(new Error("Error 1")),
        async () => Promise.reject(new Error("Error 2")),
      ];

      const { results, errors } = await ErrorHandler.handleBatchAsync(
        operations,
        {
          message: "All async fail",
        }
      );

      expect(results).toHaveLength(0);
      expect(errors).toHaveLength(2);
    });
  });

  describe("withRetry", () => {
    it("should succeed on first attempt", async () => {
      const operation = jest.fn().mockResolvedValue(42);

      const result = await ErrorHandler.withRetry(operation, {
        message: "Retry test",
        retries: 3,
      });

      expect(result).toBe(42);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry and eventually succeed", async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockResolvedValue(42);

      const result = await ErrorHandler.withRetry(operation, {
        message: "Retry test",
        retries: 3,
        retryDelay: 10,
      });

      expect(result).toBe(42);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should return default value after exhausting retries", async () => {
      const operation = jest.fn().mockRejectedValue(new Error("Always fails"));

      const result = await ErrorHandler.withRetry(operation, {
        message: "Retry test",
        retries: 2,
        retryDelay: 10,
        defaultValue: null,
      });

      expect(result).toBe(null);
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should use custom shouldRetry logic", async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("Retryable"))
        .mockRejectedValueOnce(new Error("Fatal"));

      const shouldRetry = (error: Error) => {
        return error.message === "Retryable";
      };

      const result = await ErrorHandler.withRetry(operation, {
        message: "Custom retry",
        retries: 5,
        retryDelay: 10,
        defaultValue: null,
        shouldRetry,
      });

      expect(result).toBe(null);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should rethrow after retries when rethrow is true", async () => {
      const operation = jest.fn().mockRejectedValue(new Error("Always fails"));

      await expect(
        ErrorHandler.withRetry(operation, {
          message: "Retry with rethrow",
          retries: 1,
          retryDelay: 10,
          rethrow: true,
        })
      ).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});
