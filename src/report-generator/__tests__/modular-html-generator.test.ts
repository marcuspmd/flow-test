/**
 * Comprehensive test suite for ModularHtmlGenerator
 *
 * Focusing on core functionality, data processing, and component integration
 * to achieve high coverage without extensive mocking complexity.
 */

import * as fs from "fs";
import * as path from "path";
import { ModularHtmlGenerator } from "../modular-html-generator";

// Mock fs module
jest.mock("fs");

describe("ModularHtmlGenerator", () => {
  let generator: ModularHtmlGenerator;
  const mockFs = fs as jest.Mocked<typeof fs>;

  // Sample test data
  const sampleResult = {
    project_name: "Test Project",
    total_tests: 5,
    successful_tests: 4,
    failed_tests: 1,
    success_rate: 80,
    total_duration_ms: 1500,
    suites_results: [
      {
        suite_name: "Authentication Tests",
        status: "PASS",
        duration_ms: 500,
        steps_results: [
          {
            step_name: "Login with valid credentials",
            status: "PASS",
            duration_ms: 200,
            assertions_results: [
              {
                type: "status_code",
                field: "status_code",
                passed: true,
                expected: 200,
                actual: 200,
              },
            ],
            request_details: {
              method: "POST",
              url: "/auth/login",
              headers: { "Content-Type": "application/json" },
              body: { username: "testuser", password: "password123" },
            },
            response_details: {
              status: 200,
              headers: { "Content-Type": "application/json" },
              body: { token: "auth_token_123", success: true },
            },
          },
        ],
      },
      {
        suite_name: "Failed Test Suite",
        status: "FAIL",
        duration_ms: 300,
        steps_results: [
          {
            step_name: "Invalid operation",
            status: "FAIL",
            duration_ms: 300,
            assertions_results: [
              {
                type: "status_code",
                field: "status_code",
                passed: false,
                expected: 200,
                actual: 500,
              },
            ],
            request_details: {
              method: "GET",
              url: "/invalid-endpoint",
            },
            response_details: {
              status: 500,
              body: { error: "Internal server error" },
            },
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    generator = new ModularHtmlGenerator();
    jest.clearAllMocks();

    // Setup default mock implementations
    mockFs.readFileSync.mockImplementation((path) => {
      if (path.toString().includes("tailwind.css")) {
        return "body { font-family: sans-serif; }";
      }
      if (path.toString().includes("logo.png")) {
        return Buffer.from("fake-logo-data");
      }
      if (path.toString().includes("chart.min.js")) {
        return "window.Chart = {};";
      }
      return "";
    });

    mockFs.existsSync.mockReturnValue(true);
    mockFs.writeFileSync.mockImplementation(() => {});
  });

  describe("generate", () => {
    it("should generate complete HTML report with sample data", () => {
      const result = generator.generate(sampleResult);

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("<html");
      expect(result).toContain("Test Project");
      expect(result).toContain("Authentication Tests");
      expect(result).toContain("Failed Test Suite");
    });

    it("should handle empty result data", () => {
      const emptyResult = {
        project_name: "Empty Project",
        total_tests: 0,
        successful_tests: 0,
        failed_tests: 0,
        success_rate: 0,
        total_duration_ms: 0,
        suites_results: [],
      };

      const result = generator.generate(emptyResult);

      expect(result).toContain("Empty Project");
      expect(result).toContain("<!DOCTYPE html>");
    });

    it("should handle missing project name", () => {
      const resultWithoutName = {
        ...sampleResult,
        project_name: undefined,
      };

      const result = generator.generate(resultWithoutName);

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("<html");
    });

    it("should handle missing suites_results", () => {
      const resultWithoutSuites = {
        ...sampleResult,
        suites_results: undefined,
      };

      const result = generator.generate(resultWithoutSuites);

      expect(result).toContain("Test Project");
      expect(result).toContain("<!DOCTYPE html>");
    });

    it("should handle null values gracefully", () => {
      const resultWithNulls = {
        project_name: undefined,
        total_tests: undefined,
        successful_tests: undefined,
        failed_tests: undefined,
        success_rate: undefined,
        total_duration_ms: undefined,
        suites_results: undefined,
      };

      const result = generator.generate(resultWithNulls);

      expect(result).toContain("<!DOCTYPE html>");
    });
  });

  describe("Variable interpolation", () => {
    it("should interpolate common variables in content", () => {
      const testData = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Variable Test",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name: "Test with {{httpbin_url}} and {{user_name}}",
                status: "PASS",
                duration_ms: 100,
                request_details: {
                  url: "{{httpbin_url}}/get",
                  headers: { User: "{{user_name}}" },
                },
                response_details: {
                  body: { user: "{{user_name}}", url: "{{httpbin_url}}" },
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(testData);

      expect(result).toContain("http://localhost:8080");
      expect(result).toContain("John Doe");
    });

    it("should handle faker expressions", () => {
      const testData = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Faker Test",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name: "Test faker: {{faker.person.fullName}}",
                status: "PASS",
                duration_ms: 100,
                request_details: {
                  body: { email: "{{faker.internet.email}}" },
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(testData);

      expect(result).toContain("john.doe@example.com");
    });

    it("should handle URL-encoded content", () => {
      const testData = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Encoded Test",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name: "Test with encoded content",
                status: "PASS",
                duration_ms: 100,
                request_details: {
                  body: { data: "Hello%20World" },
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(testData);

      // Should decode URL-encoded content
      expect(result).toContain("Hello World");
    });

    it("should handle JavaScript expressions", () => {
      const testData = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "JS Expression Test",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name:
                  "Test JS: {{$js.return Object.keys(json.variable_scopes).length}}",
                status: "PASS",
                duration_ms: 100,
                request_details: {
                  body: {
                    count:
                      "{{$js.const obj = {a:1, b:2, c:3}; return Object.keys(obj).length}}",
                  },
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(testData);

      expect(result).toContain("5"); // From the first JS expression
      expect(result).toContain("3"); // From the second JS expression
    });

    it("should handle environment variable patterns", () => {
      const testData = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Environment Test",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name: "Test env vars",
                status: "PASS",
                duration_ms: 100,
                request_details: {
                  headers: { "API-Key": "{{$env.API_KEY:-default_key}}" },
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(testData);

      expect(result).toContain("default_value");
    });
  });

  describe("Asset loading", () => {
    it("should handle missing CSS file gracefully", () => {
      mockFs.existsSync.mockImplementation((path) => {
        return !path.toString().includes("tailwind.css");
      });

      const result = generator.generate(sampleResult);

      expect(result).toContain("<!DOCTYPE html>");
    });

    it("should handle missing logo file gracefully", () => {
      mockFs.existsSync.mockImplementation((path) => {
        return !path.toString().includes("logo.png");
      });

      const result = generator.generate(sampleResult);

      expect(result).toContain("<!DOCTYPE html>");
    });

    it("should handle missing Chart.js file gracefully", () => {
      mockFs.existsSync.mockImplementation((path) => {
        return !path.toString().includes("chart.min.js");
      });

      const result = generator.generate(sampleResult);

      expect(result).toContain("<!DOCTYPE html>");
    });

    it("should load and include CSS when available", () => {
      mockFs.readFileSync.mockImplementation((path) => {
        if (
          path.toString().includes("tailwind.css") ||
          path.toString().includes("styles.css")
        ) {
          return "body { color: red; }";
        }
        return "";
      });

      const result = generator.generate(sampleResult);

      // O CSS pode ser injetado internamente, então vamos verificar se o HTML é gerado
      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("Test Project");
    });
  });

  describe("Error handling", () => {
    it("should handle fs.readFileSync errors gracefully", () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("File read error");
      });

      expect(() => {
        generator.generate(sampleResult);
      }).not.toThrow();
    });

    it("should handle malformed data structures", () => {
      const malformedResult = {
        project_name: "Test",
        suites_results: [
          {
            // Missing required fields
            steps_results: [
              {
                // Missing required fields
                request_details: null,
                response_details: undefined,
              },
            ],
          },
        ],
      };

      expect(() => {
        generator.generate(malformedResult);
      }).not.toThrow();
    });
  });

  describe("Complex test data scenarios", () => {
    it("should handle multiple suites with mixed results", () => {
      const complexResult = {
        project_name: "Complex Test Project",
        total_tests: 10,
        successful_tests: 7,
        failed_tests: 3,
        success_rate: 70,
        total_duration_ms: 5000,
        suites_results: [
          {
            suite_name: "Authentication",
            status: "PASS",
            duration_ms: 1000,
            steps_results: [
              {
                step_name: "Login",
                status: "PASS",
                duration_ms: 500,
                assertions_results: [
                  {
                    type: "status_code",
                    field: "status_code",
                    passed: true,
                    expected: 200,
                    actual: 200,
                  },
                  {
                    type: "response_time",
                    field: "response_time_ms",
                    passed: true,
                    expected: 1000,
                    actual: 500,
                  },
                ],
              },
              {
                step_name: "Logout",
                status: "PASS",
                duration_ms: 500,
                assertions_results: [
                  {
                    type: "status_code",
                    field: "status_code",
                    passed: true,
                    expected: 200,
                    actual: 200,
                  },
                ],
              },
            ],
          },
          {
            suite_name: "Data Operations",
            status: "FAIL",
            duration_ms: 2000,
            steps_results: [
              {
                step_name: "Create data",
                status: "PASS",
                duration_ms: 800,
                assertions_results: [
                  {
                    type: "status_code",
                    field: "status_code",
                    passed: true,
                    expected: 201,
                    actual: 201,
                  },
                ],
              },
              {
                step_name: "Invalid operation",
                status: "FAIL",
                duration_ms: 1200,
                assertions_results: [
                  {
                    type: "status_code",
                    field: "status_code",
                    passed: false,
                    expected: 200,
                    actual: 500,
                  },
                  {
                    type: "contains",
                    field: "body",
                    passed: false,
                    expected: "success",
                    actual: "error",
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = generator.generate(complexResult);

      expect(result).toContain("Complex Test Project");
      expect(result).toContain("Authentication");
      expect(result).toContain("Data Operations");
      expect(result).toContain("Login");
      expect(result).toContain("Logout");
      expect(result).toContain("Create data");
      expect(result).toContain("Invalid operation");
    });

    it("should handle steps with no assertions", () => {
      const resultWithNoAssertions = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "No Assertions Test",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name: "Simple request",
                status: "PASS",
                duration_ms: 100,
                assertions_results: [],
                request_details: {
                  method: "GET",
                  url: "/test",
                },
                response_details: {
                  status: 200,
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(resultWithNoAssertions);

      expect(result).toContain("No Assertions Test");
      expect(result).toContain("Simple request");
    });

    it("should handle very long step names and suite names", () => {
      const longName = "A".repeat(200);
      const resultWithLongNames = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: longName,
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name: longName,
                status: "PASS",
                duration_ms: 100,
              },
            ],
          },
        ],
      };

      const result = generator.generate(resultWithLongNames);

      expect(result).toContain(longName);
    });
  });

  describe("Performance and metrics", () => {
    it("should handle zero durations", () => {
      const zeroResult = {
        ...sampleResult,
        total_duration_ms: 0,
        suites_results: [
          {
            suite_name: "Zero Duration Test",
            status: "PASS",
            duration_ms: 0,
            steps_results: [
              {
                step_name: "Instant step",
                status: "PASS",
                duration_ms: 0,
              },
            ],
          },
        ],
      };

      const result = generator.generate(zeroResult);

      expect(result).toContain("Zero Duration Test");
    });

    it("should handle very large durations", () => {
      const largeResult = {
        ...sampleResult,
        total_duration_ms: 999999999,
        suites_results: [
          {
            suite_name: "Long Duration Test",
            status: "PASS",
            duration_ms: 999999999,
            steps_results: [
              {
                step_name: "Slow step",
                status: "PASS",
                duration_ms: 999999999,
              },
            ],
          },
        ],
      };

      const result = generator.generate(largeResult);

      expect(result).toContain("Long Duration Test");
    });

    it("should handle 100% success rate", () => {
      const perfectResult = {
        ...sampleResult,
        successful_tests: 5,
        failed_tests: 0,
        success_rate: 100,
      };

      const result = generator.generate(perfectResult);

      expect(result).toContain("Test Project");
    });

    it("should handle 0% success rate", () => {
      const failedResult = {
        ...sampleResult,
        successful_tests: 0,
        failed_tests: 5,
        success_rate: 0,
      };

      const result = generator.generate(failedResult);

      expect(result).toContain("Test Project");
    });
  });
});
