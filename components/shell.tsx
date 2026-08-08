import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MobileNav } from "./mobile-nav";
import { type IconName } from "./nav-link";

export type NavItem =
  | { href: string; label: string; icon: IconName; separator?: boolean; children?: never }
  | { href?: never; label: string; icon: IconName; separator?: boolean; children: { href: string; label: string }[] };

const baseLinks: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "Home" },
  { href: "https://kb-portal-omega.vercel.app/", label: "KB Portal", icon: "ExternalLink" },
  { href: "/bestellungen", label: "Bestellungen", icon: "ShoppingBag" },
  { label: "Lager", icon: "Boxes", children: [
    { href: "/inventory",                    label: "Übersicht"            },
    { href: "/lager/portale-bestand-sync",   label: "Portale Bestand Sync" },
    { href: "/lagerprotokoll",               label: "Lagerprotokoll"       },
  ]},
  { href: "/sales", label: "Verkäufe", icon: "ClipboardList" },
  { href: "/auswertung", label: "Auswertung", icon: "BarChart2" },
  { href: "/corrections", label: "Korrekturen", icon: "SlidersHorizontal" },
  { label: "Buchhaltung", icon: "Receipt", separator: true, children: [
    { href: "/buchhaltung",           label: "Rechnungen"   },
    { href: "/buchhaltung/storniert", label: "Storniert"    },
    { href: "/gutschrift",            label: "Gutschriften" },
    { href: "/b2c/kunden",            label: "B2C Kunden"   },
    { href: "/export",                label: "Export"       },
  ]},
  { label: "Angebote", icon: "FileText", separator: true, children: [
    { href: "/angebot",     label: "Alle Angebote" },
    { href: "/angebot/neu", label: "Neues Angebot" },
  ]},
];

const protokoll: NavItem = { href: "/activity", label: "Protokoll", icon: "Shield", separator: true };

export async function AppShell({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const b2bGroup: NavItem = { label: "B2B", icon: "Building2", separator: true, children: [
    { href: "/b2b/einkauf",         label: "Wareneinkauf"   },
    { href: "/b2b/preisliste",      label: "Preisliste"     },
    { href: "/b2b/kunden",          label: "B2B Kunden"     },
    { href: "/b2b/portale-gewinn",  label: "Portale Gewinn" },
  ]};

  const links: NavItem[] =
    session.user.role === "ADMIN"
      ? [...baseLinks, b2bGroup, { href: "/admin/users", label: "Benutzer", icon: "Users" as IconName }, protokoll]
      : [...baseLinks, protokoll];

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <MobileNav
      links={links}
      initials={initials}
      userName={session.user.name ?? ""}
      userRole={session.user.role === "ADMIN" ? "Administrator" : "Benutzer"}
    >
      {children}
    </MobileNav>
  );
}
