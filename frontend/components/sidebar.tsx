"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/lib/store/userStore";
import { ChevronDown, ChevronUp, LogOut, Menu, Settings2, UserRound, X } from "lucide-react";

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
  const [collapsed, setCollapsed] = useState(false);
  const navWidth = useMemo(() => (collapsed ? "w-16" : "w-64"), [collapsed]);

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col gap-4 overflow-y-auto border-r border-black/5 bg-white/90 px-3 py-4 shadow-sm backdrop-blur transition-all duration-200 dark:border-white/10 dark:bg-slate-900/60 ${navWidth}`}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            PC
          </span>
          {!collapsed && "Proxy Checker"}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full border border-slate-200 text-muted-foreground shadow-sm dark:border-slate-700"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Ouvrir la nav" : "Fermer la nav"}
        >
          {collapsed ? <Menu className="size-5" /> : <X className="size-5" />}
        </Button>
      </div>

      <nav className="flex flex-col gap-1 text-sm">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-slate-700 transition hover:bg-primary/10 hover:text-primary dark:text-slate-200"
          >
            <span className="inline-flex size-2 shrink-0 rounded-full bg-primary/60" />
            {!collapsed && item.label}
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
              {!collapsed && (
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold">{user.name || user.email}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
              )}
              {openActions && !collapsed ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : !collapsed ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : null}
            </button>

            {openActions && !collapsed ? (
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
            {!collapsed && (
              <>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Compte</div>
                <div className="text-sm text-muted-foreground">
                  Mode invite : connectez-vous pour debloquer les fonctions premium.
                </div>
              </>
            )}
            <Button asChild size="sm">
              <Link href="/auth">{collapsed ? "Sign" : "Creer un compte"}</Link>
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
