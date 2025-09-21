import React from "react";
import type { MetricsData } from "../types/dashboard.types";

interface MetricsCardsProps {
  data: MetricsData;
  className?: string;
}

const MetricsCards: React.FC<MetricsCardsProps> = ({
  data,
  className = "",
}) => {
  const metrics = [
    {
      id: "total",
      title: "Total Tests",
      value: data.totalTests,
      icon: "📊",
      color: "primary",
      description: "Total number of tests executed",
    },
    {
      id: "success",
      title: "Success Rate",
      value: `${data.successRate.toFixed(1)}%`,
      icon: "✅",
      color:
        data.successRate >= 90
          ? "success"
          : data.successRate >= 70
          ? "warning"
          : "error",
      description: "Percentage of successful tests",
    },
    {
      id: "duration",
      title: "Avg Duration",
      value: `${data.avgDuration.toFixed(0)}ms`,
      icon: "⏱️",
      color: "info",
      description: "Average test execution time",
    },
    {
      id: "critical",
      title: "Critical Tests",
      value: data.criticalTests,
      icon: "🔴",
      color: "warning",
      description: "High priority test cases",
    },
    {
      id: "failed",
      title: "Failed Tests",
      value: data.failedTests,
      icon: "❌",
      color: data.failedTests > 0 ? "error" : "success",
      description: "Number of failed test cases",
    },
    {
      id: "skipped",
      title: "Skipped Tests",
      value: data.skippedTests,
      icon: "⏭️",
      color: "neutral",
      description: "Tests that were skipped",
    },
  ];

  const getCardColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      primary: "border-primary bg-primary/5",
      success: "border-success bg-success/5",
      warning: "border-warning bg-warning/5",
      error: "border-error bg-error/5",
      info: "border-info bg-info/5",
      neutral: "border-neutral bg-neutral/5",
    };
    return colorMap[color] || colorMap.neutral;
  };

  const getTextColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      primary: "text-primary",
      success: "text-success",
      warning: "text-warning",
      error: "text-error",
      info: "text-info",
      neutral: "text-neutral",
    };
    return colorMap[color] || colorMap.neutral;
  };

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 ${className}`}
    >
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className={`card bg-base-100 border-2 transition-all duration-200 hover:shadow-lg hover:scale-105 ${getCardColorClass(
            metric.color
          )}`}
        >
          <div className="card-body p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-2xl"
                    role="img"
                    aria-label={metric.title}
                  >
                    {metric.icon}
                  </span>
                  <h3 className="card-title text-sm font-medium text-base-content/70">
                    {metric.title}
                  </h3>
                </div>
                <div
                  className={`text-3xl font-bold ${getTextColorClass(
                    metric.color
                  )}`}
                >
                  {metric.value}
                </div>
                <p className="text-xs text-base-content/60 mt-2">
                  {metric.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricsCards;
