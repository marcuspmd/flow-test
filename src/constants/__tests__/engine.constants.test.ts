/**
 * @fileoverview Tests for engine constants and helper functions
 */

import {
  ENGINE_CONSTANTS,
  HTTP_STATUS,
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  isSuccessStatus,
  isClientError,
  isServerError,
} from "../engine.constants";

describe("ENGINE_CONSTANTS", () => {
  describe("basic constants", () => {
    it("should have MAX_CALL_DEPTH defined", () => {
      expect(ENGINE_CONSTANTS.MAX_CALL_DEPTH).toBe(10);
    });

    it("should have DEFAULT_TIMEOUT_MS defined", () => {
      expect(ENGINE_CONSTANTS.DEFAULT_TIMEOUT_MS).toBe(60000);
    });

    it("should have DEFAULT_STEP_DURATION_MS defined", () => {
      expect(ENGINE_CONSTANTS.DEFAULT_STEP_DURATION_MS).toBe(500);
    });

    it("should have ENV_VAR_PREFIX defined", () => {
      expect(ENGINE_CONSTANTS.ENV_VAR_PREFIX).toBe("FLOW_TEST_");
    });
  });

  describe("CACHE constants", () => {
    it("should have TTL_DEFAULT_MS", () => {
      expect(ENGINE_CONSTANTS.CACHE.TTL_DEFAULT_MS).toBe(300000);
    });

    it("should have INTERPOLATION_CLEAR_DELAY_MS", () => {
      expect(ENGINE_CONSTANTS.CACHE.INTERPOLATION_CLEAR_DELAY_MS).toBe(5000);
    });
  });

  describe("FILE_PATTERNS constants", () => {
    it("should have TEST_FILES patterns", () => {
      expect(Array.isArray(ENGINE_CONSTANTS.FILE_PATTERNS.TEST_FILES)).toBe(true);
      expect(ENGINE_CONSTANTS.FILE_PATTERNS.TEST_FILES.length).toBeGreaterThan(0);
    });

    it("should have CONFIG_FILES patterns", () => {
      expect(Array.isArray(ENGINE_CONSTANTS.FILE_PATTERNS.CONFIG_FILES)).toBe(true);
      expect(ENGINE_CONSTANTS.FILE_PATTERNS.CONFIG_FILES).toContain("flow-test.config.yml");
    });

    it("should have EXCLUDE_PATTERNS", () => {
      expect(Array.isArray(ENGINE_CONSTANTS.FILE_PATTERNS.EXCLUDE_PATTERNS)).toBe(true);
      expect(ENGINE_CONSTANTS.FILE_PATTERNS.EXCLUDE_PATTERNS).toContain("**/node_modules/**");
    });
  });

  describe("HTTP constants", () => {
    it("should have MAX_REDIRECTS", () => {
      expect(ENGINE_CONSTANTS.HTTP.MAX_REDIRECTS).toBe(5);
    });

    it("should have DEFAULT_HEADERS", () => {
      expect(ENGINE_CONSTANTS.HTTP.DEFAULT_HEADERS).toBeDefined();
      expect(ENGINE_CONSTANTS.HTTP.DEFAULT_HEADERS["User-Agent"]).toContain("Flow-Test-Engine");
    });

    it("should have MAX_RESPONSE_SIZE_BYTES", () => {
      expect(ENGINE_CONSTANTS.HTTP.MAX_RESPONSE_SIZE_BYTES).toBe(100 * 1024 * 1024);
    });
  });

  describe("LOGGING constants", () => {
    it("should have MAX_LOG_LENGTH", () => {
      expect(ENGINE_CONSTANTS.LOGGING.MAX_LOG_LENGTH).toBe(10000);
    });

    it("should have MAX_OBJECT_DEPTH", () => {
      expect(ENGINE_CONSTANTS.LOGGING.MAX_OBJECT_DEPTH).toBe(5);
    });
  });

  describe("EXECUTION constants", () => {
    it("should have DEFAULT_WORKERS", () => {
      expect(ENGINE_CONSTANTS.EXECUTION.DEFAULT_WORKERS).toBe(4);
    });

    it("should have MAX_WORKERS", () => {
      expect(ENGINE_CONSTANTS.EXECUTION.MAX_WORKERS).toBe(16);
    });

    it("should have RETRY configuration", () => {
      expect(ENGINE_CONSTANTS.EXECUTION.RETRY.DEFAULT_MAX_ATTEMPTS).toBe(3);
      expect(ENGINE_CONSTANTS.EXECUTION.RETRY.DEFAULT_DELAY_MS).toBe(1000);
      expect(ENGINE_CONSTANTS.EXECUTION.RETRY.BACKOFF_MULTIPLIER).toBe(2);
    });
  });

  describe("INTERPOLATION constants", () => {
    it("should have VARIABLE_PATTERN regex", () => {
      expect(ENGINE_CONSTANTS.INTERPOLATION.VARIABLE_PATTERN).toBeInstanceOf(RegExp);
    });

    it("should have PREFIXES", () => {
      expect(ENGINE_CONSTANTS.INTERPOLATION.PREFIXES.FAKER).toBe("$faker");
      expect(ENGINE_CONSTANTS.INTERPOLATION.PREFIXES.JAVASCRIPT).toBe("$js");
      expect(ENGINE_CONSTANTS.INTERPOLATION.PREFIXES.ENVIRONMENT).toBe("$env");
      expect(ENGINE_CONSTANTS.INTERPOLATION.PREFIXES.JMESPATH).toBe("$jmespath");
    });
  });

  describe("INPUT constants", () => {
    it("should have DEFAULT_TIMEOUT_MS", () => {
      expect(ENGINE_CONSTANTS.INPUT.DEFAULT_TIMEOUT_MS).toBe(300000);
    });

    it("should have MAX_INPUT_LENGTH", () => {
      expect(ENGINE_CONSTANTS.INPUT.MAX_INPUT_LENGTH).toBe(10000);
    });
  });

  describe("PRIORITY constants", () => {
    it("should have all priority levels", () => {
      expect(ENGINE_CONSTANTS.PRIORITY.CRITICAL).toBe("critical");
      expect(ENGINE_CONSTANTS.PRIORITY.HIGH).toBe("high");
      expect(ENGINE_CONSTANTS.PRIORITY.MEDIUM).toBe("medium");
      expect(ENGINE_CONSTANTS.PRIORITY.LOW).toBe("low");
    });
  });

  describe("STATUS constants", () => {
    it("should have all status types", () => {
      expect(ENGINE_CONSTANTS.STATUS.SUCCESS).toBe("success");
      expect(ENGINE_CONSTANTS.STATUS.FAILURE).toBe("failure");
      expect(ENGINE_CONSTANTS.STATUS.SKIPPED).toBe("skipped");
      expect(ENGINE_CONSTANTS.STATUS.ERROR).toBe("error");
      expect(ENGINE_CONSTANTS.STATUS.PENDING).toBe("pending");
    });
  });

  describe("EXTENSIONS constants", () => {
    it("should have YAML extensions", () => {
      expect(ENGINE_CONSTANTS.EXTENSIONS.YAML).toContain(".yml");
      expect(ENGINE_CONSTANTS.EXTENSIONS.YAML).toContain(".yaml");
    });

    it("should have JSON extensions", () => {
      expect(ENGINE_CONSTANTS.EXTENSIONS.JSON).toContain(".json");
    });

    it("should have JAVASCRIPT extensions", () => {
      expect(ENGINE_CONSTANTS.EXTENSIONS.JAVASCRIPT).toContain(".js");
      expect(ENGINE_CONSTANTS.EXTENSIONS.JAVASCRIPT).toContain(".mjs");
    });
  });

  describe("REPORTS constants", () => {
    it("should have DEFAULT_OUTPUT_DIR", () => {
      expect(ENGINE_CONSTANTS.REPORTS.DEFAULT_OUTPUT_DIR).toBe("results");
    });

    it("should have report file names", () => {
      expect(ENGINE_CONSTANTS.REPORTS.FILES.LATEST).toBe("latest.json");
      expect(ENGINE_CONSTANTS.REPORTS.FILES.HTML).toBe("report.html");
      expect(ENGINE_CONSTANTS.REPORTS.FILES.JUNIT).toBe("junit.xml");
    });
  });
});

