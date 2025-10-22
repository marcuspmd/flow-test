/**
 * @fileoverview Tests for PFX certificate loader strategy
 */

import * as https from "https";
import { PfxCertificateLoader } from "../pfx-loader.strategy";
import { CertificateLoaderContext } from "../certificate-loader.interface";
import { PfxCertificateConfig } from "../../../../types/certificate.types";

// Mock helpers
jest.mock("../../helpers/path.helper");
jest.mock("../../helpers/ssl-config.helper");

import { readFileBuffer } from "../../helpers/path.helper";
import { applySSLConfig } from "../../helpers/ssl-config.helper";

describe("PfxCertificateLoader", () => {
  let loader: PfxCertificateLoader;
  let mockLogger: any;

  const mockReadFileBuffer = readFileBuffer as jest.MockedFunction<
    typeof readFileBuffer
  >;
  const mockApplySSLConfig = applySSLConfig as jest.MockedFunction<
    typeof applySSLConfig
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    loader = new PfxCertificateLoader();
    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  describe("name", () => {
    it("should have correct strategy name", () => {
      expect(loader.name).toBe("PfxCertificateLoader");
    });
  });

  describe("canHandle", () => {
    it("should handle PFX certificate config", () => {
      const config: PfxCertificateConfig = {
        pfx_path: "./cert.pfx",
      };

      expect(loader.canHandle(config)).toBe(true);
    });

    it("should handle P12 certificate config", () => {
      const config: PfxCertificateConfig = {
        pfx_path: "./cert.p12",
      };

      expect(loader.canHandle(config)).toBe(true);
    });

    it("should not handle PEM certificate config", () => {
      const config = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };

      expect(loader.canHandle(config)).toBe(false);
    });

    it("should not handle config without pfx_path", () => {
      const config = {
        passphrase: "secret",
      };

      expect(loader.canHandle(config)).toBe(false);
    });

    it("should not handle empty config", () => {
      expect(loader.canHandle({})).toBe(false);
    });
  });

  describe("load", () => {
    it("should load PFX certificate successfully", () => {
      const config: PfxCertificateConfig = {
        pfx_path: "./cert.pfx",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
        logger: mockLogger,
      };

      const mockPfxBuffer = Buffer.from("pfx data");
      mockReadFileBuffer.mockReturnValue(mockPfxBuffer);

      const result = loader.load(context);

      expect(result.pfx).toBe(mockPfxBuffer);
      expect(mockReadFileBuffer).toHaveBeenCalledWith("./cert.pfx", "/base");
      expect(mockApplySSLConfig).toHaveBeenCalledWith(
        config,
        expect.any(Object),
        "/base",
        mockLogger
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Loaded PFX certificate")
      );
    });

    it("should load PFX certificate with passphrase", () => {
      const config: PfxCertificateConfig = {
        pfx_path: "./cert.pfx",
        passphrase: "secret123",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
        logger: mockLogger,
      };

      mockReadFileBuffer.mockReturnValue(Buffer.from("pfx data"));

      const result = loader.load(context);

      expect(result.pfx).toBeDefined();
      expect(mockApplySSLConfig).toHaveBeenCalled();
    });

    it("should throw error for invalid config", () => {
      const config = { cert_path: "./cert.pem", key_path: "./key.pem" };
      const context: CertificateLoaderContext = {
        config: config as any,
        baseDir: "/base",
        logger: mockLogger,
      };

      expect(() => loader.load(context)).toThrow(
        "Invalid PFX certificate configuration"
      );
    });

    it("should throw error when pfx file cannot be read", () => {
      const config: PfxCertificateConfig = {
        pfx_path: "./cert.pfx",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
        logger: mockLogger,
      };

      mockReadFileBuffer.mockImplementation(() => {
        throw new Error("File not found");
      });

      expect(() => loader.load(context)).toThrow("File not found");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to load PFX certificate",
        expect.any(Object)
      );
    });

    it("should work without logger", () => {
      const config: PfxCertificateConfig = {
        pfx_path: "./cert.pfx",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
      };

      mockReadFileBuffer.mockReturnValue(Buffer.from("pfx"));

      const result = loader.load(context);

      expect(result.pfx).toBeDefined();
    });

    it("should handle P12 file extension", () => {
      const config: PfxCertificateConfig = {
        pfx_path: "./cert.p12",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
        logger: mockLogger,
      };

      mockReadFileBuffer.mockReturnValue(Buffer.from("p12 data"));

      const result = loader.load(context);

      expect(result.pfx).toBeDefined();
      expect(mockReadFileBuffer).toHaveBeenCalledWith("./cert.p12", "/base");
    });
  });

  describe("validate", () => {
    beforeEach(() => {
      const pathHelper = require("../../helpers/path.helper");
      pathHelper.validateFilePath = jest.fn();
    });

    it("should validate PFX certificate successfully", () => {
      const config: PfxCertificateConfig = {
        pfx_path: "./cert.pfx",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
        logger: mockLogger,
      };

      const pathHelper = require("../../helpers/path.helper");
      pathHelper.validateFilePath.mockReturnValue(null);

      const result = loader.validate(context);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(pathHelper.validateFilePath).toHaveBeenCalledWith(
        "./cert.pfx",
        "/base",
        "PFX"
      );
    });

    it("should return error for invalid config", () => {
      const config = { cert_path: "./cert.pem" };
      const context: CertificateLoaderContext = {
        config: config as any,
        baseDir: "/base",
        logger: mockLogger,
      };

      const result = loader.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Not a PFX certificate configuration");
    });

    it("should return error for missing PFX file", () => {
      const config: PfxCertificateConfig = {
        pfx_path: "./cert.pfx",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
        logger: mockLogger,
      };

      const pathHelper = require("../../helpers/path.helper");
      pathHelper.validateFilePath.mockReturnValue("PFX file not found");

      const result = loader.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("PFX file not found");
    });

    it("should validate CA certificate if specified", () => {
      const config: PfxCertificateConfig = {
        pfx_path: "./cert.pfx",
        ca_path: "./ca.pem",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
        logger: mockLogger,
      };

      const pathHelper = require("../../helpers/path.helper");
      pathHelper.validateFilePath.mockReturnValue(null);

      const result = loader.validate(context);

      expect(result.valid).toBe(true);
      expect(pathHelper.validateFilePath).toHaveBeenCalledTimes(2);
      expect(pathHelper.validateFilePath).toHaveBeenCalledWith(
        "./ca.pem",
        "/base",
        "CA"
      );
    });

    it("should return error for missing CA certificate", () => {
      const config: PfxCertificateConfig = {
        pfx_path: "./cert.pfx",
        ca_path: "./ca.pem",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
        logger: mockLogger,
      };

      const pathHelper = require("../../helpers/path.helper");
      pathHelper.validateFilePath.mockImplementation(
        (path: string, baseDir: string, fileType: string) => {
          if (fileType === "CA") {
            return "CA file not found";
          }
          return null;
        }
      );

      const result = loader.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("CA file not found");
    });

    it("should accumulate multiple errors", () => {
      const config: PfxCertificateConfig = {
        pfx_path: "./cert.pfx",
        ca_path: "./ca.pem",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
        logger: mockLogger,
      };

      const pathHelper = require("../../helpers/path.helper");
      pathHelper.validateFilePath.mockImplementation(
        (path: string, baseDir: string, fileType: string) => {
          return `${fileType} file not found`;
        }
      );

      const result = loader.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain("PFX file not found");
      expect(result.errors).toContain("CA file not found");
    });

    it("should validate P12 files", () => {
      const config: PfxCertificateConfig = {
        pfx_path: "./cert.p12",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
        logger: mockLogger,
      };

      const pathHelper = require("../../helpers/path.helper");
      pathHelper.validateFilePath.mockReturnValue(null);

      const result = loader.validate(context);

      expect(result.valid).toBe(true);
      expect(pathHelper.validateFilePath).toHaveBeenCalledWith(
        "./cert.p12",
        "/base",
        "PFX"
      );
    });
  });
});
