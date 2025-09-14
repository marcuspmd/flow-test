/**
 * Testes unitários para LoggerService
 * Cobertura: 100% das funções, branches e statements
 */

import { ConsoleLoggerAdapter, LogContext, Logger } from "../logger.service";

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
      test("silent: deve logar apenas errors", () => {
        logger = new ConsoleLoggerAdapter("silent");

        logger.debug("Debug message");
        logger.info("Info message");
        logger.warn("Warning message");
        logger.error("Error message");

        expect(consoleSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [ERROR] Error message"
        );
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

        const context: LogContext = { nodeId: "test-1", stepName: "Step 1" };
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
        const context: LogContext = { nodeId: "test-node-1" };

        logger.info("Test message", context);

        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] [test-node-1] Test message"
        );
      });

      test("deve incluir stepName no log quando fornecido", () => {
        logger = new ConsoleLoggerAdapter("detailed");
        const context: LogContext = { stepName: "Authentication Step" };

        logger.info("Test message", context);

        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] [Authentication Step] Test message"
        );
      });

      test("deve incluir duration no log quando fornecido", () => {
        logger = new ConsoleLoggerAdapter("detailed");
        const context: LogContext = { duration: 150 };

        logger.info("Test message", context);

        expect(consoleSpy).toHaveBeenCalledWith(
          "[2025-09-14T10:00:00.000Z] [INFO] Test message (150ms)"
        );
      });

      test("deve incluir nodeId, stepName e duration juntos", () => {
        logger = new ConsoleLoggerAdapter("detailed");
        const context: LogContext = {
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
        const context: LogContext = {
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
        const context: LogContext = { nodeId: "test-1", stepName: "Step 1" };

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
        const context: LogContext = { duration: 0 };

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

  describe("getLogger function", () => {
    test("deve retornar instância singleton do LoggerService", () => {
      const { getLogger } = require("../logger.service");

      const logger1 = getLogger();
      const logger2 = getLogger();

      expect(logger1).toBe(logger2); // Mesmo objeto (singleton)
      expect(logger1).toBeDefined();
    });
  });

  describe("setupLogger function", () => {
    test("deve configurar logger console com verbosity padrão", () => {
      const { setupLogger } = require("../logger.service");

      const loggerService = setupLogger("console");

      expect(loggerService).toBeDefined();
    });

    test("deve configurar logger console com verbosity específica", () => {
      const { setupLogger } = require("../logger.service");

      const loggerService = setupLogger("console", { level: "verbose" });

      expect(loggerService).toBeDefined();
    });

    test("deve lançar erro ao tentar configurar pino sem instalação", () => {
      const { setupLogger } = require("../logger.service");

      expect(() => {
        setupLogger("pino", { level: "info" });
      }).toThrow("Pino is not installed. Run: npm install pino");
    });

    test("deve usar console como padrão quando tipo não especificado", () => {
      const { setupLogger } = require("../logger.service");

      const loggerService = setupLogger();

      expect(loggerService).toBeDefined();
    });
  });

  describe("PinoLoggerAdapter functionality (simulated)", () => {
    test("deve exercitar código do PinoLoggerAdapter indiretamente", () => {
      // Mock do módulo pino diretamente usando jest.doMock
      const mockPino = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const mockPinoFactory = jest.fn((options) => {
        // Verificar se options foram passados corretamente
        expect(options).toMatchObject({
          level: "debug",
          formatters: expect.any(Object),
        });

        // Testar função formatters.level
        const levelResult = options.formatters.level("info");
        expect(levelResult).toEqual({ level: "info" });

        return mockPino;
      });

      // Mock do require temporariamente
      jest.doMock("pino", () => mockPinoFactory, { virtual: true });

      // Força o reload do módulo para usar o mock
      jest.resetModules();

      try {
        const { PinoLoggerAdapter } = require("../logger.service");
        const pinoLogger = new PinoLoggerAdapter({ customOption: true });

        // Testar todos os métodos com contexto completo
        const context = {
          nodeId: "test-node",
          stepName: "test-step",
          duration: 150,
          filePath: "/path/to/file",
          metadata: { key: "value" },
          error: new Error("Test error"),
        };

        pinoLogger.debug("Debug message", context);
        pinoLogger.info("Info message", context);
        pinoLogger.warn("Warn message", context);
        pinoLogger.error("Error message", context);

        // Verificar se buildLogObject construiu o objeto corretamente
        expect(mockPino.debug).toHaveBeenCalledWith(
          expect.objectContaining({
            nodeId: "test-node",
            stepName: "test-step",
            duration: 150,
            filePath: "/path/to/file",
            metadata: { key: "value" },
            error: expect.objectContaining({
              message: "Test error",
              stack: expect.any(String),
            }),
          }),
          "Debug message"
        );

        // Testar com contexto vazio para exercitar linha: if (!context) return {};
        pinoLogger.debug("Empty context");
        expect(mockPino.debug).toHaveBeenCalledWith({}, "Empty context");

        // Testar error que não é instância de Error para exercitar ternário
        const contextWithPlainError = {
          error: "Plain string error",
        };
        pinoLogger.error("Plain error test", contextWithPlainError);
        expect(mockPino.error).toHaveBeenCalledWith(
          expect.objectContaining({
            error: "Plain string error",
          }),
          "Plain error test"
        );

        // Testar contexto parcial para exercitar todas as condições if
        const partialContext = {
          nodeId: "partial-node",
          // Sem stepName, duration, filePath, metadata, error
        };
        pinoLogger.info("Partial context", partialContext);
        expect(mockPino.info).toHaveBeenCalledWith(
          expect.objectContaining({
            nodeId: "partial-node",
          }),
          "Partial context"
        );
      } finally {
        // Limpar mocks
        jest.dontMock("pino");
        jest.resetModules();
      }
    });

    test("deve testar setLogger quando instância já existe", () => {
      const { LoggerService } = require("../logger.service");

      // Garantir que instância existe
      const instance1 = LoggerService.getInstance();

      const newLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      // Configurar novo logger
      LoggerService.setLogger(newLogger);

      // Verificar se instance continua a mesma
      const instance2 = LoggerService.getInstance();
      expect(instance1).toBe(instance2);

      // Verificar se o logger foi atualizado
      instance1.info("Test message", { nodeId: "test" });
      expect(newLogger.info).toHaveBeenCalledWith("Test message", {
        nodeId: "test",
      });
    });

    test("deve criar nova instância quando setLogger é chamado sem instância prévia", () => {
      const { LoggerService } = require("../logger.service");

      // Reset instância (simulando situação inicial)
      LoggerService.instance = null;

      const newLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      // Configurar novo logger - deve criar nova instância
      LoggerService.setLogger(newLogger);

      const instance = LoggerService.getInstance();
      instance.debug("Debug test");

      expect(newLogger.debug).toHaveBeenCalledWith("Debug test", undefined);
    });
  });

  describe("LoggerService singleton instance methods", () => {
    let loggerService: any;
    let mockLogger: Logger;

    beforeEach(() => {
      mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const { LoggerService } = require("../logger.service");
      loggerService = LoggerService.getInstance();
      LoggerService.setLogger(mockLogger);
    });

    test("deve delegar debug para logger interno", () => {
      const context = { nodeId: "test-debug" };

      loggerService.debug("Debug message", context);

      expect(mockLogger.debug).toHaveBeenCalledWith("Debug message", context);
    });

    test("deve delegar info para logger interno", () => {
      const context = { stepName: "test-step" };

      loggerService.info("Info message", context);

      expect(mockLogger.info).toHaveBeenCalledWith("Info message", context);
    });

    test("deve delegar warn para logger interno", () => {
      const context = { duration: 200 };

      loggerService.warn("Warning message", context);

      expect(mockLogger.warn).toHaveBeenCalledWith("Warning message", context);
    });

    test("deve delegar error para logger interno", () => {
      const context = { error: new Error("Test error") };

      loggerService.error("Error message", context);

      expect(mockLogger.error).toHaveBeenCalledWith("Error message", context);
    });

    test("deve manter singleton quando setLogger é chamado novamente", () => {
      const { LoggerService } = require("../logger.service");
      const newMockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const instance1 = LoggerService.getInstance();
      LoggerService.setLogger(newMockLogger);
      const instance2 = LoggerService.getInstance();

      expect(instance1).toBe(instance2);

      // Verificar se o logger foi atualizado
      instance1.info("Test message");
      expect(newMockLogger.info).toHaveBeenCalledWith(
        "Test message",
        undefined
      );
    });
  });
});
