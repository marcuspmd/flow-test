import React, { useState } from "react";
import CodeBlock from "./CodeBlock";
import type { StepResult } from "../types/dashboard.types";

interface RequestTabsProps {
  steps: StepResult[];
  className?: string;
}

const RequestTabs: React.FC<RequestTabsProps> = ({
  steps = [],
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<StepResult | null>(
    null
  );

  // Filter steps by status
  const getFilteredSteps = (filter: string) => {
    switch (filter) {
      case "success":
        return steps.filter((step) => step.status === "success");
      case "failed":
        return steps.filter((step) => step.status === "failed");
      case "skipped":
        return steps.filter((step) => step.status === "skipped");
      default:
        return steps;
    }
  };

  const filteredSteps = getFilteredSteps(activeTab);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return "✅";
      case "failed":
        return "❌";
      case "skipped":
        return "⏭️";
      default:
        return "⏸️";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-success";
      case "failed":
        return "text-error";
      case "skipped":
        return "text-warning";
      default:
        return "text-neutral";
    }
  };

  const getMethodColor = (method: string) => {
    switch (method?.toUpperCase()) {
      case "GET":
        return "badge-primary";
      case "POST":
        return "badge-success";
      case "PUT":
        return "badge-warning";
      case "DELETE":
        return "badge-error";
      case "PATCH":
        return "badge-info";
      default:
        return "badge-neutral";
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return "N/A";
    return `${duration}ms`;
  };

  const tabs = [
    { id: "all", label: "All Requests", count: steps.length },
    {
      id: "success",
      label: "Success",
      count: steps.filter((s) => s.status === "success").length,
    },
    {
      id: "failed",
      label: "Failed",
      count: steps.filter((s) => s.status === "failed").length,
    },
    {
      id: "skipped",
      label: "Skipped",
      count: steps.filter((s) => s.status === "skipped").length,
    },
  ];

  return (
    <div
      className={`bg-base-100 rounded-lg border border-base-200 ${className}`}
    >
      {/* Tabs Header */}
      <div className="border-b border-base-200">
        <div className="tabs tabs-boxed bg-transparent p-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab tab-bordered flex-1 ${
                activeTab === tab.id ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              <span className="badge badge-sm ml-2">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {filteredSteps.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-base-content/60">
              No requests found for this filter
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSteps.map((step, index) => (
              <div
                key={step.step_name || index}
                className="card bg-base-50 border border-base-200 hover:bg-base-100 transition-colors cursor-pointer"
                onClick={() =>
                  setSelectedRequest(
                    selectedRequest?.step_name === step.step_name ? null : step
                  )
                }
              >
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span
                        className={`text-lg ${getStatusColor(step.status)}`}
                      >
                        {getStatusIcon(step.status)}
                      </span>

                      <div className="flex items-center gap-2">
                        {step.request_details?.method && (
                          <span
                            className={`badge badge-sm ${getMethodColor(
                              step.request_details.method
                            )}`}
                          >
                            {step.request_details.method}
                          </span>
                        )}
                        <span className="font-medium">{step.step_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-base-content/60">
                      {step.response_details?.status_code && (
                        <span
                          className={`badge badge-outline ${
                            step.response_details.status_code >= 200 &&
                            step.response_details.status_code < 300
                              ? "badge-success"
                              : step.response_details.status_code >= 400
                              ? "badge-error"
                              : "badge-warning"
                          }`}
                        >
                          {step.response_details.status_code}
                        </span>
                      )}
                      <span>{formatDuration(step.duration_ms)}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          selectedRequest?.step_name === step.step_name
                            ? "rotate-180"
                            : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedRequest?.step_name === step.step_name && (
                    <div className="mt-4 pt-4 border-t border-base-200">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Request Details */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2">
                            Request
                          </h4>
                          <div className="bg-base-200 rounded p-3 text-sm">
                            {step.request_details?.url && (
                              <div className="mb-2">
                                <span className="font-medium">URL:</span>{" "}
                                {step.request_details.url}
                              </div>
                            )}
                            {step.request_details?.headers && (
                              <div>
                                <div className="mt-1">
                                  <CodeBlock
                                    code={JSON.stringify(
                                      step.request_details.headers,
                                      null,
                                      2
                                    )}
                                    language="json"
                                    title="Request Headers"
                                    maxHeight="150px"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Response Details */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2">
                            Response
                          </h4>
                          <div className="bg-base-200 rounded p-3 text-sm">
                            {step.response_details?.status_code && (
                              <div className="mb-2">
                                <span className="font-medium">Status:</span>{" "}
                                {step.response_details.status_code}
                              </div>
                            )}
                            {step.response_details?.headers && (
                              <div className="mb-2">
                                <div className="mt-1">
                                  <CodeBlock
                                    code={JSON.stringify(
                                      step.response_details.headers,
                                      null,
                                      2
                                    )}
                                    language="json"
                                    title="Response Headers"
                                    maxHeight="150px"
                                  />
                                </div>
                              </div>
                            )}
                            {step.response_details?.body && (
                              <div>
                                <div className="mt-1">
                                  <CodeBlock
                                    code={
                                      typeof step.response_details.body ===
                                      "object"
                                        ? JSON.stringify(
                                            step.response_details.body,
                                            null,
                                            2
                                          )
                                        : step.response_details.body
                                    }
                                    language="json"
                                    title="Response Body"
                                    maxHeight="200px"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Assertions */}
                      {step.assertions_results &&
                        step.assertions_results.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-sm mb-2">
                              Assertions
                            </h4>
                            <div className="space-y-2">
                              {step.assertions_results.map((assertion, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 text-sm p-2 bg-base-100 rounded"
                                >
                                  <span
                                    className={
                                      assertion.passed
                                        ? "text-success"
                                        : "text-error"
                                    }
                                  >
                                    {assertion.passed ? "✅" : "❌"}
                                  </span>
                                  <div className="flex-1">
                                    <div className="font-medium mb-1">
                                      {assertion.message || assertion.field}
                                    </div>
                                    {assertion.expected && (
                                      <div className="text-xs">
                                        <span className="text-base-content/60">
                                          Expected:
                                        </span>
                                        <CodeBlock
                                          code={assertion.expected}
                                          language="json"
                                          title=""
                                          maxHeight="50px"
                                        />
                                      </div>
                                    )}
                                    {assertion.actual && (
                                      <div className="text-xs mt-1">
                                        <span className="text-base-content/60">
                                          Actual:
                                        </span>
                                        <CodeBlock
                                          code={assertion.actual}
                                          language="json"
                                          title=""
                                          maxHeight="50px"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestTabs;
