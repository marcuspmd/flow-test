import React, { useState } from "react";
import type {
  ScenariosMetadata,
  ScenarioEvaluation,
} from "../types/dashboard.types";

interface ScenariosProps {
  scenarios: ScenariosMetadata;
  className?: string;
  showDetails?: boolean;
  onScenarioClick?: (scenario: ScenarioEvaluation) => void;
}

const Scenarios: React.FC<ScenariosProps> = ({
  scenarios,
  className = "",
  showDetails = true,
  onScenarioClick,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "executed" | "all">(
    "overview"
  );
  const [expandedScenario, setExpandedScenario] = useState<number | null>(null);

  if (!scenarios.has_scenarios) {
    return (
      <div
        className={`bg-base-100 rounded-lg border border-base-200 p-6 ${className}`}
      >
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎭</div>
          <h3 className="text-lg font-semibold mb-2">
            Nenhum Cenário Configurado
          </h3>
          <p className="text-base-content/60">
            Este step não possui cenários condicionais configurados.
          </p>
        </div>
      </div>
    );
  }

  const getFilteredScenarios = () => {
    switch (activeTab) {
      case "executed":
        return scenarios.evaluations.filter((scenario) => scenario.executed);
      case "all":
        return scenarios.evaluations;
      default:
        return scenarios.evaluations;
    }
  };

  const getScenarioIcon = (scenario: ScenarioEvaluation) => {
    if (scenario.executed) {
      return scenario.matched ? "✅" : "🔄";
    }
    return scenario.matched ? "🎯" : "⭕";
  };

  const getScenarioStatus = (scenario: ScenarioEvaluation) => {
    if (scenario.executed && scenario.matched) return "success";
    if (scenario.executed && !scenario.matched) return "warning";
    if (!scenario.executed && scenario.matched) return "info";
    return "neutral";
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "success":
        return "badge-success";
      case "warning":
        return "badge-warning";
      case "info":
        return "badge-info";
      default:
        return "badge-neutral";
    }
  };

  const tabs = [
    {
      id: "overview",
      label: "Visão Geral",
      count: scenarios.evaluations.length,
      icon: "📊",
    },
    {
      id: "executed",
      label: "Executados",
      count: scenarios.executed_count,
      icon: "▶️",
    },
    {
      id: "all",
      label: "Todos",
      count: scenarios.evaluations.length,
      icon: "📋",
    },
  ];

  const filteredScenarios = getFilteredScenarios();

  return (
    <div
      className={`bg-base-100 rounded-lg border border-base-200 ${className}`}
    >
      {/* Header */}
      <div className="border-b border-base-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎭</span>
            <div>
              <h3 className="text-lg font-semibold">Cenários Condicionais</h3>
              <p className="text-sm text-base-content/60">
                {scenarios.executed_count} de {scenarios.evaluations.length}{" "}
                cenários executados
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="stat-value text-2xl">
              {Math.round(
                (scenarios.executed_count / scenarios.evaluations.length) * 100
              )}
              %
            </div>
            <div className="stat-desc">Taxa de Execução</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-base-200">
        <div className="tabs tabs-boxed bg-transparent p-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab tab-bordered flex-1 gap-2 ${
                activeTab === tab.id ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className="badge badge-sm">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="stat bg-base-200 rounded-lg p-3">
                <div className="stat-title text-xs">Total</div>
                <div className="stat-value text-lg">
                  {scenarios.evaluations.length}
                </div>
              </div>
              <div className="stat bg-success/20 rounded-lg p-3">
                <div className="stat-title text-xs">Executados</div>
                <div className="stat-value text-lg text-success">
                  {scenarios.executed_count}
                </div>
              </div>
              <div className="stat bg-info/20 rounded-lg p-3">
                <div className="stat-title text-xs">Matched</div>
                <div className="stat-value text-lg text-info">
                  {scenarios.evaluations.filter((s) => s.matched).length}
                </div>
              </div>
              <div className="stat bg-warning/20 rounded-lg p-3">
                <div className="stat-title text-xs">Branches</div>
                <div className="stat-value text-lg text-warning">
                  {new Set(scenarios.evaluations.map((s) => s.branch)).size}
                </div>
              </div>
            </div>

            {/* Quick Overview List */}
            <div>
              <h4 className="font-semibold mb-3">Resumo dos Cenários</h4>
              <div className="space-y-2">
                {scenarios.evaluations.slice(0, 3).map((scenario) => (
                  <div
                    key={scenario.index}
                    className="flex items-center justify-between p-2 bg-base-200 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span>{getScenarioIcon(scenario)}</span>
                      <span className="text-sm font-medium">
                        Cenário #{scenario.index}
                      </span>
                      <span className="badge badge-xs badge-outline">
                        {scenario.branch}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {scenario.assertions_added > 0 && (
                        <span className="badge badge-xs badge-success">
                          {scenario.assertions_added} assertions
                        </span>
                      )}
                      {scenario.captures_added > 0 && (
                        <span className="badge badge-xs badge-info">
                          {scenario.captures_added} captures
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {scenarios.evaluations.length > 3 && (
                  <div className="text-center py-2">
                    <button
                      onClick={() => setActiveTab("all")}
                      className="btn btn-sm btn-outline"
                    >
                      Ver todos ({scenarios.evaluations.length})
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {(activeTab === "executed" || activeTab === "all") && (
          <div className="space-y-3">
            {filteredScenarios.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-base-content/60">
                  Nenhum cenário encontrado para este filtro.
                </p>
              </div>
            ) : (
              filteredScenarios.map((scenario) => (
                <div
                  key={scenario.index}
                  className="card bg-base-50 border border-base-200 hover:bg-base-100 transition-colors"
                >
                  <div className="card-body p-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => {
                        const newExpanded =
                          expandedScenario === scenario.index
                            ? null
                            : scenario.index;
                        setExpandedScenario(newExpanded);
                        if (onScenarioClick) {
                          onScenarioClick(scenario);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-lg">
                          {getScenarioIcon(scenario)}
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            Cenário #{scenario.index}
                          </span>
                          <span
                            className={`badge badge-sm ${getStatusBadgeClass(
                              getScenarioStatus(scenario)
                            )}`}
                          >
                            {scenario.executed ? "Executado" : "Não Executado"}
                          </span>
                          <span className="badge badge-sm badge-outline">
                            {scenario.branch}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-base-content/60">
                        {scenario.assertions_added > 0 && (
                          <span className="badge badge-sm badge-success">
                            {scenario.assertions_added} assertions
                          </span>
                        )}
                        {scenario.captures_added > 0 && (
                          <span className="badge badge-sm badge-info">
                            {scenario.captures_added} captures
                          </span>
                        )}
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            expandedScenario === scenario.index
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
                    {expandedScenario === scenario.index && showDetails && (
                      <div className="mt-4 pt-4 border-t border-base-200">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-semibold text-sm mb-2">
                              Condição
                            </h5>
                            <div className="bg-base-200 rounded p-3 text-sm">
                              <code className="break-all">
                                {scenario.condition}
                              </code>
                            </div>
                          </div>

                          <div>
                            <h5 className="font-semibold text-sm mb-2">
                              Status
                            </h5>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span>Matched:</span>
                                <span
                                  className={
                                    scenario.matched
                                      ? "text-success"
                                      : "text-error"
                                  }
                                >
                                  {scenario.matched ? "✅ Sim" : "❌ Não"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Executado:</span>
                                <span
                                  className={
                                    scenario.executed
                                      ? "text-success"
                                      : "text-warning"
                                  }
                                >
                                  {scenario.executed ? "✅ Sim" : "⏸️ Não"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Branch:</span>
                                <span className="badge badge-sm badge-outline">
                                  {scenario.branch}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {(scenario.assertions_added > 0 ||
                          scenario.captures_added > 0) && (
                          <div className="mt-4">
                            <h5 className="font-semibold text-sm mb-2">
                              Impacto da Execução
                            </h5>
                            <div className="flex gap-4 text-sm">
                              {scenario.assertions_added > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-success">✅</span>
                                  <span>
                                    {scenario.assertions_added} assertions
                                    adicionadas
                                  </span>
                                </div>
                              )}
                              {scenario.captures_added > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-info">📝</span>
                                  <span>
                                    {scenario.captures_added} captures
                                    adicionadas
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scenarios;
