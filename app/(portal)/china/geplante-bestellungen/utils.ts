export type GeplantTyp = "ORDER" | "LOADING" | "CHECKEN";

export interface GeplantParsed {
  datum: string;
  typ: GeplantTyp;
}

// Format: "DATUM:2026-09-15:ORDER"
export function parseOrderPi(orderPi: string | null): GeplantParsed {
  if (!orderPi?.startsWith("DATUM:")) return { datum: "", typ: "ORDER" };
  const rest = orderPi.slice(6); // "2026-09-15:ORDER"
  const datum = rest.slice(0, 10);
  const typRaw = rest.slice(11);
  const typ: GeplantTyp = typRaw === "LOADING" ? "LOADING" : typRaw === "CHECKEN" ? "CHECKEN" : "ORDER";
  return { datum, typ };
}

export function buildOrderPi(datum: string, typ: GeplantTyp) {
  return `DATUM:${datum}:${typ}`;
}
