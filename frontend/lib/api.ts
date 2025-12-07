const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001";

export type Category = {
  id: number;
  name: string;
  description?: string | null;
  targets?: SiteTarget[];
};

export type SiteTarget = {
  id: number;
  name: string;
  url: string;
  protectionType: "PROXY" | "DLP" | "THREAT" | "CUSTOM";
  notes?: string | null;
  tags?: string | null;
  categoryId: number;
  category?: Category;
  createdAt?: string;
};

export type AuthResponse = {
  token: string;
  user: { id: number; email: string; name?: string | null };
};

export type App = {
  id: number;
  name: string;
  description?: string | null;
  category: AppCategory;
  isDefault?: boolean;
  createdAt?: string;
  endpoints?: AppEndpoint[];
};

export type AppCategory =
  | "CLOUD_STORAGE"
  | "FILE_TRANSFER"
  | "SOCIAL_MEDIA"
  | "SAAS"
  | "OTHER";

export type AppEndpoint = {
  id: number;
  label: string;
  url: string;
  kind: "WEB" | "API" | "FILE";
  method?: string | null;
  notes?: string | null;
  applicationId: number;
  createdAt?: string;
};

type Options = {
  token?: string | null;
  body?: unknown;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
};

async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function register(email: string, password: string, name?: string) {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: { email, password, name },
  });
}

export function fetchProfile(token: string) {
  return apiFetch<{ user: AuthResponse["user"] }>("/auth/me", { token });
}

export function fetchCategories(token?: string | null) {
  return apiFetch<{ categories: Category[] }>("/categories", { token });
}

export function createCategory(
  input: { name: string; description?: string },
  token: string
) {
  return apiFetch<{ category: Category }>("/categories", {
    method: "POST",
    body: input,
    token,
  });
}

export function createTarget(
  input: {
    name: string;
    url: string;
    categoryId: number;
    protectionType?: SiteTarget["protectionType"];
    notes?: string;
    tags?: string;
  },
  token: string
) {
  return apiFetch<{ target: SiteTarget }>("/targets", {
    method: "POST",
    body: input,
    token,
  });
}

export function fetchTargets(token?: string | null) {
  return apiFetch<{ targets: SiteTarget[] }>("/targets", { token });
}

export function fetchApps(token?: string | null) {
  return apiFetch<{ apps: App[] }>("/apps", { token });
}

export function fetchApp(id: number, token?: string | null) {
  return apiFetch<{ app: App }>(`/apps/${id}`, { token });
}

export function createApp(
  input: { name: string; description?: string; category?: AppCategory },
  token: string
) {
  return apiFetch<{ app: App }>("/apps", {
    method: "POST",
    body: input,
    token,
  });
}

export function createAppEndpoint(
  appId: number,
  input: {
    label: string;
    url: string;
    kind?: AppEndpoint["kind"];
    method?: string;
    notes?: string;
  },
  token: string
) {
  return apiFetch<{ endpoint: AppEndpoint }>(`/apps/${appId}/endpoints`, {
    method: "POST",
    body: input,
    token,
  });
}

export function serverCheck(input: {
  url: string;
  method?: string;
  payload?: string;
  contentType?: string;
  applicationId?: number;
  endpointId?: number;
}) {
  return apiFetch<{
    status: "reachable" | "blocked";
    httpStatus?: number;
    latencyMs?: number;
    error?: string;
    url: string;
  }>("/server-check", { method: "POST", body: input });
}

export function fetchHistory(params?: { applicationId?: number; endpointId?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.applicationId) qs.set("applicationId", String(params.applicationId));
  if (params?.endpointId) qs.set("endpointId", String(params.endpointId));
  if (params?.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<{
    history: Array<{
      id: number;
      applicationId: number;
      endpointId: number;
      status: string;
      latencyMs?: number | null;
      httpStatus?: number | null;
      error?: string | null;
      createdAt: string;
      application: App;
      endpoint: AppEndpoint;
    }>;
  }>(`/history${suffix}`);
}

export function fetchHistorySummary() {
  return apiFetch<{ lastRun: string | null; intervalMs: number }>("/history/summary");
}
