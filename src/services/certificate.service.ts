/**
 * @fileoverview Service for managing SSL/TLS client certificates
 * @module services/certificate
 */

import * as fs from "fs";
import * as path from "path";
import { AxiosRequestConfig } from "axios";
import * as https from "https";
import {
  CertificateConfig,
  CertificateEntry,
  isPemCertificate,
  isPfxCertificate,
  toCertificateConfig,
} from "../types/certificate.types";
import { getLogger } from "./logger.service";

/**
 * Service for loading and managing client certificates for HTTPS requests
 *
 * @remarks
 * Supports both PEM (separate cert/key files) and PFX/P12 (bundled) formats.
 * Implements domain-based certificate matching and priority resolution.
 *
 * @example
 * ```typescript
 * const service = new CertificateService([
 *   {
 *     name: "Corporate API",
 *     cert_path: "./certs/client.crt",
 *     key_path: "./certs/client.key",
 *     domains: ["*.example.com"]
 *   }
 * ]);
 *
 * const axiosConfig = {};
 * service.applyCertificate(axiosConfig, undefined, "https://api.example.com");
 * ```
 *
 * @public
 */
export class CertificateService {
  private logger = getLogger();
  private globalCertificates: CertificateEntry[] = [];

  /**
   * Initialize with global certificates from config
   *
   * @param certificates - Array of global certificate entries
   */
  constructor(certificates?: CertificateEntry[]) {
    if (certificates) {
      this.globalCertificates = certificates;
      this.logger.info(`Loaded ${certificates.length} global certificate(s)`);
    }
  }

  /**
   * Find applicable certificate for a given URL
   *
   * @param url - Full URL to match against certificate domains
   * @returns Matching certificate entry or undefined
   *
   * @remarks
   * - If a certificate has no domains specified, it applies to all URLs
   * - Domain patterns support wildcards via regex (e.g., "*.example.com")
   * - Returns the first matching certificate found
   *
   * @internal
   */
  private findCertificateForUrl(url: string): CertificateEntry | undefined {
    for (const entry of this.globalCertificates) {
      // If no domains specified, certificate applies to all
      if (!entry.domains || entry.domains.length === 0) {
        return entry;
      }

      // Check if URL matches any domain pattern
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        for (const domainPattern of entry.domains) {
          // Convert wildcard pattern to regex
          // First escape dots, then replace * with .*
          const regexPattern = domainPattern
            .replace(/\./g, "\\.") // Escape dots first
            .replace(/\*/g, ".*"); // Then replace * with .*
          const regex = new RegExp("^" + regexPattern + "$");
          if (regex.test(hostname)) {
            this.logger.debug(
              `Certificate "${entry.name}" matched for ${hostname}`
            );
            return entry;
          }
        }
      } catch (error) {
        this.logger.warn(`Invalid URL for certificate matching: ${url}`);
      }
    }

