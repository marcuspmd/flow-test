/**
 * @fileoverview Unit tests for SelectInputStrategy
 *
 * Tests single-selection from a list of options.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import { SelectInputStrategy } from "../select-input.strategy";
import type { InputConfig } from "../../../../../types/engine.types";
import * as readline from "readline";

// Mock readline module
jest.mock("readline");
const mockReadline = readline as jest.Mocked<typeof readline>;

describe("SelectInputStrategy", () => {
  let strategy: SelectInputStrategy;
  let mockRl: any;

  beforeEach(() => {
    strategy = new SelectInputStrategy();

    // Setup readline mock
    mockRl = {
      question: jest.fn(),
      close: jest.fn(),
    };

    mockReadline.createInterface.mockReturnValue(mockRl);

    // Spy on console methods
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("name", () => {
    it("should have correct strategy name", () => {
      expect(strategy.name).toBe("select");
    });
  });

  describe("canHandle", () => {
    it("should handle select type", () => {
      expect(strategy.canHandle("select")).toBe(true);
    });

    it("should not handle text type", () => {
      expect(strategy.canHandle("text")).toBe(false);
    });

    it("should not handle multiselect type", () => {
      expect(strategy.canHandle("multiselect")).toBe(false);
    });

    it("should not handle confirm type", () => {
      expect(strategy.canHandle("confirm")).toBe(false);
    });
  });

  describe("prompt", () => {
    it("should display numbered options and return selected value", async () => {
      const config: InputConfig = {
        prompt: "Select environment:",
        variable: "env",
        type: "select",
        options: [
          { value: "dev", label: "Development" },
          { value: "prod", label: "Production" },
        ],
      };

      mockRl.question.mockImplementation((question: string, callback: any) => {
        callback("1");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("dev");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Options:")
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("1. Development")
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("2. Production")
      );
      expect(mockRl.question).toHaveBeenCalledWith(
        "> Select (1-2): ",
        expect.any(Function)
      );
      expect(mockRl.close).toHaveBeenCalled();
    });

    it("should return second option when user selects 2", async () => {
      const config: InputConfig = {
        prompt: "Select role:",
        variable: "role",
        type: "select",
        options: [
          { value: "admin", label: "Administrator" },
          { value: "user", label: "Regular User" },
          { value: "guest", label: "Guest" },
        ],
      };

      mockRl.question.mockImplementation((question: string, callback: any) => {
        callback("2");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("user");
    });

    it("should return last option when user selects last index", async () => {
      const config: InputConfig = {
        prompt: "Select priority:",
        variable: "priority",
        type: "select",
        options: [
          { value: "low", label: "Low Priority" },
          { value: "medium", label: "Medium Priority" },
          { value: "high", label: "High Priority" },
          { value: "critical", label: "Critical Priority" },
        ],
      };

      mockRl.question.mockImplementation((question: string, callback: any) => {
        callback("4");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("critical");
    });

    it("should return default value when selection is invalid and default exists", async () => {
      const config: InputConfig = {
        prompt: "Select environment:",
        variable: "env",
        type: "select",
        default: "dev",
        options: [
          { value: "dev", label: "Development" },
          { value: "prod", label: "Production" },
        ],
      };

      mockRl.question.mockImplementation((question: string, callback: any) => {
        callback("99");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("dev");
    });

    it("should retry recursively when selection is invalid and no default", async () => {
      const config: InputConfig = {
        prompt: "Select environment:",
        variable: "env",
        type: "select",
        options: [
          { value: "dev", label: "Development" },
          { value: "prod", label: "Production" },
        ],
      };

      let callCount = 0;
      mockRl.question.mockImplementation((question: string, callback: any) => {
        callCount++;
        if (callCount === 1) {
          callback("999"); // Invalid first time
        } else {
          callback("1"); // Valid second time
        }
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("dev");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("❌ Invalid selection")
      );
    });

    it("should return default when user enters 0 (out of range)", async () => {
      const config: InputConfig = {
        prompt: "Select option:",
        variable: "option",
        type: "select",
        default: "default_value",
        options: [
          { value: "opt1", label: "Option 1" },
          { value: "opt2", label: "Option 2" },
        ],
      };

      mockRl.question.mockImplementation((question: string, callback: any) => {
        callback("0");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("default_value");
    });

    it("should return default when user enters negative number", async () => {
      const config: InputConfig = {
        prompt: "Select option:",
        variable: "option",
        type: "select",
        default: "default_value",
        options: [
          { value: "opt1", label: "Option 1" },
          { value: "opt2", label: "Option 2" },
        ],
      };

      mockRl.question.mockImplementation((question: string, callback: any) => {
        callback("-5");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("default_value");
    });

    it("should return default when user enters non-numeric input", async () => {
      const config: InputConfig = {
        prompt: "Select option:",
        variable: "option",
        type: "select",
        default: "default_value",
        options: [
          { value: "opt1", label: "Option 1" },
          { value: "opt2", label: "Option 2" },
        ],
      };

      mockRl.question.mockImplementation((question: string, callback: any) => {
        callback("abc");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("default_value");
    });

    it("should throw error when options array is empty", async () => {
      const config: InputConfig = {
        prompt: "Select option:",
        variable: "option",
        type: "select",
        options: [],
      };

      await expect(strategy.prompt(config)).rejects.toThrow(
        "Select input requires options array"
      );
    });

    it("should throw error when options is not an array", async () => {
      const config: InputConfig = {
        prompt: "Select option:",
        variable: "option",
        type: "select",
        options: null as any,
      };

      await expect(strategy.prompt(config)).rejects.toThrow(
        "Select input requires options array"
      );
    });

    it("should throw error when options is undefined", async () => {
      const config: InputConfig = {
        prompt: "Select option:",
        variable: "option",
        type: "select",
        // options omitted
      };

      await expect(strategy.prompt(config)).rejects.toThrow(
        "Select input requires options array"
      );
    });

    it("should handle single option correctly", async () => {
      const config: InputConfig = {
        prompt: "Confirm selection:",
        variable: "selection",
        type: "select",
        options: [{ value: "only_option", label: "Only Option" }],
      };

      mockRl.question.mockImplementation((question: string, callback: any) => {
        callback("1");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("only_option");
      expect(mockRl.question).toHaveBeenCalledWith(
        "> Select (1-1): ",
        expect.any(Function)
      );
    });

    it("should handle many options (10+)", async () => {
      const options = Array.from({ length: 15 }, (_, i) => ({
        value: `option_${i + 1}`,
        label: `Option ${i + 1}`,
      }));

      const config: InputConfig = {
        prompt: "Select option:",
        variable: "option",
        type: "select",
        options,
      };

      mockRl.question.mockImplementation((question: string, callback: any) => {
        callback("10");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("option_10");
      expect(mockRl.question).toHaveBeenCalledWith(
        "> Select (1-15): ",
        expect.any(Function)
      );
    });

    it("should handle whitespace in numeric input", async () => {
      const config: InputConfig = {
        prompt: "Select option:",
        variable: "option",
        type: "select",
        options: [
          { value: "opt1", label: "Option 1" },
          { value: "opt2", label: "Option 2" },
        ],
      };

      mockRl.question.mockImplementation((question: string, callback: any) => {
        callback("  2  ");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("opt2");
    });

    it("should handle empty input with default", async () => {
      const config: InputConfig = {
        prompt: "Select option:",
        variable: "option",
        type: "select",
        default: "default_opt",
        options: [
          { value: "opt1", label: "Option 1" },
          { value: "opt2", label: "Option 2" },
        ],
      };

      mockRl.question.mockImplementation((question: string, callback: any) => {
        callback("");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("default_opt");
    });

    it("should retry when empty input without default", async () => {
      const config: InputConfig = {
        prompt: "Select option:",
        variable: "option",
        type: "select",
        options: [
          { value: "opt1", label: "Option 1" },
          { value: "opt2", label: "Option 2" },
        ],
      };

      let callCount = 0;
      mockRl.question.mockImplementation((question: string, callback: any) => {
        callCount++;
        if (callCount === 1) {
          callback("");
        } else {
          callback("1");
        }
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("opt1");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("❌ Invalid selection")
      );
    });
  });
});
