/**
 * @fileoverview Tests for BoxedPromptStyle
 */

import { BoxedPromptStyle } from "../boxed-style.strategy";
import type { InputConfig } from "../../../../../types/engine.types";

describe("BoxedPromptStyle", () => {
  let strategy: BoxedPromptStyle;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    strategy = new BoxedPromptStyle();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("name", () => {
    it("should have correct name", () => {
      expect(strategy.name).toBe("boxed");
    });
  });

  describe("canHandle", () => {
    it("should handle boxed style", () => {
      expect(strategy.canHandle("boxed")).toBe(true);
    });

    it("should not handle other styles", () => {
      expect(strategy.canHandle("simple")).toBe(false);
      expect(strategy.canHandle("highlighted")).toBe(false);
      expect(strategy.canHandle(undefined)).toBe(false);
    });
  });

  describe("display", () => {
    it("should display basic prompt in box", () => {
      const config: InputConfig = {
        prompt: "Enter your name",
        variable: "name",
        type: "text",
      };

      strategy.display(config);

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.map((c) => c[0]);
      const allOutput = calls.join("\n");

      expect(allOutput).toContain("Enter your name");
    });

    it("should display prompt with description", () => {
      const config: InputConfig = {
        prompt: "Enter your name",
        variable: "name",
        description: "Your full legal name",
        type: "text",
      };

      strategy.display(config);

      expect(consoleSpy).toHaveBeenCalled();
      const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("Your full legal name");
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

    it("should display prompt with placeholder", () => {
      const config: InputConfig = {
        prompt: "Enter your email",
        placeholder: "user@example.com",
        variable: "test",
        type: "text",
      };

      strategy.display(config);

      expect(consoleSpy).toHaveBeenCalled();
      const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("user@example.com");
    });

    it("should display prompt with all options", () => {
      const config: InputConfig = {
        prompt: "Enter your email",
        description: "Your email address",
        default: "user@example.com",
        placeholder: "email@domain.com",
        variable: "test",
        type: "text",
      };

      strategy.display(config);

      expect(consoleSpy).toHaveBeenCalled();
      const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join("\n");

      expect(allOutput).toContain("Enter your email");
      expect(allOutput).toContain("Your email address");
    });
  });
});
