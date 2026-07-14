"use client";

import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
import Link from "next/link";
import { NavLink, type IconName } from "./nav-link";
import { type NavItem } from "./shell";
import { logoutAction } from "@/app/actions";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { BarChart2, Boxes, ClipboardList, FileText, Home, PackagePlus, Receipt, Shield, ShoppingBag, SlidersHorizontal, Users } from "lucide-react";

const ICONS = { Home, Boxes, ClipboardList, PackagePlus, Shield, SlidersHorizontal, Users, BarChart2, Receipt, FileText, ShoppingBag } as const;

function NavGroup({ icon, label, children }: { icon: IconName; label: string; children: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const Icon = ICONS[icon];
  // Generic longest-prefix-wins logic: the most specific matching child is active
  const sorted = [...children].sort((a, b) => b.href.length - a.href.length);
  const activeChild = sorted.find((c) => pathname === c.href || pathname.startsWith(c.href + "/"));
  const isAnyActive = !!activeChild;
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex w-full items-center gap-3 px-3 py-2 text-sm font-semibold transition-colors",
          isAnyActive ? "text-white" : "text-white/50 hover:text-white/80"
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <span className="font-mono text-[10px] text-white/30">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="ml-4 space-y-0.5 border-l border-white/10 pl-2">
          {children.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={clsx(
                "block rounded-md px-3 py-2 text-sm font-semibold transition-all duration-150",
                activeChild === c ? "bg-brand-red text-white" : "text-white/50 hover:bg-white/10 hover:text-white"
              )}
            >
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface MobileNavProps {
  links: NavItem[];
  initials: string;
  userName: string;
  userRole: string;
  children: React.ReactNode;
}

export function MobileNav({ links, initials, userName, userRole, children }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-brand-black">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-brand-red text-sm font-black text-white">
          KB
        </div>
        <div>
          <div className="text-sm font-black tracking-tight text-white">KB ELEMENTS</div>
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">ERP System</div>
        </div>
        {/* Close button (mobile only) */}
        <button
          onClick={() => setOpen(false)}
          className="ml-auto rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Menü schließen"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
          Navigation
        </div>
        <div className="space-y-0.5">
          {links.map((link) => (
            <div key={link.label}>
              {link.separator && <div className="mx-3 my-2 border-t border-white/25" />}
              {link.children ? (
                <NavGroup icon={link.icon} label={link.label} children={link.children} />
              ) : (
                <NavLink href={link.href} icon={link.icon} label={link.label} />
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{userName}</div>
            <div className="font-mono text-[10px] text-white/40">{userRole}</div>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded border border-white/15 px-3 py-2 text-xs font-semibold text-white/50 transition-colors hover:border-white/30 hover:text-white/80"
          >
            <LogOut className="h-3.5 w-3.5" />
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-grey-light lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile: Hamburger Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-brand-black px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-brand-red text-xs font-black text-white">
            KB
          </div>
          <span className="text-sm font-black tracking-tight text-white">KB ELEMENTS</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Menü öffnen"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile: Overlay + Sidebar Drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="min-h-screen flex-1 lg:ml-60">
        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
