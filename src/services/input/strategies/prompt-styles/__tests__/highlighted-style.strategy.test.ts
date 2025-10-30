/**
 * @fileoverview Tests for HighlightedPromptStyle
 */

import { HighlightedPromptStyle } from "../highlighted-style.strategy";
import type { InputConfig } from "../../../../../types/engine.types";

describe("HighlightedPromptStyle", () => {
  let strategy: HighlightedPromptStyle;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    strategy = new HighlightedPromptStyle();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("name", () => {
    it("should have correct name", () => {
      expect(strategy.name).toBe("highlighted");
    });
  });

  describe("canHandle", () => {
    it("should handle highlighted style", () => {
      expect(strategy.canHandle("highlighted")).toBe(true);
    });

    it("should not handle other styles", () => {
      expect(strategy.canHandle("simple")).toBe(false);
      expect(strategy.canHandle("boxed")).toBe(false);
      expect(strategy.canHandle(undefined)).toBe(false);
    });
  });

  describe("display", () => {
    it("should display basic prompt", () => {
      const config: InputConfig = {
        prompt: "Enter your name",
        variable: "test",
        type: "text",
      };

      strategy.display(config);

      expect(consoleSpy).toHaveBeenCalled();
      const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("Enter your name");
    });

    it("should display prompt with description", () => {
      const config: InputConfig = {
        prompt: "Enter your name",
        description: "Your full name",
        variable: "test",
        type: "text",
      };

      strategy.display(config);

      expect(consoleSpy).toHaveBeenCalled();
      const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("Your full name");
    });

    it("should display prompt with default value", () => {
      const config: InputConfig = {
        prompt: "Enter your name",
        default: "John Doe",
        variable: "test",
        type: "text",
      };

      strategy.display(config);

      expect(consoleSpy).toHaveBeenCalled();
      const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("John Doe");
    });

    it("should display prompt with all options", () => {
      const config: InputConfig = {
        prompt: "Enter your email",
        description: "Email address",
        default: "user@example.com",
        variable: "test",
        type: "text",
      };

      strategy.display(config);

      expect(consoleSpy).toHaveBeenCalled();
      const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("Enter your email");
    });
  });
});
