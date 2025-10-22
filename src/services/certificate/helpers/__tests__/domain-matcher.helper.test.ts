/**
 * @fileoverview Tests for domain matching helper functions
 */

import {
  wildcardToRegex,
  matchesDomain,
  matchesAnyDomain,
  extractHostname,
} from "../domain-matcher.helper";

describe("domain-matcher.helper", () => {
  describe("wildcardToRegex", () => {
    it("should convert simple domain to regex", () => {
      const result = wildcardToRegex("example.com");
      expect(result).toBe("^example\\.com$");
    });

    it("should convert wildcard subdomain pattern", () => {
      const result = wildcardToRegex("*.example.com");
      expect(result).toBe("^.*\\.example\\.com$");
    });

    it("should escape dots", () => {
      const result = wildcardToRegex("api.example.com");
      expect(result).toBe("^api\\.example\\.com$");
    });

    it("should handle multiple wildcards", () => {
      const result = wildcardToRegex("*.*.example.com");
      expect(result).toBe("^.*\\..*\\.example\\.com$");
    });

    it("should handle wildcard at the end", () => {
      const result = wildcardToRegex("example.*");
      expect(result).toBe("^example\\..*$");
    });

    it("should handle single wildcard", () => {
      const result = wildcardToRegex("*");
      expect(result).toBe("^.*$");
    });
  });

  describe("matchesDomain", () => {
    it("should match exact domain", () => {
      expect(matchesDomain("example.com", "example.com")).toBe(true);
    });

    it("should not match different domain", () => {
      expect(matchesDomain("example.com", "other.com")).toBe(false);
    });

    it("should match wildcard subdomain", () => {
      expect(matchesDomain("api.example.com", "*.example.com")).toBe(true);
      expect(matchesDomain("www.example.com", "*.example.com")).toBe(true);
      // Wildcard matches any characters, so this will match
      expect(matchesDomain("test.api.example.com", "*.example.com")).toBe(true);
    });

    it("should not match root domain with wildcard subdomain pattern", () => {
      expect(matchesDomain("example.com", "*.example.com")).toBe(false);
    });

    it("should match with multiple wildcards", () => {
      expect(matchesDomain("a.b.example.com", "*.*.example.com")).toBe(true);
    });

    it("should match catch-all pattern", () => {
      expect(matchesDomain("anything.com", "*")).toBe(true);
      expect(matchesDomain("sub.domain.com", "*")).toBe(true);
    });

    it("should be case-sensitive", () => {
      expect(matchesDomain("Example.com", "example.com")).toBe(false);
      expect(matchesDomain("example.com", "example.com")).toBe(true);
    });

    it("should handle invalid regex patterns gracefully", () => {
      // This shouldn't throw even with edge cases
      expect(() => matchesDomain("example.com", "[invalid")).not.toThrow();
    });
  });

  describe("matchesAnyDomain", () => {
    it("should return true when hostname matches at least one pattern", () => {
      const patterns = ["example.com", "*.test.com", "api.service.com"];

      expect(matchesAnyDomain("example.com", patterns)).toBe(true);
      expect(matchesAnyDomain("sub.test.com", patterns)).toBe(true);
      expect(matchesAnyDomain("api.service.com", patterns)).toBe(true);
    });

    it("should return false when hostname matches no patterns", () => {
      const patterns = ["example.com", "*.test.com"];

      expect(matchesAnyDomain("other.com", patterns)).toBe(false);
      expect(matchesAnyDomain("test.com", patterns)).toBe(false);
    });

    it("should handle empty pattern array", () => {
      expect(matchesAnyDomain("example.com", [])).toBe(false);
    });

    it("should match on first matching pattern", () => {
      const patterns = ["*.example.com", "api.example.com"];

      // Both patterns would match, but should return true on first match
      expect(matchesAnyDomain("api.example.com", patterns)).toBe(true);
    });

    it("should handle catch-all in pattern list", () => {
      const patterns = ["specific.com", "*"];

      expect(matchesAnyDomain("anything.com", patterns)).toBe(true);
    });
  });

  describe("extractHostname", () => {
    it("should extract hostname from https URL", () => {
      expect(extractHostname("https://example.com/path")).toBe("example.com");
    });

    it("should extract hostname from http URL", () => {
      expect(extractHostname("http://example.com/path")).toBe("example.com");
    });

    it("should extract hostname with subdomain", () => {
      expect(extractHostname("https://api.example.com/v1/users")).toBe(
        "api.example.com"
      );
    });

    it("should extract hostname with port", () => {
      expect(extractHostname("https://example.com:8080/path")).toBe(
        "example.com"
      );
    });

    it("should handle localhost", () => {
      expect(extractHostname("http://localhost:3000/api")).toBe("localhost");
    });

    it("should handle IP addresses", () => {
      expect(extractHostname("http://192.168.1.1:8080")).toBe("192.168.1.1");
    });

    it("should return null for invalid URL", () => {
      expect(extractHostname("not-a-valid-url")).toBeNull();
      expect(extractHostname("")).toBeNull();
      expect(extractHostname("//example.com")).toBeNull();
    });

    it("should handle URL with query parameters", () => {
      expect(extractHostname("https://example.com/path?query=value")).toBe(
        "example.com"
      );
    });

    it("should handle URL with hash", () => {
      expect(extractHostname("https://example.com/path#section")).toBe(
        "example.com"
      );
    });

    it("should handle complex URL", () => {
      expect(
        extractHostname(
          "https://user:pass@api.example.com:443/v1/users?active=true#top"
        )
      ).toBe("api.example.com");
    });
  });
});
