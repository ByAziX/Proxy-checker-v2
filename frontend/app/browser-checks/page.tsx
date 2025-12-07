"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/lib/store/userStore";
import { fetchApps, type App } from "@/lib/api";
import {
  CheckCircle2,
  Globe2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  WifiOff,
} from "lucide-react";

type CheckStatus = "idle" | "checking" | "reachable" | "blocked";

type CheckResult = {
  status: CheckStatus;
  latencyMs?: number;
  error?: string;
};

const statusCopy: Record<CheckStatus, { label: string; tone: string; icon: ReactNode }> = {
  idle: {
    label: "En attente",
    tone: "bg-muted text-muted-foreground border border-dashed border-muted-foreground/30",
    icon: <WifiOff className="size-4" />,
  },
  checking: {
    label: "Test en cours",
    tone:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100 border border-amber-200/80 dark:border-amber-800",
    icon: <Loader2 className="size-4 animate-spin" />,
  },
  reachable: {
    label: "Accessible",
    tone:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100 border border-emerald-200/80 dark:border-emerald-800",
    icon: <CheckCircle2 className="size-4" />,
  },
  blocked: {
    label: "Bloqué",
    tone:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-100 border border-rose-200/80 dark:border-rose-800",
    icon: <ShieldAlert className="size-4" />,
  },
};

const formatLatency = (latency?: number) =>
  typeof latency === "number" ? `${Math.round(latency)} ms` : "-";

const categories: { value: App["category"] | "all"; label: string }[] = [
  { value: "all", label: "Toutes les catégories" },
  { value: "CLOUD_STORAGE", label: "Cloud storage" },
  { value: "FILE_TRANSFER", label: "File transfer" },
  { value: "SOCIAL_MEDIA", label: "Social media" },
  { value: "SAAS", label: "SaaS" },
  { value: "OTHER", label: "Autre" },
];

