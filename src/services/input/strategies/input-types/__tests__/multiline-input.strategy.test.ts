/**
 * @fileoverview Unit tests for MultilineInputStrategy
 *
 * Tests multiline text input collection.
 *
 * @author Flow Test Engine
 * @since 1.2.0
 */

import { MultilineInputStrategy } from "../multiline-input.strategy";
import type { InputConfig } from "../../../../../types/engine.types";
import * as readline from "readline";

// Mock readline module
jest.mock("readline");
const mockReadline = readline as jest.Mocked<typeof readline>;

describe("MultilineInputStrategy", () => {
  let strategy: MultilineInputStrategy;
  let mockRl: any;

  beforeEach(() => {
    strategy = new MultilineInputStrategy();

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
      expect(strategy.name).toBe("multiline");
    });
  });

  describe("canHandle", () => {
    it("should handle multiline type", () => {
      expect(strategy.canHandle("multiline")).toBe(true);
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

    it("should not handle select type", () => {
      expect(strategy.canHandle("select")).toBe(false);
    });
  });

  describe("prompt", () => {
    it("should collect single line and return when END is entered", async () => {
      const config: InputConfig = {
        prompt: "Enter description:",
        variable: "description",
        type: "multiline",
      };

      let questionCallback: any;
      mockRl.question.mockImplementation((question: string, callback: any) => {
        questionCallback = callback;
        if (!mockRl.question.mock.calls.length) {
          setTimeout(() => {
            callback("This is a single line");
            setTimeout(() => {
              callback("END");
            }, 0);
          }, 0);
        }
      });

      // Simulate user entering lines
      setTimeout(() => {
        questionCallback("This is a single line");
        setTimeout(() => {
          questionCallback("END");
        }, 10);
      }, 10);

      const result = await strategy.prompt(config);

      expect(result).toBe("This is a single line");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Enter multiline text (type "END" on a new line to finish)'
        )
      );
      expect(mockRl.close).toHaveBeenCalled();
    });

    it("should collect multiple lines and join with newline", async () => {
      const config: InputConfig = {
        prompt: "Enter content:",
        variable: "content",
        type: "multiline",
      };

      const lines = ["Line 1", "Line 2", "Line 3", "END"];
      let callIndex = 0;

      mockRl.question.mockImplementation((question: string, callback: any) => {
        const line = lines[callIndex++];
        callback(line);
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("Line 1\nLine 2\nLine 3");
    });

    it("should handle empty lines within input", async () => {
      const config: InputConfig = {
        prompt: "Enter text:",
        variable: "text",
        type: "multiline",
      };

      const lines = ["First line", "", "Third line", "END"];
      let callIndex = 0;

      mockRl.question.mockImplementation((question: string, callback: any) => {
        const line = lines[callIndex++];
        callback(line);
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("First line\n\nThird line");
    });

    it("should return empty string when only END is entered", async () => {
      const config: InputConfig = {
        prompt: "Enter data:",
        variable: "data",
        type: "multiline",
      };

      mockRl.question.mockImplementation((question: string, callback: any) => {
        callback("END");
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("");
    });

    it("should handle END with whitespace (trimmed)", async () => {
      const config: InputConfig = {
        prompt: "Enter text:",
        variable: "text",
        type: "multiline",
      };

      const lines = ["Content line", "  END  "];
      let callIndex = 0;

      mockRl.question.mockImplementation((question: string, callback: any) => {
        const line = lines[callIndex++];
        callback(line);
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("Content line");
    });

    it("should not treat 'end' (lowercase) as terminator", async () => {
      const config: InputConfig = {
        prompt: "Enter text:",
        variable: "text",
        type: "multiline",
      };

      const lines = ["This is the end", "of the line", "END"];
      let callIndex = 0;

      mockRl.question.mockImplementation((question: string, callback: any) => {
        const line = lines[callIndex++];
        callback(line);
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("This is the end\nof the line");
    });

    it("should not treat 'End' (mixed case) as terminator", async () => {
      const config: InputConfig = {
        prompt: "Enter text:",
        variable: "text",
        type: "multiline",
      };

      const lines = ["The End is near", "End", "END"];
      let callIndex = 0;

      mockRl.question.mockImplementation((question: string, callback: any) => {
        const line = lines[callIndex++];
        callback(line);
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("The End is near\nEnd");
    });

    it("should preserve whitespace within lines", async () => {
      const config: InputConfig = {
        prompt: "Enter code:",
        variable: "code",
        type: "multiline",
      };

      const lines = ["  function test() {", "    return true;", "  }", "END"];
      let callIndex = 0;

      mockRl.question.mockImplementation((question: string, callback: any) => {
        const line = lines[callIndex++];
        callback(line);
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("  function test() {\n    return true;\n  }");
    });

    it("should handle special characters in input", async () => {
      const config: InputConfig = {
        prompt: "Enter data:",
        variable: "data",
        type: "multiline",
      };

      const lines = [
        "Special: @#$%^&*()",
        "Unicode: 你好世界",
        "Emoji: 😀🎉",
        "END",
      ];
      let callIndex = 0;

      mockRl.question.mockImplementation((question: string, callback: any) => {
        const line = lines[callIndex++];
        callback(line);
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("Special: @#$%^&*()\nUnicode: 你好世界\nEmoji: 😀🎉");
    });

    it("should handle JSON input correctly", async () => {
      const config: InputConfig = {
        prompt: "Enter JSON:",
        variable: "json",
        type: "multiline",
      };

      const lines = ["{", '  "name": "test",', '  "value": 123', "}", "END"];
      let callIndex = 0;

      mockRl.question.mockImplementation((question: string, callback: any) => {
        const line = lines[callIndex++];
        callback(line);
      });

      const result = await strategy.prompt(config);

      expect(result).toBe('{\n  "name": "test",\n  "value": 123\n}');
    });

    it("should handle very long input (100+ lines)", async () => {
      const config: InputConfig = {
        prompt: "Enter content:",
        variable: "content",
        type: "multiline",
      };

      const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`);
      lines.push("END");
      let callIndex = 0;

      mockRl.question.mockImplementation((question: string, callback: any) => {
        const line = lines[callIndex++];
        callback(line);
      });

      const result = await strategy.prompt(config);

      const expectedLines = Array.from(
        { length: 100 },
        (_, i) => `Line ${i + 1}`
      );
      expect(result).toBe(expectedLines.join("\n"));
    });

    it("should handle lines containing END as substring", async () => {
      const config: InputConfig = {
        prompt: "Enter text:",
        variable: "text",
        type: "multiline",
      };

      const lines = ["This is a ENDING line", "APPEND to the end", "END"];
      let callIndex = 0;

      mockRl.question.mockImplementation((question: string, callback: any) => {
        const line = lines[callIndex++];
        callback(line);
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("This is a ENDING line\nAPPEND to the end");
    });

    it("should prompt with > for each line", async () => {
      const config: InputConfig = {
        prompt: "Enter text:",
        variable: "text",
        type: "multiline",
      };

      const lines = ["Line 1", "Line 2", "END"];
      let callIndex = 0;

      mockRl.question.mockImplementation((question: string, callback: any) => {
        expect(question).toBe("> ");
        const line = lines[callIndex++];
        callback(line);
      });

      await strategy.prompt(config);

      expect(mockRl.question).toHaveBeenCalledWith("> ", expect.any(Function));
      expect(mockRl.question).toHaveBeenCalledTimes(3);
    });

    it("should handle tabs and newlines in input", async () => {
      const config: InputConfig = {
        prompt: "Enter code:",
        variable: "code",
        type: "multiline",
      };

      const lines = ["Line\twith\ttabs", "Another\tline", "END"];
      let callIndex = 0;

      mockRl.question.mockImplementation((question: string, callback: any) => {
        const line = lines[callIndex++];
        callback(line);
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("Line\twith\ttabs\nAnother\tline");
    });

    it("should handle numeric lines", async () => {
      const config: InputConfig = {
        prompt: "Enter numbers:",
        variable: "numbers",
        type: "multiline",
      };

      const lines = ["123", "456.789", "-100", "END"];
      let callIndex = 0;

      mockRl.question.mockImplementation((question: string, callback: any) => {
        const line = lines[callIndex++];
        callback(line);
      });

      const result = await strategy.prompt(config);

      expect(result).toBe("123\n456.789\n-100");
    });

    it("should close readline interface after END", async () => {
      const config: InputConfig = {
        prompt: "Enter text:",
        variable: "text",
        type: "multiline",
      };

      mockRl.question.mockImplementation((question: string, callback: any) => {
        callback("END");
      });

      await strategy.prompt(config);

      expect(mockRl.close).toHaveBeenCalledTimes(1);
    });
  });
});
