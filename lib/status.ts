export const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  eingegangen: { label: "Eingegangen", className: "bg-blue-100 text-blue-700" },
  in_bearbeitung: { label: "In Bearbeitung", className: "bg-amber-100 text-amber-700" },
  erledigt: { label: "Erledigt", className: "bg-green-100 text-green-700" },
};

export const RESOLUTION_LABELS: Record<string, string> = {
  neu: "Neu",
  ns: "NS",
  garantie: "Garantie",
  bware: "B-Ware",
};

export const RESOLUTION_OPTIONS = [
  { value: "neu", label: "Erledigt als Neu" },
  { value: "ns", label: "Erledigt als NS" },
  { value: "garantie", label: "Erledigt Garantie" },
  { value: "bware", label: "Erledigt B-Ware" },
];

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
