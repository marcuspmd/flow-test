/**
 * @fileoverview Unit tests for Dependency Injection container.
 *
 * @remarks
 * Tests the DI container configuration, service bindings, and resolution.
 */

import "reflect-metadata";
import { Container } from "inversify";
import { createContainer } from "../container";
import { TYPES } from "../identifiers";
import { ILogger } from "../../interfaces/services/ILogger";
import { IConfigManager } from "../../interfaces/services/IConfigManager";
import { IGlobalRegistryService } from "../../interfaces/services/IGlobalRegistryService";
import { ICertificateService } from "../../interfaces/services/ICertificateService";
import { IHttpService } from "../../interfaces/services/IHttpService";
import { IVariableService } from "../../interfaces/services/IVariableService";
import { IAssertionService } from "../../interfaces/services/IAssertionService";
import { ICaptureService } from "../../interfaces/services/ICaptureService";
import { LoggerService } from "../../services/logger.service";

describe("DI Container", () => {
  let container: Container;

  beforeEach(() => {
    // Create fresh container for each test
    container = createContainer();
  });

  afterEach(() => {
    // Clean up
    if (container.isBound(TYPES.ILogger)) {
      container.unbind(TYPES.ILogger);
    }
  });

  describe("Container Creation", () => {
    it("should create a container instance", () => {
      expect(container).toBeDefined();
      expect(container).toBeInstanceOf(Container);
    });
  });

  describe("Logger Service Binding", () => {
    it("should bind ILogger to LoggerService", () => {
      expect(container.isBound(TYPES.ILogger)).toBe(true);
    });

    it("should resolve ILogger to LoggerService instance", () => {
      const logger = container.get<ILogger>(TYPES.ILogger);

      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(LoggerService);
    });

    it("should resolve same instance for singleton scope (ILogger)", () => {
      const logger1 = container.get<ILogger>(TYPES.ILogger);
      const logger2 = container.get<ILogger>(TYPES.ILogger);

      expect(logger1).toBe(logger2);
    });

    it("should have all required ILogger methods", () => {
      const logger = container.get<ILogger>(TYPES.ILogger);

      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.setLogLevel).toBe("function");
      expect(typeof logger.getLogLevel).toBe("function");
    });
  });

  describe("Logger Functionality", () => {
    it("should log messages without errors", () => {
      const logger = container.get<ILogger>(TYPES.ILogger);

      // Should not throw
      expect(() => {
        logger.debug("Debug message");
        logger.info("Info message");
        logger.warn("Warning message");
        logger.error("Error message");
      }).not.toThrow();
    });

    it("should set and get log level", () => {
      const logger = container.get<ILogger>(TYPES.ILogger);

      logger.setLogLevel("debug");
      expect(logger.getLogLevel()).toBeTruthy();

      logger.setLogLevel("info");
      expect(logger.getLogLevel()).toBeTruthy();
    });
  });

  describe("Container Isolation", () => {
    it("should create independent containers", () => {
      const container1 = createContainer();
      const container2 = createContainer();

      const logger1 = container1.get<ILogger>(TYPES.ILogger);
      const logger2 = container2.get<ILogger>(TYPES.ILogger);

      // Different containers = different instances
      expect(logger1).not.toBe(logger2);
    });

    it("should allow rebinding in new container", () => {
      const testContainer = createContainer();

      // Unbind existing
      testContainer.unbind(TYPES.ILogger);

      // Rebind to mock
      const mockLogger: ILogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        setLogLevel: jest.fn(),
        getLogLevel: jest.fn(() => "info"),
      };

      testContainer.bind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);

      const resolved = testContainer.get<ILogger>(TYPES.ILogger);
      expect(resolved).toBe(mockLogger);
    });
  });

  describe("Error Handling", () => {
    it("should throw error when resolving unbound service", () => {
      const testContainer = new Container();

      expect(() => {
        testContainer.get(Symbol.for("NonExistentService"));
      }).toThrow();
    });
  });

  describe("ConfigManager Service Binding", () => {
    it("should resolve IConfigManager from container", () => {
      const configManager = container.get<IConfigManager>(TYPES.IConfigManager);

      expect(configManager).toBeDefined();
      expect(configManager).toHaveProperty("getConfig");
      expect(configManager).toHaveProperty("getGlobalVariables");
      expect(configManager).toHaveProperty("isStrategyPatternEnabled");
      expect(configManager).toHaveProperty("getRuntimeFilters");
      expect(configManager).toHaveProperty("reload");
      expect(configManager).toHaveProperty("saveDebugConfig");
    });

    it("should return same ConfigManager instance (singleton)", () => {
      const instance1 = container.get<IConfigManager>(TYPES.IConfigManager);
      const instance2 = container.get<IConfigManager>(TYPES.IConfigManager);

      expect(instance1).toBe(instance2);
    });

    it("should have getConfig method that returns EngineConfig", () => {
      const configManager = container.get<IConfigManager>(TYPES.IConfigManager);
      const config = configManager.getConfig();

      expect(config).toBeDefined();
      expect(config).toHaveProperty("project_name");
      expect(config).toHaveProperty("test_directory");
    });

    it("should have getGlobalVariables method", () => {
      const configManager = container.get<IConfigManager>(TYPES.IConfigManager);
      const globalVars = configManager.getGlobalVariables();

      expect(globalVars).toBeDefined();
      expect(typeof globalVars).toBe("object");
    });

    it("should have isStrategyPatternEnabled method", () => {
      const configManager = container.get<IConfigManager>(TYPES.IConfigManager);
      const isEnabled = configManager.isStrategyPatternEnabled();

      expect(typeof isEnabled).toBe("boolean");
    });
  });

  describe("GlobalRegistryService Binding", () => {
    it("should resolve IGlobalRegistryService from container", () => {
      const registry = container.get<IGlobalRegistryService>(
        TYPES.IGlobalRegistryService
      );

      expect(registry).toBeDefined();
      expect(registry).toHaveProperty("registerNode");
      expect(registry).toHaveProperty("setExportedVariable");
      expect(registry).toHaveProperty("getExportedVariable");
      expect(registry).toHaveProperty("getAllExportedVariables");
      expect(registry).toHaveProperty("getStats");
      expect(registry).toHaveProperty("validateIntegrity");
    });

    it("should return same GlobalRegistryService instance (singleton)", () => {
      const instance1 = container.get<IGlobalRegistryService>(
        TYPES.IGlobalRegistryService
      );
      const instance2 = container.get<IGlobalRegistryService>(
        TYPES.IGlobalRegistryService
      );

      expect(instance1).toBe(instance2);
    });

    it("should allow registering nodes", () => {
      const registry = container.get<IGlobalRegistryService>(
        TYPES.IGlobalRegistryService
      );

      expect(() => {
        registry.registerNode(
          "test-node",
          "Test Suite",
          ["var1", "var2"],
          "./test.yaml"
        );
      }).not.toThrow();
    });

    it("should allow setting and getting exported variables", () => {
      const registry = container.get<IGlobalRegistryService>(
        TYPES.IGlobalRegistryService
      );

      registry.registerNode("auth", "Auth Suite", ["token"], "./auth.yaml");
      registry.setExportedVariable("auth", "token", "abc123");

      const value = registry.getExportedVariable("auth.token");
      expect(value).toBe("abc123");
    });

    it("should have getStats method", () => {
      const registry = container.get<IGlobalRegistryService>(
        TYPES.IGlobalRegistryService
      );
      const stats = registry.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.total_nodes).toBe("number");
      expect(typeof stats.total_exported_variables).toBe("number");
    });

    it("should validate registry integrity", () => {
      const registry = container.get<IGlobalRegistryService>(
        TYPES.IGlobalRegistryService
      );
      const validation = registry.validateIntegrity();

      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe("boolean");
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  describe("CertificateService Binding", () => {
    it("should resolve ICertificateService from container", () => {
      const certService = container.get<ICertificateService>(
        TYPES.ICertificateService
      );

      expect(certService).toBeDefined();
      expect(certService).toHaveProperty("getGlobalCertificates");
      expect(certService).toHaveProperty("applyCertificate");
      expect(certService).toHaveProperty("validateCertificate");
      expect(certService).toHaveProperty("getCertificateCount");
    });

    it("should return same CertificateService instance (singleton)", () => {
      const instance1 = container.get<ICertificateService>(
        TYPES.ICertificateService
      );
      const instance2 = container.get<ICertificateService>(
        TYPES.ICertificateService
      );

      expect(instance1).toBe(instance2);
    });

    it("should have getGlobalCertificates method", () => {
      const certService = container.get<ICertificateService>(
        TYPES.ICertificateService
      );
      const certs = certService.getGlobalCertificates();

      expect(Array.isArray(certs)).toBe(true);
    });

    it("should have getCertificateCount method", () => {
      const certService = container.get<ICertificateService>(
        TYPES.ICertificateService
      );
      const count = certService.getCertificateCount();

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should have applyCertificate method that does not throw", () => {
      const certService = container.get<ICertificateService>(
        TYPES.ICertificateService
      );
      const axiosConfig = { method: "GET" };

      expect(() => {
        certService.applyCertificate(axiosConfig, undefined, undefined);
      }).not.toThrow();
    });

    it("should have validateCertificate method", async () => {
      const certService = container.get<ICertificateService>(
        TYPES.ICertificateService
      );

      // Test with invalid config (should return validation errors)
      const result = await certService.validateCertificate({
        cert_path: "/nonexistent/cert.pem",
        key_path: "/nonexistent/key.pem",
      });

      expect(result).toBeDefined();
      expect(typeof result.valid).toBe("boolean");
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe("HttpService Binding", () => {
    it("should resolve IHttpService from container", () => {
      const httpService = container.get<IHttpService>(TYPES.IHttpService);

      expect(httpService).toBeDefined();
      expect(httpService).toHaveProperty("executeRequest");
      expect(httpService).toHaveProperty("setBaseUrl");
      expect(httpService).toHaveProperty("setTimeout");
      expect(httpService).toHaveProperty("constructUrl");
    });

    it("should return different HttpService instances (transient)", () => {
      const instance1 = container.get<IHttpService>(TYPES.IHttpService);
      const instance2 = container.get<IHttpService>(TYPES.IHttpService);

      // Transient scope = different instances
      expect(instance1).not.toBe(instance2);
    });

    it("should have executeRequest method", async () => {
      const httpService = container.get<IHttpService>(TYPES.IHttpService);

      // This will fail because no server is running, but method should exist
      expect(typeof httpService.executeRequest).toBe("function");
    });

    it("should have setBaseUrl method", () => {
      const httpService = container.get<IHttpService>(TYPES.IHttpService);

      expect(() => {
        httpService.setBaseUrl("https://api.example.com");
      }).not.toThrow();
    });

    it("should have setTimeout method", () => {
      const httpService = container.get<IHttpService>(TYPES.IHttpService);

      expect(() => {
        httpService.setTimeout(30000);
      }).not.toThrow();
    });

    it("should have constructUrl method", () => {
      const httpService = container.get<IHttpService>(TYPES.IHttpService);

      const url = httpService.constructUrl("/users");
      expect(typeof url).toBe("string");
    });
  });

  describe("VariableService Binding", () => {
    it("should resolve IVariableService from container", () => {
      const variableService = container.get<IVariableService>(
        TYPES.IVariableService
      );

      expect(variableService).toBeDefined();
      expect(variableService).toHaveProperty("interpolate");
      expect(variableService).toHaveProperty("setVariables");
      expect(variableService).toHaveProperty("getVariable");
      expect(variableService).toHaveProperty("getAllVariables");
    });

    it("should return different VariableService instances (transient)", () => {
      const instance1 = container.get<IVariableService>(TYPES.IVariableService);
      const instance2 = container.get<IVariableService>(TYPES.IVariableService);

      // Transient scope = different instances
      expect(instance1).not.toBe(instance2);
    });

    it("should have interpolate method that works", () => {
      const variableService = container.get<IVariableService>(
        TYPES.IVariableService
      );

      // Set a variable
      variableService.setRuntimeVariable("test_var", "hello");

      // Interpolate it
      const result = variableService.interpolate("{{test_var}} world");
      expect(result).toBe("hello world");
    });

    it("should have setVariables method", () => {
      const variableService = container.get<IVariableService>(
        TYPES.IVariableService
      );

      expect(() => {
        variableService.setVariables({ var1: "value1", var2: 123 });
      }).not.toThrow();
    });

    it("should have getVariable method", () => {
      const variableService = container.get<IVariableService>(
        TYPES.IVariableService
      );

      variableService.setRuntimeVariable("test_key", "test_value");
      const value = variableService.getVariable("test_key");

      expect(value).toBe("test_value");
    });

    it("should have getAllVariables method", () => {
      const variableService = container.get<IVariableService>(
        TYPES.IVariableService
      );

      const vars = variableService.getAllVariables();
      expect(vars).toBeDefined();
      expect(typeof vars).toBe("object");
    });

    it("should have hasVariable method", () => {
      const variableService = container.get<IVariableService>(
        TYPES.IVariableService
      );

      variableService.setRuntimeVariable("exists", "yes");

      expect(variableService.hasVariable("exists")).toBe(true);
      expect(variableService.hasVariable("not_exists")).toBe(false);
    });

    it("should have clearCache method", () => {
      const variableService = container.get<IVariableService>(
        TYPES.IVariableService
      );

      expect(() => {
        variableService.clearCache();
      }).not.toThrow();
    });
  });

  describe("AssertionService Binding", () => {
    it("should resolve IAssertionService from container", () => {
      const assertionService = container.get<IAssertionService>(
        TYPES.IAssertionService
      );

      expect(assertionService).toBeDefined();
      expect(assertionService).toHaveProperty("validateAssertions");
    });

    it("should return different AssertionService instances (transient)", () => {
      const instance1 = container.get<IAssertionService>(
        TYPES.IAssertionService
      );
      const instance2 = container.get<IAssertionService>(
        TYPES.IAssertionService
      );

      // Transient scope = different instances
      expect(instance1).not.toBe(instance2);
    });

    it("should have validateAssertions method that works", () => {
      const assertionService = container.get<IAssertionService>(
        TYPES.IAssertionService
      );

      const mockResult = {
        success: true,
        response_details: {
          status_code: 200,
          headers: { "content-type": "application/json" },
          body: { success: true, data: { id: 1 } },
        },
      };

      const results = assertionService.validateAssertions(
        {
          status_code: 200,
        } as any,
        mockResult as any
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      // Just check that it returns results, not all must pass
      expect(results[0].passed).toBeDefined();
    });

    it("should validate status code assertions", () => {
      const assertionService = container.get<IAssertionService>(
        TYPES.IAssertionService
      );

      const mockResult = {
        success: true,
        response_details: {
          status_code: 200,
          headers: {},
          body: {},
        },
      };

      const results = assertionService.validateAssertions(
        { status_code: 200 },
        mockResult as any
      );

      expect(results).toBeDefined();
      expect(results[0].passed).toBe(true);
    });

    it("should detect failed assertions", () => {
      const assertionService = container.get<IAssertionService>(
        TYPES.IAssertionService
      );

      const mockResult = {
        success: true,
        response_details: {
          status_code: 404,
          headers: {},
          body: {},
        },
      };

      const results = assertionService.validateAssertions(
        { status_code: 200 },
        mockResult as any
      );

      expect(results).toBeDefined();
      expect(results[0].passed).toBe(false);
    });

    it("should handle missing response gracefully", () => {
      const assertionService = container.get<IAssertionService>(
        TYPES.IAssertionService
      );

      const mockResult = {
        success: false,
        response_details: undefined,
      };

      const results = assertionService.validateAssertions(
        { status_code: 200 },
        mockResult as any
      );

      expect(results).toBeDefined();
      expect(results[0].passed).toBe(false);
      expect(results[0].message).toContain("Response not available");
    });
  });

  describe("CaptureService Binding", () => {
    it("should resolve ICaptureService from container", () => {
      const captureService = container.get<ICaptureService>(
        TYPES.ICaptureService
      );

      expect(captureService).toBeDefined();
      expect(captureService).toHaveProperty("captureVariables");
      expect(captureService).toHaveProperty("captureFromObject");
    });

    it("should return different CaptureService instances (transient scope)", () => {
      const instance1 = container.get<ICaptureService>(TYPES.ICaptureService);
      const instance2 = container.get<ICaptureService>(TYPES.ICaptureService);

      expect(instance1).not.toBe(instance2);
    });

    it("should capture data from response", () => {
      const captureService = container.get<ICaptureService>(
        TYPES.ICaptureService
      );

      const mockResult = {
        success: true,
        response_details: {
          status_code: 200,
          headers: { "content-type": "application/json" },
          body: {
            user: { id: 123, name: "John" },
            token: "abc123",
          },
        },
      };

      const captured = captureService.captureVariables(
        {
          user_id: "body.user.id",
          token: "body.token",
        },
        mockResult as any
      );

      expect(captured).toBeDefined();
      expect(captured.user_id).toBe(123);
      expect(captured.token).toBe("abc123");
    });

    it("should capture from custom object", () => {
      const captureService = container.get<ICaptureService>(
        TYPES.ICaptureService
      );

      const source = {
        data: { items: [1, 2, 3], total: 3 },
        status: "success",
      };

      const captured = captureService.captureFromObject(
        {
          items: "data.items",
          total: "data.total",
        },
        source
      );

      expect(captured).toBeDefined();
      expect(captured.items).toEqual([1, 2, 3]);
      expect(captured.total).toBe(3);
    });

    it("should handle JMESPath expressions", () => {
      const captureService = container.get<ICaptureService>(
        TYPES.ICaptureService
      );

      const source = {
        users: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
      };

      const captured = captureService.captureFromObject(
        {
          first_user: "users[0].name",
          all_ids: "users[*].id",
        },
        source
      );

      expect(captured).toBeDefined();
      expect(captured.first_user).toBe("Alice");
      expect(captured.all_ids).toEqual([1, 2]);
    });

    it("should handle missing data gracefully", () => {
      const captureService = container.get<ICaptureService>(
        TYPES.ICaptureService
      );

      const mockResult = {
        success: false,
        response_details: undefined,
      };

      const captured = captureService.captureVariables(
        { user_id: "body.user.id" },
        mockResult as any
      );

      expect(captured).toBeDefined();
      expect(captured.user_id).toBeUndefined();
    });
  });
});
