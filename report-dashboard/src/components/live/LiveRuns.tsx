import React, { useEffect, useMemo, useState } from "react";
import {
  fetchRuns,
  fetchHealth,
  startRun,
  retryRun,
  subscribeToEvents,
  getOrchestratorBaseUrl,
} from "../../services/orchestratorClient";
import type { LiveRunRecord, LiveEvent } from "../../types/orchestrator";

type ConnectionState = "connecting" | "open" | "error";

type HealthState = {
  status: string;
  activeRunId: string | null;
};

interface FormState {
  label: string;
  optionsText: string;
  error?: string | null;
}

const EVENT_LABELS: Record<string, string> = {
  run_registered: "Run registered",
  run_started: "Execution started",
  suite_started: "Suite started",
  suite_completed: "Suite completed",
  step_completed: "Step completed",
  run_error: "Run error",
  run_completed: "Run completed",
};

const STATUS_TAG_CLASSES: Record<string, string> = {
  pending: "badge-warning",
  running: "badge-info",
  success: "badge-success",
  failed: "badge-error",
};

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
};

function formatTimestamp(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], DATE_FORMAT_OPTIONS)}`;
}

function appendEvent(events: LiveEvent[], event: LiveEvent): LiveEvent[] {
  const exists = events.some(
    (current) => current.timestamp === event.timestamp && current.type === event.type
  );
  if (exists) {
    return events;
  }

  return [...events, event].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

function applyEvent(run: LiveRunRecord, event: LiveEvent): LiveRunRecord {
  const payload = event.payload ?? {};
  const updated: LiveRunRecord = {
    ...run,
    events: appendEvent(run.events || [], event),
    last_event_at: event.timestamp,
  };

  switch (event.type) {
    case "run_registered":
      updated.status = "pending";
      updated.created_at = updated.created_at ?? event.timestamp;
      if (payload.source) {
        updated.source = payload.source;
      }
      if (payload.label) {
        updated.label = payload.label;
      }
      if (payload.options) {
        updated.options = payload.options;
      }
      break;

    case "run_started":
      updated.status = "running";
      updated.started_at = event.timestamp;
      if (payload.stats) {
        updated.stats = payload.stats;
      }
      break;

    case "suite_started":
    case "suite_completed":
    case "step_completed":
      // No additional metadata beyond events for now
      break;

    case "run_error":
      updated.status = "failed";
      updated.finished_at = event.timestamp;
      updated.error = {
        message: payload?.message ?? "Unknown error",
        stack: payload?.stack,
        context: payload?.context,
      };
      break;

    case "run_completed":
      updated.status = payload?.status ?? "success";
      updated.finished_at = event.timestamp;
      if (payload?.result) {
        updated.result = payload.result;
      }
      break;

    default:
      break;
  }

  return updated;
}

function upsertRunWithEvent(
  runs: LiveRunRecord[],
  event: LiveEvent
): LiveRunRecord[] {
  const index = runs.findIndex((run) => run.id === event.runId);
  const existing = index >= 0 ? runs[index] : undefined;

  const base: LiveRunRecord = existing ?? {
    id: event.runId,
    status: "pending",
    created_at: event.timestamp,
    events: [],
  } as LiveRunRecord;

  const updated = applyEvent(base, event);
  const next = [...runs];
  if (index >= 0) {
    next[index] = updated;
  } else {
    next.unshift(updated);
  }

  return next.sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );
}

const LiveRuns: React.FC = () => {
  const [runs, setRuns] = useState<LiveRunRecord[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [health, setHealth] = useState<HealthState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ label: "", optionsText: "{}" });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const orchestratorUrl = getOrchestratorBaseUrl();

  const selectedRun = useMemo(() => {
    if (!selectedRunId) return runs[0];
    return runs.find((run) => run.id === selectedRunId) ?? runs[0];
  }, [runs, selectedRunId]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    async function initialize() {
      try {
        setLoading(true);
        setError(null);

        const [initialRuns, healthStatus] = await Promise.all([
          fetchRuns(),
          fetchHealth().catch(() => null),
        ]);

        if (!isMounted) return;

        setRuns(initialRuns.sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
        ));
        if (initialRuns.length > 0) {
          setSelectedRunId(initialRuns[0].id);
        }
        if (healthStatus) {
          setHealth(healthStatus);
        }
      } catch (err) {
        if (!isMounted) return;
        setError((err as Error).message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }

      unsubscribe = subscribeToEvents({
        onOpen: () => setConnectionState("open"),
        onError: () => setConnectionState("error"),
        onEvent: (event) => {
          setRuns((prev) => upsertRunWithEvent(prev, event));
          setHealth((prevHealth) =>
            prevHealth
              ? event.type === "run_started"
                ? { ...prevHealth, activeRunId: event.runId }
                : event.type === "run_completed" || event.type === "run_error"
                ? {
                    ...prevHealth,
                    activeRunId:
                      prevHealth.activeRunId === event.runId
                        ? null
                        : prevHealth.activeRunId,
                  }
                : prevHealth
              : prevHealth
          );
          setSelectedRunId((current) => current ?? event.runId);
        },
      });
    }

    initialize();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const handleFormChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value, error: null }));
  };

  const handleStartRun = async () => {
    setForm((prev) => ({ ...prev, error: null }));
    let parsedOptions: Record<string, any> = {};

    if (form.optionsText.trim().length > 0) {
      try {
        parsedOptions = JSON.parse(form.optionsText);
      } catch (parseError) {
        setForm((prev) => ({
          ...prev,
          error: `Erro ao parsear JSON de opções: ${(parseError as Error).message}`,
        }));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await startRun({
        label: form.label.trim() || undefined,
        options: parsedOptions,
      });
      setForm({ label: "", optionsText: form.optionsText, error: null });
    } catch (err) {
      setForm((prev) => ({
        ...prev,
        error: (err as Error).message,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async (runId: string) => {
    setError(null);
    try {
      await retryRun(runId);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const renderStatusBadge = (status: string) => {
    const badgeClass = STATUS_TAG_CLASSES[status] ?? "badge-ghost";
    return <span className={`badge ${badgeClass} badge-outline uppercase`}>{status}</span>;
  };

  const connectionBadgeClass = {
    connecting: "badge-info",
    open: "badge-success",
    error: "badge-error",
  }[connectionState];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-1 space-y-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <span>🛰️</span>
              Orchestrator
            </h2>
            <div className="space-y-2 text-sm text-base-content/80">
              <div className="flex items-center justify-between">
                <span>Endpoint</span>
                <code className="bg-base-200 px-2 py-1 rounded text-xs">
                  {orchestratorUrl}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span>Conexão SSE</span>
                <span className={`badge ${connectionBadgeClass}`}>
                  {connectionState === "connecting" && "Conectando"}
                  {connectionState === "open" && "Conectado"}
                  {connectionState === "error" && "Erro"}
                </span>
              </div>
              {health && (
                <div className="flex items-center justify-between">
                  <span>Run ativo</span>
                  <span className="text-xs">
                    {health.activeRunId ? health.activeRunId : "Nenhum"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body space-y-4">
            <h2 className="card-title flex items-center gap-2">
              <span>🚀</span>
              Disparar execução
            </h2>
            <div className="form-control w-full">
              <label className="label" htmlFor="run-label">
                <span className="label-text">Label (opcional)</span>
              </label>
              <input
                id="run-label"
                className="input input-bordered"
                placeholder="Ex: smoke tests"
                value={form.label}
                onChange={(event) => handleFormChange("label", event.target.value)}
              />
            </div>

            <div className="form-control w-full">
              <label className="label" htmlFor="run-options">
                <span className="label-text">Opções (JSON)</span>
              </label>
              <textarea
                id="run-options"
                className="textarea textarea-bordered font-mono h-32"
                value={form.optionsText}
                onChange={(event) => handleFormChange("optionsText", event.target.value)}
              ></textarea>
              <label className="label">
                <span className="label-text-alt">Deixe como {{}} para usar configuração padrão</span>
              </label>
            </div>

            {form.error && (
              <div className="alert alert-error text-sm">
                <span>{form.error}</span>
              </div>
            )}

            <button
              className="btn btn-primary w-full"
              onClick={handleStartRun}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Disparando..." : "Iniciar execução"}
            </button>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-sm mb-2">Execuções recentes</h3>
            {loading && <div className="text-sm text-base-content/60">Carregando execuções...</div>}
            {!loading && runs.length === 0 && (
              <div className="text-sm text-base-content/60">
                Nenhuma execução registrada ainda. Dispare um run para começar.
              </div>
            )}
            <ul className="menu bg-base-200/50 rounded-box">
              {runs.map((run) => (
                <li key={run.id}>
                  <button
                    className={selectedRun?.id === run.id ? "active" : ""}
                    onClick={() => setSelectedRunId(run.id)}
                  >
                    <div className="flex flex-col items-start text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate max-w-[12rem]">
                          {run.label || run.id}
                        </span>
                        {renderStatusBadge(run.status)}
                      </div>
                      <span className="text-xs text-base-content/60">
                        {formatTimestamp(run.created_at)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="xl:col-span-2">
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {selectedRun ? (
          <div className="space-y-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="card-title text-2xl flex items-center gap-3">
                      <span>📦</span>
                      {selectedRun.label || selectedRun.id}
                      {renderStatusBadge(selectedRun.status)}
                    </h2>
                    <p className="text-sm text-base-content/70">
                      Run ID: <code className="font-mono">{selectedRun.id}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-outline btn-secondary"
                      onClick={() => handleRetry(selectedRun.id)}
                      disabled={selectedRun.status === "running"}
                    >
                      Retry run
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm bg-base-200/60 p-4 rounded-xl">
                  <div>
                    <div className="text-base-content/60">Criado em</div>
                    <div className="font-medium">{formatTimestamp(selectedRun.created_at)}</div>
                  </div>
                  <div>
                    <div className="text-base-content/60">Iniciado</div>
                    <div className="font-medium">{formatTimestamp(selectedRun.started_at)}</div>
                  </div>
                  <div>
                    <div className="text-base-content/60">Finalizado</div>
                    <div className="font-medium">{formatTimestamp(selectedRun.finished_at)}</div>
                  </div>
                </div>

                {selectedRun.error && (
                  <div className="alert alert-error mt-4 text-sm">
                    <span className="font-semibold">Erro:</span>
                    <span>{selectedRun.error.message}</span>
                  </div>
                )}

                {selectedRun.result && (
                  <div className="mt-4 bg-base-200/60 p-4 rounded-xl">
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold">
                        Resultado agregado (JSON)
                      </summary>
                      <pre className="mt-2 text-xs bg-base-300 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(selectedRun.result, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {selectedRun.options && (
                  <div className="mt-4">
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold">
                        Opções utilizadas
                      </summary>
                      <pre className="mt-2 text-xs bg-base-300 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(selectedRun.options, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg flex items-center gap-2">
                  <span>📜</span>
                  Timeline
                </h3>
                <div className="mt-4">
                  {selectedRun.events && selectedRun.events.length > 0 ? (
                    <ul className="timeline timeline-vertical">
                      {selectedRun.events.map((event, index) => (
                        <li key={`${event.timestamp}-${index}`}>
                          <div className="timeline-start timeline-box bg-base-200">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold">
                                {EVENT_LABELS[event.type] ?? event.type}
                              </span>
                              <span className="text-xs text-base-content/60">
                                {new Date(event.timestamp).toLocaleTimeString([], DATE_FORMAT_OPTIONS)}
                              </span>
                            </div>
                            {event.type === "suite_started" && event.payload?.suite_name && (
                              <div className="text-xs mt-1">
                                Suite: {event.payload.suite_name}
                              </div>
                            )}
                            {event.type === "suite_completed" && event.payload?.suite_name && (
                              <div className="text-xs mt-1">
                                Suite: {event.payload.suite_name} ({event.payload.status})
                              </div>
                            )}
                            {event.type === "step_completed" && event.payload?.step_name && (
                              <div className="text-xs mt-1 truncate">
                                Step: {event.payload.step_name} ({event.payload.status})
                              </div>
                            )}
                            {event.type === "run_error" && event.payload?.message && (
                              <div className="text-xs mt-2 text-error">
                                {event.payload.message}
                              </div>
                            )}
                          </div>
                          <hr />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-base-content/60">
                      Sem eventos registrados para este run.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Selecione uma execução</h2>
              <p className="text-sm text-base-content/70">
                Use a lista ao lado para visualizar os detalhes de uma execução.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveRuns;
