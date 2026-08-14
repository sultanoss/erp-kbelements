"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/returns",
    label: "Retouren",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
      </svg>
    ),
  },
  {
    href: "/tasks",
    label: "Aufgaben",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/schadenmeldungen",
    label: "Schadenmeldungen",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
];

interface Props {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const chinaSubItems = [
  { href: "/china/bestellungen", label: "Bestellungen" },
  { href: "/china/ware", label: "Ware in China" },
  { href: "/china/geplante-bestellungen", label: "Geplante Bestellungen" },
];

const todoSubItems = [
  { href: "/todo/kalender", label: "Terminkalender" },
  { href: "/todo/notizen", label: "Notizen" },
];

const archivSubItems = [
  { href: "/archiv/retouren", label: "Retouren Archiv" },
  { href: "/archiv/aufgaben", label: "Aufgaben Archiv" },
];

export default function Sidebar({ userName, userEmail, isAdmin, isOpen, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [chinaOpen, setChinaOpen] = useState(pathname.startsWith("/china"));
  const [todoOpen, setTodoOpen] = useState(pathname.startsWith("/todo"));
  const [archivOpen, setArchivOpen] = useState(pathname.startsWith("/archiv"));

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function close() {
    onClose?.();
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={close}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 flex-shrink-0 bg-brand-dark flex flex-col h-full
        transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo */}
        <div className="px-4 py-5 border-b border-stone-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-red rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">K</span>
            </div>
            <div>
              <div className="text-white font-semibold text-sm leading-tight">KB Portal</div>
              <div className="text-stone-400 text-xs leading-tight">Internes Tool</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-red text-white"
                    : "text-stone-300 hover:text-white hover:bg-stone-700"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}

          {/* China-Bestellungen Gruppe — nur Admin */}
          {isAdmin && <div>
            <button
              onClick={() => setChinaOpen((o) => !o)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith("/china")
                  ? "bg-brand-red text-white"
                  : "text-stone-300 hover:text-white hover:bg-stone-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                China-Bestellungen
              </div>
              <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${chinaOpen ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {chinaOpen && (
              <div className="mt-1 space-y-0.5">
                {chinaSubItems.map((sub) => {
                  const isActive = pathname === sub.href || pathname.startsWith(sub.href + "/");
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={close}
                      className={`flex items-center gap-2 pl-10 pr-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-stone-700 text-white"
                          : "text-stone-400 hover:text-white hover:bg-stone-700"
                      }`}
                    >
                      <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>}

          {/* Todo-Gruppe — alle User */}
          <div>
            <button
              onClick={() => setTodoOpen((o) => !o)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith("/todo")
                  ? "bg-brand-red text-white"
                  : "text-stone-300 hover:text-white hover:bg-stone-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Todo
              </div>
              <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${todoOpen ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {todoOpen && (
              <div className="mt-1 space-y-0.5">
                {todoSubItems.map((sub) => {
                  const isActive = pathname === sub.href || pathname.startsWith(sub.href + "/");
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={close}
                      className={`flex items-center gap-2 pl-10 pr-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-stone-700 text-white"
                          : "text-stone-400 hover:text-white hover:bg-stone-700"
                      }`}
                    >
                      <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Archiv-Gruppe — alle User */}
          <div>
            <button
              onClick={() => setArchivOpen((o) => !o)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith("/archiv")
                  ? "bg-brand-red text-white"
                  : "text-stone-300 hover:text-white hover:bg-stone-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12h4" />
                </svg>
                Archiv
              </div>
              <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${archivOpen ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {archivOpen && (
              <div className="mt-1 space-y-0.5">
                {archivSubItems.map((sub) => {
                  const isActive = pathname === sub.href || pathname.startsWith(sub.href + "/");
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={close}
                      className={`flex items-center gap-2 pl-10 pr-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-stone-700 text-white"
                          : "text-stone-400 hover:text-white hover:bg-stone-700"
                      }`}
                    >
                      <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {isAdmin && (
            <Link
              href="/admin/users"
              onClick={close}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith("/admin/users")
                  ? "bg-brand-red text-white"
                  : "text-stone-300 hover:text-white hover:bg-stone-700"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Benutzerverwaltung
            </Link>
          )}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-stone-700">
          <div className="px-3 py-2 mb-2">
            <div className="text-white text-sm font-medium truncate">{userName}</div>
            <div className="text-stone-400 text-xs truncate">{userEmail}</div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-stone-400 hover:text-white hover:bg-stone-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Abmelden
          </button>
        </div>
      </aside>
    </>
  );
}
