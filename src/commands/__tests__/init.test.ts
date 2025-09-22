/**
 * @fileoverview Comprehensive unit tests for ConfigInitializer and init command
 *
 * @remarks
 * This test suite covers the ConfigInitializer class and handleInitCommand function
 * which handle CLI initialization, config generation, template processing,
 * and interactive configuration setup.
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import yaml from "js-yaml";

// Mock all dependencies
jest.mock("fs");
jest.mock("path");
jest.mock("readline");
jest.mock("js-yaml");
jest.mock("../../services/logger.service", () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe("ConfigInitializer", () => {
  let configInitializer: ConfigInitializer;
  let mockReadlineInterface: any;
  let mockFs: jest.Mocked<typeof fs>;
  let mockPath: jest.Mocked<typeof path>;
  let mockYaml: jest.Mocked<typeof yaml>;
  let mockReadline: jest.Mocked<typeof readline>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mocks
    mockFs = fs as jest.Mocked<typeof fs>;
    mockPath = path as jest.Mocked<typeof path>;
    mockYaml = yaml as jest.Mocked<typeof yaml>;
    mockReadline = readline as jest.Mocked<typeof readline>;

    // Mock readline interface
    mockReadlineInterface = {
      question: jest.fn(),
      close: jest.fn(),
    };

    mockReadline.createInterface.mockReturnValue(mockReadlineInterface);

    // Create instance
    configInitializer = new ConfigInitializer();
  });

  afterEach(() => {
    // Ensure readline is closed
    mockReadlineInterface.close();
  });

  describe("constructor", () => {
    it("should create instance with default config", () => {
      expect(mockReadline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout,
      });
      expect(configInitializer).toBeInstanceOf(ConfigInitializer);
    });

    it("should initialize with default configuration template", () => {
      const defaultConfig = (configInitializer as any).config;
      expect(defaultConfig.project_name).toBe("My API Test Project");
      expect(defaultConfig.test_directory).toBe("./tests");
      expect(defaultConfig.execution.mode).toBe("sequential");
    });
  });

  describe("getDefaultConfig", () => {
    it("should return complete default configuration", () => {
      const defaultConfig = (configInitializer as any).getDefaultConfig();

      expect(defaultConfig).toHaveProperty("project_name");
      expect(defaultConfig).toHaveProperty("test_directory");
      expect(defaultConfig).toHaveProperty("globals");
      expect(defaultConfig).toHaveProperty("discovery");
      expect(defaultConfig).toHaveProperty("priorities");
      expect(defaultConfig).toHaveProperty("execution");
      expect(defaultConfig).toHaveProperty("reporting");
    });

    it("should include proper default values", () => {
      const defaultConfig = (configInitializer as any).getDefaultConfig();

      expect(defaultConfig.priorities.levels).toEqual([
        "critical",
        "high",
        "medium",
        "low",
      ]);
      expect(defaultConfig.discovery.patterns).toContain("**/*.yaml");
      expect(defaultConfig.execution.max_parallel).toBe(3);
    });
  });

  describe("getTemplates", () => {
    it("should return available templates", () => {
      const templates = (configInitializer as any).getTemplates();

      expect(templates).toHaveProperty("basic");
      expect(templates).toHaveProperty("performance");
      expect(templates).toHaveProperty("ci_cd");
      expect(templates).toHaveProperty("comprehensive");
    });

    it("should return template configs with proper structure", () => {
      const templates = (configInitializer as any).getTemplates();

      // Check basic template
      expect(templates.basic).toHaveProperty("project_name");
      expect(templates.basic.execution?.mode).toBe("sequential");

      // Check performance template
      expect(templates.performance.execution?.mode).toBe("parallel");
      expect(templates.performance.execution?.max_parallel).toBeGreaterThan(1);
    });
  });

  describe("ask", () => {
    it("should prompt user and return answer", async () => {
      mockReadlineInterface.question.mockImplementationOnce(
        (prompt: string, callback: Function) => {
          expect(prompt).toContain("What is your name?");
          callback("John Doe");
        }
      );

      const answer = await (configInitializer as any).ask("What is your name?");
      expect(answer).toBe("John Doe");
    });

    it("should return default value when empty answer", async () => {
      mockReadlineInterface.question.mockImplementationOnce(
        (prompt: string, callback: Function) => {
          callback("");
        }
      );

      const answer = await (configInitializer as any).ask(
        "What is your name?",
        "Default Name"
      );
      expect(answer).toBe("Default Name");
    });

    it("should trim whitespace from answer", async () => {
      mockReadlineInterface.question.mockImplementationOnce(
        (prompt: string, callback: Function) => {
          callback("  John Doe  ");
        }
      );

      const answer = await (configInitializer as any).ask("What is your name?");
      expect(answer).toBe("John Doe");
    });
  });

  describe("askBoolean", () => {
    it("should return true for 'y' answer", async () => {
      mockReadlineInterface.question.mockImplementationOnce(
        (prompt: string, callback: Function) => {
          callback("y");
        }
      );

      const answer = await (configInitializer as any).askBoolean(
        "Do you agree?"
      );
      expect(answer).toBe(true);
    });

    it("should return true for 'yes' answer", async () => {
      mockReadlineInterface.question.mockImplementationOnce(
        (prompt: string, callback: Function) => {
          callback("yes");
        }
      );

      const answer = await (configInitializer as any).askBoolean(
        "Do you agree?"
      );
      expect(answer).toBe(true);
    });

    it("should return false for 'n' answer", async () => {
      mockReadlineInterface.question.mockImplementationOnce(
        (prompt: string, callback: Function) => {
          callback("n");
        }
      );

      const answer = await (configInitializer as any).askBoolean(
        "Do you agree?"
      );
      expect(answer).toBe(false);
    });

    it("should return default value for empty answer", async () => {
      mockReadlineInterface.question.mockImplementationOnce(
        (prompt: string, callback: Function) => {
          callback("");
        }
      );

      const answer = await (configInitializer as any).askBoolean(
        "Do you agree?",
        true
      );
      expect(answer).toBe(true);
    });
  });

  describe("askChoice", () => {
    it("should return selected choice", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      mockReadlineInterface.question.mockImplementationOnce(
        (prompt: string, callback: Function) => {
          callback("2");
        }
      );

      const choices = ["Option A", "Option B", "Option C"];
      const answer = await (configInitializer as any).askChoice(
        "Choose option:",
        choices
      );

      expect(answer).toBe("Option B");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Choose option:")
      );

      consoleSpy.mockRestore();
    });

    it("should return default choice for empty answer", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      mockReadlineInterface.question.mockImplementationOnce(
        (prompt: string, callback: Function) => {
          callback("");
        }
      );

      const choices = ["Option A", "Option B", "Option C"];
      const answer = await (configInitializer as any).askChoice(
        "Choose option:",
        choices,
        1
      );

      expect(answer).toBe("Option B");

      consoleSpy.mockRestore();
    });
  });

  describe("runInteractiveSetup", () => {
    beforeEach(() => {
      // Mock all ask methods
      jest.spyOn(configInitializer as any, "ask").mockResolvedValue("");
      jest
        .spyOn(configInitializer as any, "askBoolean")
        .mockResolvedValue(false);
      jest
        .spyOn(configInitializer as any, "askChoice")
        .mockResolvedValue("sequential");
      jest
        .spyOn(configInitializer as any, "setupAdditionalVariables")
        .mockResolvedValue(undefined);
      jest
        .spyOn(configInitializer as any, "setupPriorities")
        .mockResolvedValue(undefined);
      jest
        .spyOn(configInitializer as any, "setupDiscovery")
        .mockResolvedValue(undefined);
    });

    it("should run complete interactive setup", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await (configInitializer as any).runInteractiveSetup();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Configuration Setup")
      );
      expect((configInitializer as any).ask).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle errors during interactive setup", async () => {
      jest
        .spyOn(configInitializer as any, "ask")
        .mockRejectedValue(new Error("Setup error"));

      await expect(
        (configInitializer as any).runInteractiveSetup()
      ).rejects.toThrow("Setup error");
    });
  });

  describe("generateFromTemplate", () => {
    beforeEach(() => {
      jest.spyOn(configInitializer as any, "getTemplates").mockReturnValue({
        basic: {
          project_name: "Basic Project",
          execution: { mode: "sequential" },
        },
        performance: {
          project_name: "Performance Project",
          execution: { mode: "parallel" },
        },
      });
    });

    it("should generate config from valid template", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await configInitializer.generateFromTemplate("basic");

      expect((configInitializer as any).config.project_name).toBe(
        "Basic Project"
      );
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should handle invalid template", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      await configInitializer.generateFromTemplate("invalid");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("not found")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Available templates")
      );

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe("saveConfiguration", () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockImplementation(() => undefined);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockPath.resolve.mockImplementation((input) => input); // Return input as-is
      mockPath.dirname.mockReturnValue("./");
      jest
        .spyOn(configInitializer as any, "generateYamlWithComments")
        .mockReturnValue("yaml content");
      jest
        .spyOn(configInitializer as any, "showNextSteps")
        .mockImplementation();
    });

    it("should save config to file", async () => {
      await configInitializer.saveConfiguration("test-config.yml");

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        "test-config.yml",
        "yaml content",
        "utf8"
      );
      // Note: Logger calls are mocked, so we don't check for specific logger calls
      // We just verify the main functionality (file writing) works
    });

    it("should handle existing file without force", async () => {
      mockFs.existsSync.mockReturnValue(true);
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await configInitializer.saveConfiguration("existing-config.yml", false);

      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("already exists")
      );

      consoleErrorSpy.mockRestore();
    });

    it("should overwrite existing file with force", async () => {
      mockFs.existsSync.mockReturnValue(true);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await configInitializer.saveConfiguration("existing-config.yml", true);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Configuration saved")
      );

      consoleSpy.mockRestore();
    });

    it("should handle file write errors", async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await configInitializer.saveConfiguration("test-config.yml");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to save")
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("generateYamlWithComments", () => {
    it("should generate YAML with comments", () => {
      const yaml = (configInitializer as any).generateYamlWithComments();

      expect(yaml).toContain("# Flow Test Engine Configuration");
      expect(yaml).toContain("project_name:");
      expect(yaml).toContain("test_directory:");
    });
  });

  describe("close", () => {
    it("should close readline interface", () => {
      configInitializer.close();
      expect(mockReadlineInterface.close).toHaveBeenCalled();
    });
  });

  describe("run", () => {
    beforeEach(() => {
      jest
        .spyOn(configInitializer, "generateFromTemplate")
        .mockResolvedValue(undefined);
      jest
        .spyOn(configInitializer as any, "runInteractiveSetup")
        .mockResolvedValue(undefined);
      jest
        .spyOn(configInitializer, "saveConfiguration")
        .mockResolvedValue(undefined);
      jest
        .spyOn(configInitializer as any, "listTemplates")
        .mockImplementation();
    });

    it("should run with template option", async () => {
      await configInitializer.run({ template: "basic" });

      expect(configInitializer.generateFromTemplate).toHaveBeenCalledWith(
        "basic"
      );
      expect(configInitializer.saveConfiguration).toHaveBeenCalledWith(
        "flow-test.config.yml",
        undefined
      );
    });

    it("should list templates when template is 'list'", async () => {
      await configInitializer.run({ template: "list" });

      expect((configInitializer as any).listTemplates).toHaveBeenCalled();
      expect(configInitializer.saveConfiguration).not.toHaveBeenCalled();
    });

    it("should run interactive setup by default", async () => {
      await configInitializer.run({});

      expect((configInitializer as any).runInteractiveSetup).toHaveBeenCalled();
      expect(configInitializer.saveConfiguration).toHaveBeenCalled();
    });

    it("should use custom output path", async () => {
      await configInitializer.run({ output: "custom.yml", template: "basic" });

      expect(configInitializer.saveConfiguration).toHaveBeenCalledWith(
        "custom.yml",
        undefined
      );
    });

    it("should pass force option to save", async () => {
      await configInitializer.run({ force: true, template: "basic" });

      expect(configInitializer.saveConfiguration).toHaveBeenCalledWith(
        "flow-test.config.yml",
        true
      );
    });

    it("should always close readline interface", async () => {
      jest.spyOn(configInitializer, "close");

      await configInitializer.run({ template: "basic" });

      expect(configInitializer.close).toHaveBeenCalled();
    });

    it("should close readline interface even on error", async () => {
      jest.spyOn(configInitializer, "close");
      jest
        .spyOn(configInitializer, "generateFromTemplate")
        .mockRejectedValue(new Error("Test error"));

      await expect(
        configInitializer.run({ template: "basic" })
      ).rejects.toThrow("Test error");
      expect(configInitializer.close).toHaveBeenCalled();
    });
  });
});

