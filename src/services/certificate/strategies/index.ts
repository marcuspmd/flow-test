/**
 * @fileoverview Registry for certificate loader strategies
 * @module services/certificate/strategies
 */

import { CertificateConfig } from "../../../types/certificate.types";
import {
  CertificateLoader,
  CertificateLoaderContext,
  ValidationResult,
} from "./certificate-loader.interface";
import { PemCertificateLoader } from "./pem-loader.strategy";
import { PfxCertificateLoader } from "./pfx-loader.strategy";
import * as https from "https";

/**
 * Registry for managing certificate loader strategies
 *
 * @remarks
 * Maintains a collection of certificate loaders and provides methods to
 * find the appropriate loader for a given certificate configuration.
 *
 * @example
 * ```typescript
 * const registry = new LoaderRegistry();
 * registry.register(new PemCertificateLoader());
 * registry.register(new PfxCertificateLoader());
 *
 * const loader = registry.findLoader(config);
 * if (loader) {
 *   const agentOptions = loader.load(context);
 * }
 * ```
 *
 * @public
 */
export class LoaderRegistry {
  private loaders: CertificateLoader[] = [];

  /**
   * Register a certificate loader strategy
   *
   * @param loader - Loader strategy to register
   */
  public register(loader: CertificateLoader): void {
    this.loaders.push(loader);
  }

  /**
   * Find a loader that can handle the given certificate configuration
   *
   * @param config - Certificate configuration
   * @returns Matching loader or undefined if none found
   */
  public findLoader(config: CertificateConfig): CertificateLoader | undefined {
    return this.loaders.find((loader) => loader.canHandle(config));
  }

  /**
   * Get all registered loaders
   *
   * @returns Array of all loaders
   */
  public getAllLoaders(): CertificateLoader[] {
    return [...this.loaders];
  }

  /**
   * Load certificate using appropriate strategy
   *
   * @param context - Loading context
   * @returns HTTPS agent options
   * @throws Error if no loader found or loading fails
   */
  public load(context: CertificateLoaderContext): https.AgentOptions {
    const loader = this.findLoader(context.config);

    if (!loader) {
      throw new Error(
        "No certificate loader found for the given configuration"
      );
    }

    return loader.load(context);
  }

  /**
   * Validate certificate using appropriate strategy
   *
   * @param context - Validation context
   * @returns Validation result
   * @throws Error if no loader found
   */
  public validate(context: CertificateLoaderContext): ValidationResult {
    const loader = this.findLoader(context.config);

    if (!loader) {
      return {
        valid: false,
        errors: ["No certificate loader found for the given configuration"],
      };
    }

    return loader.validate(context);
  }

  /**
   * Clear all registered loaders
   */
  public clear(): void {
    this.loaders = [];
  }

  /**
   * Get count of registered loaders
   */
  public count(): number {
    return this.loaders.length;
  }
}

/**
 * Create a loader registry with default strategies
 *
 * @returns Registry with PEM and PFX loaders registered
 *
 * @public
 */
export function getDefaultLoaders(): LoaderRegistry {
  const registry = new LoaderRegistry();
  registry.register(new PemCertificateLoader());
  registry.register(new PfxCertificateLoader());
  return registry;
}

// Export strategies
export { PemCertificateLoader } from "./pem-loader.strategy";
export { PfxCertificateLoader } from "./pfx-loader.strategy";
export type {
  CertificateLoader,
  CertificateLoaderContext,
  ValidationResult,
} from "./certificate-loader.interface";
