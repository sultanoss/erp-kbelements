export type GeplantTyp = "ORDER" | "LOADING";

export interface GeplantParsed {
  datum: string;
  typ: GeplantTyp;
  checked: boolean;
}

// Format: "DATUM:2026-09-15:ORDER" or "DATUM:2026-09-15:ORDER:1" (checked)
export function parseOrderPi(orderPi: string | null): GeplantParsed {
  if (!orderPi?.startsWith("DATUM:")) return { datum: "", typ: "ORDER", checked: false };
  const rest = orderPi.slice(6); // "2026-09-15:ORDER" or "2026-09-15:ORDER:1"
  const datum = rest.slice(0, 10);
  const after = rest.slice(11); // "ORDER" or "ORDER:1"
  const [typRaw, checkedRaw] = after.split(":");
  const typ: GeplantTyp = typRaw === "LOADING" ? "LOADING" : "ORDER";
  return { datum, typ, checked: checkedRaw === "1" };
}

export function buildOrderPi(datum: string, typ: GeplantTyp, checked = false) {
  return `DATUM:${datum}:${typ}${checked ? ":1" : ""}`;
}
