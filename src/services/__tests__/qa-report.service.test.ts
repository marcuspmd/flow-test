import { QAReportService } from "../qa-report.service";
import type { AggregatedResult } from "../../types/config.types";

describe("QAReportService", () => {
  it("omits environment data and masks sensitive fields in QA report", () => {
    const service = new QAReportService();
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 1200).toISOString();

    const aggregated: AggregatedResult = {
      project_name: "Sample Project",
      start_time: startTime,
      end_time: endTime,
      total_duration_ms: 1200,
      total_tests: 1,
      successful_tests: 1,
      failed_tests: 0,
      skipped_tests: 0,
      success_rate: 100,
      suites_results: [
        {
          node_id: "auth-flow",
          suite_name: "Authentication Flow",
          file_path: "tests/auth-flow.yaml",
          priority: "critical",
          start_time: startTime,
          end_time: endTime,
          duration_ms: 1200,
          status: "success",
          steps_executed: 1,
          steps_successful: 1,
          steps_failed: 0,
          success_rate: 100,
          steps_results: [
            {
              step_name: "User login",
              status: "success",
              duration_ms: 500,
              request_details: {
                method: "POST",
                url: "/auth/login",
                full_url: "https://api.example.com/auth/login",
                headers: {
                  Authorization: "Bearer super-secret-token",
                  "Content-Type": "application/json",
                },
                body: {
                  username: "qa-user",
                  password: "my-password",
                },
                curl_command:
                  "curl -X POST https://api.example.com/auth/login -d '{\"password\":\"my-password\"}'",
              },
              response_details: {
                status_code: 200,
                headers: {
                  "Content-Type": "application/json",
                },
                body: {
                  token: "jwt-token-value",
                  message: "ok",
                },
                size_bytes: 256,
              },
              assertions_results: [
                {
                  field: "body.token",
                  expected: "jwt-token-value",
                  actual: "jwt-token-value",
                  passed: true,
                },
              ],
              captured_variables: {
                auth_token: "jwt-token-value",
                secretKey: "s3cr3t",
              },
            },
          ],
          error_message: undefined,
          variables_captured: {},
          available_variables: undefined,
        },
      ],
      global_variables_final_state: {
        api_key: "api-key-value",
        PASSWORD: "plain-text-password",
      },
      performance_summary: {
        total_requests: 1,
        average_response_time_ms: 500,
        min_response_time_ms: 500,
        max_response_time_ms: 500,
        requests_per_second: 2,
        slowest_endpoints: [
          {
            url: "/auth/login",
            average_time_ms: 500,
            call_count: 1,
          },
        ],
      },
    };

    const report = service.transformToQAReport(aggregated);

    expect("environment" in report).toBe(false);
    expect(report.test_cases).toHaveLength(1);

    const step = report.test_cases[0].steps[0];

    expect(step.request?.body?.username).toBe("qa-user");
    expect(step.request?.body?.password).toBe("[REDACTED]");
    expect(step.request?.headers?.Authorization).toBe("[REDACTED]");
    expect(step.request?.curl_command).toContain("[REDACTED]");
    expect(step.response?.body?.token).toBe("[REDACTED]");
    expect(step.response?.body?.message).toBe("ok");
    expect(step.variables_captured?.secretKey).toBe("[REDACTED]");
    expect(step.variables_captured?.auth_token).toBe("[REDACTED]");

    const serializedReport = JSON.stringify(report);
    expect(serializedReport).not.toContain("api_key");
    expect(serializedReport).not.toContain("plain-text-password");

    expect(report.performance.total_requests).toBe(1);
    expect(report.metrics.total_test_suites).toBe(1);
  });
});
