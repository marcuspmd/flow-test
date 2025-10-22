/**
 * @fileoverview Helper functions for domain pattern matching
 * @module services/certificate/helpers/domain-matcher
 */

/**
 * Convert wildcard domain pattern to regex pattern
 *
 * @param domainPattern - Domain pattern with optional wildcards (e.g., "*.example.com")
 * @returns Regex pattern string
 *
 * @remarks
 * - Escapes dots to match literal dots
 * - Converts * to .* for wildcard matching
 *
 * @example
 * ```typescript
 * wildcardToRegex("*.example.com") // Returns: "^.*\\.example\\.com$"
 * wildcardToRegex("api.example.com") // Returns: "^api\\.example\\.com$"
 * ```
 *
 * @public
 */
export function wildcardToRegex(domainPattern: string): string {
  return (
    "^" +
    domainPattern
      .replace(/\./g, "\\.") // Escape dots first
      .replace(/\*/g, ".*") + // Then replace * with .*
    "$"
  );
}

/**
 * Check if a hostname matches a domain pattern
 *
 * @param hostname - Hostname to test (e.g., "api.example.com")
 * @param domainPattern - Domain pattern with optional wildcards
 * @returns True if hostname matches pattern
 *
 * @example
 * ```typescript
 * matchesDomain("api.example.com", "*.example.com") // Returns: true
 * matchesDomain("api.example.com", "example.com") // Returns: false
 * matchesDomain("example.com", "example.com") // Returns: true
 * ```
 *
 * @public
 */
export function matchesDomain(
  hostname: string,
  domainPattern: string
): boolean {
  try {
    const regexPattern = wildcardToRegex(domainPattern);
    const regex = new RegExp(regexPattern);
    return regex.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Check if a hostname matches any pattern in a list
 *
 * @param hostname - Hostname to test
 * @param domainPatterns - Array of domain patterns
 * @returns True if hostname matches at least one pattern
 *
 * @public
 */
export function matchesAnyDomain(
  hostname: string,
  domainPatterns: string[]
): boolean {
  return domainPatterns.some((pattern) => matchesDomain(hostname, pattern));
}

/**
 * Extract hostname from URL
 *
 * @param url - Full URL string
 * @returns Hostname or null if URL is invalid
 *
 * @example
 * ```typescript
 * extractHostname("https://api.example.com/path") // Returns: "api.example.com"
 * extractHostname("invalid-url") // Returns: null
 * ```
 *
 * @public
 */
export function extractHostname(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}
