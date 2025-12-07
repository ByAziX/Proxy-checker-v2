"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe2, Lock, ShieldAlert, ShieldCheck, Upload } from "lucide-react";

const pages = [
  {
    href: "/apps",
    title: "Applications et endpoints",
    desc: "Cree tes applications et liste leurs URLs (web, API, fichiers).",
    icon: <Globe2 className="size-5" />,
  },
  {
    href: "/threat",
    title: "Threat protection",
    desc: "Tester l acces a des URLs a risque (depuis navigateur et serveur).",
    icon: <ShieldAlert className="size-5" />,
  },
  {
    href: "/dlp",
    title: "DLP / exfiltration",
    desc: "Simuler une exfiltration controlee pour verifier les blocages.",
    icon: <Upload className="size-5" />,
  },
  {
    href: "/browser-checks",
    title: "Checks depuis le navigateur",
    desc: "Verifier l acces aux sites stockes en base via ton reseau utilisateur.",
    icon: <ShieldCheck className="size-5" />,
  },
  {
    href: "/server-checks",
    title: "Checks depuis le serveur",
    desc: "Tester une URL cote backend pour comparer avec l utilisateur.",
    icon: <Lock className="size-5" />,
  },
];

const stats = [
  { label: "Sites suivis", value: "24" },
  { label: "Tests jour", value: "132" },
  { label: "Taux succes", value: "87%" },
  { label: "Latence nav.", value: "480 ms" },
  { label: "Latence serveur", value: "120 ms" },
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

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card className="border-none bg-white/90 shadow-xl ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
            <CardHeader>
              <CardTitle>Activite des checks</CardTitle>
              <CardDescription>Evolution des checks reussis et bloques (demo).</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-7 gap-2">
              {[50, 72, 40, 88, 64, 92, 75].map((h, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className="h-40 w-8 rounded-md bg-slate-100 dark:bg-slate-800">
                    <div
                      className="w-full rounded-md bg-primary transition"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">J{idx + 1}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-none bg-white/90 shadow-xl ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
            <CardHeader>
              <CardTitle>Repartition</CardTitle>
              <CardDescription>Accessibles vs bloques (demo).</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <div className="relative h-40 w-40">
                <div className="absolute inset-0 rounded-full bg-primary/20" />
                <div
                  className="absolute inset-1 rounded-full bg-emerald-400/70"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 65%, 0 65%)" }}
                />
                <div className="absolute inset-4 rounded-full bg-white/90 dark:bg-slate-900/80" />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                  87% OK
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card
              key={page.href}
              className="border-none bg-white/80 shadow-lg ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/80 dark:ring-white/5"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {page.icon}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={page.href}>Ouvrir</Link>
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 px-6 pb-6">
                <CardTitle>{page.title}</CardTitle>
                <CardDescription>{page.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
