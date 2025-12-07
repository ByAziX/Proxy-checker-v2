"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useUserStore } from "@/lib/store/userStore";
import { createApp, fetchApps, type App, type AppCategory } from "@/lib/api";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Link2,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const categoryOptions: { value: AppCategory; label: string }[] = [
  { value: "CLOUD_STORAGE", label: "Cloud storage" },
  { value: "FILE_TRANSFER", label: "File transfer" },
  { value: "SOCIAL_MEDIA", label: "Social media" },
  { value: "SAAS", label: "SaaS" },
  { value: "OTHER", label: "Autre" },
];

export default function AppsPage() {
  const router = useRouter();
  const { user, token } = useUserStore();
  const [apps, setApps] = useState<App[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AppCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<{
    name: string;
    description: string;
    category: AppCategory;
  }>({
    name: "",
    description: "",
    category: "OTHER",
  });

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesCategory = filter === "all" || app.category === filter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        app.name.toLowerCase().includes(query) ||
        (app.description || "").toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [apps, filter, search]);

  const stats = useMemo(() => {
    const defaults = apps.filter((a) => a.isDefault).length;
    const custom = apps.filter((a) => !a.isDefault).length;
    const endpoints = apps.reduce((acc, a) => acc + (a.endpoints?.length || 0), 0);
    return { total: apps.length, defaults, custom, endpoints };
  }, [apps]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { apps: data } = await fetchApps(token);
        // Prioritise custom apps on top while keeping stable order
        const sorted = [...data].sort((a, b) => Number(a.isDefault) - Number(b.isDefault));
        setApps(sorted);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Chargement impossible";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handleCreate = async () => {
    if (!user || !token) {
      setError("Connecte-toi pour creer et modifier tes applications custom.");
      return;
    }
    if (!form.name.trim()) {
      setError("Un nom est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { app } = await createApp(
        {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          category: form.category,
        },
        token
      );
      setApps((prev) => [app, ...prev]);
      setForm({ name: "", description: "", category: "OTHER" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Creation impossible";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10 font-sans text-foreground dark:from-slate-950 dark:via-slate-900 dark:to-black">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <FolderKanban className="size-4" />
            Applications + endpoints
          </div>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Catalogue des applications a tester
          </h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Les applications par defaut sont deja chargees (Dropbox, Drive, WeTransfer, etc).
            Cree tes propres apps, ajoute leurs URLs, puis lance les checks navigateur ou serveur.
          </p>
        </header>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Applications" value={stats.total} />
          <Stat label="Custom" value={stats.custom} tone="blue" />
          <Stat label="Par defaut" value={stats.defaults} tone="amber" />
          <Stat label="Endpoints" value={stats.endpoints} tone="green" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
            <CardHeader>
              <CardTitle>Nouvelle application custom</CardTitle>
              <CardDescription>
                Creation gratuite, edition reservee aux utilisateurs connectes. Les apps par defaut restent en lecture seule.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Nom</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Mon portail cloud"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Usage, sensibilite, notes..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Categorie</Label>
                <select
                  className="h-10 rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-slate-900"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as AppCategory }))}
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground sm:col-span-1">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="size-4" /> Compte requis
                </span>
                <span>Les checks simples sont gratuits, l edition necessite un compte.</span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Button onClick={handleCreate} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Creer
              </Button>
              {!user ? (
                <span className="text-sm text-muted-foreground">
                  Connecte-toi pour sauvegarder tes apps personnalisables.
                </span>
              ) : null}
            </CardFooter>
          </Card>

          <Card className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
            <CardHeader>
              <CardTitle>Filtrer</CardTitle>
              <CardDescription>Par categorie ou mot-cle.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Categorie</Label>
                <select
                  className="h-10 rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-slate-900"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as AppCategory | "all")}
                >
                  <option value="all">Toutes</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Recherche</Label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom ou description"
                />
              </div>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Chargement des applications...
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredApps.length === 0 ? (
            <div className="sm:col-span-2 xl:col-span-3 rounded-lg border border-dashed border-muted-foreground/30 px-4 py-6 text-center text-muted-foreground">
              Aucune application dans ce filtre.
            </div>
          ) : null}

          {filteredApps.map((app) => {
            const isExpanded = expanded[app.id];
            const endpoints = app.endpoints || [];
            return (
              <Card
                key={app.id}
                className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/80 dark:ring-white/5"
              >
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {app.name}
                      {app.isDefault ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-100">
                          Par defaut
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
                          Custom
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>{app.description || "Aucune description"}</CardDescription>
                    <div className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {app.category}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => router.push(`/apps/${app.id}`)}
                  >
                    <ArrowUpRight className="size-4" />
                    Ouvrir
                  </Button>
                </CardHeader>

                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                      <Link2 className="size-3" /> {endpoints.length} URL
                    </span>
                    {app.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-100">
                        <Lock className="size-3" /> Lecture seule
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
                        <ShieldCheck className="size-3" /> Modifiable
                      </span>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit gap-2 px-0 text-sm text-primary"
                    onClick={() => toggleExpand(app.id)}
                  >
                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    {isExpanded ? "Masquer les URLs" : "Voir les URLs"}
                  </Button>

                  {isExpanded ? (
                    <div className="flex flex-col gap-2">
                      {endpoints.length === 0 ? (
                        <div className="rounded-md border border-dashed border-muted-foreground/30 px-3 py-2 text-sm text-muted-foreground">
                          Aucun endpoint pour cette application.
                        </div>
                      ) : (
                        endpoints.map((ep) => (
                          <div
                            key={ep.id}
                            className="rounded-lg border border-border/60 bg-white/70 px-3 py-2 text-sm shadow-sm dark:bg-slate-900/70"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate font-semibold">{ep.label}</div>
                                <div className="truncate text-xs text-muted-foreground">{ep.url}</div>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                  {ep.kind}
                                </span>
                                {ep.method ? (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    {ep.method}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </CardContent>

                <CardFooter className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link href={`/apps/${app.id}`}>
                      <ArrowUpRight className="size-4" />
                      Fiche detail
                    </Link>
                  </Button>
                  {!app.isDefault && user ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() => router.push(`/apps/${app.id}`)}
                    >
                      <Plus className="size-4" />
                      Ajouter des URLs
                    </Button>
                  ) : null}
                  {app.isDefault ? (
                    <span className="text-xs text-muted-foreground">App systeme importee automatiquement.</span>
                  ) : null}
                  {!user ? (
                    <span className="text-xs text-muted-foreground">
                      Connecte-toi pour modifier ou ajouter des endpoints.
                    </span>
                  ) : null}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "amber" | "green" | "blue";
}) {
  const color =
    tone === "green"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "blue"
          ? "text-sky-600"
          : "text-primary";
  return (
    <Card className="border border-white/40 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
    </Card>
  );
}
