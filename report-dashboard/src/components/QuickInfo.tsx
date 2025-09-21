import React from "react";
import type { StepResult, SuiteResult } from "../types/dashboard.types";

export interface QuickInfoProps {
  type: "step" | "suite" | "metric" | "status" | "performance";
  data?: StepResult | SuiteResult | any;
  title?: string;
  value?: string | number;
  subValue?: string;
  icon?: string;
  status?: "success" | "failed" | "warning" | "info" | "neutral";
  size?: "sm" | "md" | "lg";
  clickable?: boolean;
  onClick?: () => void;
  className?: string;
}

const QuickInfo: React.FC<QuickInfoProps> = ({
  type,
  data,
  title,
  value,
  subValue,
  icon,
  status = "neutral",
  size = "md",
  clickable = false,
  onClick,
  className = "",
}) => {
  const formatDuration = (duration?: number) => {
    if (!duration) return "N/A";
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "success":
        return "bg-success/20 text-success border-success/30";
      case "failed":
        return "bg-error/20 text-error border-error/30";
      case "warning":
        return "bg-warning/20 text-warning border-warning/30";
      case "info":
        return "bg-info/20 text-info border-info/30";
      default:
        return "bg-base-200 text-base-content border-base-300";
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case "sm":
        return "p-2 text-xs";
      case "lg":
        return "p-4 text-base";
      default:
        return "p-3 text-sm";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return "✅";
      case "failed":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "📊";
    }
  };

  const renderStepInfo = (step: StepResult) => {
    const statusIcon = getStatusIcon(step.status);
    const duration = formatDuration(step.duration_ms);
    const statusCode = step.response_details?.status_code;

    return (
      <>
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium truncate">{step.step_name}</span>
          <span className="text-lg">{statusIcon}</span>
        </div>
        <div className="flex items-center justify-between text-xs opacity-75">
          <span>{duration}</span>
          {statusCode && (
            <span
              className={`badge badge-xs ${
                statusCode >= 200 && statusCode < 300
                  ? "badge-success"
                  : statusCode >= 400
                  ? "badge-error"
                  : "badge-warning"
              }`}
            >
              {statusCode}
            </span>
          )}
        </div>
      </>
    );
  };

  const renderSuiteInfo = (suite: SuiteResult) => {
    const statusIcon = getStatusIcon(suite.status);
    const duration = formatDuration(suite.duration_ms);
    const successRate = Math.round(suite.success_rate || 0);

    return (
      <>
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium truncate">{suite.suite_name}</span>
          <span className="text-lg">{statusIcon}</span>
        </div>
        <div className="flex items-center justify-between text-xs opacity-75">
          <span>{duration}</span>
          <span className="badge badge-xs badge-outline">{successRate}%</span>
        </div>
        <div className="text-xs opacity-60 mt-1">
          {suite.steps_executed || 0} steps
        </div>
      </>
    );
  };

  const renderMetricInfo = () => (
    <>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="font-medium">{title}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`font-bold ${size === "lg" ? "text-2xl" : "text-lg"}`}>
          {value}
        </span>
        {subValue && <span className="text-xs opacity-75">{subValue}</span>}
      </div>
    </>
  );

  const renderStatusInfo = () => (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{getStatusIcon(status)}</span>
        <span className="font-medium">{title}</span>
      </div>
      {value && <div className="font-semibold">{value}</div>}
      {subValue && <div className="text-xs opacity-75">{subValue}</div>}
    </>
  );

  const renderPerformanceInfo = () => (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon || "⚡"}</span>
        <span className="font-medium">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="opacity-75">Avg</div>
          <div className="font-semibold">{value}</div>
        </div>
        {subValue && (
          <div>
            <div className="opacity-75">Total</div>
            <div className="font-semibold">{subValue}</div>
          </div>
        )}
      </div>
    </>
  );

  const renderContent = () => {
    switch (type) {
      case "step":
        return data ? renderStepInfo(data as StepResult) : null;
      case "suite":
        return data ? renderSuiteInfo(data as SuiteResult) : null;
      case "metric":
        return renderMetricInfo();
      case "status":
        return renderStatusInfo();
      case "performance":
        return renderPerformanceInfo();
      default:
        return null;
    }
  };

  const baseClasses = [
    "rounded-lg border transition-all duration-200",
    getStatusClasses(status),
    getSizeClasses(size),
    clickable ? "cursor-pointer hover:shadow-md hover:scale-105" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={baseClasses}
      onClick={clickable ? onClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {renderContent()}
    </div>
  );
};

// Componente de conveniência para tooltip
export const QuickInfoTooltip: React.FC<
  QuickInfoProps & { tooltip: string }
> = ({ tooltip, ...props }) => (
  <div className="tooltip" data-tip={tooltip}>
    <QuickInfo {...props} />
  </div>
);

// Componente de grid para múltiplos QuickInfos
interface QuickInfoGridProps {
  items: QuickInfoProps[];
  columns?: 1 | 2 | 3 | 4 | 6;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export const QuickInfoGrid: React.FC<QuickInfoGridProps> = ({
  items,
  columns = 3,
  gap = "md",
  className = "",
}) => {
  const getGridClasses = () => {
    const colClasses = {
      1: "grid-cols-1",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
    };

    const gapClasses = {
      sm: "gap-2",
      md: "gap-4",
      lg: "gap-6",
    };

    return `grid ${colClasses[columns]} ${gapClasses[gap]}`;
  };

  return (
    <div className={`${getGridClasses()} ${className}`}>
      {items.map((item, index) => (
        <QuickInfo key={index} {...item} />
      ))}
    </div>
  );
};

export default QuickInfo;
