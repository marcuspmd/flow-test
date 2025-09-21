import React, { useState } from "react";
import CodeBlock from "./CodeBlock";
import AssertionStats from "./AssertionStats";
import type {
  StepResult,
  SuiteResult,
  RequestDetails,
  ResponseDetails,
} from "../types/dashboard.types";

interface ViewDetailsProps {
  data: StepResult | SuiteResult;
  type: "step" | "suite";
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const ViewDetails: React.FC<ViewDetailsProps> = ({
  data,
  type,
  isOpen,
  onClose,
  className = "",
}) => {
  const [activeSection, setActiveSection] = useState("overview");

  if (!isOpen) return null;

  const formatJson = (data: any) => {
    if (!data) return "N/A";
    if (typeof data === "string") {
      try {
        return JSON.stringify(JSON.parse(data), null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return "N/A";
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

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

  const sections =
    type === "step"
      ? [
          { id: "overview", label: "Visão Geral", icon: "📊" },
          { id: "request", label: "Request", icon: "📤" },
          { id: "response", label: "Response", icon: "📥" },
          { id: "assertions", label: "Assertions", icon: "🔍" },
          { id: "raw", label: "Raw Data", icon: "📄" },
        ]
      : [
          { id: "overview", label: "Visão Geral", icon: "📊" },
          { id: "steps", label: "Steps", icon: "👣" },
          { id: "metrics", label: "Métricas", icon: "📈" },
          { id: "raw", label: "Raw Data", icon: "📄" },
        ];

  const renderStepOverview = (step: StepResult) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Status</div>
          <div className="stat-value text-lg flex items-center gap-2">
            <span className={getStatusColor(step.status)}>
              {getStatusIcon(step.status)}
            </span>
            <span className="capitalize">{step.status}</span>
          </div>
        </div>

        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Duração</div>
          <div className="stat-value text-lg">
            {formatDuration(step.duration_ms)}
          </div>
        </div>

        {step.response_details?.status_code && (
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">Status Code</div>
            <div className="stat-value text-lg">
              <div
                className={`badge badge-lg ${
                  step.response_details.status_code >= 200 &&
                  step.response_details.status_code < 300
                    ? "badge-success"
                    : step.response_details.status_code >= 400
                    ? "badge-error"
                    : "badge-warning"
                }`}
              >
                {step.response_details.status_code}
              </div>
            </div>
          </div>
        )}
      </div>

      {step.step_name && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Step Name</h3>
          <div className="bg-base-200 rounded-lg p-4">
            <code className="text-sm">{step.step_name}</code>
          </div>
        </div>
      )}

      {step.status === "failed" && (
        <div className="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <div>
            <h3 className="font-bold">Step com falha!</h3>
            <div className="text-xs">
              Verifique os detalhes nas abas Request, Response e Assertions
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSuiteOverview = (suite: SuiteResult) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Status</div>
          <div className="stat-value text-lg flex items-center gap-2">
            <span className={getStatusColor(suite.status)}>
              {getStatusIcon(suite.status)}
            </span>
            <span className="capitalize">{suite.status}</span>
          </div>
        </div>

        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Duração Total</div>
          <div className="stat-value text-lg">
            {formatDuration(suite.duration_ms)}
          </div>
        </div>

        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Total Steps</div>
          <div className="stat-value text-lg">
            {suite.steps_results?.length || 0}
          </div>
        </div>

        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Success Rate</div>
          <div className="stat-value text-lg">
            {suite.success_rate ? Math.round(suite.success_rate) : 0}%
          </div>
        </div>
      </div>

      {suite.suite_name && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Suite Name</h3>
          <div className="bg-base-200 rounded-lg p-4">
            <code className="text-sm">{suite.suite_name}</code>
          </div>
        </div>
      )}
    </div>
  );

  const renderRequestSection = (step: StepResult) => (
    <div className="space-y-4">
      {step.request_details && (
        <>
          <div>
            <CodeBlock
              code={step.request_details.full_url || step.request_details.url}
              language="text"
              title="Request URL"
              maxHeight="100px"
            />
          </div>

          {step.request_details.method && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Método</h3>
              <div
                className={`badge badge-lg ${
                  step.request_details.method === "GET"
                    ? "badge-success"
                    : step.request_details.method === "POST"
                    ? "badge-primary"
                    : step.request_details.method === "PUT"
                    ? "badge-warning"
                    : step.request_details.method === "DELETE"
                    ? "badge-error"
                    : "badge-info"
                }`}
              >
                {step.request_details.method}
              </div>
            </div>
          )}

          {step.request_details.headers && (
            <div>
              <CodeBlock
                code={formatJson(step.request_details.headers)}
                language="json"
                title="Request Headers"
                maxHeight="200px"
              />
            </div>
          )}

          {step.request_details.body && (
            <div>
              <CodeBlock
                code={formatJson(step.request_details.body)}
                language="json"
                title="Request Body"
                maxHeight="300px"
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderResponseSection = (step: StepResult) => (
    <div className="space-y-4">
      {step.response_details && (
        <>
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`badge badge-lg ${
                step.response_details.status_code >= 200 &&
                step.response_details.status_code < 300
                  ? "badge-success"
                  : step.response_details.status_code >= 400
                  ? "badge-error"
                  : "badge-warning"
              }`}
            >
              {step.response_details.status_code}
            </div>
            {step.response_details.size_bytes && (
              <span className="text-sm text-base-content/70">
                {(step.response_details.size_bytes / 1024).toFixed(2)} KB
              </span>
            )}
          </div>

          {step.response_details.headers && (
            <div>
              <CodeBlock
                code={formatJson(step.response_details.headers)}
                language="json"
                title="Response Headers"
                maxHeight="200px"
              />
            </div>
          )}

          {step.response_details.body && (
            <div>
              <CodeBlock
                code={formatJson(step.response_details.body)}
                language="json"
                title="Response Body"
                maxHeight="300px"
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderAssertionsSection = (step: StepResult) => (
    <div className="space-y-4">
      <AssertionStats
        assertions={step.assertions_results || []}
        showDetails={true}
      />
    </div>
  );

  const renderStepsSection = (suite: SuiteResult) => (
    <div className="space-y-4">
      {suite.steps_results && suite.steps_results.length > 0 ? (
        <div className="space-y-3">
          {suite.steps_results.map((step: StepResult, idx: number) => (
            <div key={idx} className="card bg-base-200 border border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={getStatusColor(step.status)}>
                      {getStatusIcon(step.status)}
                    </span>
                    <span className="font-medium">{step.step_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-base-content/60">
                    <span>{formatDuration(step.duration_ms)}</span>
                    {step.response_details?.status_code && (
                      <div
                        className={`badge badge-sm ${
                          step.response_details.status_code >= 200 &&
                          step.response_details.status_code < 300
                            ? "badge-success"
                            : step.response_details.status_code >= 400
                            ? "badge-error"
                            : "badge-warning"
                        }`}
                      >
                        {step.response_details.status_code}
                      </div>
                    )}
                  </div>
                </div>

                {step.status === "failed" && (
                  <div className="mt-2 text-sm text-error">
                    Falha na execução - verifique detalhes
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">👣</div>
          <p className="text-base-content/60">Nenhum step encontrado</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-base-100 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">
              {type === "step" ? "🔍 Detalhes do Step" : "📋 Detalhes da Suite"}
            </h2>
            <div className="badge badge-outline">
              {type === "step"
                ? (data as StepResult).step_name
                : (data as SuiteResult).suite_name}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            ✕
          </button>
        </div>

        {/* Navigation */}
        <div className="border-b border-base-200">
          <div className="flex overflow-x-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`tab tab-lg gap-2 px-6 ${
                  activeSection === section.id
                    ? "tab-active border-b-2 border-primary"
                    : ""
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeSection === "overview" &&
            (type === "step"
              ? renderStepOverview(data as StepResult)
              : renderSuiteOverview(data as SuiteResult))}

          {activeSection === "request" &&
            type === "step" &&
            renderRequestSection(data as StepResult)}

          {activeSection === "response" &&
            type === "step" &&
            renderResponseSection(data as StepResult)}

          {activeSection === "assertions" &&
            type === "step" &&
            renderAssertionsSection(data as StepResult)}

          {activeSection === "steps" &&
            type === "suite" &&
            renderStepsSection(data as SuiteResult)}

          {activeSection === "metrics" && type === "suite" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">Steps com Sucesso</div>
                  <div className="stat-value text-2xl text-success">
                    {(data as SuiteResult).steps_successful || 0}
                  </div>
                </div>
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">Steps com Falha</div>
                  <div className="stat-value text-2xl text-error">
                    {(data as SuiteResult).steps_failed || 0}
                  </div>
                </div>
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">Steps Executados</div>
                  <div className="stat-value text-2xl text-info">
                    {(data as SuiteResult).steps_executed || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "raw" && (
            <div>
              <CodeBlock
                code={formatJson(data)}
                language="json"
                title="Complete Raw Data"
                maxHeight="400px"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewDetails;
