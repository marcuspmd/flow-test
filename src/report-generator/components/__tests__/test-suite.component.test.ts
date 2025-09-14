import { TestSuiteComponent } from "../test-suite.component";
import { TestSuiteProps, TestStepData } from "../types";

describe("TestSuiteComponent", () => {
  let component: TestSuiteComponent;

  beforeEach(() => {
    component = new TestSuiteComponent();
  });

  const createTestStep = (
    status: "success" | "failure",
    stepName: string,
    stepId?: string
  ): TestStepData => ({
    stepName,
    status,
    duration: 1000,
    assertions: [],
    stepId: stepId || `step-${stepName.replace(/\s+/g, "-").toLowerCase()}`,
  });

  describe("Constructor", () => {
    it("should create instance successfully", () => {
      expect(component).toBeDefined();
      expect(component).toBeInstanceOf(TestSuiteComponent);
    });
  });

  describe("Status Icon", () => {
    it("should return success icon for success status", () => {
      const props: TestSuiteProps = {
        suiteName: "Test Suite",
        status: "success",
        duration: 1000,
        steps: [],
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain("✓");
    });

    it("should return failure icon for failure status", () => {
      const props: TestSuiteProps = {
        suiteName: "Test Suite",
        status: "failure",
        duration: 1000,
        steps: [],
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain("✗");
    });
  });

  describe("Status Classes", () => {
    it("should return green classes for success status", () => {
      const props: TestSuiteProps = {
        suiteName: "Test Suite",
        status: "success",
        duration: 1000,
        steps: [],
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain("border-l-green-500");
      expect(result).toContain("bg-green-50");
      expect(result).toContain("text-green-500");
    });

    it("should return red classes for failure status", () => {
      const props: TestSuiteProps = {
        suiteName: "Test Suite",
        status: "failure",
        duration: 1000,
        steps: [],
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain("border-l-red-500");
      expect(result).toContain("bg-red-50");
      expect(result).toContain("text-red-500");
    });
  });

  describe("Suite Metrics", () => {
    it("should calculate metrics for all successful steps", () => {
      const steps = [
        createTestStep("success", "Step 1"),
        createTestStep("success", "Step 2"),
        createTestStep("success", "Step 3"),
      ];

      const props: TestSuiteProps = {
        suiteName: "Test Suite",
        status: "success",
        duration: 1000,
        steps,
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain("3 steps");
      expect(result).toContain("3 passed");
      expect(result).toContain("100.0% success");
      expect(result).not.toContain("failed");
    });

    it("should calculate metrics for mixed success/failure steps", () => {
      const steps = [
        createTestStep("success", "Step 1"),
        createTestStep("failure", "Step 2"),
        createTestStep("success", "Step 3"),
        createTestStep("failure", "Step 4"),
      ];

      const props: TestSuiteProps = {
        suiteName: "Test Suite",
        status: "failure",
        duration: 1000,
        steps,
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain("4 steps");
      expect(result).toContain("2 passed");
      expect(result).toContain("2 failed");
      expect(result).toContain("50.0% success");
    });

    it("should calculate metrics for all failed steps", () => {
      const steps = [
        createTestStep("failure", "Step 1"),
        createTestStep("failure", "Step 2"),
      ];

      const props: TestSuiteProps = {
        suiteName: "Test Suite",
        status: "failure",
        duration: 1000,
        steps,
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain("2 steps");
      expect(result).toContain("0 passed");
      expect(result).toContain("2 failed");
      expect(result).toContain("0.0% success");
    });

    it("should handle empty steps array", () => {
      const props: TestSuiteProps = {
        suiteName: "Test Suite",
        status: "success",
        duration: 1000,
        steps: [],
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain("0 steps");
      expect(result).toContain("0 passed");
      expect(result).toContain("0% success");
      expect(result).not.toContain("failed");
    });

    it("should handle single step", () => {
      const steps = [createTestStep("success", "Only Step")];

      const props: TestSuiteProps = {
        suiteName: "Test Suite",
        status: "success",
        duration: 1000,
        steps,
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain("1 steps");
      expect(result).toContain("1 passed");
      expect(result).toContain("100.0% success");
    });
  });

  describe("Success Rate Badges", () => {
    it("should show green badge for 100% success rate", () => {
      const steps = [
        createTestStep("success", "Step 1"),
        createTestStep("success", "Step 2"),
      ];

      const props: TestSuiteProps = {
        suiteName: "Test Suite",
        status: "success",
        duration: 1000,
        steps,
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain("badge badge-green");
      expect(result).toContain("100.0% success");
    });

    it("should show amber badge for 80-99% success rate", () => {
      const steps = [
        createTestStep("success", "Step 1"),
        createTestStep("success", "Step 2"),
        createTestStep("success", "Step 3"),
        createTestStep("success", "Step 4"),
        createTestStep("failure", "Step 5"),
      ];

      const props: TestSuiteProps = {
        suiteName: "Test Suite",
        status: "failure",
        duration: 1000,
        steps,
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain("badge badge-amber");
      expect(result).toContain("80.0% success");
    });

    it("should show gray badge for less than 80% success rate", () => {
      const steps = [
        createTestStep("success", "Step 1"),
        createTestStep("failure", "Step 2"),
        createTestStep("failure", "Step 3"),
      ];

      const props: TestSuiteProps = {
        suiteName: "Test Suite",
        status: "failure",
        duration: 1000,
        steps,
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain("badge badge-gray");
      expect(result).toContain("33.3% success");
    });

    it("should show gray badge for 0% success rate", () => {
      const steps = [
        createTestStep("failure", "Step 1"),
        createTestStep("failure", "Step 2"),
      ];

      const props: TestSuiteProps = {
        suiteName: "Test Suite",
        status: "failure",
        duration: 1000,
        steps,
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain("badge badge-gray");
      expect(result).toContain("0.0% success");
    });
  });

  describe("Suite Content", () => {
    it("should render suite header with correct information", () => {
      const props: TestSuiteProps = {
        suiteName: "My Test Suite",
        status: "success",
        duration: 5000,
        steps: [],
        suiteId: "suite-123",
      };

      const result = component.render(props);
      expect(result).toContain("My Test Suite");
      expect(result).toContain("5.0s");
      expect(result).toContain("suite-123");
      expect(result).toContain("onclick=\"toggleSuite('suite-123')\"");
    });

    it("should render steps when available", () => {
      const steps = [
        {
          stepName: "Login step",
          status: "success" as const,
          duration: 1000,
          assertions: [],
          stepId: "login-1",
          request: { method: "POST", url: "/login", headers: {}, body: {} },
          response: { status_code: 200, headers: {}, body: {} },
        },
      ];

      const props: TestSuiteProps = {
        suiteName: "Auth Suite",
        status: "success",
        duration: 1000,
        steps,
        suiteId: "auth-1",
      };

      const result = component.render(props);
      expect(result).toContain("Steps da suíte:");
      expect(result).not.toContain("Nenhum step encontrado");
    });

    it("should render empty state when no steps", () => {
      const props: TestSuiteProps = {
        suiteName: "Empty Suite",
        status: "success",
        duration: 0,
        steps: [],
        suiteId: "empty-1",
      };

      const result = component.render(props);
      expect(result).toContain("Nenhum step encontrado nesta suíte");
      expect(result).not.toContain("Steps da suíte:");
    });

    it("should escape HTML in suite name", () => {
      const props: TestSuiteProps = {
        suiteName: '<script>alert("xss")</script>',
        status: "success",
        duration: 1000,
        steps: [],
        suiteId: "test-1",
      };

      const result = component.render(props);
      expect(result).toContain(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
      );
      expect(result).not.toContain('<script>alert("xss")</script>');
    });

    it("should render accessibility attributes", () => {
      const props: TestSuiteProps = {
        suiteName: "Accessible Suite",
        status: "success",
        duration: 1000,
        steps: [],
        suiteId: "acc-1",
      };

      const result = component.render(props);
      expect(result).toContain('role="button"');
      expect(result).toContain('tabindex="0"');
      expect(result).toContain('aria-expanded="false"');
      expect(result).toContain('aria-controls="acc-1-content"');
      expect(result).toContain('aria-labelledby="acc-1-header"');
      expect(result).toContain('aria-hidden="true"');
    });

    it("should include expand/collapse functionality", () => {
      const props: TestSuiteProps = {
        suiteName: "Collapsible Suite",
        status: "success",
        duration: 1000,
        steps: [],
        suiteId: "collapse-1",
      };

      const result = component.render(props);
      expect(result).toContain('id="collapse-1-icon"');
      expect(result).toContain('id="collapse-1-content"');
      expect(result).toContain('class="hidden border-t border-default"');
      expect(result).toContain("▶");
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
        { duration: 125000, expected: "2m 5s" },
      ];

      testCases.forEach(({ duration, expected }) => {
        const props: TestSuiteProps = {
          suiteName: `Test ${duration}`,
          status: "success",
          duration,
          steps: [],
          suiteId: `test-${duration}`,
        };

        const result = component.render(props);
        expect(result).toContain(expected);
      });
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle suite with multiple step types", () => {
      const steps = [
        createTestStep("success", "GET /users"),
        createTestStep("failure", "POST /login"),
        createTestStep("success", "PUT /profile"),
        createTestStep("failure", "DELETE /account"),
        createTestStep("success", "GET /logout"),
      ];

      const props: TestSuiteProps = {
        suiteName: "Complex API Suite",
        status: "failure",
        duration: 1250,
        steps,
        suiteId: "complex-1",
      };

      const result = component.render(props);
      expect(result).toContain("Complex API Suite");
      expect(result).toContain("5 steps");
      expect(result).toContain("3 passed");
      expect(result).toContain("2 failed");
      expect(result).toContain("60.0% success");
      expect(result).toContain("badge badge-gray");
    });

    it("should handle very long suite names", () => {
      const longName =
        "Very Long Suite Name That Might Cause Layout Issues And Should Be Handled Gracefully In The UI Component";

      const props: TestSuiteProps = {
        suiteName: longName,
        status: "success",
        duration: 1000,
        steps: [],
        suiteId: "long-1",
      };

      const result = component.render(props);
      expect(result).toContain(longName);
    });

    it("should handle special characters in suite ID", () => {
      const props: TestSuiteProps = {
        suiteName: "Special Suite",
        status: "success",
        duration: 1000,
        steps: [],
        suiteId: "test-123_special-chars.suite",
      };

      const result = component.render(props);
      expect(result).toContain("test-123_special-chars.suite");
      expect(result).toContain(
        "onclick=\"toggleSuite('test-123_special-chars.suite')\""
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined or null values gracefully", () => {
      const props: TestSuiteProps = {
        suiteName: "",
        status: "success",
        duration: 0,
        steps: [],
        suiteId: "",
      };

      const result = component.render(props);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle steps with incomplete status information", () => {
      const steps = [
        createTestStep("success", "Complete step"),
        createTestStep("failure", "Failed step"),
        createTestStep("success", "Another success"),
      ];

      const props: TestSuiteProps = {
        suiteName: "Mixed Status Suite",
        status: "failure",
        duration: 1000,
        steps,
        suiteId: "mixed-1",
      };

      const result = component.render(props);
      expect(result).toBeDefined();
      expect(result).toContain("3 steps");
      expect(result).toContain("2 passed");
      expect(result).toContain("1 failed");
    });
  });
});
