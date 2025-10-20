/**
 * @fileoverview Type definitions for SSL/TLS client certificate authentication
 * @module types/certificate
 */

/**
 * Configuration for PEM-based certificates (separate cert and key files)
 */
export interface PemCertificateConfig {
  /** Path to the certificate file (.crt, .pem) */
  cert_path: string;
  /** Path to the private key file (.key, .pem) */
  key_path: string;
  /** Optional passphrase for encrypted private key */
  passphrase?: string;
  /** Optional CA certificate path for verification */
  ca_path?: string;
}

/**
 * Configuration for PFX/P12 certificates (bundled cert and key)
 */
export interface PfxCertificateConfig {
  /** Path to the PFX/P12 file */
  pfx_path: string;
  /** Passphrase for the PFX file */
  passphrase?: string;
  /** Optional CA certificate path */
  ca_path?: string;
}

/**
 * Certificate configuration supporting both PEM and PFX formats
 */
export type CertificateConfig = PemCertificateConfig | PfxCertificateConfig;

/**
 * Certificate entry with domain filtering
 */
export interface CertificateEntry {
  /** Friendly name for the certificate */
  name?: string;
  /** Certificate configuration (PEM or PFX) */
  cert_path?: string;
  key_path?: string;
  pfx_path?: string;
  passphrase?: string;
  ca_path?: string;
  /**
   * Optional domain patterns (regex) where this certificate applies
   * If empty, applies to all domains
   */
  domains?: string[];
}

/**
 * Global certificates configuration
 */
export interface GlobalCertificatesConfig {
  certificates?: CertificateEntry[];
}

/**
 * Type guard to check if config is PEM-based
 */
export function isPemCertificate(
  config: CertificateConfig | CertificateEntry
): config is PemCertificateConfig {
  return "cert_path" in config && "key_path" in config;
}

/**
 * Type guard to check if config is PFX-based
 */
export function isPfxCertificate(
  config: CertificateConfig | CertificateEntry
): config is PfxCertificateConfig {
  return "pfx_path" in config;
}

/**
 * Convert CertificateEntry to CertificateConfig
 */
export function toCertificateConfig(
  entry: CertificateEntry
): CertificateConfig {
  if (isPemCertificate(entry)) {
    return {
      cert_path: entry.cert_path!,
      key_path: entry.key_path!,
      passphrase: entry.passphrase,
      ca_path: entry.ca_path,
    };
  } else if (isPfxCertificate(entry)) {
    return {
      pfx_path: entry.pfx_path!,
      passphrase: entry.passphrase,
      ca_path: entry.ca_path,
    };
  }
  throw new Error(
    "Invalid certificate entry: must have either cert_path/key_path or pfx_path"
  );
}
