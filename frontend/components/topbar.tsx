"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/lib/store/userStore";
import { UserRound } from "lucide-react";

export function TopBar() {
  const { user } = useUserStore();

  return (
    <header className="flex items-center justify-end gap-3 border-b border-black/5 bg-white/70 px-6 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
      {user ? (
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary dark:text-slate-100"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <UserRound className="size-4" />
          </span>
          <span>{user.name || user.email}</span>
        </Link>
      ) : (
        <>
          <Button asChild variant="outline" size="sm">
            <Link href="/auth">Login</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/auth">Sign up</Link>
          </Button>
        </>
      )}
    </header>
  );
}
