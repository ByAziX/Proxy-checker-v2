"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchApp, fetchHistory, type App, type AppEndpoint } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ArrowLeft, CloudAlert, Clock } from "lucide-react";
import { Chip } from "../chip";

type HistoryEntry = {
  at: string;
  status: "reachable" | "blocked" | "checking" | "idle";
  latencyMs?: number | null;
  httpStatus?: number | null;
  error?: string | null;
  endpointId: number;
};

export default function ServerCheckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [app, setApp] = useState<App | null>(null);
  const [historyByEndpoint, setHistoryByEndpoint] = useState<Record<number, HistoryEntry[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "all">("7d");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ app: appData }, { history }] = await Promise.all([
          fetchApp(id),
          fetchHistory({ applicationId: id, limit: 1000 }),
        ]);
        setApp(appData);

        const byEp: Record<number, HistoryEntry[]> = {};
        history.forEach((h) => {
          const entry: HistoryEntry = {
            at: h.createdAt,
            status: h.status as HistoryEntry["status"],
            latencyMs: h.latencyMs,
            httpStatus: h.httpStatus,
            error: h.error,
            endpointId: h.endpointId,
          };
          if (!byEp[h.endpointId]) byEp[h.endpointId] = [];
          byEp[h.endpointId].push(entry);
        });
        setHistoryByEndpoint(byEp);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chargement impossible");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const ranges: Record<typeof range, number | null> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      all: null,
    };
    const windowMs = ranges[range];
    const filterFn = (h: HistoryEntry) =>
      windowMs === null ? true : now - new Date(h.at).getTime() <= windowMs;
    const byEp: typeof historyByEndpoint = {};
    Object.entries(historyByEndpoint).forEach(([epId, entries]) => {
      byEp[Number(epId)] = entries.filter(filterFn);
    });
    return byEp;
  }, [historyByEndpoint, range]);

  const globalStats = useMemo(() => {
    const entries = Object.values(filtered).flat();
    const ok = entries.filter((h) => h.status === "reachable").length;
    const ko = entries.filter((h) => h.status === "blocked").length;
    const avg =
      entries.filter((h) => typeof h.latencyMs === "number").reduce((acc, h) => acc + (h.latencyMs || 0), 0) /
      Math.max(1, entries.filter((h) => typeof h.latencyMs === "number").length);
    const total = entries.length;
    const availability = total ? Math.round((ok / total) * 100) : 0;
    const last = entries[0]?.at ? new Date(entries[0].at) : null;
    return { ok, ko, avg: Math.round(avg) || 0, total, availability, last };
  }, [filtered]);

  const renderBars = (entries: HistoryEntry[], barHeight = "h-12") => (
    <div className="flex gap-1">
      {entries.slice(0, 32).map((h, idx) => (
        <div
          key={`${h.at}-${idx}`}
          className={cn(
            `${barHeight} w-3 rounded-sm`,
            h.status === "reachable" ? "bg-emerald-400" : h.status === "blocked" ? "bg-rose-400" : "bg-slate-300"
          )}
          title={`${new Date(h.at).toLocaleString()} • ${h.status}${
            h.httpStatus ? ` • HTTP ${h.httpStatus}` : ""
          }${typeof h.latencyMs === "number" ? ` • ${Math.round(h.latencyMs)} ms` : ""}${h.error ? ` • ${h.error}` : ""}`}
        />
      ))}
    </div>
  );

  if (!id) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10 font-sans text-foreground dark:from-slate-950 dark:via-slate-900 dark:to-black">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/server-checks")} className="gap-2">
            <ArrowLeft className="size-4" />
            Retour
          </Button>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <CloudAlert className="size-4" />
            Detail checks serveur
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <Clock className="size-4" />
            Plage:{" "}
            <select
              className="rounded-md border border-input bg-transparent px-2 py-1 text-xs outline-none"
              value={range}
              onChange={(e) => setRange(e.target.value as typeof range)}
            >
              <option value="24h">24h</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="all">Tout</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <Card className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {app?.name || "Application"}
              {app?.category ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{app.category}</span>
              ) : null}
            </CardTitle>
            <CardDescription>{app?.description}</CardDescription>
          </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="text-xs text-muted-foreground">Historique global</div>
              {filtered && Object.keys(filtered).length ? (
                <>
                  {renderBars(Object.values(filtered).flat(), "h-12")}
                  <div className="flex flex-wrap gap-2">
                    <Chip label="OK" value={globalStats.ok} tone="green" />
                    <Chip label="KO" value={globalStats.ko} tone="rose" />
                    <Chip label="Lat. moy" value={globalStats.avg} suffix="ms" />
                    <Chip label="Disponibilite" value={globalStats.availability} suffix="%" tone="blue" />
                    <Chip label="Entries" value={globalStats.total} />
                    <span className="text-xs text-muted-foreground">Plage: {range}</span>
                    {globalStats.last ? (
                      <span className="text-xs text-muted-foreground">
                        Dernier : {globalStats.last.toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">Aucun historique.</div>
              )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {app?.endpoints?.length ? (
            app.endpoints.map((ep: AppEndpoint) => {
              const entries = filtered[ep.id] || [];
              const ok = entries.filter((h) => h.status === "reachable").length;
              const ko = entries.filter((h) => h.status === "blocked").length;
              const avg =
                entries.filter((h) => typeof h.latencyMs === "number").reduce((acc, h) => acc + (h.latencyMs || 0), 0) /
                Math.max(1, entries.filter((h) => typeof h.latencyMs === "number").length);
              const total = entries.length;
              const availability = total ? Math.round((ok / total) * 100) : 0;
              const last = entries[0]?.at ? new Date(entries[0].at) : null;
              return (
                <Card key={ep.id} className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {ep.label}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                        {ep.kind}
                      </span>
                    </CardTitle>
                    <CardDescription className="truncate text-xs">{ep.url}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
                    {entries.length ? (
                      <>
                        {renderBars(entries, "h-6")}
                        <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                          {entries.slice(0, 8).map((h, idx) => (
                            <span key={`${h.at}-lab-${idx}`} className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
                              {new Date(h.at).toLocaleDateString()} {new Date(h.at).toLocaleTimeString()}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div>Aucun historique sur cette plage.</div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Chip label="OK" value={ok} tone="green" />
                      <Chip label="KO" value={ko} tone="rose" />
                      <Chip label="Lat. moy" value={Math.round(avg) || 0} suffix="ms" />
                      <Chip label="Disponibilite" value={availability} suffix="%" tone="blue" />
                      <Chip label="Entries" value={total} />
                      {last ? (
                        <span className="text-[11px] text-muted-foreground">
                          Dernier : {last.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    {entries.slice(0, 6).map((h, idx) => (
                      <div key={`${h.at}-${idx}`} className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {new Date(h.at).toLocaleString()}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                            h.status === "reachable"
                              ? "bg-emerald-100 text-emerald-800"
                              : h.status === "blocked"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-200 text-slate-700"
                          )}
                        >
                          {h.status}
                        </span>
                        {typeof h.latencyMs === "number" ? <span>{Math.round(h.latencyMs)} ms</span> : null}
                        {h.httpStatus ? <span>HTTP {h.httpStatus}</span> : null}
                        {h.error ? <span className="text-rose-600">{h.error}</span> : null}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-sm text-muted-foreground">Aucun endpoint pour cette application.</div>
          )}
        </div>
      </div>
    </main>
  );
}