    return undefined;
  }

  /**
   * Load certificate files and create HTTPS agent configuration
   *
   * @param config - Certificate configuration (PEM or PFX)
   * @param baseDir - Base directory for resolving relative paths
   * @returns HTTPS agent options with certificate data
   * @throws Error if certificate files are not found or invalid
   *
   * @internal
   */
  private loadCertificateConfig(
    config: CertificateConfig,
    baseDir: string = process.cwd()
  ): https.AgentOptions {
    const agentOptions: https.AgentOptions = {};

    try {
      if (isPemCertificate(config)) {
        // PEM format: separate cert and key files
        const certPath = path.resolve(baseDir, config.cert_path);
        const keyPath = path.resolve(baseDir, config.key_path);

        if (!fs.existsSync(certPath)) {
          throw new Error(`Certificate file not found: ${certPath}`);
        }
        if (!fs.existsSync(keyPath)) {
          throw new Error(`Key file not found: ${keyPath}`);
        }

        agentOptions.cert = fs.readFileSync(certPath);
        agentOptions.key = fs.readFileSync(keyPath);

        if (config.passphrase) {
          agentOptions.passphrase = config.passphrase;
        }

        if (config.ca_path) {
          const caPath = path.resolve(baseDir, config.ca_path);
          if (fs.existsSync(caPath)) {
            agentOptions.ca = fs.readFileSync(caPath);
          } else {
            this.logger.warn(`CA certificate file not found: ${caPath}`);
          }
        }

        this.logger.debug(`Loaded PEM certificate from ${certPath}`);
      } else if (isPfxCertificate(config)) {
        // PFX/P12 format: bundled cert and key
        const pfxPath = path.resolve(baseDir, config.pfx_path);

        if (!fs.existsSync(pfxPath)) {
          throw new Error(`PFX file not found: ${pfxPath}`);
        }

        agentOptions.pfx = fs.readFileSync(pfxPath);

        if (config.passphrase) {
          agentOptions.passphrase = config.passphrase;
        }

        if (config.ca_path) {
          const caPath = path.resolve(baseDir, config.ca_path);
          if (fs.existsSync(caPath)) {
            agentOptions.ca = fs.readFileSync(caPath);
          } else {
            this.logger.warn(`CA certificate file not found: ${caPath}`);
          }
        }

        this.logger.debug(`Loaded PFX certificate from ${pfxPath}`);
      }

      // Additional security options
      agentOptions.rejectUnauthorized = true; // Validate server certificate by default

      return agentOptions;
    } catch (error) {
      this.logger.error("Failed to load certificate", {
        error: error as Error,
      });
      throw error;
    }
  }

  /**
   * Apply certificate configuration to axios request config
   *
   * @param axiosConfig - Axios configuration object to modify (mutated in-place)
   * @param requestCertificate - Certificate config from request (highest priority)
   * @param url - Full URL for domain matching (used if no request certificate)
   * @param baseDir - Base directory for resolving certificate paths
   *
   * @remarks
   * Priority order:
   * 1. Request-specific certificate (if provided)
   * 2. Global certificate matching URL domain (if URL provided)
   * 3. No certificate (request proceeds without client cert)
   *
   * @example
   * ```typescript
   * const axiosConfig = { method: 'GET', url: 'https://api.example.com' };
   * service.applyCertificate(axiosConfig, undefined, 'https://api.example.com');
   * // axiosConfig.httpsAgent is now configured with matching certificate
   * ```
   *
   * @public
   */
  public applyCertificate(
    axiosConfig: AxiosRequestConfig,
    requestCertificate?: CertificateConfig,
    url?: string,
    baseDir: string = process.cwd()
  ): void {
    let certificateConfig: CertificateConfig | undefined;
    let certificateName = "Request-specific";

    // Priority 1: Request-specific certificate
    if (requestCertificate) {
      certificateConfig = requestCertificate;
      this.logger.debug("Using request-specific certificate");
    }
    // Priority 2: Global certificate matching URL
    else if (url) {
      const entry = this.findCertificateForUrl(url);
      if (entry) {
        try {
          certificateConfig = toCertificateConfig(entry);
          certificateName = entry.name || "Global";
          this.logger.debug(`Using global certificate: ${certificateName}`);
        } catch (error) {
          this.logger.error("Failed to convert certificate entry", {
            error: error as Error,
          });
          return;
        }
      }
    }

    // Apply certificate if found
    if (certificateConfig) {
      try {
        const agentOptions = this.loadCertificateConfig(
          certificateConfig,
          baseDir
        );
        axiosConfig.httpsAgent = new https.Agent(agentOptions);

        this.logger.info(`Applied certificate: ${certificateName}`, {
          metadata: { type: "certificate_applied", internal: true },
        });
      } catch (error) {
        this.logger.error("Failed to apply certificate", {
          error: error as Error,
        });
        // Don't throw - let the request proceed without certificate
      }
    }
  }

  /**
   * Validate certificate files exist and are readable
   *
   * @param config - Certificate configuration to validate
   * @param baseDir - Base directory for resolving paths
   * @returns Validation result with success status and error messages
   *
   * @remarks
   * This method does NOT validate certificate content or expiration,
   * only that the files exist and are readable.
   *
   * @example
   * ```typescript
   * const result = await service.validateCertificate({
   *   cert_path: "./certs/client.crt",
   *   key_path: "./certs/client.key"
   * });
   *
   * if (!result.valid) {
   *   console.error("Certificate validation failed:", result.errors);
   * }
   * ```
   *
   * @public
   */
  public async validateCertificate(
    config: CertificateConfig,
    baseDir: string = process.cwd()
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      if (isPemCertificate(config)) {
        const certPath = path.resolve(baseDir, config.cert_path);
        const keyPath = path.resolve(baseDir, config.key_path);

        if (!fs.existsSync(certPath)) {
          errors.push(`Certificate file not found: ${certPath}`);
        } else if (!fs.statSync(certPath).isFile()) {
          errors.push(`Certificate path is not a file: ${certPath}`);
        }

        if (!fs.existsSync(keyPath)) {
          errors.push(`Key file not found: ${keyPath}`);
        } else if (!fs.statSync(keyPath).isFile()) {
          errors.push(`Key path is not a file: ${keyPath}`);
        }

        if (config.ca_path) {
          const caPath = path.resolve(baseDir, config.ca_path);
          if (!fs.existsSync(caPath)) {
            errors.push(`CA file not found: ${caPath}`);
          }
        }
      } else if (isPfxCertificate(config)) {
        const pfxPath = path.resolve(baseDir, config.pfx_path);

        if (!fs.existsSync(pfxPath)) {
          errors.push(`PFX file not found: ${pfxPath}`);
        } else if (!fs.statSync(pfxPath).isFile()) {
          errors.push(`PFX path is not a file: ${pfxPath}`);
        }

        if (config.ca_path) {
          const caPath = path.resolve(baseDir, config.ca_path);
          if (!fs.existsSync(caPath)) {
            errors.push(`CA file not found: ${caPath}`);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push(`Validation error: ${(error as Error).message}`);
      return { valid: false, errors };
    }
  }

  /**
   * Get the number of loaded global certificates
   *
   * @returns Count of global certificates
   *
   * @public
   */
  public getCertificateCount(): number {
    return this.globalCertificates.length;
  }
}
