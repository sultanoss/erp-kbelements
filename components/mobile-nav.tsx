"use client";

import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { NavLink, type IconName } from "./nav-link";
import { logoutAction } from "@/app/actions";
import { usePathname } from "next/navigation";

type Link = { href: string; label: string; icon: IconName };

interface MobileNavProps {
  links: Link[];
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
      <div className="relative border-b border-white/10 px-5 py-6">
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="KB ELEMENTS"
            className="h-16 w-auto max-w-[200px]"
            style={{ filter: "invert(1)" }}
          />
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-white/70">ERP System</div>
        </div>
        {/* Close button (mobile only) */}
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white lg:hidden"
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
            <NavLink key={link.href} href={link.href} icon={link.icon} label={link.label} />
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
        <div className="flex flex-col gap-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="KB ELEMENTS" className="h-7 w-auto" style={{ filter: "invert(1)" }} />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/60">ERP System</span>
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
