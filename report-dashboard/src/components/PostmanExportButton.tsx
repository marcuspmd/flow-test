import React from "react";
import type {
  SuiteResult,
  StepResult,
} from "../types/dashboard.types";
import type {
  PostmanCollection,
  PostmanItem,
  PostmanRequest,
} from "../../../src/services/postman-collection.service";
import {
  buildPostmanCollectionFromSuiteYaml,
  POSTMAN_SCHEMA_URL,
} from "../utils/postman-converter";

interface PostmanExportButtonProps {
  suite: SuiteResult;
  className?: string;
}

export const PostmanExportButton: React.FC<PostmanExportButtonProps> = ({
  suite,
  className = "btn btn-outline btn-sm",
}) => {
  const exportToPostman = () => {
    let postmanCollection: PostmanCollection | null = null;

    console.log("[Postman Export] Starting export for suite:", suite.suite_name);
    console.log("[Postman Export] Has YAML content:", !!suite.suite_yaml_content);
    console.log("[Postman Export] Has step results:", !!suite.steps_results && suite.steps_results.length > 0);

    if (suite.suite_yaml_content) {
      try {
        postmanCollection = buildPostmanCollectionFromSuiteYaml({
          yamlContent: suite.suite_yaml_content,
          fallbackSuiteName: suite.suite_name,
          filePath: suite.file_path,
        });
        console.log("[Postman Export] Built collection from YAML. Items count:", postmanCollection?.item?.length || 0);
      } catch (error) {
        console.error("[Postman Export] Error building collection from YAML:", error);
      }
    }

    if (!postmanCollection || !postmanCollection.item || postmanCollection.item.length === 0) {
      console.log("[Postman Export] Falling back to step results");
      postmanCollection = buildCollectionFromStepResults(suite);
      console.log("[Postman Export] Built collection from step results. Items count:", postmanCollection?.item?.length || 0);
    }

    if (!postmanCollection || !postmanCollection.item || postmanCollection.item.length === 0) {
      console.error("[Postman Export] Unable to build collection for suite", {
        suite: suite.suite_name,
        hasYaml: !!suite.suite_yaml_content,
        hasStepResults: !!suite.steps_results && suite.steps_results.length > 0,
      });
      alert(`Failed to export ${suite.suite_name}: No valid requests found to export.`);
      return;
    }

    const blob = new Blob([JSON.stringify(postmanCollection, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${suite.suite_name.replace(/[^a-zA-Z0-9]/g, "_")}.postman_collection.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportToPostman}
      className={className}
      title={`Export ${suite.suite_name} to Postman collection`}
    >
      Export Postman
    </button>
  );
};

function buildCollectionFromStepResults(
  suite: SuiteResult
): PostmanCollection | null {
  if (!suite.steps_results || suite.steps_results.length === 0) {
    return null;
  }

  const items: PostmanItem[] = suite.steps_results
    .filter((step) => Boolean(step.request_details && step.response_details))
    .map((step) => convertStepResultToItem(step));

  if (items.length === 0) {
    return null;
  }

  return {
    info: {
      name: suite.suite_name,
      schema: POSTMAN_SCHEMA_URL,
      description: `Exported from Flow Test execution: ${suite.file_path}`,
    },
    item: items,
  };
}

function convertStepResultToItem(stepResult: StepResult): PostmanItem {
  const { request_details, assertions_results } = stepResult;

  if (!request_details) {
    throw new Error(
      `Missing request details for step: ${stepResult.step_name}`
    );
  }

  const fullUrl = request_details.full_url || request_details.url;
  const url = parseUrlForPostman(fullUrl);

  const headers = Object.entries(request_details.headers || {})
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ({
      key,
      value: String(value),
      disabled: false,
    }));

  const request: PostmanRequest = {
    method: request_details.method,
    url,
    header: headers.length > 0 ? headers : undefined,
  };

  if (request_details.body !== undefined && request_details.body !== null) {
    if (typeof request_details.body === "string") {
      request.body = {
        mode: "raw",
        raw: request_details.body,
        options: {
          raw: {
            language: "text",
          },
        },
      };
    } else {
      request.body = {
        mode: "raw",
        raw: JSON.stringify(request_details.body, null, 2),
        options: {
          raw: {
            language: "json",
          },
        },
      };
    }
  }

  const testScript = generateTestScriptFromAssertions(assertions_results || []);

  const item: PostmanItem = {
    name: stepResult.step_name,
    request,
  };

  if (testScript.length > 0) {
    item.event = [
      {
        listen: "test",
        script: {
          type: "text/javascript",
          exec: testScript,
        },
      },
    ];
  }

  return item;
}

function parseUrlForPostman(fullUrl: string): PostmanRequest["url"] {
  try {
    const urlObj = new URL(fullUrl);

    const query = Array.from(urlObj.searchParams.entries()).map(
      ([key, value]) => ({
        key,
        value,
      })
    );

    return {
      raw: fullUrl,
      host: [urlObj.hostname],
      path: urlObj.pathname.split("/").filter(Boolean),
      query: query.length > 0 ? query : undefined,
    };
  } catch (error) {
    return {
      raw: fullUrl,
    };
  }
}

function generateTestScriptFromAssertions(assertions: any[]): string[] {
  const lines: string[] = [];

  for (const assertion of assertions) {
    if (assertion.passed) {
      if (assertion.field === "status_code") {
        lines.push(
          `pm.test("Status code is ${assertion.expected}", function () {`
        );
        lines.push(
          `    pm.response.to.have.status(${assertion.expected});`
        );
        lines.push("});");
        lines.push("");
      } else if (assertion.field?.startsWith("body.")) {
        const fieldPath = assertion.field.replace("body.", "");
        lines.push(`pm.test("${assertion.field} validation", function () {`);
        lines.push("    const responseJson = pm.response.json();");
        lines.push(
          `    pm.expect(responseJson).to.have.property('${fieldPath.split('.')[0]}');`
        );
        lines.push("});");
        lines.push("");
      } else if (assertion.field?.startsWith("custom.")) {
        const testName = assertion.field.replace("custom.", "");
        lines.push(`pm.test("${testName}", function () {`);
        lines.push(
          `    // Custom validation: ${assertion.message || "OK"}`
        );
        lines.push("    pm.expect(true).to.be.true;");
        lines.push("});");
        lines.push("");
      }
    }
  }

  return lines;
}
