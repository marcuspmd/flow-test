/**
 * @fileoverview Tests for ConfirmInputStrategy
 */

import { ConfirmInputStrategy } from "../confirm-input.strategy";
import type { InputConfig } from "../../../../../types/engine.types";
import * as readline from "readline";

// Mock readline
jest.mock("readline");

const mockReadline = readline as jest.Mocked<typeof readline>;

describe("ConfirmInputStrategy", () => {
  let strategy: ConfirmInputStrategy;
  let mockRl: any;

  beforeEach(() => {
    strategy = new ConfirmInputStrategy();

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
      expect(strategy.name).toBe("confirm");
    });
  });

  describe("canHandle", () => {
    it("should handle confirm type", () => {
      expect(strategy.canHandle("confirm")).toBe(true);
    });

    it("should not handle text type", () => {
      expect(strategy.canHandle("text")).toBe(false);
    });

    it("should not handle password type", () => {
      expect(strategy.canHandle("password")).toBe(false);
    });

    it("should not handle number type", () => {
      expect(strategy.canHandle("number")).toBe(false);
    });
  });

  describe("prompt", () => {
    it("should return true for 'y' answer", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("y");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(true);
      expect(typeof result).toBe("boolean");
    });

    it("should return true for 'yes' answer", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("yes");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(true);
    });

    it("should return true for 'Y' answer (case insensitive)", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("Y");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(true);
    });

    it("should return true for 'YES' answer (case insensitive)", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("YES");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(true);
    });

    it("should return true for 'Yes' answer (mixed case)", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("Yes");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(true);
    });

    it("should return false for 'n' answer", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("n");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(false);
    });

    it("should return false for 'no' answer", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("no");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(false);
    });

    it("should return false for any other answer", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("maybe");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(false);
    });

    it("should return default true when user enters empty input", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
        default: true,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(true);
    });

    it("should return default false when user enters empty input", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
        default: false,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(false);
    });

    it("should show (Y/n) hint when default is true", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
        default: true,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("y");
      });

      await strategy.prompt(config);

      expect(mockRl.question).toHaveBeenCalledWith(
        ">  (Y/n): ",
        expect.any(Function)
      );
    });

    it("should show (y/N) hint when default is false", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
        default: false,
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("n");
      });

      await strategy.prompt(config);

      expect(mockRl.question).toHaveBeenCalledWith(
        ">  (y/N): ",
        expect.any(Function)
      );
    });

    it("should show (y/N) hint when no default provided", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("y");
      });

      await strategy.prompt(config);

      expect(mockRl.question).toHaveBeenCalledWith(
        ">  (y/N): ",
        expect.any(Function)
      );
    });

    it("should return false for empty input when no default", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe(false);
    });

    it("should handle whitespace in input", async () => {
      const config: InputConfig = {
        variable: "confirmed",
        prompt: "Confirm action",
        type: "confirm",
      };

      mockRl.question.mockImplementation((prompt: string, callback: any) => {
        callback("  yes  ");
      });

      const result = await strategy.prompt(config);

      // The strategy doesn't trim, so this should return false
      expect(result).toBe(false);
    });
  });
});
