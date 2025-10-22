/**
 * @fileoverview Tests for Strategy Pattern feature flag in ConfigManager.
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { ConfigManager } from "../config";

// Mock modules
jest.mock("fs");
jest.mock("path");
jest.mock("js-yaml");

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;

describe("ConfigManager - Strategy Pattern Feature Flag", () => {
  const mockConfigPath = "/test/flow-test.config.yml";

  const baseConfig = {
    project_name: "Test Project",
    test_directory: "./tests",
    globals: {
      variables: { test_var: "value" },
    },
  };

  beforeEach(() => {
    // Clear environment variable before each test
    delete process.env.FLOW_TEST_USE_STRATEGY_PATTERN;

    // Setup default mocks
    mockPath.resolve.mockImplementation((p) => `/absolute${p}`);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("mocked yaml content");
  });

  afterEach(() => {
    delete process.env.FLOW_TEST_USE_STRATEGY_PATTERN;
    jest.clearAllMocks();
  });

  describe("isStrategyPatternEnabled", () => {
    it("should default to false when not configured", () => {
      mockYaml.load.mockReturnValue(baseConfig);

      const configManager = new ConfigManager({ config_file: mockConfigPath });

      expect(configManager.isStrategyPatternEnabled()).toBe(false);
    });

    it("should return true when enabled in config file", () => {
      const configWithFlag = {
        ...baseConfig,
        globals: {
          ...baseConfig.globals,
          use_strategy_pattern: true,
        },
      };
      mockYaml.load.mockReturnValue(configWithFlag);

      const configManager = new ConfigManager({ config_file: mockConfigPath });

      expect(configManager.isStrategyPatternEnabled()).toBe(true);
    });

    it("should return false when explicitly disabled in config file", () => {
      const configWithFlag = {
        ...baseConfig,
        globals: {
          ...baseConfig.globals,
          use_strategy_pattern: false,
        },
      };
      mockYaml.load.mockReturnValue(configWithFlag);

      const configManager = new ConfigManager({ config_file: mockConfigPath });

      expect(configManager.isStrategyPatternEnabled()).toBe(false);
    });

    it("should prioritize environment variable over config file (env=true, config=false)", () => {
      const configWithFlag = {
        ...baseConfig,
        globals: {
          ...baseConfig.globals,
          use_strategy_pattern: false,
        },
      };
      mockYaml.load.mockReturnValue(configWithFlag);

      // Environment variable should override file setting
      process.env.FLOW_TEST_USE_STRATEGY_PATTERN = "true";

      const configManager = new ConfigManager({ config_file: mockConfigPath });

      expect(configManager.isStrategyPatternEnabled()).toBe(true);
    });

    it("should prioritize environment variable over config file (env=false, config=true)", () => {
      const configWithFlag = {
        ...baseConfig,
        globals: {
          ...baseConfig.globals,
          use_strategy_pattern: true,
        },
      };
      mockYaml.load.mockReturnValue(configWithFlag);

      // Environment variable should override file setting
      process.env.FLOW_TEST_USE_STRATEGY_PATTERN = "false";

      const configManager = new ConfigManager({ config_file: mockConfigPath });

      expect(configManager.isStrategyPatternEnabled()).toBe(false);
    });

    it("should parse various truthy environment variable values", () => {
      mockYaml.load.mockReturnValue(baseConfig);

      const truthyValues = [
        "true",
        "TRUE",
        "True",
        "1",
        "yes",
        "YES",
        "on",
        "ON",
      ];

      truthyValues.forEach((value) => {
        process.env.FLOW_TEST_USE_STRATEGY_PATTERN = value;
        const configManager = new ConfigManager({
          config_file: mockConfigPath,
        });

        expect(configManager.isStrategyPatternEnabled()).toBe(true);

        delete process.env.FLOW_TEST_USE_STRATEGY_PATTERN;
      });
    });

    it("should parse various falsy environment variable values", () => {
      mockYaml.load.mockReturnValue(baseConfig);

      const falsyValues = [
        "false",
        "FALSE",
        "False",
        "0",
        "no",
        "NO",
        "off",
        "OFF",
        "",
      ];

      falsyValues.forEach((value) => {
        process.env.FLOW_TEST_USE_STRATEGY_PATTERN = value;
        const configManager = new ConfigManager({
          config_file: mockConfigPath,
        });

        expect(configManager.isStrategyPatternEnabled()).toBe(false);

        delete process.env.FLOW_TEST_USE_STRATEGY_PATTERN;
      });
    });

    it("should handle whitespace in environment variable values", () => {
      mockYaml.load.mockReturnValue(baseConfig);

      process.env.FLOW_TEST_USE_STRATEGY_PATTERN = "  true  ";
      const configManager = new ConfigManager({ config_file: mockConfigPath });

      expect(configManager.isStrategyPatternEnabled()).toBe(true);
    });
  });

  describe("getConfig integration", () => {
    it("should include use_strategy_pattern in globals config", () => {
      const configWithFlag = {
        ...baseConfig,
        globals: {
          use_strategy_pattern: true,
          variables: {
            test_var: "value",
          },
        },
      };
      mockYaml.load.mockReturnValue(configWithFlag);

      const configManager = new ConfigManager({ config_file: mockConfigPath });
      const config = configManager.getConfig();

      expect(config.globals?.use_strategy_pattern).toBe(true);
      expect(config.globals?.variables?.test_var).toBe("value");
    });

    it("should preserve other globals when feature flag is set", () => {
      const configWithFlag = {
        ...baseConfig,
        globals: {
          use_strategy_pattern: true,
          base_url: "https://api.example.com",
          variables: {
            api_key: "test-key",
          },
          timeouts: {
            default: 5000,
            slow_tests: 10000,
          },
        },
      };
      mockYaml.load.mockReturnValue(configWithFlag);

      const configManager = new ConfigManager({ config_file: mockConfigPath });
      const config = configManager.getConfig();

      expect(config.globals?.use_strategy_pattern).toBe(true);
      expect(config.globals?.base_url).toBe("https://api.example.com");
      expect(config.globals?.variables?.api_key).toBe("test-key");
      expect(config.globals?.timeouts?.default).toBe(5000);
      expect(config.globals?.timeouts?.slow_tests).toBe(10000);
    });

    it("should not include use_strategy_pattern when missing from config", () => {
      mockYaml.load.mockReturnValue(baseConfig);

      const configManager = new ConfigManager({ config_file: mockConfigPath });
      const config = configManager.getConfig();

      // Should default to false
      expect(config.globals?.use_strategy_pattern).toBe(false);
    });
  });
});
