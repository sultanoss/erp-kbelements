"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Boxes, ClipboardList, FileText, Home, PackagePlus, Receipt, Shield, SlidersHorizontal, Users } from "lucide-react";
import { clsx } from "clsx";

const ICONS = { Home, Boxes, ClipboardList, PackagePlus, Shield, SlidersHorizontal, Users, BarChart2, Receipt, FileText } as const;

export type IconName = keyof typeof ICONS;

export function NavLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  const Icon = ICONS[icon];

  return (
    <Link
      href={href}
      className={clsx(
        "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-all duration-150",
        isActive
          ? "bg-brand-red text-white"
          : "text-white/60 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{label}</span>
    </Link>
  );
}
