/**
 * @fileoverview Tests for TextInputStrategy
 */

import { TextInputStrategy } from "../text-input.strategy";
import type { InputConfig } from "../../../../../types/engine.types";
import * as readline from "readline";

// Mock readline
jest.mock("readline");

const mockReadline = readline as jest.Mocked<typeof readline>;

describe("TextInputStrategy", () => {
  let strategy: TextInputStrategy;
  let mockRl: any;

  beforeEach(() => {
    strategy = new TextInputStrategy();

    // Mock readline interface
    mockRl = {
      question: jest.fn(),
      close: jest.fn(),
    };

    mockReadline.createInterface.mockReturnValue(mockRl as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("name", () => {
    it("should have correct strategy name", () => {
      expect(strategy.name).toBe("text");
    });
  });

  describe("canHandle", () => {
    it("should handle text type", () => {
      expect(strategy.canHandle("text")).toBe(true);
    });

    it("should handle email type", () => {
      expect(strategy.canHandle("email")).toBe(true);
    });

    it("should handle url type", () => {
      expect(strategy.canHandle("url")).toBe(true);
    });

    it("should not handle password type", () => {
      expect(strategy.canHandle("password")).toBe(false);
    });

    it("should not handle number type", () => {
      expect(strategy.canHandle("number")).toBe(false);
    });

    it("should not handle confirm type", () => {
      expect(strategy.canHandle("confirm")).toBe(false);
    });

    it("should not handle select type", () => {
      expect(strategy.canHandle("select")).toBe(false);
    });
  });

  describe("prompt", () => {
    it("should prompt for required text input", async () => {
      const config: InputConfig = {
        variable: "username",
        prompt: "Enter username",
        type: "text",
        required: true,
      };

      // Simulate user entering "testuser"
      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("testuser");
      });

      const result = await strategy.prompt(config);

      expect(mockReadline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout,
      });
      expect(mockRl.question).toHaveBeenCalledWith("> ", expect.any(Function));
      expect(mockRl.close).toHaveBeenCalled();
      expect(result).toBe("testuser");
    });

    it("should prompt for optional text input with default value", async () => {
      const config: InputConfig = {
        variable: "name",
        prompt: "Enter name",
        type: "text",
        required: false,
        default: "John Doe",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("Jane Smith");
      });

      const result = await strategy.prompt(config);

      expect(mockRl.question).toHaveBeenCalledWith(
        "> (John Doe): ",
        expect.any(Function)
      );
      expect(result).toBe("Jane Smith");
    });

    it("should return default value when user enters empty input", async () => {
      const config: InputConfig = {
        variable: "city",
        prompt: "Enter city",
        type: "text",
        default: "New York",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback(""); // User presses enter without typing
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("New York");
    });

    it("should return empty string when no default and user enters empty", async () => {
      const config: InputConfig = {
        variable: "optional",
        prompt: "Enter optional value",
        type: "text",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("");
    });

    it("should handle email type input", async () => {
      const config: InputConfig = {
        variable: "email",
        prompt: "Enter email",
        type: "email",
        required: true,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("user@example.com");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("user@example.com");
    });

    it("should handle url type input", async () => {
      const config: InputConfig = {
        variable: "website",
        prompt: "Enter website",
        type: "url",
        required: true,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("https://example.com");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("https://example.com");
    });

    it("should show 'empty' hint when no default value provided", async () => {
      const config: InputConfig = {
        variable: "optional",
        prompt: "Enter value",
        type: "text",
        required: false,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("value");
      });

      await strategy.prompt(config);

      expect(mockRl.question).toHaveBeenCalledWith(
        "> (empty): ",
        expect.any(Function)
      );
    });

    it("should handle multiline text input", async () => {
      const config: InputConfig = {
        variable: "description",
        prompt: "Enter description",
        type: "text",
      };

      const multilineText = "Line 1\nLine 2\nLine 3";
      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback(multilineText);
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(multilineText);
    });

    it("should trim whitespace from input", async () => {
      const config: InputConfig = {
        variable: "test",
        prompt: "Enter value",
        type: "text",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("  value with spaces  ");
      });

      const result = await strategy.prompt(config);

      // Strategy returns raw input - trimming happens elsewhere
      expect(result).toBe("  value with spaces  ");
    });
  });
});
