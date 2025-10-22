/**
 * @fileoverview Strategy for loading PEM format certificates
 * @module services/certificate/strategies/pem-loader
 */

import * as https from "https";
import { isPemCertificate } from "../../../types/certificate.types";
import {
  CertificateLoader,
  CertificateLoaderContext,
  ValidationResult,
} from "./certificate-loader.interface";
import { readFileBuffer, validateFilePath } from "../helpers/path.helper";
import { applySSLConfig } from "../helpers/ssl-config.helper";

/**
 * Certificate loader for PEM format (separate cert and key files)
 *
 * @remarks
 * PEM format requires separate files for certificate and private key.
 * Optionally supports CA certificate and passphrase for encrypted keys.
 *
 * @example
 * ```typescript
 * const loader = new PemCertificateLoader();
 * const context = {
 *   config: {
 *     cert_path: "./certs/client.crt",
 *     key_path: "./certs/client.key",
 *     passphrase: "secret"
 *   },
 *   baseDir: process.cwd()
 * };
 *
 * if (loader.canHandle(context.config)) {
 *   const agentOptions = loader.load(context);
 * }
 * ```
 *
 * @public
 */
export class PemCertificateLoader implements CertificateLoader {
  public readonly name = "PemCertificateLoader";

  /**
   * Check if config is PEM format (has cert_path and key_path)
   */
  public canHandle(config: any): boolean {
    return isPemCertificate(config);
  }

  /**
   * Load PEM certificate and key files
   *
   * @param context - Loading context
   * @returns HTTPS agent options with cert and key buffers
   * @throws Error if files don't exist or can't be read
   */
  public load(context: CertificateLoaderContext): https.AgentOptions {
    const { config, baseDir, logger } = context;

    if (!isPemCertificate(config)) {
      throw new Error("Invalid PEM certificate configuration");
    }

    const agentOptions: https.AgentOptions = {};

    try {
      // Load certificate file
      agentOptions.cert = readFileBuffer(config.cert_path, baseDir);

      // Load key file
      agentOptions.key = readFileBuffer(config.key_path, baseDir);

      logger?.debug(`Loaded PEM certificate from ${config.cert_path}`);

      // Apply common SSL configurations (CA, verify, TLS version, passphrase)
      applySSLConfig(config, agentOptions, baseDir, logger);

      return agentOptions;
    } catch (error) {
      logger?.error("Failed to load PEM certificate", {
        error: error as Error,
      });
      throw error;
    }
  }

  /**
   * Validate PEM certificate files exist
   *
   * @param context - Validation context
   * @returns Validation result with errors if any
   */
  public validate(context: CertificateLoaderContext): ValidationResult {
    const { config, baseDir } = context;

    if (!isPemCertificate(config)) {
      return {
        valid: false,
        errors: ["Not a PEM certificate configuration"],
      };
    }

    const errors: string[] = [];

    // Validate certificate file
    const certError = validateFilePath(
      config.cert_path,
      baseDir,
      "Certificate"
    );
    if (certError) {
      errors.push(certError);
    }

    // Validate key file
    const keyError = validateFilePath(config.key_path, baseDir, "Key");
    if (keyError) {
      errors.push(keyError);
    }

    // Validate CA file if specified
    if (config.ca_path) {
      const caError = validateFilePath(config.ca_path, baseDir, "CA");
      if (caError) {
        errors.push(caError);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