// Import the module for testing
import { ConfigInitializer, handleInitCommand } from "../init";

describe("handleInitCommand", () => {
  let runSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock the run method on ConfigInitializer prototype
    runSpy = jest
      .spyOn(ConfigInitializer.prototype, 'run')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    runSpy?.mockRestore();
    jest.clearAllMocks();
  });

  it("should run with default options for no arguments", async () => {
    await handleInitCommand([]);

    expect(runSpy).toHaveBeenCalledWith({
      interactive: true,
      force: false,
    });
  });

  it("should parse template option", async () => {
    await handleInitCommand(["--template", "basic"]);

    expect(runSpy).toHaveBeenCalledWith({
      interactive: false,
      force: false,
      template: "basic",
    });
  });

  it("should parse template short option", async () => {
    await handleInitCommand(["-t", "performance"]);

    expect(runSpy).toHaveBeenCalledWith({
      interactive: false,
      force: false,
      template: "performance",
    });
  });

  it("should parse output option", async () => {
    await handleInitCommand(["--output", "custom.yml"]);

    expect(runSpy).toHaveBeenCalledWith({
      interactive: true,
      force: false,
      output: "custom.yml",
    });
  });

  it("should parse output short option", async () => {
    await handleInitCommand(["-o", "config.yml"]);

    expect(runSpy).toHaveBeenCalledWith({
      interactive: true,
      force: false,
      output: "config.yml",
    });
  });

  it("should parse force option", async () => {
    await handleInitCommand(["--force"]);

    expect(runSpy).toHaveBeenCalledWith({
      interactive: true,
      force: true,
    });
  });

  it("should parse force short option", async () => {
    await handleInitCommand(["-f"]);

    expect(runSpy).toHaveBeenCalledWith({
      interactive: true,
      force: true,
    });
  });

  it("should parse no-interactive option", async () => {
    await handleInitCommand(["--no-interactive"]);

    expect(runSpy).toHaveBeenCalledWith({
      interactive: false,
      force: false,
    });
  });

  it("should handle combined options", async () => {
    await handleInitCommand(["-t", "ci_cd", "-o", "ci.yml", "-f"]);

    expect(runSpy).toHaveBeenCalledWith({
      interactive: false,
      force: true,
      template: "ci_cd",
      output: "ci.yml",
    });
  });

  it("should show help with --help flag", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    await handleInitCommand(["--help"]);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Flow Test Engine")
    );
    expect(runSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should show help with -h flag", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    await handleInitCommand(["-h"]);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Flow Test Engine")
    );
    expect(runSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
