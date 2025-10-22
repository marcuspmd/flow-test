/**
 * @fileoverview Tests for LoaderRegistry and factory function
 */

import * as https from "https";
import {
  LoaderRegistry,
  getDefaultLoaders,
  PemCertificateLoader,
  PfxCertificateLoader,
  CertificateLoader,
  CertificateLoaderContext,
} from "../index";
import {
  PemCertificateConfig,
  PfxCertificateConfig,
} from "../../../../types/certificate.types";

// Mock the loader strategies
jest.mock("../pem-loader.strategy");
jest.mock("../pfx-loader.strategy");

describe("LoaderRegistry", () => {
  let registry: LoaderRegistry;
  let mockPemLoader: jest.Mocked<CertificateLoader>;
  let mockPfxLoader: jest.Mocked<CertificateLoader>;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = new LoaderRegistry();

    mockPemLoader = {
      name: "MockPemLoader",
      canHandle: jest.fn(),
      load: jest.fn(),
      validate: jest.fn(),
    };

    mockPfxLoader = {
      name: "MockPfxLoader",
      canHandle: jest.fn(),
      load: jest.fn(),
      validate: jest.fn(),
    };
  });

  describe("register", () => {
    it("should register a loader", () => {
      registry.register(mockPemLoader);

      expect(registry.count()).toBe(1);
    });

    it("should register multiple loaders", () => {
      registry.register(mockPemLoader);
      registry.register(mockPfxLoader);

      expect(registry.count()).toBe(2);
    });

    it("should allow registering same loader multiple times", () => {
      registry.register(mockPemLoader);
      registry.register(mockPemLoader);

      expect(registry.count()).toBe(2);
    });
  });

  describe("findLoader", () => {
    beforeEach(() => {
      registry.register(mockPemLoader);
      registry.register(mockPfxLoader);
    });

    it("should find loader that can handle config", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };

      mockPemLoader.canHandle.mockReturnValue(true);
      mockPfxLoader.canHandle.mockReturnValue(false);

      const result = registry.findLoader(config);

      expect(result).toBe(mockPemLoader);
      expect(mockPemLoader.canHandle).toHaveBeenCalledWith(config);
    });

    it("should return first matching loader", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };

      mockPemLoader.canHandle.mockReturnValue(true);
      mockPfxLoader.canHandle.mockReturnValue(true);

      const result = registry.findLoader(config);

      expect(result).toBe(mockPemLoader);
    });

    it("should return undefined when no loader can handle config", () => {
      const config = { unknown_format: true };

      mockPemLoader.canHandle.mockReturnValue(false);
      mockPfxLoader.canHandle.mockReturnValue(false);

      const result = registry.findLoader(config as any);

      expect(result).toBeUndefined();
    });

    it("should work with empty registry", () => {
      const emptyRegistry = new LoaderRegistry();
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };

      const result = emptyRegistry.findLoader(config);

      expect(result).toBeUndefined();
    });
  });

  describe("getAllLoaders", () => {
    it("should return all registered loaders", () => {
      registry.register(mockPemLoader);
      registry.register(mockPfxLoader);

      const loaders = registry.getAllLoaders();

      expect(loaders).toHaveLength(2);
      expect(loaders).toContain(mockPemLoader);
      expect(loaders).toContain(mockPfxLoader);
    });

    it("should return empty array for empty registry", () => {
      const loaders = registry.getAllLoaders();

      expect(loaders).toEqual([]);
    });

    it("should return a copy of loaders array", () => {
      registry.register(mockPemLoader);

      const loaders1 = registry.getAllLoaders();
      const loaders2 = registry.getAllLoaders();

      expect(loaders1).not.toBe(loaders2);
      expect(loaders1).toEqual(loaders2);
    });
  });

  describe("load", () => {
    beforeEach(() => {
      registry.register(mockPemLoader);
      registry.register(mockPfxLoader);
    });

    it("should load certificate using appropriate loader", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
      };
      const mockAgentOptions: https.AgentOptions = {
        cert: Buffer.from("cert"),
        key: Buffer.from("key"),
      };

      mockPemLoader.canHandle.mockReturnValue(true);
      mockPemLoader.load.mockReturnValue(mockAgentOptions);

      const result = registry.load(context);

      expect(result).toBe(mockAgentOptions);
      expect(mockPemLoader.load).toHaveBeenCalledWith(context);
    });

    it("should throw error when no loader found", () => {
      const config = { unknown_format: true };
      const context: CertificateLoaderContext = {
        config: config as any,
        baseDir: "/base",
      };

      mockPemLoader.canHandle.mockReturnValue(false);
      mockPfxLoader.canHandle.mockReturnValue(false);

      expect(() => registry.load(context)).toThrow(
        "No certificate loader found"
      );
    });

    it("should propagate loader errors", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
      };

      mockPemLoader.canHandle.mockReturnValue(true);
      mockPemLoader.load.mockImplementation(() => {
        throw new Error("File not found");
      });

      expect(() => registry.load(context)).toThrow("File not found");
    });
  });

  describe("validate", () => {
    beforeEach(() => {
      registry.register(mockPemLoader);
      registry.register(mockPfxLoader);
    });

    it("should validate certificate using appropriate loader", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
      };
      const mockValidationResult = {
        valid: true,
        errors: [],
      };

      mockPemLoader.canHandle.mockReturnValue(true);
      mockPemLoader.validate.mockReturnValue(mockValidationResult);

      const result = registry.validate(context);

      expect(result).toBe(mockValidationResult);
      expect(mockPemLoader.validate).toHaveBeenCalledWith(context);
    });

    it("should return error when no loader found", () => {
      const config = { unknown_format: true };
      const context: CertificateLoaderContext = {
        config: config as any,
        baseDir: "/base",
      };

      mockPemLoader.canHandle.mockReturnValue(false);
      mockPfxLoader.canHandle.mockReturnValue(false);

      const result = registry.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "No certificate loader found for the given configuration"
      );
    });

    it("should return validation errors from loader", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
      };
      const mockValidationResult = {
        valid: false,
        errors: ["Certificate file not found", "Key file not found"],
      };

      mockPemLoader.canHandle.mockReturnValue(true);
      mockPemLoader.validate.mockReturnValue(mockValidationResult);

      const result = registry.validate(context);

      expect(result).toBe(mockValidationResult);
    });
  });

  describe("clear", () => {
    it("should remove all registered loaders", () => {
      registry.register(mockPemLoader);
      registry.register(mockPfxLoader);

      expect(registry.count()).toBe(2);

      registry.clear();

      expect(registry.count()).toBe(0);
      expect(registry.getAllLoaders()).toEqual([]);
    });

    it("should work on empty registry", () => {
      expect(() => registry.clear()).not.toThrow();
      expect(registry.count()).toBe(0);
    });
  });

  describe("count", () => {
    it("should return 0 for empty registry", () => {
      expect(registry.count()).toBe(0);
    });

    it("should return correct count after registrations", () => {
      expect(registry.count()).toBe(0);

      registry.register(mockPemLoader);
      expect(registry.count()).toBe(1);

      registry.register(mockPfxLoader);
      expect(registry.count()).toBe(2);
    });

    it("should return correct count after clear", () => {
      registry.register(mockPemLoader);
      registry.register(mockPfxLoader);

      expect(registry.count()).toBe(2);

      registry.clear();

      expect(registry.count()).toBe(0);
    });
  });
});

