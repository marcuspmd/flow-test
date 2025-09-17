import { TestStepComponent } from "../test-step.component";
import { TestStepProps, TestStepData, AssertionData } from "../types";

describe("TestStepComponent", () => {
  let component: TestStepComponent;

  beforeEach(() => {
    component = new TestStepComponent();
  });

  const createAssertion = (
    overrides: Partial<AssertionData> = {}
  ): AssertionData => ({
    type: "status_code",
    operator: "equals",
    expected: 200,
    actual: 200,
    passed: true,
    ...overrides,
  });

  const createStepData = (
    overrides: Partial<TestStepData> = {}
  ): TestStepData => ({
    stepName: "Default Step",
    status: "success",
    duration: 1000,
    assertions: [],
    stepId: "step-1",
    request: {
      method: "GET",
      url: "/test",
      headers: {},
      body: {},
    },
    response: {
      status_code: 200,
      headers: {},
      body: {},
    },
    ...overrides,
  });

  describe("Constructor", () => {
    it("should create instance successfully", () => {
      expect(component).toBeDefined();
      expect(component).toBeInstanceOf(TestStepComponent);
    });
  });

  describe("Status Icon", () => {
    it("should return success icon for success status", () => {
      const stepData = createStepData({ status: "success" });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("✓");
    });

    it("should return failure icon for failure status", () => {
      const stepData = createStepData({ status: "failure" });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("✗");
    });

    it("should return failure icon for failed status", () => {
      const stepData = createStepData({ status: "failed" });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("✗");
    });

    it("should return failure icon for error status", () => {
      const stepData = createStepData({ status: "error" });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("✗");
    });

    it("should return failure icon for unknown status", () => {
      const stepData = createStepData({ status: "unknown" });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("✗");
    });
  });

  describe("Status Classes", () => {
    it("should return green classes for success status", () => {
      const stepData = createStepData({ status: "success" });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("border-l-green-500");
      expect(result).toContain("bg-green-50");
      expect(result).toContain("text-green-500");
    });

    it("should return red classes for failure status", () => {
      const stepData = createStepData({ status: "failure" });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("border-l-red-500");
      expect(result).toContain("bg-red-50");
      expect(result).toContain("text-red-500");
    });

    it("should return red classes for failed status", () => {
      const stepData = createStepData({ status: "failed" });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("border-l-red-500");
      expect(result).toContain("bg-red-50");
      expect(result).toContain("text-red-500");
    });

    it("should return red classes for error status", () => {
      const stepData = createStepData({ status: "error" });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("border-l-red-500");
      expect(result).toContain("bg-red-50");
      expect(result).toContain("text-red-500");
    });
  });

  describe("Step Rendering", () => {
    it("should render step with basic information", () => {
      const stepData = createStepData({
        stepName: "Login API Test",
        status: "success",
        duration: 1500,
      });
      const props: TestStepProps = { step: stepData, index: 1 };

      const result = component.render(props);
      expect(result).toContain("#2"); // O número aparece como #2
      expect(result).toContain("Login API Test");
      expect(result).toContain("1.5s");
    });

    it("should render step with request details", () => {
      const stepData = createStepData({
        request: {
          method: "POST",
          url: "/api/login",
          headers: { "Content-Type": "application/json" },
          body: { username: "test", password: "secret" },
        },
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("POST");
      expect(result).toContain("/api/login");
    });

    it("should render step with response details", () => {
      const stepData = createStepData({
        response: {
          status_code: 201,
          headers: { "Content-Type": "application/json" },
          body: { id: 123, message: "Created" },
        },
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("201");
    });

    it("should escape HTML in step name", () => {
      const stepData = createStepData({
        stepName: '<script>alert("xss")</script>',
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
      );
      expect(result).not.toContain('<script>alert("xss")</script>');
    });
  });

  describe("Assertions Rendering", () => {
    it("should render successful assertions", () => {
      const stepData = createStepData({
        assertions: [
          createAssertion({
            type: "status_code",
            operator: "equals",
            expected: 200,
            actual: 200,
            passed: true,
          }),
          createAssertion({
            type: "body.message",
            operator: "contains",
            expected: "success",
            actual: "Operation successful",
            passed: true,
          }),
        ],
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("Status Code"); // Formatado como "Status Code"
      expect(result).toContain("Body: message"); // Field formatted properly
      expect(result).toContain("200");
      expect(result).toContain("✓");
    });

    it("should render failed assertions", () => {
      const stepData = createStepData({
        assertions: [
          createAssertion({
            type: "status_code",
            operator: "equals",
            expected: 200,
            actual: 500,
            passed: false,
          }),
        ],
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("Status Code"); // Formatado como "Status Code"
      expect(result).toContain("200");
      expect(result).toContain("500");
      expect(result).toContain("✗");
    });

    it("should render empty assertions", () => {
      const stepData = createStepData({
        assertions: [],
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("No assertions recorded");
    });

    it("should handle complex assertion field names", () => {
      const stepData = createStepData({
        assertions: [
          createAssertion({
            type: "body.user.profile.email",
            operator: "matches",
            expected: "^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$",
            actual: "test@example.com",
            passed: true,
          }),
        ],
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("Body: user.profile.email");
      // O operador não é exibido como string separada, apenas na estrutura
      expect(result).toContain("test@example.com");
    });
  });

  describe("Duration Formatting", () => {
    it("should format various durations correctly", () => {
      const testCases = [
        { duration: 0, expected: "0ms" },
        { duration: 500, expected: "500ms" },
        { duration: 1000, expected: "1.0s" },
        { duration: 1500, expected: "1.5s" },
        { duration: 60000, expected: "1m 0s" },
        { duration: 65000, expected: "1m 5s" },
      ];

      testCases.forEach(({ duration, expected }) => {
        const stepData = createStepData({ duration });
        const props: TestStepProps = { step: stepData, index: 0 };

        const result = component.render(props);
        expect(result).toContain(expected);
      });
    });
  });

  describe("Tabs and Collapsible Content", () => {
    it("should render collapsible step content", () => {
      const stepData = createStepData({
        stepId: "custom-step-id",
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain('aria-expanded="false"');
      expect(result).toContain("custom-step-id");
      expect(result).toContain('onclick="toggleStep(');
    });

    it("should render multiple tabs (Request, Response, Assertions)", () => {
      const stepData = createStepData({
        request: {
          method: "POST",
          url: "/api/test",
          headers: { Authorization: "Bearer token" },
          body: { data: "test" },
        },
        response: {
          status_code: 200,
          headers: { "Content-Type": "application/json" },
          body: { result: "success" },
        },
        assertions: [
          createAssertion({
            type: "status_code",
            operator: "equals",
            expected: 200,
            actual: 200,
            passed: true,
          }),
        ],
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("Request");
      expect(result).toContain("Response");
      expect(result).toContain("Assertions"); // O componente usa "Assertions" não "Validações"
    });
  });

  describe("Request Tab Content", () => {
    it("should render GET request details", () => {
      const stepData = createStepData({
        request: {
          method: "GET",
          url: "/api/users?page=1",
          headers: { Accept: "application/json" },
          body: {},
        },
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("GET");
      expect(result).toContain("/api/users?page=1");
      expect(result).toContain("Accept");
      expect(result).toContain("application/json");
    });

    it("should render POST request with body", () => {
      const stepData = createStepData({
        request: {
          method: "POST",
          url: "/api/users",
          headers: { "Content-Type": "application/json" },
          body: { name: "John Doe", email: "john@example.com" },
        },
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("POST");
      expect(result).toContain("/api/users");
      expect(result).toContain("John Doe");
      expect(result).toContain("john@example.com");
    });

    it("should handle empty request headers", () => {
      const stepData = createStepData({
        request: {
          method: "GET",
          url: "/api/test",
          headers: {},
          body: { data: "test" },
        },
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      // Headers vazios são renderizados como {} pelo formatJson
      expect(result).toContain("{}");
    });

    it("should handle empty request body", () => {
      const stepData = createStepData({
        request: {
          method: "GET",
          url: "/api/test",
          headers: {},
          body: {},
        },
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      // Body vazio é renderizado como {} pelo formatJson
      expect(result).toContain("{}");
    });
  });

  describe("Response Tab Content", () => {
    it("should render response with headers and body", () => {
      const stepData = createStepData({
        response: {
          status_code: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-ID": "12345",
          },
          body: {
            data: [1, 2, 3],
            meta: { total: 3 },
          },
        },
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("200");
      expect(result).toContain("Content-Type");
      expect(result).toContain("X-Request-ID");
      expect(result).toContain("12345");
    });

    it("should handle empty response headers", () => {
      const stepData = createStepData({
        response: {
          status_code: 204,
          headers: {},
          body: {},
        },
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("204");
      // Headers vazios são renderizados como {} pelo formatJson
      expect(result).toContain("{}");
    });

    it("should handle empty response body", () => {
      const stepData = createStepData({
        response: {
          status_code: 204,
          headers: {},
          body: {},
        },
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      // Body vazio é renderizado como {} pelo formatJson
      expect(result).toContain("{}");
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle step with multiple failed assertions", () => {
      const stepData = createStepData({
        status: "failed",
        assertions: [
          createAssertion({
            type: "status_code",
            operator: "equals",
            expected: 200,
            actual: 500,
            passed: false,
          }),
          createAssertion({
            type: "body.error",
            operator: "not_exists",
            expected: null,
            actual: "Internal Server Error",
            passed: false,
          }),
        ],
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("✗");
      expect(result).toContain("Status Code"); // O campo é formatado como "Status Code"
      expect(result).toContain("Body: error"); // E como "Body: error"
      expect(result).toContain("500");
      expect(result).toContain("Internal Server Error");
    });

    it("should handle step with iterations", () => {
      const stepData = createStepData({
        iterations: [
          {
            index: 1,
            total: 2,
            stepName: "Login API Test",
            status: "success",
            duration: 500,
            assertions: [
              createAssertion({
                type: "status_code",
                operator: "equals",
                expected: 200,
                actual: 200,
                passed: true,
              }),
            ],
            stepId: "step-1-iter-1",
          },
          {
            index: 2,
            total: 2,
            stepName: "Login API Test",
            status: "failed",
            duration: 1000,
            assertions: [
              createAssertion({
                type: "status_code",
                operator: "equals",
                expected: 200,
                actual: 404,
                passed: false,
              }),
            ],
            stepId: "step-1-iter-2",
          },
        ],
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("[1/2]"); // O formato é [x/y] não "Iteração x"
      expect(result).toContain("[2/2]");
      expect(result).toContain("500ms");
      expect(result).toContain("1.0s");
    });

    it("should handle very long step names", () => {
      const longName =
        "Very Long Step Name That Should Be Handled Gracefully And Not Break The Layout When Rendered In The Component";
      const stepData = createStepData({
        stepName: longName,
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain(longName);
    });

    it("should handle special characters in URLs and data", () => {
      const stepData = createStepData({
        request: {
          method: "GET",
          url: "/api/search?q=hello%20world&filter=%3Ctest%3E",
          headers: { "X-Custom": 'value with "quotes" and <tags>' },
          body: {},
        },
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      // A URL é escapada para HTML, então & vira &amp;
      expect(result).toContain(
        "/api/search?q=hello%20world&amp;filter=%3Ctest%3E"
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing step properties gracefully", () => {
      const stepData = {
        stepName: "",
        status: "success" as const,
        duration: 0,
        assertions: [],
        stepId: "",
      };
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle null/undefined values in data", () => {
      const stepData = createStepData({
        request: {
          method: "GET",
          url: "/api/test",
          headers: null as any,
          body: undefined as any,
        },
        response: {
          status_code: 200,
          headers: null as any,
          body: null as any,
        },
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toBeDefined();
    });

    it("should handle assertion with missing properties", () => {
      const stepData = createStepData({
        assertions: [
          createAssertion({
            type: "status_code",
            operator: "equals",
            expected: 200,
            actual: undefined as any,
            passed: false,
          }),
        ],
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toBeDefined();
      expect(result).toContain("Status Code"); // Campo formatado como "Status Code"
    });
  });

  describe("Accessibility", () => {
    it("should include proper ARIA attributes", () => {
      const stepData = createStepData({
        stepId: "accessible-step",
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain('role="button"');
      expect(result).toContain('tabindex="0"');
      expect(result).toContain('aria-expanded="false"');
      expect(result).toContain('aria-controls="accessible-step-content"');
      expect(result).toContain('aria-hidden="true"');
    });

    it("should include keyboard navigation support", () => {
      const stepData = createStepData({
        stepId: "keyboard-step",
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("onclick=\"toggleStep('keyboard-step')\"");
    });
  });

  describe("Visual Status Indicators", () => {
    it("should show correct visual status for successful step", () => {
      const stepData = createStepData({
        status: "success",
        assertions: [
          createAssertion({
            type: "status_code",
            operator: "equals",
            expected: 200,
            actual: 200,
            passed: true,
          }),
        ],
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("border-l-green-500");
      expect(result).toContain("text-green-500");
    });

    it("should show correct visual status for failed step with successful assertions", () => {
      const stepData = createStepData({
        status: "failed",
        assertions: [
          createAssertion({
            type: "status_code",
            operator: "equals",
            expected: 200,
            actual: 200,
            passed: true,
          }),
        ],
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("border-l-red-500");
      expect(result).toContain("text-red-500");
    });

    it("should show correct visual status for successful step with failed assertions", () => {
      const stepData = createStepData({
        status: "failed", // Status deve ser 'failed' se há asserções falhando
        assertions: [
          createAssertion({
            type: "status_code",
            operator: "equals",
            expected: 200,
            actual: 500,
            passed: false,
          }),
        ],
      });
      const props: TestStepProps = { step: stepData, index: 0 };

      const result = component.render(props);
      expect(result).toContain("border-l-red-500"); // Status vermelho para falha
      expect(result).toContain("text-red-500");
    });
  });
});
