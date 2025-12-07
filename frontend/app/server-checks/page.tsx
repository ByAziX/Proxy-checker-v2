"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchApps, fetchHistory, fetchHistorySummary, type App } from "@/lib/api";
import { useUserStore } from "@/lib/store/userStore";
import { cn } from "@/lib/utils";
import { Chip } from "./chip";
import { CloudAlert, Clock } from "lucide-react";

type HistoryEntry = {
  at: string;
  status: "reachable" | "blocked" | "checking" | "idle";
  latencyMs?: number | null;
  httpStatus?: number | null;
  error?: string | null;
  applicationId: number;
};

export default function ServerChecksPage() {
  const { token } = useUserStore();
  const router = useRouter();

  const [apps, setApps] = useState<App[]>([]);
  const [historyByApp, setHistoryByApp] = useState<Record<number, HistoryEntry[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [nextRun, setNextRun] = useState<Date | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  // Charger les apps par défaut
  useEffect(() => {
    const loadApps = async () => {
      setError(null);
      try {
        const { apps: data } = await fetchApps(token);
        setApps(data.filter((a) => a.isDefault));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chargement des applications impossible");
      }
    };
    loadApps();
  }, [token]);

  // Charger l'historique agrégé
  const refreshHistory = async () => {
    try {
      const { history } = await fetchHistory({ limit: 1000 });
      const byApp: Record<number, HistoryEntry[]> = {};
      history.forEach((h) => {
        const entry: HistoryEntry = {
          at: h.createdAt,
          status: h.status as HistoryEntry["status"],
          latencyMs: h.latencyMs,
          httpStatus: h.httpStatus,
          error: h.error,
          applicationId: h.applicationId,
        };
        if (!byApp[h.applicationId]) byApp[h.applicationId] = [];
        byApp[h.applicationId].push(entry);
      });
      setHistoryByApp(byApp);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshHistory();
    const intervalId = window.setInterval(refreshHistory, 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Charger le dernier run côté backend pour afficher le compte à rebours
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const { lastRun: lr, intervalMs } = await fetchHistorySummary();
        if (lr) {
          const lrDate = new Date(lr);
          setLastRun(lrDate);
          setNextRun(new Date(lrDate.getTime() + intervalMs));
        }
      } catch {
        /* ignore */
      }
    };
    loadSummary();
    const id = window.setInterval(loadSummary, 60000);
    return () => window.clearInterval(id);
  }, []);

  // Countdown
  useEffect(() => {
    const tick = () => {
      if (!nextRun) {
        setRemainingSec(null);
        return;
      }
      const diff = Math.max(0, Math.floor((nextRun.getTime() - Date.now()) / 1000));
      setRemainingSec(diff);
    };
    const id = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(id);
  }, [nextRun]);

  const formatCountdown = useMemo(() => {
    if (remainingSec == null) return "Auto";
    const min = Math.floor(remainingSec / 60);
    const sec = remainingSec % 60;
    return min > 0 ? `${min}m ${sec.toString().padStart(2, "0")}s` : `${sec}s`;
  }, [remainingSec]);

  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q) ||
        (a.category || "").toLowerCase().includes(q)
    );
  }, [apps, search]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10 font-sans text-foreground dark:from-slate-950 dark:via-slate-900 dark:to-black">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <CloudAlert className="size-4" />
            Down detector (serveur)
          </div>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Etat des applications cote backend</h1>
          <p className="text-lg text-muted-foreground">
            Tests planifiés côté serveur toutes les 15 minutes. Les résultats sont stockés en base et partagés pour tous les
            utilisateurs.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            Dernier run : {lastRun ? lastRun.toLocaleTimeString() : "N/A"} • Prochain dans : {formatCountdown}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <Input
              placeholder="Rechercher une application (nom, description, categorie)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {filteredApps.length} apps / {apps.length} (defaut)
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {filteredApps.map((app) => {
            const entries = historyByApp[app.id] || [];
            const ok = entries.filter((h) => h.status === "reachable").length;
            const ko = entries.filter((h) => h.status === "blocked").length;
            const avg =
              entries.filter((h) => typeof h.latencyMs === "number").reduce((acc, h) => acc + (h.latencyMs || 0), 0) /
              Math.max(1, entries.filter((h) => typeof h.latencyMs === "number").length);
            return (
              <Card
                key={app.id}
                className="cursor-pointer border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/80 dark:ring-white/5"
                onClick={() => router.push(`/server-checks/${app.id}`)}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {app.name}
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {app.category}
                      </span>
                    </CardTitle>
                    <CardDescription>{app.description}</CardDescription>
                    {entries.length ? (
                      <div className="mt-2 flex flex-col gap-2 rounded-md bg-white/60 px-3 py-2 text-xs text-muted-foreground shadow-sm dark:bg-slate-900/60">
                        <div className="font-semibold text-foreground">Vue globale</div>
                        <div className="flex gap-1">
                          {entries.slice(0, 16).map((h, idx) => (
                            <div
                              key={`${h.at}-bar-${idx}`}
                              className={cn(
                                "h-10 w-3 rounded-sm",
                                h.status === "reachable"
                                  ? "bg-emerald-400"
                                  : h.status === "blocked"
                                    ? "bg-rose-400"
                                    : "bg-slate-300"
                              )}
                              title={`${new Date(h.at).toLocaleString()} • ${h.status}${
                                h.httpStatus ? ` • HTTP ${h.httpStatus}` : ""
                              }${typeof h.latencyMs === "number" ? ` • ${Math.round(h.latencyMs)} ms` : ""}${
                                h.error ? ` • ${h.error}` : ""
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Chip label="OK" value={ok} tone="green" />
                          <Chip label="KO" value={ko} tone="rose" />
                          <Chip label="Lat. moy" value={Math.round(avg) || 0} suffix="ms" />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">Aucun historique encore.</div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" disabled className="gap-2 opacity-60" title="Tests planifiés serveur">
                    <Clock className="size-4" />
                    {formatCountdown}
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="rounded-md border border-dashed border-muted-foreground/30 bg-white/70 px-3 py-2 text-xs text-muted-foreground dark:bg-slate-900/60">
                    Vue globale. Clique pour ouvrir la fiche detaillee (historique complet + endpoints).
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
