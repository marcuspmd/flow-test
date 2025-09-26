import type {
  LiveEvent,
  LiveRunRecord,
  RunResponse,
  StartRunPayload,
} from "../types/orchestrator";

const DEFAULT_BASE_URL = "http://localhost:3333";

function sanitizeBaseUrl(raw?: string): string {
  if (!raw || raw.trim().length === 0) {
    return DEFAULT_BASE_URL;
  }

  const trimmed = raw.trim().replace(/\/$/, "");
  return trimmed.length > 0 ? trimmed : DEFAULT_BASE_URL;
}

export function getOrchestratorBaseUrl(): string {
  const envValue = import.meta.env?.PUBLIC_ORCHESTRATOR_URL as string | undefined;
  return sanitizeBaseUrl(envValue);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getOrchestratorBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Orchestrator request failed (${response.status} ${response.statusText}): ${errorText}`
    );
  }

  return (await response.json()) as T;
}

export async function fetchRuns(): Promise<LiveRunRecord[]> {
  const data = await requestJson<{ runs: LiveRunRecord[] }>("/runs");
  return data.runs;
}

export async function startRun(payload: StartRunPayload = {}): Promise<RunResponse> {
  return requestJson<RunResponse>("/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function retryRun(runId: string): Promise<RunResponse> {
  if (!runId) {
    throw new Error("runId is required for retry");
  }

  return requestJson<RunResponse>(`/runs/${encodeURIComponent(runId)}/retry`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

interface EventSubscriptionOptions {
  onEvent: (event: LiveEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
}

export function subscribeToEvents(options: EventSubscriptionOptions): () => void {
  const baseUrl = getOrchestratorBaseUrl();
  const eventsUrl = `${baseUrl}/events`;
  const eventSource = new EventSource(eventsUrl);

  if (options.onOpen) {
    eventSource.onopen = () => options.onOpen?.();
  }

  eventSource.onmessage = (messageEvent) => {
    try {
      const data: LiveEvent = JSON.parse(messageEvent.data);
      options.onEvent(data);
    } catch (error) {
      console.warn("Failed to parse orchestrator event", error);
    }
  };

  if (options.onError) {
    eventSource.onerror = options.onError;
  }

  return () => {
    eventSource.close();
  };
}

export async function fetchHealth(): Promise<{ status: string; activeRunId: string | null }>
{
  return requestJson<{ status: string; activeRunId: string | null }>("/health");
}
