import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { ConfigManager } from "../config";
import type { EngineConfig } from "../../types/engine.types";

// Mock fs module
jest.mock("fs");
jest.mock("path");
jest.mock("js-yaml");

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;

describe("ConfigManager", () => {
  const mockConfigPath = "/test/flow-test.config.yml";
  const validConfig = {
    project_name: "Test Project",
    test_directory: "./tests",
    globals: {
      variables: { api_url: "http://localhost" },
      timeouts: { default: 30000, slow_tests: 60000 },
      base_url: "http://api.test.com",
    },
    discovery: {
      patterns: ["**/*.test.yml"],
      exclude: ["**/node_modules/**"],
      recursive: true,
    },
    priorities: {
      levels: ["critical", "high", "medium", "low"],
      required: ["critical"],
      fail_fast_on_required: true,
    },
    execution: {
      mode: "sequential",
      max_parallel: 5,
      timeout: 30000,
      continue_on_failure: false,
      retry_failed: {
        enabled: false,
        max_attempts: 3,
        delay_ms: 1000,
      },
    },
    reporting: {
      formats: ["json"],
      output_dir: "./results",
      aggregate: true,
      include_performance_metrics: true,
      include_variables_state: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockPath.resolve.mockReturnValue(mockConfigPath);
    mockFs.existsSync.mockReturnValue(true); // Always return true by default
    mockFs.readFileSync.mockReturnValue(JSON.stringify(validConfig));
    mockYaml.load.mockReturnValue(validConfig);

    // Clear environment variables
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("FLOW_TEST_")) {
        delete process.env[key];
      }
    });
  });

  describe("constructor", () => {
    it("should create instance with default config file", () => {
      const configManager = new ConfigManager();

      expect(configManager).toBeInstanceOf(ConfigManager);
      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.readFileSync).toHaveBeenCalledWith(mockConfigPath, "utf8");
    });

    it("should create instance with custom config file", () => {
      const customPath = "/custom/config.yml";
      mockPath.resolve.mockReturnValue(customPath);

      const configManager = new ConfigManager({ config_file: "./custom.yml" });

      expect(configManager).toBeInstanceOf(ConfigManager);
      expect(mockPath.resolve).toHaveBeenCalledWith("./custom.yml");
    });

    it("should throw error if custom config file does not exist", () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => new ConfigManager({ config_file: "./missing.yml" })).toThrow(
        "Config file not found: ./missing.yml"
      );
    });

    it("should find first available default config file", () => {
      mockFs.existsSync
        .mockReturnValueOnce(false) // flow-test.config.yml
        .mockReturnValueOnce(false) // flow-test.config.yaml
        .mockReturnValueOnce(true) // flow-test.yml - found!
        .mockReturnValueOnce(true) // test directory exists
        .mockReturnValueOnce(true); // output directory check

      const configManager = new ConfigManager();

      expect(configManager).toBeInstanceOf(ConfigManager);
      expect(mockFs.existsSync).toHaveBeenCalledTimes(5);
    });

    it("should throw error if no default config file found", () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => new ConfigManager()).toThrow(/No configuration file found/);
    });

    it("should apply options overrides", () => {
      const configManager = new ConfigManager({
        test_directory: "./custom-tests",
        verbosity: "silent",
      });

      const config = configManager.getConfig();
      expect(config.test_directory).toBe("./custom-tests");
    });
  });

  describe("getConfig", () => {
    it("should return complete configuration", () => {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config).toEqual(
        expect.objectContaining({
          project_name: "Test Project",
          test_directory: "./tests",
          globals: expect.any(Object),
          discovery: expect.any(Object),
          priorities: expect.any(Object),
          execution: expect.any(Object),
          reporting: expect.any(Object),
        })
      );
    });

    it("should normalize config with default values", () => {
      const minimalConfig = { project_name: "Minimal Project" };
      mockYaml.load.mockReturnValue(minimalConfig);

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.test_directory).toBe("./tests");
      expect(config.globals?.timeouts?.default).toBe(30000);
      expect(config.discovery?.patterns).toEqual([
        "**/*.test.yml",
        "**/*.test.yaml",
      ]);
      expect(config.execution?.mode).toBe("sequential");
      expect(config.reporting?.formats).toEqual(["json"]);
    });
  });

  describe("getGlobalVariables", () => {
    it("should return global variables from config", () => {
      const configManager = new ConfigManager();
      const globalVars = configManager.getGlobalVariables();

      expect(globalVars).toEqual({
        api_url: "http://localhost",
      });
    });

    it("should merge environment variables with config variables", () => {
      process.env.FLOW_TEST_API_KEY = "test-key";
      process.env.FLOW_TEST_DEBUG = "true";

      const configManager = new ConfigManager();
      const globalVars = configManager.getGlobalVariables();

      expect(globalVars).toEqual({
        api_url: "http://localhost",
        api_key: "test-key",
        debug: "true",
      });
    });

    it("should prioritize environment variables over config variables", () => {
      process.env.FLOW_TEST_API_URL = "http://env.localhost";

      const configManager = new ConfigManager();
      const globalVars = configManager.getGlobalVariables();

      expect(globalVars.api_url).toBe("http://env.localhost");
    });

    it("should handle missing globals section in config", () => {
      const configWithoutGlobals = { project_name: "Test" };
      mockYaml.load.mockReturnValue(configWithoutGlobals);

      const configManager = new ConfigManager();
      const globalVars = configManager.getGlobalVariables();

      expect(globalVars).toEqual({});
    });
  });

  describe("getRuntimeFilters", () => {
    it("should return empty object when no filters applied", () => {
      const configManager = new ConfigManager();
      const filters = configManager.getRuntimeFilters();

      expect(filters).toEqual({});
    });

    it("should return runtime filters when provided", () => {
      const filters = { tags: ["smoke"], priority: ["high"] };
      const configManager = new ConfigManager({ filters });
      const runtimeFilters = configManager.getRuntimeFilters();

      expect(runtimeFilters).toEqual(filters);
    });
  });

  describe("reload", () => {
    it("should reload configuration from file", () => {
      const configManager = new ConfigManager();

      // Change mock return value
      const newConfig = { ...validConfig, project_name: "Reloaded Project" };
      mockYaml.load.mockReturnValue(newConfig);

      configManager.reload();
      const config = configManager.getConfig();

      expect(config.project_name).toBe("Reloaded Project");
      expect(mockFs.readFileSync).toHaveBeenCalledTimes(2); // Once in constructor, once in reload
    });
  });

  describe("saveDebugConfig", () => {
    it("should save debug configuration to file", () => {
      const configManager = new ConfigManager();
      const outputPath = "./debug-config.yml";
      const expectedDebugConfig = {
        ...validConfig,
        _loaded_from: mockConfigPath,
        _loaded_at: expect.any(String),
        _environment_variables: expect.any(Object),
      };

      configManager.saveDebugConfig(outputPath);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        outputPath,
        yaml.dump(expectedDebugConfig, { indent: 2 }),
        "utf8"
      );
    });
  });

  describe("config validation", () => {
    it("should throw error if config is not an object", () => {
      mockYaml.load.mockReturnValue("invalid");

      expect(() => new ConfigManager()).toThrow(
        "Configuration must be a valid object"
      );
    });

    it("should throw error if project_name is missing", () => {
      const invalidConfig = { test_directory: "./tests" };
      mockYaml.load.mockReturnValue(invalidConfig);

      expect(() => new ConfigManager()).toThrow(
        "project_name is required in configuration"
      );
    });

    it("should throw error if test_directory does not exist", () => {
      mockFs.existsSync
        .mockReturnValueOnce(true) // config file exists
        .mockReturnValueOnce(false); // test directory does not exist

      expect(() => new ConfigManager()).toThrow(
        "Test directory does not exist"
      );
    });

    it("should throw error for invalid execution mode", () => {
      const invalidConfig = {
        ...validConfig,
        execution: { ...validConfig.execution, mode: "invalid" },
      };
      mockYaml.load.mockReturnValue(invalidConfig);

      expect(() => new ConfigManager()).toThrow(
        "Invalid execution mode: invalid"
      );
    });

    it("should throw error for invalid max_parallel in parallel mode", () => {
      const invalidConfig = {
        ...validConfig,
        execution: { mode: "parallel" as const, max_parallel: -1 },
      };
      mockYaml.load.mockReturnValue(invalidConfig);

      expect(() => new ConfigManager()).toThrow(
        "max_parallel must be greater than 0 for parallel execution"
      );
    });

    it("should throw error if no priority levels defined", () => {
      const invalidConfig = {
        ...validConfig,
        priorities: { ...validConfig.priorities, levels: [] },
      };
      mockYaml.load.mockReturnValue(invalidConfig);

      expect(() => new ConfigManager()).toThrow(
        "At least one priority level must be defined"
      );
    });

    it("should throw error for required priority not in levels", () => {
      const invalidConfig = {
        ...validConfig,
        priorities: {
          levels: ["high", "medium"],
          required: ["critical"],
        },
      };
      mockYaml.load.mockReturnValue(invalidConfig);

      expect(() => new ConfigManager()).toThrow(
        "Required priorities not found in levels: critical"
      );
    });

    it("should throw error for invalid reporting formats", () => {
      const invalidConfig = {
        ...validConfig,
        reporting: { ...validConfig.reporting, formats: ["invalid"] },
      };
      mockYaml.load.mockReturnValue(invalidConfig);

      expect(() => new ConfigManager()).toThrow(
        "Invalid reporting formats: invalid"
      );
    });

    it("should create output directory if it does not exist", () => {
      mockFs.existsSync
        .mockReturnValueOnce(true) // config file exists
        .mockReturnValueOnce(true) // test directory exists
        .mockReturnValueOnce(false); // output directory does not exist

      const configManager = new ConfigManager();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith("./results", {
        recursive: true,
      });
    });
  });

  describe("options overrides", () => {
    it("should override test_directory", () => {
      const configManager = new ConfigManager({
        test_directory: "./custom-tests",
      });
      const config = configManager.getConfig();

      expect(config.test_directory).toBe("./custom-tests");
    });

    it("should keep reporting formats when verbosity changes", () => {
      const silentConfig = new ConfigManager({ verbosity: "silent" });
      expect(silentConfig.getConfig().reporting?.formats).toEqual(["json"]);

      const verboseConfig = new ConfigManager({ verbosity: "verbose" });
      expect(verboseConfig.getConfig().reporting?.formats).toEqual(["json"]);
    });

    it("should merge reporting overrides for html output", () => {
      const configManager = new ConfigManager({
        reporting: {
          formats: ["html"],
          html: {
            output_subdir: "custom-html",
            aggregate: true,
            per_suite: false,
          },
        },
      });

      const reporting = configManager.getConfig().reporting!;
      expect(reporting.formats).toEqual(["json", "html"]);
      expect(reporting.html).toEqual(
        expect.objectContaining({
          output_subdir: "custom-html",
          aggregate: true,
          per_suite: false,
        })
      );
    });
  });

  describe("error handling", () => {
    it("should throw error if config file read fails", () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      expect(() => new ConfigManager()).toThrow(
        /Failed to load config from.*Permission denied/
      );
    });

    it("should throw error if YAML parsing fails", () => {
      mockYaml.load.mockImplementation(() => {
        throw new Error("Invalid YAML");
      });

      expect(() => new ConfigManager()).toThrow(
        /Failed to load config from.*Invalid YAML/
      );
    });
  });

  describe("environment variables handling", () => {
    it("should ignore non-FLOW_TEST environment variables", () => {
      process.env.NODE_ENV = "test";
      process.env.PATH = "/usr/bin";

      const configManager = new ConfigManager();
      const globalVars = configManager.getGlobalVariables();

      expect(globalVars).not.toHaveProperty("node_env");
      expect(globalVars).not.toHaveProperty("path");
    });

    it("should convert FLOW_TEST_ prefixed variables correctly", () => {
      process.env.FLOW_TEST_MAX_RETRIES = "5";
      process.env.FLOW_TEST_BASE_URL = "https://api.example.com";

      const configManager = new ConfigManager();
      const globalVars = configManager.getGlobalVariables();

      expect(globalVars.max_retries).toBe("5");
      expect(globalVars.base_url).toBe("https://api.example.com");
    });

    it("should handle empty environment variables", () => {
      process.env.FLOW_TEST_EMPTY = "";

      const configManager = new ConfigManager();
      const globalVars = configManager.getGlobalVariables();

      expect(globalVars.empty).toBe("");
    });
  });

  describe("edge cases", () => {
    it("should handle config with null values", () => {
      const configWithNulls = {
        project_name: "Test",
        globals: null,
        discovery: null,
      };
      mockYaml.load.mockReturnValue(configWithNulls);

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.globals?.variables).toEqual({});
      expect(config.discovery?.patterns).toEqual([
        "**/*.test.yml",
        "**/*.test.yaml",
      ]);
    });

    it("should handle partial configuration objects", () => {
      const partialConfig = {
        project_name: "Test",
        globals: { variables: { key: "value" } },
        execution: { mode: "parallel" },
      };
      mockYaml.load.mockReturnValue(partialConfig);

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.globals?.timeouts?.default).toBe(30000);
      expect(config.execution?.max_parallel).toBe(5);
      expect(config.reporting?.formats).toEqual(["json"]);
    });

    it("should handle boolean false values correctly", () => {
      const configWithFalse = {
        project_name: "Test",
        discovery: { recursive: false },
        priorities: { fail_fast_on_required: false },
        execution: { continue_on_failure: false },
        reporting: { aggregate: false },
      };
      mockYaml.load.mockReturnValue(configWithFalse);

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.discovery?.recursive).toBe(false);
      expect(config.priorities?.fail_fast_on_required).toBe(false);
      expect(config.execution?.continue_on_failure).toBe(false);
      expect(config.reporting?.aggregate).toBe(false);
    });

    it("should accept json reporting format", () => {
      const configWithJson = {
        project_name: "Test",
        reporting: { formats: ["json"] },
      };
      mockYaml.load.mockReturnValue(configWithJson);

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.reporting?.formats).toEqual(["json"]);
    });

    it("should accept html reporting format", () => {
      const configWithHtml = {
        project_name: "Test",
        reporting: { formats: ["html"] },
      };
      mockYaml.load.mockReturnValue(configWithHtml);

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.reporting?.formats).toEqual(["html"]);
    });

    it("should accept qa reporting format", () => {
      const configWithQa = {
        project_name: "Test",
        reporting: { formats: ["qa"] },
      };
      mockYaml.load.mockReturnValue(configWithQa);

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.reporting?.formats).toEqual(["qa"]);
    });

    it("should reject unsupported reporting formats", () => {
      const configWithInvalidFormat = {
        project_name: "Test",
        reporting: { formats: ["pdf"] },
      };
      mockYaml.load.mockReturnValue(configWithInvalidFormat);

      expect(() => new ConfigManager()).toThrow(
        "Invalid reporting formats: pdf"
      );
    });

    it("should handle all valid execution modes", () => {
      // Test sequential
      const sequentialConfig = {
        project_name: "Test",
        execution: { mode: "sequential" },
      };
      mockYaml.load.mockReturnValue(sequentialConfig);
      let configManager = new ConfigManager();
      expect(configManager.getConfig().execution?.mode).toBe("sequential");

      // Test parallel
      const parallelConfig = {
        project_name: "Test",
        execution: { mode: "parallel" },
      };
      mockYaml.load.mockReturnValue(parallelConfig);
      configManager = new ConfigManager();
      expect(configManager.getConfig().execution?.mode).toBe("parallel");
    });
  });
});
