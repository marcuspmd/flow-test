/**
 * @fileoverview Helper functions for SSL/TLS configuration
 * @module services/certificate/helpers/ssl-config
 */

import * as https from "https";
import * as fs from "fs";
import { CertificateConfig } from "../../../types/certificate.types";
import { resolvePath, fileExists } from "./path.helper";

/**
 * Logger interface for SSL config operations
 */
export interface SSLConfigLogger {
  warn(message: string): void;
  debug(message: string): void;
}

/**
 * Configure CA (Certificate Authority) certificate if specified
 *
 * @param config - Certificate configuration with optional ca_path
 * @param agentOptions - HTTPS agent options to modify
 * @param baseDir - Base directory for path resolution
 * @param logger - Optional logger for warnings
 *
 * @public
 */
export function configureCA(
  config: CertificateConfig,
  agentOptions: https.AgentOptions,
  baseDir: string = process.cwd(),
  logger?: SSLConfigLogger
): void {
  if (!config.ca_path) {
    return;
  }

  const caPath = resolvePath(config.ca_path, baseDir);

  if (fileExists(config.ca_path, baseDir)) {
    agentOptions.ca = fs.readFileSync(caPath);
  } else {
    logger?.warn(`CA certificate file not found: ${caPath}`);
  }
}

/**
 * Configure SSL verification (rejectUnauthorized)
 *
 * @param config - Certificate configuration with optional verify setting
 * @param agentOptions - HTTPS agent options to modify
 * @param logger - Optional logger for warnings
 *
 * @remarks
 * Default behavior is to verify SSL certificates (secure).
 * Setting verify: false disables verification (INSECURE - development only).
 *
 * @public
 */
export function configureSSLVerification(
  config: CertificateConfig,
  agentOptions: https.AgentOptions,
  logger?: SSLConfigLogger
): void {
  const shouldVerify = config.verify !== false; // Default to true
  agentOptions.rejectUnauthorized = shouldVerify;

  if (!shouldVerify) {
    logger?.warn(
      "⚠️  SSL verification disabled (verify: false) - This is INSECURE and should only be used in development!"
    );
  }
}

/**
 * Configure TLS version constraints
 *
 * @param config - Certificate configuration with optional min/max version
 * @param agentOptions - HTTPS agent options to modify
 * @param logger - Optional logger for debug messages
 *
 * @public
 */
export function configureTLSVersion(
  config: CertificateConfig,
  agentOptions: https.AgentOptions,
  logger?: SSLConfigLogger
): void {
  if (config.min_version) {
    agentOptions.minVersion = config.min_version;
    logger?.debug(`TLS min version set to: ${config.min_version}`);
  }

  if (config.max_version) {
    agentOptions.maxVersion = config.max_version;
    logger?.debug(`TLS max version set to: ${config.max_version}`);
  }
}

/**
 * Configure passphrase for encrypted certificates
 *
 * @param config - Certificate configuration with optional passphrase
 * @param agentOptions - HTTPS agent options to modify
 *
 * @public
 */
export function configurePassphrase(
  config: CertificateConfig,
  agentOptions: https.AgentOptions
): void {
  if (config.passphrase) {
    agentOptions.passphrase = config.passphrase;
  }
}

/**
 * Apply all SSL/TLS configurations to agent options
 *
 * @param config - Certificate configuration
 * @param agentOptions - HTTPS agent options to modify
 * @param baseDir - Base directory for path resolution
 * @param logger - Optional logger
 *
 * @remarks
 * This is a convenience function that applies all SSL configurations in order:
 * 1. CA certificate
 * 2. SSL verification
 * 3. TLS version
 * 4. Passphrase
 *
 * @public
 */
export function applySSLConfig(
  config: CertificateConfig,
  agentOptions: https.AgentOptions,
  baseDir: string = process.cwd(),
  logger?: SSLConfigLogger
): void {
  configureCA(config, agentOptions, baseDir, logger);
  configureSSLVerification(config, agentOptions, logger);
  configureTLSVersion(config, agentOptions, logger);
  configurePassphrase(config, agentOptions);
}