describe("HTTP_STATUS", () => {
  it("should have INFORMATIONAL range", () => {
    expect(HTTP_STATUS.INFORMATIONAL.min).toBe(100);
    expect(HTTP_STATUS.INFORMATIONAL.max).toBe(199);
  });

  it("should have SUCCESS range", () => {
    expect(HTTP_STATUS.SUCCESS.min).toBe(200);
    expect(HTTP_STATUS.SUCCESS.max).toBe(299);
  });

  it("should have REDIRECTION range", () => {
    expect(HTTP_STATUS.REDIRECTION.min).toBe(300);
    expect(HTTP_STATUS.REDIRECTION.max).toBe(399);
  });

  it("should have CLIENT_ERROR range", () => {
    expect(HTTP_STATUS.CLIENT_ERROR.min).toBe(400);
    expect(HTTP_STATUS.CLIENT_ERROR.max).toBe(499);
  });

  it("should have SERVER_ERROR range", () => {
    expect(HTTP_STATUS.SERVER_ERROR.min).toBe(500);
    expect(HTTP_STATUS.SERVER_ERROR.max).toBe(599);
  });
});

describe("HTTP_STATUS_CODES", () => {
  it("should have common success codes", () => {
    expect(HTTP_STATUS_CODES.OK).toBe(200);
    expect(HTTP_STATUS_CODES.CREATED).toBe(201);
    expect(HTTP_STATUS_CODES.ACCEPTED).toBe(202);
    expect(HTTP_STATUS_CODES.NO_CONTENT).toBe(204);
  });

  it("should have common client error codes", () => {
    expect(HTTP_STATUS_CODES.BAD_REQUEST).toBe(400);
    expect(HTTP_STATUS_CODES.UNAUTHORIZED).toBe(401);
    expect(HTTP_STATUS_CODES.FORBIDDEN).toBe(403);
    expect(HTTP_STATUS_CODES.NOT_FOUND).toBe(404);
    expect(HTTP_STATUS_CODES.METHOD_NOT_ALLOWED).toBe(405);
    expect(HTTP_STATUS_CODES.CONFLICT).toBe(409);
    expect(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).toBe(422);
    expect(HTTP_STATUS_CODES.TOO_MANY_REQUESTS).toBe(429);
  });

  it("should have common server error codes", () => {
    expect(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).toBe(500);
    expect(HTTP_STATUS_CODES.BAD_GATEWAY).toBe(502);
    expect(HTTP_STATUS_CODES.SERVICE_UNAVAILABLE).toBe(503);
    expect(HTTP_STATUS_CODES.GATEWAY_TIMEOUT).toBe(504);
  });
});

