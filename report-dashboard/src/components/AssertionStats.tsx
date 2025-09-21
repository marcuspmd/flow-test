import React, { useState } from 'react';
import CodeBlock from './CodeBlock';
import type { AssertionResult } from '../types/dashboard.types';

interface AssertionStatsProps {
  assertions: AssertionResult[];
  showDetails?: boolean;
  className?: string;
}

const AssertionStats: React.FC<AssertionStatsProps> = ({
  assertions = [],
  showDetails = true,
  className = "",
}) => {
  const [showExpanded, setShowExpanded] = useState(false);

  // Calculate stats
  const total = assertions.length;
  const passed = assertions.filter(a => a.passed).length;
  const failed = total - passed;
  const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  // Helper functions
  const formatValue = (value: any): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (value === null || value === undefined) return 'null';
    return JSON.stringify(value);
  };

  const areValuesEqual = (expected: any, actual: any): boolean => {
    return JSON.stringify(expected) === JSON.stringify(actual);
  };

  const shouldShowCodeBlock = (value: any): boolean => {
    return typeof value === 'object' && value !== null;
  };

  if (total === 0) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <div className="text-3xl mb-2">🔍</div>
        <p className="text-base-content/60 text-sm">No assertions found</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Stats Header */}
      <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-100 w-full mb-4">
        <div className="stat">
          <div className="stat-figure text-primary">
            <span className="text-2xl">📊</span>
          </div>
          <div className="stat-title">Total</div>
          <div className="stat-value text-primary">{total}</div>
          <div className="stat-desc">assertions</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-success">
            <span className="text-2xl">✅</span>
          </div>
          <div className="stat-title">Passed</div>
          <div className="stat-value text-success">{passed}</div>
          <div className="stat-desc">{passed === 1 ? 'assertion' : 'assertions'}</div>
        </div>

        {failed > 0 && (
          <div className="stat">
            <div className="stat-figure text-error">
              <span className="text-2xl">❌</span>
            </div>
            <div className="stat-title">Failed</div>
            <div className="stat-value text-error">{failed}</div>
            <div className="stat-desc">{failed === 1 ? 'assertion' : 'assertions'}</div>
          </div>
        )}

        <div className="stat">
          <div className="stat-figure text-info">
            <span className="text-2xl">📈</span>
          </div>
          <div className="stat-title">Success Rate</div>
          <div className={`stat-value ${successRate === 100 ? 'text-success' : successRate >= 80 ? 'text-warning' : 'text-error'}`}>
            {successRate}%
          </div>
          <div className="stat-desc">success</div>
        </div>
      </div>

      {/* Details Section */}
      {showDetails && (
        <div className="space-y-2">
          {/* Toggle for detailed view */}
          {total > 3 && (
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">Assertion Details</h4>
              <button
                onClick={() => setShowExpanded(!showExpanded)}
                className="btn btn-xs btn-ghost"
              >
                {showExpanded ? 'Hide Details' : 'Show All Details'}
                <svg
                  className={`w-3 h-3 ml-1 transition-transform ${
                    showExpanded ? 'rotate-180' : ''
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
              </button>
            </div>
          )}

          {/* Assertion List */}
          <div className="space-y-2">
            {assertions.map((assertion, idx) => {
              const isEqual = areValuesEqual(assertion.expected, assertion.actual);
              const showDetails = !assertion.passed || showExpanded || failed <= 2;

              return (
                <div
                  key={idx}
                  className={`rounded-lg border-2 p-4 mb-3 transition-all duration-200 hover:shadow-md ${
                    assertion.passed
                      ? 'bg-success/5 border-success/30 hover:bg-success/10'
                      : 'bg-error/5 border-error/30 hover:bg-error/10'
                  }`}
                >
                  {/* Header com status e campo */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-lg font-bold ${
                        assertion.passed
                          ? 'bg-success text-success-content'
                          : 'bg-error text-error-content'
                      }`}>
                        {assertion.passed ? '✓' : '✗'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-base text-base-content">{assertion.field}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`badge badge-sm font-medium ${
                            assertion.passed ? 'badge-success' : 'badge-error'
                          }`}>
                            {assertion.passed ? 'PASSED' : 'FAILED'}
                          </span>
                          {assertion.operator && (
                            <span className="badge badge-outline badge-sm font-mono">
                              {assertion.operator}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {assertion.passed && isEqual && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-success font-medium">✓ Match</span>
                      </div>
                    )}
                  </div>

                  {/* Condição da assertion */}
                  <div className="bg-base-100 rounded-lg p-3 mb-3">
                    <div className="text-xs font-medium text-base-content/60 mb-2 uppercase tracking-wide">
                      Condição
                    </div>
                    <div className="text-sm font-mono bg-base-200 rounded px-3 py-2">
                      <span className="text-primary font-semibold">{assertion.field}</span>
                      <span className="text-base-content/70 mx-2">{assertion.operator || 'equals'}</span>
                      <span className="text-secondary font-semibold">
                        {typeof assertion.expected === 'object'
                          ? JSON.stringify(assertion.expected)
                          : assertion.expected}
                      </span>
                    </div>
                  </div>

                  {assertion.message && (
                    <div className="text-sm text-base-content/80 bg-base-200/50 rounded-lg px-3 py-2 mb-3">
                      {assertion.message}
                    </div>
                  )}

                  {/* Detalhes dos valores */}
                  {(showDetails && !isEqual) || !assertion.passed ? (
                    <div className="space-y-4">
                      <div className="divider my-2">Comparação de Valores</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-info">Esperado</span>
                            <span className="badge badge-info badge-xs">expected</span>
                          </div>
                          {shouldShowCodeBlock(assertion.expected) ? (
                            <CodeBlock
                              code={JSON.stringify(assertion.expected, null, 2)}
                              language="json"
                              title=""
                              maxHeight="150px"
                            />
                          ) : (
                            <div className="bg-info/10 border border-info/20 rounded-lg px-3 py-2">
                              <div className="text-sm font-mono text-info-content break-all">
                                {formatValue(assertion.expected)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-warning">Recebido</span>
                            <span className="badge badge-warning badge-xs">actual</span>
                          </div>
                          {shouldShowCodeBlock(assertion.actual) ? (
                            <CodeBlock
                              code={JSON.stringify(assertion.actual, null, 2)}
                              language="json"
                              title=""
                              maxHeight="150px"
                            />
                          ) : (
                            <div className="bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
                              <div className="text-sm font-mono text-warning-content break-all">
                                {formatValue(assertion.actual)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : assertion.passed && isEqual ? (
                    <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-success">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">Assertion passou conforme esperado</span>
                      </div>
                      <div className="text-xs text-success/80 mt-1">
                        Valor recebido: <span className="font-mono bg-success/20 px-1 rounded">
                          {typeof assertion.actual === 'object' ? 'Objeto/Array' : formatValue(assertion.actual)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssertionStats;