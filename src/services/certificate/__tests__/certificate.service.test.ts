/**
 * @fileoverview Unit tests for CertificateService
 */

import { CertificateService } from "../certificate.service";
import * as fs from "fs";
import * as path from "path";
import { CertificateConfig } from "../../../types/certificate.types";
import { createMockLogger } from "../../../test-utils/di-test-helpers";

describe("CertificateService", () => {
  const testCertsDir = path.join(__dirname, "../../../../tests/fixtures/certs");
  const testCertPath = path.join(testCertsDir, "test.crt");
  const testKeyPath = path.join(testCertsDir, "test.key");
  const testPfxPath = path.join(testCertsDir, "test.pfx");
  const testCaPath = path.join(testCertsDir, "ca.crt");

  beforeAll(() => {
    // Create test certificates directory and mock files
    if (!fs.existsSync(testCertsDir)) {
      fs.mkdirSync(testCertsDir, { recursive: true });
    }

    // Create mock certificate files
    if (!fs.existsSync(testCertPath)) {
      fs.writeFileSync(testCertPath, "mock cert content");
    }
    if (!fs.existsSync(testKeyPath)) {
      fs.writeFileSync(testKeyPath, "mock key content");
    }
    if (!fs.existsSync(testPfxPath)) {
      fs.writeFileSync(testPfxPath, "mock pfx content");
    }
    if (!fs.existsSync(testCaPath)) {
      fs.writeFileSync(testCaPath, "mock ca content");
    }
  });

  afterAll(() => {
    // Cleanup test files
    try {
      if (fs.existsSync(testCertPath)) fs.unlinkSync(testCertPath);
      if (fs.existsSync(testKeyPath)) fs.unlinkSync(testKeyPath);
      if (fs.existsSync(testPfxPath)) fs.unlinkSync(testPfxPath);
      if (fs.existsSync(testCaPath)) fs.unlinkSync(testCaPath);
      if (fs.existsSync(testCertsDir)) fs.rmdirSync(testCertsDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("constructor", () => {
    it("should create instance without certificates", () => {
      const service = new CertificateService(createMockLogger());
      expect(service).toBeDefined();
      expect(service.getCertificateCount()).toBe(0);
    });

    it("should create instance with certificates", () => {
      const service = new CertificateService(createMockLogger());
      service.setCertificates([
        {
          name: "Test Cert",
          cert_path: "./test.crt",
          key_path: "./test.key",
        },
      ]);
      expect(service).toBeDefined();
      expect(service.getCertificateCount()).toBe(1);
    });
  });

  describe("validateCertificate", () => {
    it("should validate PEM certificate exists", async () => {
      const service = new CertificateService(createMockLogger());
      const config: CertificateConfig = {
        cert_path: "tests/fixtures/certs/test.crt",
        key_path: "tests/fixtures/certs/test.key",
      };

      const result = await service.validateCertificate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing certificate file", async () => {
      const service = new CertificateService(createMockLogger());
      const config: CertificateConfig = {
        cert_path: "./nonexistent.crt",
        key_path: "tests/fixtures/certs/test.key",
      };

      const result = await service.validateCertificate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("not found");
    });

    it("should detect missing key file", async () => {
      const service = new CertificateService(createMockLogger());
      const config: CertificateConfig = {
        cert_path: "tests/fixtures/certs/test.crt",
        key_path: "./nonexistent.key",
      };

      const result = await service.validateCertificate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should validate PFX certificate", async () => {
      const service = new CertificateService(createMockLogger());
      const config: CertificateConfig = {
        pfx_path: "tests/fixtures/certs/test.pfx",
        passphrase: "test123",
      };

      const result = await service.validateCertificate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing PFX file", async () => {
      const service = new CertificateService(createMockLogger());
      const config: CertificateConfig = {
        pfx_path: "./nonexistent.pfx",
      };

      const result = await service.validateCertificate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should validate CA certificate path", async () => {
      const service = new CertificateService(createMockLogger());
      const config: CertificateConfig = {
        cert_path: "tests/fixtures/certs/test.crt",
        key_path: "tests/fixtures/certs/test.key",
        ca_path: "tests/fixtures/certs/ca.crt",
      };

      const result = await service.validateCertificate(config);

      expect(result.valid).toBe(true);
    });

    it("should detect missing CA certificate", async () => {
      const service = new CertificateService(createMockLogger());
      const config: CertificateConfig = {
        cert_path: "tests/fixtures/certs/test.crt",
        key_path: "tests/fixtures/certs/test.key",
        ca_path: "./nonexistent-ca.crt",
      };

      const result = await service.validateCertificate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("CA file not found"))).toBe(
        true
      );
    });
  });

  describe("applyCertificate", () => {
    it("should apply request-specific certificate", () => {
      const service = new CertificateService(createMockLogger());
      const axiosConfig: any = {};
      const requestCert: CertificateConfig = {
        cert_path: "tests/fixtures/certs/test.crt",
        key_path: "tests/fixtures/certs/test.key",
      };

      service.applyCertificate(axiosConfig, requestCert);

      expect(axiosConfig.httpsAgent).toBeDefined();
    });

    it("should apply PFX certificate", () => {
      const service = new CertificateService(createMockLogger());
      const axiosConfig: any = {};
      const requestCert: CertificateConfig = {
        pfx_path: "tests/fixtures/certs/test.pfx",
        passphrase: "test123",
      };

      service.applyCertificate(axiosConfig, requestCert);

      expect(axiosConfig.httpsAgent).toBeDefined();
    });

    it("should apply global certificate by domain - exact match", () => {
      const service = new CertificateService(createMockLogger());
      service.setCertificates([
        {
          name: "Test Cert",
          cert_path: "tests/fixtures/certs/test.crt",
          key_path: "tests/fixtures/certs/test.key",
          domains: ["api.example.com"],
        },
      ]);

      const axiosConfig: any = {};
      service.applyCertificate(
        axiosConfig,
        undefined,
        "https://api.example.com/endpoint"
      );

      expect(axiosConfig.httpsAgent).toBeDefined();
    });

    it("should apply global certificate by domain - wildcard match", () => {
      const service = new CertificateService(createMockLogger());
      service.setCertificates([
        {
          name: "Wildcard Cert",
          cert_path: "tests/fixtures/certs/test.crt",
          key_path: "tests/fixtures/certs/test.key",
          domains: ["*.example.com"],
        },
      ]);

      const axiosConfig: any = {};
      service.applyCertificate(
        axiosConfig,
        undefined,
        "https://api.example.com/endpoint"
      );

      expect(axiosConfig.httpsAgent).toBeDefined();
    });

    it("should not apply certificate for non-matching domain", () => {
      const service = new CertificateService(createMockLogger());
      service.setCertificates([
        {
          name: "Specific Cert",
          cert_path: "tests/fixtures/certs/test.crt",
          key_path: "tests/fixtures/certs/test.key",
          domains: ["api.example.com"],
        },
      ]);

      const axiosConfig: any = {};
      service.applyCertificate(
        axiosConfig,
        undefined,
        "https://other.domain.com/endpoint"
      );

      expect(axiosConfig.httpsAgent).toBeUndefined();
    });

    it("should apply certificate without domain restrictions", () => {
      const service = new CertificateService(createMockLogger());
      service.setCertificates([
        {
          name: "Global Cert",
          cert_path: "tests/fixtures/certs/test.crt",
          key_path: "tests/fixtures/certs/test.key",
          // No domains specified
        },
      ]);

      const axiosConfig: any = {};
      service.applyCertificate(
        axiosConfig,
        undefined,
        "https://any.domain.com/endpoint"
      );

      expect(axiosConfig.httpsAgent).toBeDefined();
    });

    it("should prioritize request certificate over global", () => {
      const service = new CertificateService(createMockLogger());
      service.setCertificates([
        {
          name: "Global Cert",
          cert_path: "tests/fixtures/certs/test.crt",
          key_path: "tests/fixtures/certs/test.key",
          domains: ["api.example.com"],
        },
      ]);

      const axiosConfig: any = {};
      const requestCert: CertificateConfig = {
        pfx_path: "tests/fixtures/certs/test.pfx",
      };

      service.applyCertificate(
        axiosConfig,
        requestCert,
        "https://api.example.com/endpoint"
      );

      expect(axiosConfig.httpsAgent).toBeDefined();
      // Should use PFX (request) not PEM (global)
    });

    it("should handle invalid certificate gracefully", () => {
      const service = new CertificateService(createMockLogger());
      const axiosConfig: any = {};
      const invalidCert: CertificateConfig = {
        cert_path: "./invalid.crt",
        key_path: "./invalid.key",
      };

      // Should not throw, just log error
      expect(() => {
        service.applyCertificate(axiosConfig, invalidCert);
      }).not.toThrow();

      // Should not set httpsAgent if certificate loading fails
      expect(axiosConfig.httpsAgent).toBeUndefined();
    });

    it("should match multiple domain patterns", () => {
      const service = new CertificateService(createMockLogger());
      service.setCertificates([
        {
          name: "Multi-domain Cert",
          cert_path: "tests/fixtures/certs/test.crt",
          key_path: "tests/fixtures/certs/test.key",
          domains: ["*.api.com", "*.service.com", "exact.domain.com"],
        },
      ]);

      const axiosConfig1: any = {};
      service.applyCertificate(
        axiosConfig1,
        undefined,
        "https://test.api.com/v1"
      );
      expect(axiosConfig1.httpsAgent).toBeDefined();

      const axiosConfig2: any = {};
      service.applyCertificate(
        axiosConfig2,
        undefined,
        "https://prod.service.com/v2"
      );
      expect(axiosConfig2.httpsAgent).toBeDefined();

      const axiosConfig3: any = {};
      service.applyCertificate(
        axiosConfig3,
        undefined,
        "https://exact.domain.com/"
      );
      expect(axiosConfig3.httpsAgent).toBeDefined();
    });
  });

  describe("getCertificateCount", () => {
    it("should return 0 for no certificates", () => {
      const service = new CertificateService(createMockLogger());
      expect(service.getCertificateCount()).toBe(0);
    });

    it("should return correct count", () => {
      const service = new CertificateService(createMockLogger());
      service.setCertificates([
        { name: "Cert 1", cert_path: "./a.crt", key_path: "./a.key" },
        { name: "Cert 2", pfx_path: "./b.pfx" },
      ]);
      expect(service.getCertificateCount()).toBe(2);
    });
  });
});
