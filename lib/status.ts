export const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  eingegangen:     { label: "Eingegangen",     className: "bg-blue-100 text-blue-700" },
  in_bearbeitung:  { label: "In Bearbeitung",  className: "bg-amber-100 text-amber-700" },
  erledigt:        { label: "Erledigt",        className: "bg-green-100 text-green-700" },
  nicht_zustellbar:  { label: "Nicht zustellbar",   className: "bg-orange-100 text-orange-700" },
  wieder_an_kunde:   { label: "Wieder an Kunde",    className: "bg-purple-100 text-purple-700" },
  klaeren_mit_kunde: { label: "Klären mit Kunde",   className: "bg-sky-100 text-sky-700" },
  garantie:          { label: "Garantie",            className: "bg-teal-100 text-teal-700" },
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

export const TASK_TYPE_LABELS: Record<string, string> = {
  technische_frage: "Technische Frage",
  allgemeine_info: "Allgemeine Information",
  klaerung: "Klärung",
  aktion: "Aktion",
  sonstiges: "Sonstiges",
};

export const TASK_TYPE_OPTIONS = Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export const SCHADEN_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  offen:     { label: "Offen",     className: "bg-amber-100 text-amber-700" },
  reguliert: { label: "Reguliert", className: "bg-blue-100 text-blue-700" },
  bezahlt:   { label: "Bezahlt",   className: "bg-green-100 text-green-700" },
};

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