export default function BrowserChecksPage() {
  const { token } = useUserStore();
  const [apps, setApps] = useState<App[]>([]);
  const [checks, setChecks] = useState<Record<string, CheckResult>>({});
  const [categoryFilter, setCategoryFilter] = useState<App["category"] | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [inFlight, setInFlight] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const visibleApps = useMemo(() => {
    return apps.filter((app) => {
      const matchCategory = categoryFilter === "all" || app.category === categoryFilter;
      const matchSearch = !search.trim()
        ? true
        : app.name.toLowerCase().includes(search.toLowerCase()) ||
          (app.description || "").toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [apps, categoryFilter, search]);

  const stats = useMemo(() => {
    const statuses = visibleApps.flatMap((app) =>
      (app.endpoints || []).map((ep) => checks[`${app.id}-${ep.id}`]?.status ?? "idle")
    );
    return {
      reachable: statuses.filter((s) => s === "reachable").length,
      blocked: statuses.filter((s) => s === "blocked").length,
      checking: statuses.filter((s) => s === "checking").length,
      total: statuses.length,
    };
  }, [checks, visibleApps]);

  const isChecking = inFlight > 0;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { apps: data } = await fetchApps(token);
        setApps(data);
        setChecks((prev) => {
          const next: Record<string, CheckResult> = { ...prev };
          data.forEach((app) => {
            app.endpoints?.forEach((ep) => {
              const key = `${app.id}-${ep.id}`;
              if (!next[key]) next[key] = { status: "idle" };
            });
          });
          return next;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Chargement impossible";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const checkEndpoint = async (appName: string, url: string) => {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const start = performance.now();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(normalized, {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      const latency = performance.now() - start;
      if (response.ok || response.type === "opaque") {
        return { status: "reachable", latencyMs: latency } satisfies CheckResult;
      }
      return {
        status: "blocked",
        latencyMs: latency,
        error: response.status ? `Reponse ${response.status}` : "Blocage CORS/proxy",
      } satisfies CheckResult;
    } catch (err) {
      window.clearTimeout(timeoutId);
      return {
        status: "blocked",
        latencyMs: performance.now() - start,
        error: err instanceof Error ? err.message : "Echec navigateur",
      } satisfies CheckResult;
    }
  };

  const runChecks = async (targets: { appId: number; endpointId: number; url: string; appName: string }[]) => {
    if (!targets.length) return;
    setInFlight((c) => c + 1);
    setChecks((prev) => {
      const next = { ...prev } as Record<string, CheckResult>;
      targets.forEach((t) => {
        next[`${t.appId}-${t.endpointId}`] = { status: "checking" };
      });
      return next;
    });

    try {
      const entries = await Promise.all(
        targets.map(async (t) => {
          const res = await checkEndpoint(t.appName, t.url);
          return [`${t.appId}-${t.endpointId}`, res] as const;
        })
      );
      setChecks((prev) => {
        const next = { ...prev } as Record<string, CheckResult>;
        entries.forEach(([key, res]) => {
          next[key] = res;
        });
        return next;
      });
    } finally {
      setInFlight((c) => Math.max(0, c - 1));
    }
  };

  const selectedTargets = visibleApps.flatMap((app) =>
    (app.endpoints || []).map((ep) => ({
      appId: app.id,
      endpointId: ep.id,
      url: ep.url,
      appName: app.name,
    }))
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10 font-sans text-foreground dark:from-slate-950 dark:via-slate-900 dark:to-black">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Globe2 className="size-4" />
            Checks depuis le navigateur (par applications)
          </div>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Tester les endpoints de vos applications
          </h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Choisissez une catégorie ou une application. Les requêtes partent directement du navigateur. Gratuit pour les checks.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Catégorie</Label>
            <select
              className="h-10 rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-slate-900"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as App["category"] | "all")}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Recherche</Label>
            <Input
              placeholder="Rechercher une application"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Endpoints visibles" value={stats.total} tone="primary" />
          <Stat label="Accessibles" value={stats.reachable} tone="green" />
          <Stat label="Bloqués" value={stats.blocked} tone="rose" />
          <Stat label="En test" value={stats.checking} tone="amber" />
        </div>

        <Card className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
          <CardHeader>
            <CardTitle>Campagne</CardTitle>
            <CardDescription>Lancer les checks pour la sélection courante.</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-wrap gap-3">
            <Button
              className="gap-2"
              onClick={() => runChecks(selectedTargets)}
              disabled={!selectedTargets.length || isChecking}
            >
              {isChecking ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Lancer les tests visibles
            </Button>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Chargement des applications...
              </div>
            ) : null}
            {error ? <div className="text-sm text-rose-600">{error}</div> : null}
          </CardFooter>
        </Card>

        <div className="grid gap-4">
          {visibleApps.length === 0 ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 px-4 py-6 text-muted-foreground">
              Aucune application dans ce filtre.
            </div>
          ) : null}

          {visibleApps.map((app) => (
            <Card
              key={app.id}
              className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>{app.name}</CardTitle>
                  <CardDescription>{app.description}</CardDescription>
                  <div className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {app.category}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    runChecks(
                      (app.endpoints || []).map((ep) => ({
                        appId: app.id,
                        endpointId: ep.id,
                        url: ep.url,
                        appName: app.name,
                        label: ep.label,
                        category: app.category,
                      }))
                    )
                  }
                  disabled={isChecking || !app.endpoints?.length}
                  className="gap-2"
                >
                  {isChecking ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Tester cette application
                </Button>
              </CardHeader>

              <CardContent className="flex flex-col gap-3">
                {!app.endpoints?.length ? (
                  <div className="rounded-lg border border-dashed border-muted-foreground/30 px-3 py-2 text-sm text-muted-foreground">
                    Aucun endpoint pour cette application.
                  </div>
                ) : (
                  app.endpoints.map((ep) => {
                    const key = `${app.id}-${ep.id}`;
                    const result = checks[key] ?? { status: "idle" };
                    const status = statusCopy[result.status];
                    return (
                      <div
                        key={ep.id}
                        className="flex flex-col gap-2 rounded-xl border border-border/70 bg-gradient-to-br from-white to-slate-50 px-4 py-3 shadow-sm dark:from-slate-900 dark:to-slate-900/70"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Globe2 className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-base font-semibold">{ep.label}</div>
                              <div className="truncate text-xs text-muted-foreground">{ep.url}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium",
                                status.tone
                              )}
                            >
                              {status.icon}
                              {status.label}
                            </span>
                            <span className="text-sm text-muted-foreground">{formatLatency(result.latencyMs)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                        onClick={() =>
                          runChecks([
                            {
                              appId: app.id,
                              endpointId: ep.id,
                              url: ep.url,
                              appName: app.name,
                            },
                          ])
                        }
                            disabled={isChecking}
                          >
                            <RefreshCw className="size-4" />
                            Retester
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

type StatProps = {
  label: string;
  value: number;
  tone?: "primary" | "green" | "rose" | "amber";
};

function Stat({ label, value, tone }: StatProps) {
  const color =
    tone === "green"
      ? "text-emerald-500"
      : tone === "rose"
        ? "text-rose-500"
        : tone === "amber"
          ? "text-amber-500"
          : "text-primary";
  return (
    <Card className="border border-white/40 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-semibold", color)}>{value}</div>
    </Card>
  );
}