describe("getDefaultLoaders", () => {
  it("should return registry with PEM and PFX loaders", () => {
    const registry = getDefaultLoaders();

    expect(registry).toBeInstanceOf(LoaderRegistry);
    expect(registry.count()).toBe(2);
  });

  it("should return new instance each time", () => {
    const registry1 = getDefaultLoaders();
    const registry2 = getDefaultLoaders();

    expect(registry1).not.toBe(registry2);
  });

  it("should have loaders that can handle PEM config", () => {
    const PemLoader = jest.requireActual(
      "../pem-loader.strategy"
    ).PemCertificateLoader;
    const PfxLoader = jest.requireActual(
      "../pfx-loader.strategy"
    ).PfxCertificateLoader;

    const testRegistry = new LoaderRegistry();
    testRegistry.register(new PemLoader());
    testRegistry.register(new PfxLoader());

    const config: PemCertificateConfig = {
      cert_path: "./cert.pem",
      key_path: "./key.pem",
    };

    const loader = testRegistry.findLoader(config);

    expect(loader).toBeDefined();
    expect(loader?.name).toContain("Pem");
  });

  it("should have loaders that can handle PFX config", () => {
    const PemLoader = jest.requireActual(
      "../pem-loader.strategy"
    ).PemCertificateLoader;
    const PfxLoader = jest.requireActual(
      "../pfx-loader.strategy"
    ).PfxCertificateLoader;

    const testRegistry = new LoaderRegistry();
    testRegistry.register(new PemLoader());
    testRegistry.register(new PfxLoader());

    const config: PfxCertificateConfig = {
      pfx_path: "./cert.pfx",
    };

    const loader = testRegistry.findLoader(config);

    expect(loader).toBeDefined();
    expect(loader?.name).toContain("Pfx");
  });
});
