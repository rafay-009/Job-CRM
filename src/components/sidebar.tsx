"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Briefcase, History, Link2, LogOut, Search, Shield, Table2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import logo from "@/lib/logo.png";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

const workerLinks = [{ href: "/dashboard", label: "Job Links", icon: Briefcase }];

const scraperLinks = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/dashboard/search", label: "Scraper", icon: Search },
  { href: "/dashboard/manual-links", label: "Adding Links Manually", icon: Link2 },
  { href: "/dashboard/results", label: "Results", icon: Table2 },
  { href: "/dashboard/history", label: "History", icon: History },
];

export function Sidebar({ profile }: { profile: UserProfile }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const allLinks =
    profile.role === "admin"
      ? [...scraperLinks, { href: "/admin", label: "Admin", icon: Shield }]
      : profile.role === "scraper"
        ? scraperLinks
        : workerLinks;

  return (
    <aside className="flex min-h-screen w-full flex-col border-r border-slate-200 bg-white px-4 py-5 lg:w-72">
      <div className="px-2">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-white">
            <Image
              src={logo}
              alt="Mavericks United logo"
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-lg font-semibold text-ink">Mavericks United</p>
            <p className="text-xs font-medium text-muted">Scraping dashboard</p>
          </div>
        </Link>
      </div>

      <nav className="mt-8 space-y-1">
        {allLinks.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition",
                active
                  ? "bg-primary-light text-primary-dark"
                  : "text-muted hover:bg-surface hover:text-ink",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg bg-surface p-3">
        <p className="truncate text-sm font-semibold text-ink">
          {profile.full_name || profile.email || "Signed in"}
        </p>
        <p className="mt-1 text-xs font-medium capitalize text-muted">{profile.role}</p>
        <button
          type="button"
          onClick={signOut}
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary-dark hover:text-primary"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
