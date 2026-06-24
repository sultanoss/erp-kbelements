import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MobileNav } from "./mobile-nav";
import { type IconName } from "./nav-link";

const baseLinks: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Dashboard", icon: "Home" },
  { href: "/inventory", label: "Lager", icon: "Boxes" },
  { href: "/sales", label: "Verkäufe", icon: "ClipboardList" },
  { href: "/auswertung", label: "Auswertung", icon: "BarChart2" },
  { href: "/receipts", label: "Wareneingang", icon: "PackagePlus" },
  { href: "/corrections", label: "Korrekturen", icon: "SlidersHorizontal" },
  { href: "/activity", label: "Protokoll", icon: "Shield" },
];

export async function AppShell({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const links =
    session.user.role === "ADMIN"
      ? [...baseLinks, { href: "/admin/users", label: "Benutzer", icon: "Users" as IconName }]
      : baseLinks;

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
