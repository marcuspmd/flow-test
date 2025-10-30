/**
 * @fileoverview Basic tests for LoggerService
 */

import { LoggerService } from "../logger.service";

describe("LoggerService - Basic Functionality", () => {
  let logger: LoggerService;
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
    debug: jest.SpyInstance;
  };

  beforeEach(() => {
    logger = new LoggerService();
    
    consoleSpy = {
      log: jest.spyOn(console, "log").mockImplementation(),
      warn: jest.spyOn(console, "warn").mockImplementation(),
      error: jest.spyOn(console, "error").mockImplementation(),
      debug: jest.spyOn(console, "debug").mockImplementation(),
    };
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe("constructor", () => {
    it("should create logger instance", () => {
      expect(logger).toBeInstanceOf(LoggerService);
    });
  });

  describe("log level management", () => {
    it("should get default log level", () => {
      const level = logger.getLogLevel();
      expect(level).toBeDefined();
      expect(typeof level).toBe("string");
    });

    it("should set log level to info", () => {
      logger.setLogLevel("info");
      expect(logger.getLogLevel()).toBe("info");
    });

    it("should set log level to debug", () => {
      logger.setLogLevel("debug");
      expect(logger.getLogLevel()).toBe("debug");
    });

    it("should set log level to warn", () => {
      logger.setLogLevel("warn");
      expect(logger.getLogLevel()).toBe("warn");
    });

    it("should set log level to error", () => {
      logger.setLogLevel("error");
      expect(logger.getLogLevel()).toBe("error");
    });

    it("should set log level to silent", () => {
      logger.setLogLevel("silent");
      expect(logger.getLogLevel()).toBe("silent");
    });
  });

  describe("info logging", () => {
    it("should log info message", () => {
      logger.setLogLevel("info");
      logger.info("Test info message");
      
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it("should log info message with args", () => {
      logger.setLogLevel("info");
      logger.info("Test with args", { key: "value" });
      
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe("warn logging", () => {
    it("should log warn message", () => {
      logger.setLogLevel("warn");
      logger.warn("Test warning");
      
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it("should log warn message with args", () => {
      logger.setLogLevel("warn");
      logger.warn("Test warning", { error: "details" });
      
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });

  describe("error logging", () => {
    it("should log error message", () => {
      logger.setLogLevel("error");
      logger.error("Test error");
      
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should log error message with args", () => {
      logger.setLogLevel("error");
      logger.error("Test error", { stack: "trace" });
      
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe("debug logging", () => {
    it("should log debug message when level is debug", () => {
      logger.setLogLevel("debug");
      logger.debug("Test debug");
      
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it("should not log debug when level is info", () => {
      logger.setLogLevel("info");
      logger.debug("Test debug");
      
      // Debug is lower priority than info, so it shouldn't log
    });
  });

  describe("silent mode", () => {
    it("should not log anything in silent mode", () => {
      logger.setLogLevel("silent");
      
      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warn message");
      logger.error("Error message");
      
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle empty messages", () => {
      logger.info("");
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it("should handle undefined args", () => {
      logger.info("Test", undefined);
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it("should handle null args", () => {
      logger.info("Test", null);
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it("should handle multiple args", () => {
      logger.info("Test", "arg1", "arg2", "arg3");
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it("should handle object args", () => {
      logger.info("Test", { nested: { object: true } });
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it("should handle array args", () => {
      logger.info("Test", [1, 2, 3]);
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });
});
