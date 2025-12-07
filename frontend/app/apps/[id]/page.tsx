"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { createAppEndpoint, fetchApp, type App } from "@/lib/api";
import { ArrowLeft, Link2, Loader2, Plus, ShieldAlert } from "lucide-react";

export default function AppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useUserStore();
  const [app, setApp] = useState<App | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    label: "",
    url: "",
    kind: "WEB" as "WEB" | "API" | "FILE",
    method: "GET",
    notes: "",
  });

  const id = Number(params?.id);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { app: data } = await fetchApp(id, token);
        setApp(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chargement impossible");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, token]);

  const handleAddEndpoint = async () => {
    if (!app || app.isDefault) {
      setError("Edition interdite sur cette application.");
      return;
    }
    if (!token) {
      setError("Connecte-toi pour modifier une application.");
      return;
    }
    if (!draft.label.trim() || !draft.url.trim()) {
      setError("Label et URL requis.");
      return;
    }
    setSaving(true);
    try {
      const { endpoint } = await createAppEndpoint(
        app.id,
        {
          label: draft.label.trim(),
          url: draft.url.trim(),
          kind: draft.kind,
          method: draft.method?.trim() || undefined,
          notes: draft.notes?.trim() || undefined,
        },
        token
      );
      setApp((prev) =>
        prev
          ? { ...prev, endpoints: [endpoint, ...(prev.endpoints || [])] }
          : prev
      );
      setDraft({ label: "", url: "", kind: "WEB", method: "GET", notes: "" });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ajout impossible");
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10 font-sans text-foreground dark:from-slate-950 dark:via-slate-900 dark:to-black">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Application
            </div>
            <h1 className="mt-2 text-4xl font-semibold leading-tight">{app?.name || "Application"}</h1>
            <p className="text-muted-foreground">{app?.description}</p>
            <div className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              {app?.category}
            </div>
            {app?.isDefault ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
                <ShieldAlert className="size-4" />
                Application par defaut : lecture seule.
              </div>
            ) : null}
          </div>
          <Button variant="outline" onClick={() => router.push("/apps")} className="gap-2">
            <ArrowLeft className="size-4" />
            Retour
          </Button>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <Card className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
          <CardHeader>
            <CardTitle>Endpoints</CardTitle>
            <CardDescription>Liste des URLs testes cote navigateur.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!app?.endpoints?.length ? (
              <div className="rounded-md border border-dashed border-muted-foreground/30 px-3 py-2 text-muted-foreground text-sm">
                Aucun endpoint pour l instant.
              </div>
            ) : (
              app.endpoints.map((ep) => (
                <div
                  key={ep.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 bg-white/70 px-4 py-3 text-sm shadow-sm dark:bg-slate-900/70"
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <Link2 className="size-4 text-primary" />
                    {ep.label}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {ep.kind}
                    </span>
                    {ep.method ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {ep.method}
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{ep.url}</div>
                  {ep.notes ? <div className="text-xs text-muted-foreground">{ep.notes}</div> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
          <CardHeader>
            <CardTitle>Ajouter un endpoint</CardTitle>
            <CardDescription>Reserve aux applications creees par l utilisateur (non par defaut).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Label</Label>
              <Input
                value={draft.label}
                onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="Web"
                disabled={app?.isDefault}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>URL</Label>
              <Input
                value={draft.url}
                onChange={(e) => setDraft((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
                disabled={app?.isDefault}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <select
                className="h-10 rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-slate-900"
                value={draft.kind}
                onChange={(e) => setDraft((prev) => ({ ...prev, kind: e.target.value as "WEB" | "API" | "FILE" }))}
                disabled={app?.isDefault}
              >
                <option value="WEB">WEB</option>
                <option value="API">API</option>
                <option value="FILE">FILE</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Methode</Label>
              <Input
                value={draft.method}
                onChange={(e) => setDraft((prev) => ({ ...prev, method: e.target.value }))}
                placeholder="GET"
                disabled={app?.isDefault}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Input
                value={draft.notes}
                onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                disabled={app?.isDefault}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleAddEndpoint}
              disabled={saving || app?.isDefault || !user}
              className="gap-2"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Ajouter
            </Button>
            {app?.isDefault ? (
              <span className="ml-3 text-sm text-muted-foreground">Lecture seule pour les apps par defaut.</span>
            ) : null}
            {!user ? (
              <span className="ml-3 text-sm text-muted-foreground">Connecte-toi pour modifier.</span>
            ) : null}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
