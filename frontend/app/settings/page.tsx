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
import { useUserStore } from "@/lib/store/userStore";
import { Loader2, ShieldCheck, SlidersHorizontal } from "lucide-react";

export default function SettingsPage() {
  const { user } = useUserStore();
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    workspace: "default",
    alertEmail: user?.email || "",
    telemetry: true,
    darkMode: true,
  });

  const handleSave = async () => {
    setSaving(true);
    // Fake delay to mimic persistence; backend hooks can be added later.
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10 font-sans text-foreground dark:from-slate-950 dark:via-slate-900 dark:to-black">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <SlidersHorizontal className="size-4" />
            Parametres
          </div>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Preferences utilisateur</h1>
          <p className="text-lg text-muted-foreground">
            Reglages visuels et notifications. Les fonctions premium se debloquent apres connexion.
          </p>
        </div>

        <Card className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Recevoir les resultats des checks et les alertes de blocage.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Email de notification</Label>
              <Input
                value={preferences.alertEmail}
                onChange={(e) => setPreferences((prev) => ({ ...prev, alertEmail: e.target.value }))}
                placeholder="email@domaine.com"
              />
            </div>
            <label className="flex items-center gap-2 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs dark:bg-slate-900">
              <input
                type="checkbox"
                checked={preferences.telemetry}
                onChange={(e) => setPreferences((prev) => ({ ...prev, telemetry: e.target.checked }))}
              />
              Partager des stats anonymes pour ameliorer le produit.
            </label>
          </CardContent>
        </Card>

        <Card className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
          <CardHeader>
            <CardTitle>Apparence</CardTitle>
            <CardDescription>Choisir un workspace et l ambiance lumineuse.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Workspace</Label>
              <Input
                value={preferences.workspace}
                onChange={(e) => setPreferences((prev) => ({ ...prev, workspace: e.target.value }))}
                placeholder="default"
              />
            </div>
            <label className="flex items-center gap-2 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs dark:bg-slate-900">
              <input
                type="checkbox"
                checked={preferences.darkMode}
                onChange={(e) => setPreferences((prev) => ({ ...prev, darkMode: e.target.checked }))}
              />
              Mode sombre
            </label>
          </CardContent>
          <CardFooter className="flex items-center gap-3">
            <Button className="gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Sauvegarder
            </Button>
            {!user ? (
              <span className="text-sm text-muted-foreground">
                Connecte-toi pour synchroniser ces preferences.
              </span>
            ) : null}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
