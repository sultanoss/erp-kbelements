export type GeplantTyp = "ORDER" | "LOADING";

export function parseOrderPi(orderPi: string | null): { datum: string; typ: GeplantTyp } {
  if (!orderPi?.startsWith("DATUM:")) return { datum: "", typ: "ORDER" };
  const rest = orderPi.slice(6); // "2026-09-15:ORDER" or "2026-09-15"
  const colonIdx = rest.lastIndexOf(":");
  if (colonIdx === -1) return { datum: rest, typ: "ORDER" };
  const datum = rest.slice(0, colonIdx);
  const typRaw = rest.slice(colonIdx + 1);
  const typ: GeplantTyp = typRaw === "LOADING" ? "LOADING" : "ORDER";
  return { datum, typ };
}

export function buildOrderPi(datum: string, typ: GeplantTyp) {
  return `DATUM:${datum}:${typ}`;
}
