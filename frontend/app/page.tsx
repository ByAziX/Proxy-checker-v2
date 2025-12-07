"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Globe2 } from "lucide-react";

const stats = [
  { label: "Sites suivis", value: "24" },
  { label: "Tests jour", value: "132" },
  { label: "Taux succes", value: "87%" },
  { label: "Latence nav.", value: "480 ms" },
  { label: "Latence serveur", value: "120 ms" },
];

const moduleStats = [
  { name: "Applications", metric: "24 apps", uptime: "99.3%", blocked: "3 blocages", path: "/apps" },
  { name: "Threat protection", metric: "12 urls", uptime: "98.1%", blocked: "1 blocage", path: "/threat" },
  { name: "DLP / exfiltration", metric: "8 scenarios", uptime: "99.8%", blocked: "0 blocage", path: "/dlp" },
  { name: "Checks navigateur", metric: "62 endpoints", uptime: "97.5%", blocked: "5 blocages", path: "/browser-checks" },
  { name: "Checks serveur", metric: "62 endpoints", uptime: "99.1%", blocked: "2 blocages", path: "/server-checks" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-12 font-sans text-foreground dark:from-slate-950 dark:via-slate-900 dark:to-black">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Globe2 className="size-4" />
            Observabilite reseau (proxy, DLP, threat)
          </div>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Suite de tests proxy / DLP / threat
          </h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Choisis un module pour gerer tes applications, tester la threat
            protection, simuler l exfiltration, ou comparer les resultats
            navigateur vs serveur.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((item) => (
            <Card
              key={item.label}
              className="border border-white/40 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70"
            >
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {item.label}
              </div>
              <div className="text-2xl font-semibold text-primary">{item.value}</div>
            </Card>
          ))}
        </div>

        <Card className="border-none bg-white/90 shadow-xl ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
          <CardHeader>
            <CardTitle>Stats par module</CardTitle>
            <CardDescription>
              Vue synthetique des principaux modules (downtime, latence, blocages).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {moduleStats.map((m) => (
              <div
                key={m.name}
                className="flex flex-col gap-2 rounded-lg border border-white/40 bg-white/80 p-4 text-sm shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-900/70"
              >
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{m.name}</div>
                <div className="text-lg font-semibold text-primary">{m.metric}</div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
                    Disponibilite {m.uptime}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-100">
                    {m.blocked}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
