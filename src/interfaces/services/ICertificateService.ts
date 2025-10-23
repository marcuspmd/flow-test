/**
 * @fileoverview Certificate service interface for dependency injection.
 *
 * @remarks
 * Defines the contract for SSL/TLS client certificate management,
 * supporting both PEM and PFX formats with domain-based matching.
 *
 * @packageDocumentation
 */

import { AxiosRequestConfig } from "axios";
import {
  CertificateConfig,
  CertificateEntry,
} from "../../types/certificate.types";

/**
 * Certificate service interface
 *
 * @remarks
 * Manages client certificates for HTTPS requests with support for:
 * - PEM format (separate cert/key files)
 * - PFX/P12 format (bundled certificate)
 * - Domain-based certificate matching
 * - Priority resolution (request > global)
 *
 * @example
 * ```typescript
 * @injectable()
 * class MyService {
 *   constructor(@inject(TYPES.ICertificateService) private certService: ICertificateService) {}
 *
 *   async makeSecureRequest(): Promise<void> {
 *     const axiosConfig = { method: 'GET', url: 'https://api.example.com' };
 *     this.certService.applyCertificate(axiosConfig, undefined, axiosConfig.url);
 *   }
 * }
 * ```
 */
export interface ICertificateService {
  /**
   * Get global certificates configured for this service
   *
   * @returns Array of global certificate entries
   */
  getGlobalCertificates(): CertificateEntry[];

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
   */
  applyCertificate(
    axiosConfig: AxiosRequestConfig,
    requestCertificate?: CertificateConfig,
    url?: string,
    baseDir?: string
  ): void;

  /**
   * Validate certificate files exist and are readable
   *
   * @param config - Certificate configuration to validate
   * @param baseDir - Base directory for resolving paths
   * @returns Promise resolving to validation result with success status and error messages
   *
   * @remarks
   * This method does NOT validate certificate content or expiration,
   * only that the files exist and are readable.
   */
  validateCertificate(
    config: CertificateConfig,
    baseDir?: string
  ): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * Get the number of loaded global certificates
   *
   * @returns Count of global certificates
   */
  getCertificateCount(): number;
}
