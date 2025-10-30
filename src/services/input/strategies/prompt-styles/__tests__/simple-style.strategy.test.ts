/**
 * @fileoverview Tests for SimplePromptStyle
 */

import { SimplePromptStyle } from "../simple-style.strategy";
import type { InputConfig } from "../../../../../types/engine.types";

describe("SimplePromptStyle", () => {
  let strategy: SimplePromptStyle;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    strategy = new SimplePromptStyle();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("name", () => {
    it("should have correct name", () => {
      expect(strategy.name).toBe("simple");
    });
  });

  describe("canHandle", () => {
    it("should handle simple style", () => {
      expect(strategy.canHandle("simple")).toBe(true);
    });

    it("should handle undefined style (default)", () => {
      expect(strategy.canHandle(undefined)).toBe(true);
    });

    it("should handle undefined or simple style", () => {
      expect(strategy.canHandle(undefined)).toBe(true);
      expect(strategy.canHandle("simple")).toBe(true);
      expect(strategy.canHandle("")).toBe(true); // Empty string is also default
    });

    it("should not handle other styles", () => {
      expect(strategy.canHandle("boxed")).toBe(false);
      expect(strategy.canHandle("highlighted")).toBe(false);
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
      expect(consoleSpy.mock.calls.some((call) =>
        call[0]?.includes("Enter your name")
      )).toBe(true);
    });

    it("should display prompt with description", () => {
      const config: InputConfig = {
        prompt: "Enter your name",
        description: "Your full legal name",
        variable: "test",
        type: "text",
      };

      strategy.display(config);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some((call) =>
        call[0]?.includes("Your full legal name")
      )).toBe(true);
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
      expect(consoleSpy.mock.calls.some((call) =>
        call[0]?.includes("Default")
      )).toBe(true);
      expect(consoleSpy.mock.calls.some((call) =>
        call[0]?.includes("John Doe")
      )).toBe(true);
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
      expect(consoleSpy.mock.calls.some((call) =>
        call[0]?.includes("Example")
      )).toBe(true);
      expect(consoleSpy.mock.calls.some((call) =>
        call[0]?.includes("user@example.com")
      )).toBe(true);
    });

    it("should display prompt with all options", () => {
      const config: InputConfig = {
        prompt: "Enter your email",
        description: "Your email address for notifications",
        default: "user@example.com",
        placeholder: "email@domain.com",
        variable: "test",
        type: "text",
      };

      strategy.display(config);

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.map((c) => c[0]);
      const allOutput = calls.join(" ");

      expect(allOutput).toContain("Enter your email");
      expect(allOutput).toContain("Your email address for notifications");
      expect(allOutput).toContain("Default");
      expect(allOutput).toContain("Example");
    });

    it("should handle numeric default value", () => {
      const config: InputConfig = {
        prompt: "Enter your age",
        variable: "age",
        default: 25,
        type: "number",
      };

      strategy.display(config);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some((call) =>
        call[0]?.includes("25")
      )).toBe(true);
    });

    it("should handle boolean default value", () => {
      const config: InputConfig = {
        prompt: "Enable notifications?",
        variable: "notifications",
        default: true,
        type: "confirm",
      };

      strategy.display(config);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some((call) =>
        call[0]?.includes("true")
      )).toBe(true);
    });
  });
});
