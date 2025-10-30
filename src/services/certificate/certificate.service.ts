/**
 * @fileoverview Service for managing SSL/TLS client certificates
 * @module services/certificate
 */

import { injectable, inject } from "inversify";
import "reflect-metadata";
import { AxiosRequestConfig } from "axios";
import * as https from "https";
import {
  CertificateConfig,
  CertificateEntry,
  toCertificateConfig,
} from "../../types/certificate.types";
import { ICertificateService } from "../../interfaces/services/ICertificateService";
import { ILogger } from "../../interfaces/services/ILogger";
import { TYPES } from "../../di/identifiers";
import {
  LoaderRegistry,
  getDefaultLoaders,
  CertificateLoaderContext,
} from "./strategies";
import {
  extractHostname,
  matchesAnyDomain,
} from "./helpers/domain-matcher.helper";

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
@injectable()
export class CertificateService implements ICertificateService {
  private logger: ILogger;
  private globalCertificates: CertificateEntry[] = [];
  private loaderRegistry: LoaderRegistry;

  /**
   * Initialize CertificateService
   *
   * @remarks
   * For DI usage, use the parameterless constructor and call setCertificates()
   * if needed. For legacy usage, you can still pass certificates directly.
   */
  constructor(@inject(TYPES.ILogger) logger: ILogger) {
    this.logger = logger;
    this.loaderRegistry = getDefaultLoaders();
  }

  /**
   * Set global certificates after construction
   *
   * @param certificates - Array of global certificate entries
   * @param loaderRegistry - Optional custom loader registry
   */
  public setCertificates(
    certificates: CertificateEntry[],
    loaderRegistry?: LoaderRegistry
  ): void {
    this.globalCertificates = certificates;
    if (loaderRegistry) {
      this.loaderRegistry = loaderRegistry;
    }
    this.logger.info(`Loaded ${certificates.length} global certificate(s)`);
  }

  /**
   * Get global certificates for this service
   *
   * @returns Array of global certificate entries
   * @public
   */
  public getGlobalCertificates(): CertificateEntry[] {
    return this.globalCertificates;
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
    const hostname = extractHostname(url);

    if (!hostname) {
      this.logger.warn(`Invalid URL for certificate matching: ${url}`);
      return undefined;
    }

    for (const entry of this.globalCertificates) {
      // If no domains specified, certificate applies to all
      if (!entry.domains || entry.domains.length === 0) {
        return entry;
      }

      // Check if hostname matches any domain pattern
      if (matchesAnyDomain(hostname, entry.domains)) {
        this.logger.debug(
          `Certificate "${entry.name}" matched for ${hostname}`
        );
        return entry;
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
    const context: CertificateLoaderContext = {
      config,
      baseDir,
      logger: this.logger,
    };

    return this.loaderRegistry.load(context);
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

        this.logger.debug(
          `Certificate agent options: ${JSON.stringify({
            hasPfx: !!agentOptions.pfx,
            hasPassphrase: !!agentOptions.passphrase,
            rejectUnauthorized: agentOptions.rejectUnauthorized,
            minVersion: agentOptions.minVersion,
            maxVersion: agentOptions.maxVersion,
          })}`
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
    const context: CertificateLoaderContext = {
      config,
      baseDir,
      logger: this.logger,
    };

    return this.loaderRegistry.validate(context);
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
