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
import { fetchProfile, login, register } from "@/lib/api";
import { Loader2, LogIn, UserPlus2 } from "lucide-react";

export default function AuthPage() {
  const { user, setUser, setToken, logout } = useUserStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const action =
        mode === "login"
          ? login(form.email, form.password)
          : register(form.email, form.password, form.name);
      const { token, user: profile } = await action;
      setToken(token);
      setUser(profile);
      localStorage.setItem("auth-token", token);
      localStorage.setItem("auth-user", JSON.stringify(profile));
      try {
        const { user: refreshed } = await fetchProfile(token);
        setUser(refreshed);
        localStorage.setItem("auth-user", JSON.stringify(refreshed));
      } catch {
        /* ignore */
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Echec auth";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem("auth-token");
    localStorage.removeItem("auth-user");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10 font-sans text-foreground dark:from-slate-950 dark:via-slate-900 dark:to-black">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Authentification
          </div>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Connexion / Inscription
          </h1>
          <p className="text-lg text-muted-foreground">
            Genere un token JWT pour acceder aux APIs et stocker tes cibles.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <Card className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
          <CardHeader>
            <CardTitle>{mode === "login" ? "Se connecter" : "Creer un compte"}</CardTitle>
            <CardDescription>
              Utilise ton email et un mot de passe (&gt;= 6 caracteres).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            {mode === "register" ? (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button onClick={handleSubmit} className="gap-2" disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "login" ? (
                <LogIn className="size-4" />
              ) : (
                <UserPlus2 className="size-4" />
              )}
              {mode === "login" ? "Se connecter" : "Creer"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
            >
              {mode === "login" ? "Passer en inscription" : "J ai deja un compte"}
            </Button>
            {user ? (
              <Button variant="ghost" onClick={handleLogout}>
                Se deconnecter
              </Button>
            ) : null}
          </CardFooter>
        </Card>

        {user ? (
          <Card className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
            <CardHeader>
              <CardTitle>Session active</CardTitle>
              <CardDescription>Token enregistre dans ton navigateur.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div>Email : {user.email}</div>
              {user.name ? <div>Nom : {user.name}</div> : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

