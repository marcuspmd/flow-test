/**
 * @fileoverview Tests for SSL configuration helper functions
 */

import * as https from "https";
import * as fs from "fs";
import {
  configureCA,
  configureSSLVerification,
  configureTLSVersion,
  configurePassphrase,
  applySSLConfig,
  SSLConfigLogger,
} from "../ssl-config.helper";
import { CertificateConfig } from "../../../../types/certificate.types";

// Mock fs and path
jest.mock("fs");
jest.mock("../path.helper", () => ({
  resolvePath: jest.fn((filePath: string) => `/resolved/${filePath}`),
  fileExists: jest.fn((filePath: string) => filePath.includes("valid")),
}));

describe("ssl-config.helper", () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  let mockLogger: SSLConfigLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = {
      warn: jest.fn(),
      debug: jest.fn(),
    };
  });

  describe("configureCA", () => {
    it("should do nothing when ca_path is not specified", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };
      const agentOptions: https.AgentOptions = {};

      configureCA(config, agentOptions);

      expect(agentOptions.ca).toBeUndefined();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("should load CA certificate when file exists", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        ca_path: "./valid-ca.pem",
      };
      const agentOptions: https.AgentOptions = {};
      const mockBuffer = Buffer.from("CA cert data");

      mockFs.readFileSync.mockReturnValue(mockBuffer);

      configureCA(config, agentOptions, process.cwd(), mockLogger);

      expect(agentOptions.ca).toBe(mockBuffer);
      expect(mockFs.readFileSync).toHaveBeenCalled();
    });

    it("should warn when CA file does not exist", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        ca_path: "./nonexistent-ca.pem", // Use nome que não contém "valid"
      };
      const agentOptions: https.AgentOptions = {};

      configureCA(config, agentOptions, process.cwd(), mockLogger);

      expect(agentOptions.ca).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("CA certificate file not found")
      );
    });

    it("should work without logger", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        ca_path: "./invalid-ca.pem",
      };
      const agentOptions: https.AgentOptions = {};

      expect(() => configureCA(config, agentOptions)).not.toThrow();
    });
  });

  describe("configureSSLVerification", () => {
    it("should enable verification by default", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };
      const agentOptions: https.AgentOptions = {};

      configureSSLVerification(config, agentOptions, mockLogger);

      expect(agentOptions.rejectUnauthorized).toBe(true);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("should disable verification when verify is false", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        verify: false,
      };
      const agentOptions: https.AgentOptions = {};

      configureSSLVerification(config, agentOptions, mockLogger);

      expect(agentOptions.rejectUnauthorized).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("SSL verification disabled")
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("INSECURE")
      );
    });

    it("should enable verification when verify is true", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        verify: true,
      };
      const agentOptions: https.AgentOptions = {};

      configureSSLVerification(config, agentOptions, mockLogger);

      expect(agentOptions.rejectUnauthorized).toBe(true);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("should work without logger", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        verify: false,
      };
      const agentOptions: https.AgentOptions = {};

      expect(() =>
        configureSSLVerification(config, agentOptions)
      ).not.toThrow();
      expect(agentOptions.rejectUnauthorized).toBe(false);
    });
  });

  describe("configureTLSVersion", () => {
    it("should do nothing when no TLS version specified", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };
      const agentOptions: https.AgentOptions = {};

      configureTLSVersion(config, agentOptions, mockLogger);

      expect(agentOptions.minVersion).toBeUndefined();
      expect(agentOptions.maxVersion).toBeUndefined();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it("should set min TLS version", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        min_version: "TLSv1.2",
      };
      const agentOptions: https.AgentOptions = {};

      configureTLSVersion(config, agentOptions, mockLogger);

      expect(agentOptions.minVersion).toBe("TLSv1.2");
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "TLS min version set to: TLSv1.2"
      );
    });

    it("should set max TLS version", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        max_version: "TLSv1.3",
      };
      const agentOptions: https.AgentOptions = {};

      configureTLSVersion(config, agentOptions, mockLogger);

      expect(agentOptions.maxVersion).toBe("TLSv1.3");
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "TLS max version set to: TLSv1.3"
      );
    });

    it("should set both min and max versions", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        min_version: "TLSv1.2",
        max_version: "TLSv1.3",
      };
      const agentOptions: https.AgentOptions = {};

      configureTLSVersion(config, agentOptions, mockLogger);

      expect(agentOptions.minVersion).toBe("TLSv1.2");
      expect(agentOptions.maxVersion).toBe("TLSv1.3");
      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    });

    it("should work without logger", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        min_version: "TLSv1.2",
      };
      const agentOptions: https.AgentOptions = {};

      expect(() => configureTLSVersion(config, agentOptions)).not.toThrow();
      expect(agentOptions.minVersion).toBe("TLSv1.2");
    });
  });

  describe("configurePassphrase", () => {
    it("should do nothing when passphrase is not specified", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };
      const agentOptions: https.AgentOptions = {};

      configurePassphrase(config, agentOptions);

      expect(agentOptions.passphrase).toBeUndefined();
    });

    it("should set passphrase when specified", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        passphrase: "secret123",
      };
      const agentOptions: https.AgentOptions = {};

      configurePassphrase(config, agentOptions);

      expect(agentOptions.passphrase).toBe("secret123");
    });

    it("should handle empty passphrase", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        passphrase: "",
      };
      const agentOptions: https.AgentOptions = {};

      configurePassphrase(config, agentOptions);

      // Empty string is falsy, so passphrase won't be set
      expect(agentOptions.passphrase).toBeUndefined();
    });
  });

  describe("applySSLConfig", () => {
    it("should apply all SSL configurations", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        ca_path: "./valid-ca.pem",
        verify: false,
        min_version: "TLSv1.2",
        max_version: "TLSv1.3",
        passphrase: "secret",
      };
      const agentOptions: https.AgentOptions = {};
      const mockBuffer = Buffer.from("CA data");

      mockFs.readFileSync.mockReturnValue(mockBuffer);

      applySSLConfig(config, agentOptions, process.cwd(), mockLogger);

      expect(agentOptions.ca).toBe(mockBuffer);
      expect(agentOptions.rejectUnauthorized).toBe(false);
      expect(agentOptions.minVersion).toBe("TLSv1.2");
      expect(agentOptions.maxVersion).toBe("TLSv1.3");
      expect(agentOptions.passphrase).toBe("secret");
      expect(mockLogger.warn).toHaveBeenCalled(); // For verify: false
      expect(mockLogger.debug).toHaveBeenCalledTimes(2); // For TLS versions
    });

    it("should work with minimal config", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
      };
      const agentOptions: https.AgentOptions = {};

      applySSLConfig(config, agentOptions, process.cwd(), mockLogger);

      expect(agentOptions.rejectUnauthorized).toBe(true);
      expect(agentOptions.ca).toBeUndefined();
      expect(agentOptions.minVersion).toBeUndefined();
      expect(agentOptions.maxVersion).toBeUndefined();
      expect(agentOptions.passphrase).toBeUndefined();
    });

    it("should work without logger", () => {
      const config: CertificateConfig = {
        cert_path: "./cert.pem",
        key_path: "./key.pem",
        verify: false,
      };
      const agentOptions: https.AgentOptions = {};

      expect(() => applySSLConfig(config, agentOptions)).not.toThrow();
      expect(agentOptions.rejectUnauthorized).toBe(false);
    });
  });
});
