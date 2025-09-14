/**
 * Comprehensive test suite for ModularHtmlGenerator - Extended Coverage
 * Focusing on achieving 95%+ coverage by testing all edge cases and private methods
 */

import * as fs from "fs";
import * as path from "path";
import { ModularHtmlGenerator } from "../modular-html-generator";

// Mock fs module
jest.mock("fs");

describe("ModularHtmlGenerator - Extended Coverage", () => {
  let generator: ModularHtmlGenerator;
  const mockFs = fs as jest.Mocked<typeof fs>;

  // Sample test data
  const sampleResult = {
    project_name: "Extended Test Project",
    total_tests: 10,
    successful_tests: 8,
    failed_tests: 2,
    success_rate: 80,
    total_duration_ms: 2500,
    suites_results: [
      {
        suite_name: "Authentication Tests",
        status: "PASS",
        duration_ms: 500,
        steps_results: [
          {
            step_name: "Login with valid credentials",
            status: "success",
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
              curl_command:
                'curl -X POST "/auth/login" -H "Content-Type: application/json"',
              raw_request:
                "POST /auth/login HTTP/1.1\nContent-Type: application/json",
            },
            response_details: {
              status: 200,
              headers: { "Content-Type": "application/json" },
              body: { token: "auth_token_123", success: true },
              raw_response: "HTTP/1.1 200 OK\nContent-Type: application/json",
            },
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    generator = new ModularHtmlGenerator();
    jest.clearAllMocks();

    // Setup comprehensive mock implementations
    mockFs.readFileSync.mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("tailwind.css") || pathStr.includes("styles.css")) {
        return "body { font-family: sans-serif; margin: 0; }";
      }
      if (pathStr.includes("flow.png")) {
        return Buffer.from("fake_image_data");
      }
      if (pathStr.includes("theme.css")) {
        return ":root { --primary: #007bff; --success: #28a745; }";
      }
      if (pathStr.includes("chart.min.js")) {
        return "window.Chart = { register: () => {} };";
      }
      return "mock content";
    });

    mockFs.existsSync.mockReturnValue(true);
  });

  describe("buildSummaryCardsData edge cases", () => {
    it("should handle 100% success rate correctly", () => {
      const perfectResult = {
        ...sampleResult,
        successful_tests: 10,
        failed_tests: 0,
        success_rate: 100,
      };
      const result = generator.generate(perfectResult);
      expect(result).toContain("100.0%");
      expect(result).toContain("text-success-600"); // success color scheme
    });

    it("should handle 0% success rate correctly", () => {
      const failedResult = {
        ...sampleResult,
        successful_tests: 0,
        failed_tests: 10,
        success_rate: 0,
      };
      const result = generator.generate(failedResult);
      expect(result).toContain("0.0%");
      expect(result).toContain("text-error-600"); // error color scheme
    });

    it("should handle 80% success rate correctly (warning zone)", () => {
      const result = generator.generate(sampleResult);
      expect(result).toContain("80.0%");
      expect(result).toContain("text-warning-600"); // warning color scheme
    });

    it("should handle undefined/null values gracefully", () => {
      const incompleteResult = {
        project_name: undefined,
        total_tests: undefined,
        successful_tests: undefined,
        failed_tests: undefined,
        success_rate: undefined,
      };
      const result = generator.generate(incompleteResult as any);
      expect(result).toContain("0"); // default values
      expect(result).toContain("0.0%");
    });
  });

  describe("buildTestSuiteProps with complex iteration patterns", () => {
    it("should handle iteration patterns [i/N] correctly", () => {
      const iterationResult = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Load Testing",
            status: "PASS",
            duration_ms: 600,
            steps_results: [
              {
                step_name: "API Load Test [1/3]",
                status: "success",
                duration_ms: 200,
                assertions_results: [],
              },
              {
                step_name: "API Load Test [2/3]",
                status: "success",
                duration_ms: 180,
                assertions_results: [],
              },
              {
                step_name: "API Load Test [3/3]",
                status: "failure",
                duration_ms: 220,
                assertions_results: [],
              },
              {
                step_name: "Regular Step",
                status: "success",
                duration_ms: 100,
                assertions_results: [],
              },
            ],
          },
        ],
      };

      const result = generator.generate(iterationResult);
      expect(result).toContain("API Load Test");
      expect(result).toContain("[1/3]");
      expect(result).toContain("[2/3]");
      expect(result).toContain("[3/3]");
      expect(result).toContain("Regular Step");
    });

    it("should handle embedded iteration_results", () => {
      const embeddedResult = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Embedded Iterations",
            status: "PASS",
            duration_ms: 450,
            steps_results: [
              {
                step_name: "Parent Step",
                status: "success",
                duration_ms: 450,
                iteration_results: [
                  {
                    step_name: "Child Step [1/2]",
                    status: "success",
                    duration_ms: 200,
                    assertions_results: [],
                  },
                  {
                    step_name: "Child Step [2/2]",
                    status: "failure",
                    duration_ms: 250,
                    assertions_results: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = generator.generate(embeddedResult);
      expect(result).toContain("Parent Step");
    });

    it("should handle scenarios_meta data", () => {
      const scenarioResult = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Scenario Testing",
            status: "PASS",
            duration_ms: 300,
            steps_results: [
              {
                step_name: "Multi-scenario Test",
                status: "success",
                duration_ms: 300,
                scenarios_meta: {
                  has_scenarios: true,
                  executed_count: 5,
                  evaluations: [
                    { name: "scenario_1", result: true },
                    { name: "scenario_2", result: false },
                    { name: "scenario_3", result: true },
                  ],
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(scenarioResult);
      expect(result).toContain("Multi-scenario Test");
    });

    it("should handle available_variables with total_scenarios_tested", () => {
      const variableResult = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Variable Testing",
            status: "PASS",
            duration_ms: 200,
            steps_results: [
              {
                step_name: "Variable Test Step",
                status: "success",
                duration_ms: 200,
                available_variables: {
                  total_scenarios_tested: 12,
                  user_id: "12345",
                  session_token: "abc123",
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(variableResult);
      expect(result).toContain("Variable Test Step");
    });

    it("should handle steps without step_name", () => {
      const noNameResult = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Unnamed Steps",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                // step_name is missing
                status: "success",
                duration_ms: 100,
                assertions_results: [],
              },
              {
                step_name: "", // empty string
                status: "success",
                duration_ms: 50,
                assertions_results: [],
              },
            ],
          },
        ],
      };

      const result = generator.generate(noNameResult);
      expect(result).toContain("Step 1");
      expect(result).toContain("Step 2");
    });
  });

  describe("interpolation testing via generate method", () => {
    it("should handle all faker patterns through generate", () => {
      const resultWithFaker = {
        ...sampleResult,
        project_name: "Project {{$faker.company.name}}",
        suites_results: [
          {
            suite_name: "Suite {{$faker.person.firstName}}",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name: "Step {{$faker.string.uuid}}",
                status: "success",
                duration_ms: 100,
                request_details: {
                  method: "POST",
                  url: "/api/{{$faker.string.alphanumeric}}",
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(resultWithFaker);
      expect(result).toContain("TechCorp");
      expect(result).toContain("John");
      expect(result).toContain("550e8400-e29b-41d4-a716-446655440000");
      expect(result).toContain("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6");
    });

    it("should handle JavaScript expressions through generate", () => {
      const resultWithJS = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "JS Suite",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name: "JS Step",
                status: "success",
                duration_ms: 100,
                request_details: {
                  method: "GET",
                  url: "/api/random/{{$js.Math.random()}}",
                  headers: {
                    "X-Timestamp": "{{$js.new Date().toISOString()}}",
                  },
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(resultWithJS);
      expect(result).toContain("[JS Expression Result]");
    });

    it("should handle mock response patterns through generate", () => {
      const resultWithMocks = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Mock Suite",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name: "Mock Step",
                status: "success",
                duration_ms: 100,
                response_details: {
                  status: 200,
                  body: {
                    userData: "{{mock_responses.user_data}}",
                    apiResult: "{{mock_responses.api.result}}",
                  },
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(resultWithMocks);
      expect(result).toContain("[Mock Response Value]");
    });

    it("should handle URL encoding/decoding through generate", () => {
      const resultWithEncoding = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Encoding Suite",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name: "Encoding Step",
                status: "success",
                duration_ms: 100,
                request_details: {
                  method: "GET",
                  url: "/search?q=%7B%7Bkeyword%7D%7D",
                  body: "encoded%20data%20%7B%22test%22%3A%22value%22%7D",
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(resultWithEncoding);
      expect(result).toContain("{{keyword}}");
      expect(result).toContain('{"test":"value"}');
    });

    it("should handle environment variable patterns through generate", () => {
      const resultWithEnv = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Env Suite",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name: "Env Step",
                status: "success",
                duration_ms: 100,
                request_details: {
                  method: "GET",
                  url: "/api/{{$env.API_VERSION}}",
                  headers: {
                    Authorization: "Bearer {{$env.API_TOKEN}}",
                    "X-Environment": "{{$env.NODE_ENV}}",
                  },
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(resultWithEnv);
      expect(result).toContain("[ENV:API_VERSION]");
      expect(result).toContain("[ENV:API_TOKEN]");
      expect(result).toContain("[ENV:NODE_ENV]");
    });

    it("should handle complex nested interpolation through generate", () => {
      const resultWithNested = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Nested Suite",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name: "Nested Step",
                status: "success",
                duration_ms: 100,
                request_details: {
                  method: "POST",
                  body: {
                    user: {
                      name: "{{$faker.person.firstName}}",
                      contacts: [
                        "{{$faker.internet.email}}",
                        "{{$faker.phone.number}}",
                      ],
                      metadata: {
                        env: "{{$env.ENVIRONMENT}}",
                        uuid: "{{$faker.string.uuid}}",
                      },
                    },
                  },
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(resultWithNested);
      expect(result).toContain("John");
      expect(result).toContain("john.doe@example.com");
      expect(result).toContain("+1-555-123-4567");
      expect(result).toContain("[ENV:ENVIRONMENT]");
      expect(result).toContain("550e8400-e29b-41d4-a716-446655440000");
    });
  });

  describe("loadAssets edge cases", () => {
    it("should handle missing files gracefully", () => {
      mockFs.existsSync.mockReturnValue(false);

      // Create new generator to trigger loadAssets
      const newGenerator = new ModularHtmlGenerator();
      const result = newGenerator.generate(sampleResult);

      expect(result).toContain("<!DOCTYPE html>");
    });

    it("should handle file read errors gracefully", () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("File read error");
      });

      // Should not throw, should warn instead
      expect(() => {
        new ModularHtmlGenerator();
      }).not.toThrow();
    });

    it("should combine CSS correctly when all files exist", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((path) => {
        const pathStr = path.toString();
        if (pathStr.includes("styles.css")) {
          return ".tailwind-class { color: blue; }";
        }
        if (pathStr.includes("theme.css")) {
          return ":root { --custom: red; }";
        }
        return "";
      });

      const newGenerator = new ModularHtmlGenerator();
      const result = newGenerator.generate(sampleResult);

      expect(result).toContain(".tailwind-class");
      expect(result).toContain("--custom: red");
    });
  });

  describe("complex data structure handling", () => {
    it("should handle completely empty/null suite results", () => {
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
      expect(result).toContain("0");
      expect(result).toContain("0.0%");
    });

    it("should handle malformed suite data", () => {
      const malformedResult = {
        project_name: undefined,
        total_tests: undefined,
        suites_results: [
          {
            suite_name: "",
            status: undefined,
            duration_ms: undefined,
            steps_results: [
              {
                step_name: undefined,
                status: undefined,
                duration_ms: undefined,
                assertions_results: undefined,
              },
            ],
          },
        ],
      };

      const result = generator.generate(malformedResult as any);
      expect(result).toContain("Test Report"); // default project name
      expect(result).toContain("Step 1"); // default step name
    });

    it("should handle steps with complex request/response data", () => {
      const complexStepResult = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Complex Data Suite",
            status: "PASS",
            duration_ms: 300,
            steps_results: [
              {
                step_name: "Complex Request Step",
                status: "success",
                duration_ms: 300,
                assertions_results: [
                  {
                    type: "json_path",
                    field: "response.body.user.name",
                    passed: true,
                    expected: "John Doe",
                    actual: "John Doe",
                  },
                  {
                    type: "regex",
                    field: "response.headers.content-type",
                    passed: false,
                    expected: "/application\\/json/",
                    actual: "text/html",
                  },
                ],
                request_details: {
                  method: "POST",
                  url: "/api/users/create",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer {{auth_token}}",
                    "X-Request-ID": "{{$faker.string.uuid}}",
                  },
                  body: {
                    user: {
                      name: "{{$faker.person.fullName}}",
                      email: "{{$faker.internet.email}}",
                      preferences: {
                        theme: "dark",
                        notifications: true,
                      },
                    },
                    metadata: ["{{$env.ENVIRONMENT}}", "api-test"],
                  },
                  curl_command:
                    'curl -X POST "/api/users/create" -d \'{"user":{"name":"John"}}\'',
                  raw_request:
                    "POST /api/users/create HTTP/1.1\nContent-Length: 100",
                },
                response_details: {
                  status: 201,
                  headers: {
                    "Content-Type": "application/json",
                    Location: "/users/12345",
                  },
                  body: {
                    id: 12345,
                    user: {
                      name: "John Doe",
                      email: "john@example.com",
                    },
                    created_at: "2023-01-01T00:00:00Z",
                  },
                  raw_response:
                    "HTTP/1.1 201 Created\nContent-Type: application/json",
                },
              },
            ],
          },
        ],
      };

      const result = generator.generate(complexStepResult);
      expect(result).toContain("Complex Request Step");
      expect(result).toContain("POST");
      expect(result).toContain("/api/users/create");
      expect(result).toContain("Bearer");
      expect(result).toContain("550e8400-e29b-41d4-a716-446655440000"); // UUID replacement
      expect(result).toContain("John"); // Faker replacement
      expect(result).toContain("john.doe@example.com"); // Email replacement
      expect(result).toContain("[ENV:ENVIRONMENT]"); // Env replacement
      expect(result).toContain("201");
    });

    it("should handle missing request/response details", () => {
      const minimalStepResult = {
        ...sampleResult,
        suites_results: [
          {
            suite_name: "Minimal Suite",
            status: "PASS",
            duration_ms: 100,
            steps_results: [
              {
                step_name: "Minimal Step",
                status: "success",
                duration_ms: 100,
                // No request_details or response_details
                assertions_results: [],
              },
            ],
          },
        ],
      };

      const result = generator.generate(minimalStepResult);
      expect(result).toContain("Minimal Step");
    });
  });

  describe("header props generation", () => {
    it("should generate correct header with all data", () => {
      const result = generator.generate(sampleResult);
      expect(result).toContain("Extended Test Project");
      expect(result).toContain("10"); // total tests
      expect(result).toContain("8"); // successful
      expect(result).toContain("2"); // failed
    });

    it("should handle missing project name", () => {
      const noProjectResult = { ...sampleResult, project_name: undefined };

      const result = generator.generate(noProjectResult);
      expect(result).toContain("Test Report"); // default name
    });

    it("should handle missing metadata", () => {
      const noMetadataResult = {
        project_name: "Simple Project",
        suites_results: [],
      };

      const result = generator.generate(noMetadataResult);
      expect(result).toContain("Simple Project");
      expect(result).toContain("0"); // default counts
    });
  });
});