describe("ERROR_MESSAGES", () => {
  it("should have NETWORK error messages", () => {
    expect(ERROR_MESSAGES.NETWORK.TIMEOUT).toContain("timeout");
    expect(ERROR_MESSAGES.NETWORK.CONNECTION_REFUSED).toContain("Connection refused");
    expect(ERROR_MESSAGES.NETWORK.DNS_LOOKUP_FAILED).toContain("DNS lookup failed");
  });

  it("should have VALIDATION error messages", () => {
    expect(ERROR_MESSAGES.VALIDATION.ASSERTION_FAILED).toContain("Assertion failed");
    expect(ERROR_MESSAGES.VALIDATION.SCHEMA_INVALID).toContain("Schema validation failed");
    expect(ERROR_MESSAGES.VALIDATION.VARIABLE_NOT_FOUND).toContain("not found");
  });

  it("should have FILE error messages", () => {
    expect(ERROR_MESSAGES.FILE.NOT_FOUND).toContain("not found");
    expect(ERROR_MESSAGES.FILE.INVALID_YAML).toContain("Invalid YAML");
    expect(ERROR_MESSAGES.FILE.PERMISSION_DENIED).toContain("Permission denied");
  });

  it("should have DEPENDENCY error messages", () => {
    expect(ERROR_MESSAGES.DEPENDENCY.CIRCULAR).toContain("Circular dependency");
    expect(ERROR_MESSAGES.DEPENDENCY.NOT_FOUND).toContain("not found");
    expect(ERROR_MESSAGES.DEPENDENCY.MAX_DEPTH_EXCEEDED).toContain("Maximum call depth");
  });
});

describe("isSuccessStatus", () => {
  it("should return true for 2xx status codes", () => {
    expect(isSuccessStatus(200)).toBe(true);
    expect(isSuccessStatus(201)).toBe(true);
    expect(isSuccessStatus(204)).toBe(true);
    expect(isSuccessStatus(299)).toBe(true);
  });

  it("should return false for non-2xx status codes", () => {
    expect(isSuccessStatus(199)).toBe(false);
    expect(isSuccessStatus(300)).toBe(false);
    expect(isSuccessStatus(400)).toBe(false);
    expect(isSuccessStatus(500)).toBe(false);
  });
});

describe("isClientError", () => {
  it("should return true for 4xx status codes", () => {
    expect(isClientError(400)).toBe(true);
    expect(isClientError(404)).toBe(true);
    expect(isClientError(422)).toBe(true);
    expect(isClientError(499)).toBe(true);
  });

  it("should return false for non-4xx status codes", () => {
    expect(isClientError(399)).toBe(false);
    expect(isClientError(500)).toBe(false);
    expect(isClientError(200)).toBe(false);
  });
});

describe("isServerError", () => {
  it("should return true for 5xx status codes", () => {
    expect(isServerError(500)).toBe(true);
    expect(isServerError(502)).toBe(true);
    expect(isServerError(503)).toBe(true);
    expect(isServerError(599)).toBe(true);
  });

  it("should return false for non-5xx status codes", () => {
    expect(isServerError(499)).toBe(false);
    expect(isServerError(600)).toBe(false);
    expect(isServerError(200)).toBe(false);
    expect(isServerError(400)).toBe(false);
  });
});
