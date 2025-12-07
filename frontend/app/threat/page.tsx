"use client";

import { useState } from "react";
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
import { serverCheck } from "@/lib/api";
import {  Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

type CheckResult = {
  status: "idle" | "checking" | "reachable" | "blocked";
  latencyMs?: number;
  httpStatus?: number;
  error?: string;
};

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withProtocol = trimmed.match(/^https?:\/\//i)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return url.toString();
  } catch {
    return "";
  }
};

export default function ThreatPage() {
  const [url, setUrl] = useState("https://example.com/malware-test");
  const [method, setMethod] = useState("GET");
  const [browserResult, setBrowserResult] = useState<CheckResult>({ status: "idle" });
  const [serverResult, setServerResult] = useState<CheckResult>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);

  const checkFromBrowser = async (target: string) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);
    const start = performance.now();
    try {
      const response = await fetch(target, {
        method,
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      const latencyMs = performance.now() - start;
      if (response.ok || response.type === "opaque") {
        setBrowserResult({ status: "reachable", latencyMs });
      } else {
        setBrowserResult({
          status: "blocked",
          latencyMs,
          error: response.status ? `Reponse ${response.status}` : "Blocage CORS/proxy",
        });
      }
    } catch (err) {
      window.clearTimeout(timeoutId);
      setBrowserResult({
        status: "blocked",
        latencyMs: performance.now() - start,
        error: err instanceof Error ? err.message : "Echec navigateur",
      });
    }
  };

  const handleRun = async () => {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError("URL invalide");
      return;
    }
    setError(null);
    setBrowserResult({ status: "checking" });
    setServerResult({ status: "checking" });

    checkFromBrowser(normalized);

    try {
      const res = await serverCheck({ url: normalized, method });
      setServerResult({
        status: res.status,
        latencyMs: res.latencyMs,
        httpStatus: res.httpStatus,
        error: res.error,
      });
    } catch (err) {
      setServerResult({
        status: "blocked",
        error: err instanceof Error ? err.message : "Echec serveur",
      });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10 font-sans text-foreground dark:from-slate-950 dark:via-slate-900 dark:to-black">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldAlert className="size-4" />
            Threat protection
          </div>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Tester l acces a des URLs risquees</h1>
          <p className="text-lg text-muted-foreground">
            Test cote navigateur (no-cors) et cote serveur pour comparer le blocage proxy / threat protection.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <Card className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
          <CardHeader>
            <CardTitle>URL a tester</CardTitle>
            <CardDescription>
              Utilise une URL de test (ex: fichier EICAR heberge sur un domaine de test). Evite de telecharger du vrai malware.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/eicar.txt"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="method">Methode</Label>
              <Input
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="GET"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="gap-2" onClick={handleRun}>
              <ShieldAlert className="size-4" /> Lancer les tests
            </Button>
          </CardFooter>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <ResultCard title="Depuis le navigateur" result={browserResult} />
          <ResultCard title="Depuis le serveur" result={serverResult} />
        </div>
      </div>
    </main>
  );
}

type ResultProps = {
  title: string;
  result: CheckResult;
};

function ResultCard({ title, result }: ResultProps) {
  const tone =
    result.status === "reachable"
      ? "text-emerald-600"
      : result.status === "blocked"
        ? "text-rose-600"
        : "text-amber-600";

  const icon =
    result.status === "reachable" ? (
      <ShieldCheck className="size-5 text-emerald-600" />
    ) : result.status === "blocked" ? (
      <ShieldAlert className="size-5 text-rose-600" />
    ) : (
      <Loader2 className="size-5 animate-spin text-amber-600" />
    );

  return (
    <Card className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
      <CardHeader className="flex flex-row items-center gap-2">
        {icon}
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className={tone}>{result.status}</span>
          {result.httpStatus ? <span>HTTP {result.httpStatus}</span> : null}
          {result.latencyMs ? <span>{Math.round(result.latencyMs)} ms</span> : null}
        </div>
        {result.error ? <div className="text-rose-600">{result.error}</div> : null}
      </CardContent>
    </Card>
  );
}

