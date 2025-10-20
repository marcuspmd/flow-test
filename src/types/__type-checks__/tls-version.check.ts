/**
 * @fileoverview Type checks and examples for TLS version configuration
 * This file demonstrates proper usage of TLS min/max version properties
 */

import type {
  TLSVersion,
  PemCertificateConfig,
  PfxCertificateConfig,
  CertificateEntry,
} from "../../types/certificate.types";

// ✅ Valid TLS versions
const validTLSVersions: TLSVersion[] = [
  "TLSv1",
  "TLSv1.1",
  "TLSv1.2",
  "TLSv1.3",
];

// ✅ Valid PEM certificate with TLS config
const pemWithTLS: PemCertificateConfig = {
  cert_path: "./certs/client.crt",
  key_path: "./certs/client.key",
  min_version: "TLSv1.2",
  max_version: "TLSv1.3",
};

// ✅ Valid PFX certificate with TLS config
const pfxWithTLS: PfxCertificateConfig = {
  pfx_path: "./certs/certificate.pfx",
  passphrase: "secret",
  min_version: "TLSv1.2",
  max_version: "TLSv1.3",
};

// ✅ Valid certificate entry with TLS config
const entryWithTLS: CertificateEntry = {
  name: "Corporate API",
  cert_path: "./certs/corp.crt",
  key_path: "./certs/corp.key",
  domains: ["*.company.com"],
  min_version: "TLSv1.2",
  max_version: "TLSv1.3",
  verify: true,
};

// ✅ PEM without TLS (backward compatible)
const pemWithoutTLS: PemCertificateConfig = {
  cert_path: "./certs/client.crt",
  key_path: "./certs/client.key",
};

// ✅ Only min_version
const onlyMin: PemCertificateConfig = {
  cert_path: "./certs/client.crt",
  key_path: "./certs/client.key",
  min_version: "TLSv1.2",
};

// ✅ Only max_version
const onlyMax: PfxCertificateConfig = {
  pfx_path: "./certs/certificate.pfx",
  max_version: "TLSv1.3",
};

// ✅ Dataprev-style configuration
const dataprevConfig: PemCertificateConfig = {
  cert_path: process.env.DATAPREV_CERT_PATH || "./certs/dataprev.crt",
  key_path: process.env.DATAPREV_KEY_PATH || "./certs/dataprev.key",
  passphrase: process.env.DATAPREV_PEM_PASSWORD,
  verify: false,
  min_version: "TLSv1.2",
  max_version: "TLSv1.3",
};

// ✅ Global certificate entry
const globalCert: CertificateEntry = {
  name: "Production API",
  cert_path: "./certs/prod.crt",
  key_path: "./certs/prod.key",
  ca_path: "./certs/ca.crt",
  domains: ["*.api.production.com", "*.service.production.com"],
  min_version: "TLSv1.2",
  verify: true,
};

// Type assertions to ensure compilation succeeds
const _pemCheck: PemCertificateConfig = pemWithTLS;
const _pfxCheck: PfxCertificateConfig = pfxWithTLS;
const _entryCheck: CertificateEntry = entryWithTLS;
const _backwardCompatCheck: PemCertificateConfig = pemWithoutTLS;
const _dataprevCheck: PemCertificateConfig = dataprevConfig;

// Prevent unused variable warnings
export {
  validTLSVersions,
  pemWithTLS,
  pfxWithTLS,
  entryWithTLS,
  pemWithoutTLS,
  onlyMin,
  onlyMax,
  dataprevConfig,
  globalCert,
};

console.log("✅ All TLS version type checks passed!");
