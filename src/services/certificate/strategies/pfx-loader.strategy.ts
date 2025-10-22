/**
 * @fileoverview Strategy for loading PFX/P12 format certificates
 * @module services/certificate/strategies/pfx-loader
 */

import * as https from "https";
import { isPfxCertificate } from "../../../types/certificate.types";
import {
  CertificateLoader,
  CertificateLoaderContext,
  ValidationResult,
} from "./certificate-loader.interface";
import { readFileBuffer, validateFilePath } from "../helpers/path.helper";
import { applySSLConfig } from "../helpers/ssl-config.helper";

/**
 * Certificate loader for PFX/P12 format (bundled cert and key)
 *
 * @remarks
 * PFX (also known as PKCS#12) format contains both certificate and private key
 * in a single encrypted file. Commonly used for Windows environments and APIs.
 *
 * @example
 * ```typescript
 * const loader = new PfxCertificateLoader();
 * const context = {
 *   config: {
 *     pfx_path: "./certs/certificate.pfx",
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
export class PfxCertificateLoader implements CertificateLoader {
  public readonly name = "PfxCertificateLoader";

  /**
   * Check if config is PFX format (has pfx_path)
   */
  public canHandle(config: any): boolean {
    return isPfxCertificate(config);
  }

  /**
   * Load PFX certificate file
   *
   * @param context - Loading context
   * @returns HTTPS agent options with pfx buffer
   * @throws Error if file doesn't exist or can't be read
   */
  public load(context: CertificateLoaderContext): https.AgentOptions {
    const { config, baseDir, logger } = context;

    if (!isPfxCertificate(config)) {
      throw new Error("Invalid PFX certificate configuration");
    }

    const agentOptions: https.AgentOptions = {};

    try {
      // Load PFX file
      agentOptions.pfx = readFileBuffer(config.pfx_path, baseDir);

      logger?.debug(`Loaded PFX certificate from ${config.pfx_path}`);

      // Apply common SSL configurations (CA, verify, TLS version, passphrase)
      applySSLConfig(config, agentOptions, baseDir, logger);

      return agentOptions;
    } catch (error) {
      logger?.error("Failed to load PFX certificate", {
        error: error as Error,
      });
      throw error;
    }
  }

  /**
   * Validate PFX certificate file exists
   *
   * @param context - Validation context
   * @returns Validation result with errors if any
   */
  public validate(context: CertificateLoaderContext): ValidationResult {
    const { config, baseDir } = context;

    if (!isPfxCertificate(config)) {
      return {
        valid: false,
        errors: ["Not a PFX certificate configuration"],
      };
    }

    const errors: string[] = [];

    // Validate PFX file
    const pfxError = validateFilePath(config.pfx_path, baseDir, "PFX");
    if (pfxError) {
      errors.push(pfxError);
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
