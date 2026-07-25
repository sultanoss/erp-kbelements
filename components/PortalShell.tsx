"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";

interface Props {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  children: React.ReactNode;
}

export default function PortalShell({ userName, userEmail, isAdmin, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-stone-100">
      <Sidebar
        userName={userName}
        userEmail={userEmail}
        isAdmin={isAdmin}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile-Header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-brand-dark border-b border-stone-700 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-stone-300 hover:text-white p-1 -ml-1"
            aria-label="Menü öffnen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-red rounded flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">K</span>
            </div>
            <span className="text-white font-semibold text-sm">KB Portal</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
