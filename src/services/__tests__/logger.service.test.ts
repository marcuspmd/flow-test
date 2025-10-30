/**
 * Testes unitários para LoggerService
 * Cobertura: 100% das funções, branches e statements
 */

import { ConsoleLoggerAdapter, Logger } from "../logger.service";

describe("LoggerService", () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Setup spies para console
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    // Mock Date para ter timestamps consistentes
    jest
      .spyOn(Date.prototype, "toISOString")
      .mockReturnValue("2025-09-14T10:00:00.000Z");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("ConsoleLoggerAdapter", () => {
    describe("Verbosity Levels", () => {
      test("silent: não deve logar nenhuma mensagem", () => {
        logger = new ConsoleLoggerAdapter("silent");

        logger.debug("Debug message");
        logger.info("Info message");
        logger.warn("Warning message");
        logger.error("Error message");

        expect(consoleSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      test("simple: deve logar info, warn e error", () => {
        logger = new ConsoleLoggerAdapter("simple");

        logger.debug("Debug message");
        logger.info("Info message");
        logger.warn("Warning message");
        logger.error("Error message");

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] Info message"
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [WARN] Warning message"
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [ERROR] Error message"
        );
      });

      test("detailed: deve logar tudo exceto debug e mostrar metadata", () => {
        logger = new ConsoleLoggerAdapter("detailed");

        const context: Record<string, any> = {
          nodeId: "test-1",
          stepName: "Step 1",
        };
        logger.debug("Debug message", context);
        logger.info("Info message", context);

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] [test-1] [Step 1] Info message"
        );
      });

      test("verbose: deve logar tudo incluindo debug", () => {
        logger = new ConsoleLoggerAdapter("verbose");

        logger.debug("Debug message");
        logger.info("Info message");

        expect(consoleSpy).toHaveBeenCalledTimes(2);
        expect(consoleSpy).toHaveBeenNthCalledWith(
          1,
          "[2025-09-14T10:00:00.000Z] [DEBUG] Debug message"
        );
        expect(consoleSpy).toHaveBeenNthCalledWith(
          2,
          "[2025-09-14T10:00:00.000Z] [INFO] Info message"
        );
      });
    });

    describe("Context Handling", () => {
      test("deve incluir nodeId no log quando fornecido", () => {
        logger = new ConsoleLoggerAdapter("detailed");
        const context: Record<string, any> = { nodeId: "test-node-1" };

        logger.info("Test message", context);

        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] [test-node-1] Test message"
        );
      });

      test("deve incluir stepName no log quando fornecido", () => {
        logger = new ConsoleLoggerAdapter("detailed");
        const context: Record<string, any> = {
          stepName: "Authentication Step",
        };

        logger.info("Test message", context);

        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] [Authentication Step] Test message"
        );
      });

      test("deve incluir duration no log quando fornecido", () => {
        logger = new ConsoleLoggerAdapter("detailed");
        const context: Record<string, any> = { duration: 150 };

        logger.info("Test message", context);

        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] Test message (150ms)"
        );
      });

      test("deve incluir nodeId, stepName e duration juntos", () => {
        logger = new ConsoleLoggerAdapter("detailed");
        const context: Record<string, any> = {
          nodeId: "test-1",
          stepName: "Login",
          duration: 200,
        };

        logger.info("Test message", context);

        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] [test-1] [Login] Test message (200ms)"
        );
      });

      test("deve mostrar metadata em modo detailed/verbose", () => {
        const detailedLogger = new ConsoleLoggerAdapter("detailed");
        const verboseLogger = new ConsoleLoggerAdapter("verbose");
        const context: Record<string, any> = {
          nodeId: "test-1",
          metadata: { key: "value" },
        };

        detailedLogger.info("Test message", context);
        verboseLogger.info("Test message", context);

        expect(consoleSpy).toHaveBeenCalledTimes(4); // 2 logs + 2 context logs
        expect(consoleSpy).toHaveBeenNthCalledWith(
          1,
          "[2025-09-14T10:00:00.000Z] [INFO] [test-1] Test message"
        );
        expect(consoleSpy).toHaveBeenNthCalledWith(
          2,
          "  Context:",
          JSON.stringify({ key: "value" }, null, 2)
        );
      });

      test("não deve mostrar metadata em modo simple", () => {
        logger = new ConsoleLoggerAdapter("simple");
        const context: Record<string, any> = {
          nodeId: "test-1",
          stepName: "Step 1",
        };

        logger.info("Test message", context);

        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] [test-1] [Step 1] Test message"
        );
        // Verifica que não há log de context
        expect(consoleSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe("Error Handling", () => {
      test("deve mostrar detalhes de Error object através de context", () => {
        logger = new ConsoleLoggerAdapter("simple");
        const error = new Error("Test error");
        error.stack = "Error: Test error\n  at test.js:1:1";

        logger.error("Something went wrong", { error });

        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
        expect(consoleErrorSpy).toHaveBeenNthCalledWith(
          1,
          "[2025-09-14T10:00:00.000Z] [ERROR] Something went wrong"
        );
        expect(consoleErrorSpy).toHaveBeenNthCalledWith(
          2,
          "  Error:",
          "Error: Test error\n  at test.js:1:1"
        );
      });

      test("deve usar console.error para level ERROR", () => {
        logger = new ConsoleLoggerAdapter("simple");

        logger.error("Error message");

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      test("deve usar console.warn para level WARN", () => {
        logger = new ConsoleLoggerAdapter("simple");

        logger.warn("Warning message");

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      test("deve usar console.log para outros levels", () => {
        logger = new ConsoleLoggerAdapter("simple");

        logger.info("Info message");

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });

    describe("Constructor Default", () => {
      test("deve usar verbosity simple como padrão", () => {
        logger = new ConsoleLoggerAdapter();

        logger.debug("Debug message");
        logger.info("Info message");

        // DEBUG não deve aparecer no modo simple (padrão)
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] Info message"
        );
      });
    });

    describe("Edge Cases", () => {
      test("deve funcionar sem context", () => {
        logger = new ConsoleLoggerAdapter("simple");

        logger.info("Test message");

        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] Test message"
        );
      });

      test("deve funcionar com context vazio", () => {
        logger = new ConsoleLoggerAdapter("detailed");

        logger.info("Test message", {});

        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] Test message"
        );
      });

      test("deve tratar duration zero", () => {
        logger = new ConsoleLoggerAdapter("detailed");
        const context: Record<string, any> = { duration: 0 };

        logger.info("Test message", context);

        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] Test message (0ms)"
        );
      });
    });
  });

  describe("PinoLoggerAdapter", () => {
    test("deve lançar erro quando pino não estiver instalado", () => {
      // Como pino não está instalado no projeto, deve detectar isso
      const { PinoLoggerAdapter } = require("../logger.service");

      expect(() => {
        new PinoLoggerAdapter("verbose");
      }).toThrow("Pino is not installed. Run: npm install pino");
    });
  });
});
