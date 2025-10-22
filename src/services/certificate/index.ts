/**
 * @fileoverview Certificate service module - Barrel export.
 *
 * @remarks
 * This module provides centralized exports for the certificate service,
 * loaders (strategies), helpers, and types. It maintains backward
 * compatibility with existing imports while organizing code in a modular structure.
 *
 * @packageDocumentation
 */

// Main service
export { CertificateService } from "./certificate.service";

// Strategy pattern exports (loaders)
export {
  CertificateLoader,
  LoaderRegistry,
  CertificateLoaderContext,
  getDefaultLoaders,
} from "./strategies";

export { PemCertificateLoader } from "./strategies/pem-loader.strategy";
export { PfxCertificateLoader } from "./strategies/pfx-loader.strategy";

// Helpers
export {
  extractHostname,
  matchesDomain,
  matchesAnyDomain,
  wildcardToRegex,
} from "./helpers/domain-matcher.helper";

export {
  resolvePath,
  fileExists,
  readFileBuffer,
  validateFilePath,
} from "./helpers/path.helper";

export {
  configureCA,
  configureSSLVerification,
  configureTLSVersion,
  configurePassphrase,
  applySSLConfig,
} from "./helpers/ssl-config.helper";
