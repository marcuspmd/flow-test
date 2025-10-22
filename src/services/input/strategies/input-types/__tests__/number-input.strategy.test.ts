/**
 * @fileoverview Tests for NumberInputStrategy
 */

import { NumberInputStrategy } from "../number-input.strategy";
import type { InputConfig } from "../../../../../types/engine.types";
import * as readline from "readline";

// Mock readline
jest.mock("readline");

const mockReadline = readline as jest.Mocked<typeof readline>;

describe("NumberInputStrategy", () => {
  let strategy: NumberInputStrategy;
  let mockRl: any;

  beforeEach(() => {
    strategy = new NumberInputStrategy();

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
      expect(strategy.name).toBe("number");
    });
  });

  describe("canHandle", () => {
    it("should handle number type", () => {
      expect(strategy.canHandle("number")).toBe(true);
    });

    it("should not handle text type", () => {
      expect(strategy.canHandle("text")).toBe(false);
    });

    it("should not handle password type", () => {
      expect(strategy.canHandle("password")).toBe(false);
    });

    it("should not handle confirm type", () => {
      expect(strategy.canHandle("confirm")).toBe(false);
    });
  });

  describe("prompt", () => {
    it("should prompt for required number input and parse integer", async () => {
      const config: InputConfig = {
        variable: "age",
        prompt: "Enter age",
        type: "number",
        required: true,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("25");
      });

      const result = await strategy.prompt(config);

      expect(mockReadline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout,
      });
      expect(mockRl.question).toHaveBeenCalledWith("> ", expect.any(Function));
      expect(mockRl.close).toHaveBeenCalled();
      expect(result).toBe(25);
      expect(typeof result).toBe("number");
    });

    it("should parse float numbers correctly", async () => {
      const config: InputConfig = {
        variable: "price",
        prompt: "Enter price",
        type: "number",
        required: true,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("19.99");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(19.99);
    });

    it("should parse negative numbers", async () => {
      const config: InputConfig = {
        variable: "temperature",
        prompt: "Enter temperature",
        type: "number",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("-15.5");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(-15.5);
    });

    it("should parse zero correctly", async () => {
      const config: InputConfig = {
        variable: "count",
        prompt: "Enter count",
        type: "number",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("0");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(0);
    });

    it("should return default value when user enters empty input", async () => {
      const config: InputConfig = {
        variable: "quantity",
        prompt: "Enter quantity",
        type: "number",
        default: 10,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(10);
    });

    it("should show default value in prompt", async () => {
      const config: InputConfig = {
        variable: "amount",
        prompt: "Enter amount",
        type: "number",
        required: false,
        default: 100,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("50");
      });

      await strategy.prompt(config);

      expect(mockRl.question).toHaveBeenCalledWith(
        "> (100): ",
        expect.any(Function)
      );
    });

    it("should reject with error when input is not a valid number and no default", async () => {
      const config: InputConfig = {
        variable: "invalid",
        prompt: "Enter number",
        type: "number",
        required: true,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("abc");
      });

      await expect(strategy.prompt(config)).rejects.toThrow(
        "Invalid number input"
      );
    });

    it("should return default value when input is invalid and default exists", async () => {
      const config: InputConfig = {
        variable: "count",
        prompt: "Enter count",
        type: "number",
        default: 5,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("not-a-number");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(5);
    });

    it("should handle scientific notation", async () => {
      const config: InputConfig = {
        variable: "value",
        prompt: "Enter value",
        type: "number",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("1.5e3");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(1500);
    });

    it("should parse number from string default value", async () => {
      const config: InputConfig = {
        variable: "count",
        prompt: "Enter count",
        type: "number",
        default: "42",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(42);
    });

    it("should handle whitespace in input", async () => {
      const config: InputConfig = {
        variable: "value",
        prompt: "Enter value",
        type: "number",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("  123  ");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(123);
    });

    it("should reject when empty input with no default", async () => {
      const config: InputConfig = {
        variable: "required",
        prompt: "Enter required number",
        type: "number",
        required: true,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("");
      });

      await expect(strategy.prompt(config)).rejects.toThrow(
        "Invalid number input"
      );
    });

    it("should show 'empty' hint when no default value provided", async () => {
      const config: InputConfig = {
        variable: "optional",
        prompt: "Enter optional number",
        type: "number",
        required: false,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("42");
      });

      await strategy.prompt(config);

      expect(mockRl.question).toHaveBeenCalledWith(
        "> (empty): ",
        expect.any(Function)
      );
    });
  });
});
