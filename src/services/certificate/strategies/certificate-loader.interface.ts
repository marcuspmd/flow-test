/**
 * @fileoverview Strategy interface for certificate loading
 * @module services/certificate/strategies/certificate-loader
 */

import * as https from "https";
import { CertificateConfig } from "../../../types/certificate.types";

/**
 * Context for certificate loading operations
 *
 * @public
 */
export interface CertificateLoaderContext {
  /** Certificate configuration */
  config: CertificateConfig;
  /** Base directory for path resolution */
  baseDir: string;
  /** Logger for debug/warning messages */
  logger?: {
    debug(message: string): void;
    warn(message: string): void;
    error(message: string, meta?: any): void;
  };
}

/**
 * Validation result for certificate files
 *
 * @public
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Array of error messages (empty if valid) */
  errors: string[];
}

/**
 * Strategy interface for loading different certificate formats
 *
 * @remarks
 * Implementations should handle specific certificate formats (PEM, PFX, etc.)
 * and provide both loading and validation capabilities.
 *
 * @example
 * ```typescript
 * class PemCertificateLoader implements CertificateLoader {
 *   canHandle(config: CertificateConfig): boolean {
 *     return isPemCertificate(config);
 *   }
 *
 *   load(context: CertificateLoaderContext): https.AgentOptions {
 *     // Load PEM certificate
 *   }
 *
 *   validate(context: CertificateLoaderContext): ValidationResult {
 *     // Validate PEM files
 *   }
 * }
 * ```
 *
 * @public
 */
export interface CertificateLoader {
  /**
   * Strategy name for logging and debugging
   */
  readonly name: string;

  /**
   * Check if this loader can handle the given certificate configuration
   *
   * @param config - Certificate configuration to check
   * @returns True if this loader supports the config format
   */
  canHandle(config: CertificateConfig): boolean;

  /**
   * Load certificate and create HTTPS agent options
   *
   * @param context - Loading context with config, baseDir, and logger
   * @returns HTTPS agent options with certificate data
   * @throws Error if certificate files cannot be loaded
   */
  load(context: CertificateLoaderContext): https.AgentOptions;

  /**
   * Validate certificate files exist and are readable
   *
   * @param context - Validation context with config, baseDir, and logger
   * @returns Validation result with errors if any
   */
  validate(context: CertificateLoaderContext): ValidationResult;
}
