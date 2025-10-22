/**
 * @fileoverview Tests for PEM certificate loader strategy
 */

import * as https from "https";
import { PemCertificateLoader } from "../pem-loader.strategy";
import { CertificateLoaderContext } from "../certificate-loader.interface";
import { PemCertificateConfig } from "../../../../types/certificate.types";

// Mock helpers
jest.mock("../../helpers/path.helper");
jest.mock("../../helpers/ssl-config.helper");

import { readFileBuffer } from "../../helpers/path.helper";
import { applySSLConfig } from "../../helpers/ssl-config.helper";

describe("PemCertificateLoader", () => {
  let loader: PemCertificateLoader;
  let mockLogger: any;

  const mockReadFileBuffer = readFileBuffer as jest.MockedFunction<
    typeof readFileBuffer
  >;
  const mockApplySSLConfig = applySSLConfig as jest.MockedFunction<
    typeof applySSLConfig
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    loader = new PemCertificateLoader();
    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  describe("name", () => {
    it("should have correct strategy name", () => {
      expect(loader.name).toBe("PemCertificateLoader");
    });
  });

  describe("canHandle", () => {
    it("should handle PEM certificate config", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };

      expect(loader.canHandle(config)).toBe(true);
    });

    it("should not handle PFX certificate config", () => {
      const config = {
        pfx_path: "./cert.pfx",
      };

      expect(loader.canHandle(config)).toBe(false);
    });

    it("should not handle config without cert_path", () => {
      const config = {
        key_path: "./key.pem",
      };

      expect(loader.canHandle(config)).toBe(false);
    });

    it("should not handle config without key_path", () => {
      const config = {
        cert_path: "./cert.pem",
      };

      expect(loader.canHandle(config)).toBe(false);
    });

    it("should not handle empty config", () => {
      expect(loader.canHandle({})).toBe(false);
    });
  });

  describe("load", () => {
    it("should load PEM certificate successfully", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
        logger: mockLogger,
      };

      const mockCertBuffer = Buffer.from("cert data");
      const mockKeyBuffer = Buffer.from("key data");

      mockReadFileBuffer
        .mockReturnValueOnce(mockCertBuffer)
        .mockReturnValueOnce(mockKeyBuffer);

      const result = loader.load(context);

      expect(result.cert).toBe(mockCertBuffer);
      expect(result.key).toBe(mockKeyBuffer);
      expect(mockReadFileBuffer).toHaveBeenCalledTimes(2);
      expect(mockReadFileBuffer).toHaveBeenCalledWith("./cert.pem", "/base");
      expect(mockReadFileBuffer).toHaveBeenCalledWith("./key.pem", "/base");
      expect(mockApplySSLConfig).toHaveBeenCalledWith(
        config,
        expect.any(Object),
        "/base",
        mockLogger
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Loaded PEM certificate")
      );
    });

    it("should throw error for invalid config", () => {
      const config = { pfx_path: "./cert.pfx" };
      const context: CertificateLoaderContext = {
        config: config as any,
        baseDir: "/base",
        logger: mockLogger,
      };

      expect(() => loader.load(context)).toThrow(
        "Invalid PEM certificate configuration"
      );
    });

    it("should throw error when cert file cannot be read", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
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
        "Failed to load PEM certificate",
        expect.any(Object)
      );
    });

    it("should work without logger", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
      };

      mockReadFileBuffer
        .mockReturnValueOnce(Buffer.from("cert"))
        .mockReturnValueOnce(Buffer.from("key"));

      const result = loader.load(context);

      expect(result.cert).toBeDefined();
      expect(result.key).toBeDefined();
    });
  });

  describe("validate", () => {
    beforeEach(() => {
      // Mock validateFilePath from path.helper
      const pathHelper = require("../../helpers/path.helper");
      pathHelper.validateFilePath = jest.fn();
    });

    it("should validate PEM certificate successfully", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
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
      expect(pathHelper.validateFilePath).toHaveBeenCalledTimes(2);
    });

    it("should return error for invalid config", () => {
      const config = { pfx_path: "./cert.pfx" };
      const context: CertificateLoaderContext = {
        config: config as any,
        baseDir: "/base",
        logger: mockLogger,
      };

      const result = loader.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Not a PEM certificate configuration");
    });

    it("should return errors for missing certificate file", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
        logger: mockLogger,
      };

      const pathHelper = require("../../helpers/path.helper");
      pathHelper.validateFilePath.mockImplementation(
        (path: string, baseDir: string, fileType: string) => {
          if (fileType === "Certificate") {
            return "Certificate file not found";
          }
          return null;
        }
      );

      const result = loader.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Certificate file not found");
    });

    it("should return errors for missing key file", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };
      const context: CertificateLoaderContext = {
        config,
        baseDir: "/base",
        logger: mockLogger,
      };

      const pathHelper = require("../../helpers/path.helper");
      pathHelper.validateFilePath.mockImplementation(
        (path: string, baseDir: string, fileType: string) => {
          if (fileType === "Key") {
            return "Key file not found";
          }
          return null;
        }
      );

      const result = loader.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Key file not found");
    });

    it("should validate CA certificate if specified", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
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
      expect(pathHelper.validateFilePath).toHaveBeenCalledTimes(3);
      expect(pathHelper.validateFilePath).toHaveBeenCalledWith(
        "./ca.pem",
        "/base",
        "CA"
      );
    });

    it("should return error for missing CA certificate", () => {
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
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
      const config: PemCertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
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
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain("Certificate file not found");
      expect(result.errors).toContain("Key file not found");
      expect(result.errors).toContain("CA file not found");
    });
  });
});
