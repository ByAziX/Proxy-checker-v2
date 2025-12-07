"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/lib/store/userStore";
import { ChevronDown, ChevronUp, LogOut, Settings2, UserRound } from "lucide-react";

const navItems = [
  { href: "/", label: "Accueil" },
  { href: "/apps", label: "Applications" },
  { href: "/browser-checks", label: "Checks navigateur" },
  { href: "/server-checks", label: "Checks serveur" },
  { href: "/threat", label: "Threat protection" },
  { href: "/dlp", label: "DLP / exfiltration" },
  { href: "/settings", label: "Parametres" },
];

export function Sidebar() {
  const { user, logout } = useUserStore();
  const [openActions, setOpenActions] = useState(false);

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4 border-r border-black/5 bg-white/90 px-4 py-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 px-2 text-lg font-semibold">
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          PC
        </span>
        Proxy Checker
      </div>

      <nav className="flex flex-col gap-1 text-sm">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-slate-700 transition hover:bg-primary/10 hover:text-primary dark:text-slate-200"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-black/5 bg-white/80 px-3 py-4 text-sm shadow-sm dark:border-white/10 dark:bg-slate-800/60">
        {user ? (
          <div className="space-y-3">
            <button
              onClick={() => setOpenActions((v) => !v)}
              className="flex w-full items-center gap-3 rounded-lg border border-transparent px-1 py-1 transition hover:border-primary/30 hover:bg-primary/10"
            >
              <div className="inline-flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <UserRound className="size-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold">{user.name || user.email}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
              {openActions ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>

            {openActions ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="gap-2">
                  <Link href="/profile">
                    <UserRound className="size-4" />
                    Profil
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-2">
                  <Link href="/settings">
                    <Settings2 className="size-4" />
                    Parametres
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" className="gap-2" onClick={logout}>
                  <LogOut className="size-4" />
                  Logout
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Compte</div>
            <div className="text-sm text-muted-foreground">
              Mode invite : connectez-vous pour debloquer les fonctions premium.
            </div>
            <Button asChild size="sm">
              <Link href="/auth">Creer un compte</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/auth">Login</Link>
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
