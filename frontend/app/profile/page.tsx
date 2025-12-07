"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserStore } from "@/lib/store/userStore";
import { fetchProfile } from "@/lib/api";
import { Loader2, LogOut, RefreshCw } from "lucide-react";

export default function ProfilePage() {
  const { user, token, setUser, logout } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { user: refreshed } = await fetchProfile(token);
      setUser(refreshed);
      localStorage.setItem("auth-user", JSON.stringify(refreshed));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Echec profil";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && !user) {
      handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10 font-sans text-foreground dark:from-slate-950 dark:via-slate-900 dark:to-black">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Profil utilisateur
          </div>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Mon profil</h1>
          <p className="text-lg text-muted-foreground">
            Consulte tes infos et rafraichis-les depuis le backend.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <Card className="border-none bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/80 dark:ring-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Utilisateur</CardTitle>
              <CardDescription>Synchronise avec /auth/me</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading || !token}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="size-4" />
                Logout
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {user ? (
              <div className="space-y-1">
                <div>Email : {user.email}</div>
                {user.name ? <div>Nom : {user.name}</div> : null}
                <div>ID : {user.id}</div>
              </div>
            ) : (
              <div>Aucune session active. Va sur la page Auth pour te connecter.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
