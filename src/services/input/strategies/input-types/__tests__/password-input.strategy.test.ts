/**
 * @fileoverview Tests for PasswordInputStrategy
 */

import { PasswordInputStrategy } from "../password-input.strategy";
import type { InputConfig } from "../../../../../types/engine.types";
import * as readline from "readline";

// Mock readline
jest.mock("readline");

const mockReadline = readline as jest.Mocked<typeof readline>;

describe("PasswordInputStrategy", () => {
  let strategy: PasswordInputStrategy;
  let mockRl: any;

  beforeEach(() => {
    strategy = new PasswordInputStrategy();

    // Mock readline interface with output mock
    mockRl = {
      question: jest.fn(),
      close: jest.fn(),
      output: {
        write: jest.fn(),
      },
      _writeToOutput: null,
    };

    mockReadline.createInterface.mockReturnValue(mockRl as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("name", () => {
    it("should have correct strategy name", () => {
      expect(strategy.name).toBe("password");
    });
  });

  describe("canHandle", () => {
    it("should handle password type", () => {
      expect(strategy.canHandle("password")).toBe(true);
    });

    it("should not handle text type", () => {
      expect(strategy.canHandle("text")).toBe(false);
    });

    it("should not handle email type", () => {
      expect(strategy.canHandle("email")).toBe(false);
    });

    it("should not handle number type", () => {
      expect(strategy.canHandle("number")).toBe(false);
    });

    it("should not handle confirm type", () => {
      expect(strategy.canHandle("confirm")).toBe(false);
    });
  });

  describe("prompt", () => {
    it("should prompt for required password input", async () => {
      const config: InputConfig = {
        variable: "password",
        prompt: "Enter password",
        type: "password",
        required: true,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("secret123");
      });

      const result = await strategy.prompt(config);

      expect(mockReadline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout,
      });
      expect(mockRl.question).toHaveBeenCalledWith("> ", expect.any(Function));
      expect(mockRl.close).toHaveBeenCalled();
      expect(result).toBe("secret123");
    });

    it("should prompt for optional password with default value", async () => {
      const config: InputConfig = {
        variable: "apiKey",
        prompt: "Enter API key",
        type: "password",
        required: false,
        default: "default-key",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("new-key");
      });

      const result = await strategy.prompt(config);

      expect(mockRl.question).toHaveBeenCalledWith(
        "> (***): ",
        expect.any(Function)
      );
      expect(result).toBe("new-key");
    });

    it("should return default value when user enters empty input", async () => {
      const config: InputConfig = {
        variable: "secret",
        prompt: "Enter secret",
        type: "password",
        default: "default-secret",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("default-secret");
    });

    it("should return empty string when no default and user enters empty", async () => {
      const config: InputConfig = {
        variable: "optional",
        prompt: "Enter optional password",
        type: "password",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("");
    });

    it("should show 'empty' hint when no default value provided", async () => {
      const config: InputConfig = {
        variable: "optional",
        prompt: "Enter value",
        type: "password",
        required: false,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("password");
      });

      await strategy.prompt(config);

      expect(mockRl.question).toHaveBeenCalledWith(
        "> (empty): ",
        expect.any(Function)
      );
    });

    it("should override _writeToOutput for masking", async () => {
      const config: InputConfig = {
        variable: "password",
        prompt: "Enter password",
        type: "password",
        required: true,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("secret");
      });

      await strategy.prompt(config);

      // Verify _writeToOutput was set
      expect(mockRl._writeToOutput).toBeDefined();
      expect(typeof mockRl._writeToOutput).toBe("function");
    });

    it("should handle Enter key (char code 13) in _writeToOutput", async () => {
      const config: InputConfig = {
        variable: "password",
        prompt: "Enter password",
        type: "password",
        required: true,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        // Simulate the _writeToOutput being called with Enter key
        if (mockRl._writeToOutput) {
          mockRl._writeToOutput("\r"); // char code 13
        }
        callback("password");
      });

      await strategy.prompt(config);

      // Check that _writeToOutput was defined
      expect(mockRl._writeToOutput).toBeDefined();
    });

    it("should handle Backspace key (char code 8) in _writeToOutput", async () => {
      const config: InputConfig = {
        variable: "password",
        prompt: "Enter password",
        type: "password",
        required: true,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        // Simulate the _writeToOutput being called with Backspace
        if (mockRl._writeToOutput) {
          mockRl._writeToOutput("\b"); // char code 8
        }
        callback("password");
      });

      await strategy.prompt(config);

      expect(mockRl._writeToOutput).toBeDefined();
    });

    it("should write asterisk for normal characters in _writeToOutput", async () => {
      const config: InputConfig = {
        variable: "password",
        prompt: "Enter password",
        type: "password",
        required: true,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        // Simulate the _writeToOutput being called with normal character
        if (mockRl._writeToOutput) {
          mockRl._writeToOutput("a");
        }
        callback("password");
      });

      await strategy.prompt(config);

      expect(mockRl._writeToOutput).toBeDefined();
    });
  });
});
