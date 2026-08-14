export type GeplantTyp = "ORDER" | "LOADING";
export type GeplantStatus = "OFFEN" | "IN_PRODUKTION" | "VERSCHIFFT" | "ANGEKOMMEN";

export interface GeplantParsed {
  datum: string;
  typ: GeplantTyp;
  status: GeplantStatus;
}

// Format: "DATUM:2026-09-15:ORDER:OFFEN"
// Dates are always 10 chars (YYYY-MM-DD), so we can reliably slice them out.
export function parseOrderPi(orderPi: string | null): GeplantParsed {
  if (!orderPi?.startsWith("DATUM:")) return { datum: "", typ: "ORDER", status: "OFFEN" };
  const rest = orderPi.slice(6); // e.g. "2026-09-15:ORDER:OFFEN"
  const datum = rest.slice(0, 10); // always YYYY-MM-DD
  const after = rest.slice(11); // "ORDER:OFFEN" or "ORDER" or ""
  const [typRaw, statusRaw] = after.split(":");
  const typ: GeplantTyp = typRaw === "LOADING" ? "LOADING" : "ORDER";
  const validStatuses: GeplantStatus[] = ["OFFEN", "IN_PRODUKTION", "VERSCHIFFT", "ANGEKOMMEN"];
  const status: GeplantStatus = validStatuses.includes(statusRaw as GeplantStatus)
    ? (statusRaw as GeplantStatus)
    : "OFFEN";
  return { datum, typ, status };
}

export function buildOrderPi(datum: string, typ: GeplantTyp, status: GeplantStatus) {
  return `DATUM:${datum}:${typ}:${status}`;
}

export const STATUS_LABELS: Record<GeplantStatus, string> = {
  OFFEN: "Offen",
  IN_PRODUKTION: "In Produktion",
  VERSCHIFFT: "Verschifft",
  ANGEKOMMEN: "Angekommen",
};

export const STATUS_COLORS: Record<GeplantStatus, string> = {
  OFFEN:        "bg-stone-100 text-stone-600",
  IN_PRODUKTION:"bg-amber-100 text-amber-700",
  VERSCHIFFT:   "bg-blue-100 text-blue-700",
  ANGEKOMMEN:   "bg-green-100 text-green-700",
};
