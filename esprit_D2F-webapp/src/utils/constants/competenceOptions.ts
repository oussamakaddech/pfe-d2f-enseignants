
export const TYPE_SAVOIR_OPTIONS = ["THEORIQUE", "PRATIQUE"];

export const NIVEAU_SAVOIR_OPTIONS = [
  { value: "N1_DEBUTANT",      label: "N1 – Débutant",      color: "default" },
  { value: "N2_ELEMENTAIRE",   label: "N2 – Élémentaire",   color: "blue" },
  { value: "N3_INTERMEDIAIRE", label: "N3 – Intermédiaire", color: "cyan" },
  { value: "N4_AVANCE",        label: "N4 – Avancé",        color: "green" },
  { value: "N5_EXPERT",        label: "N5 – Expert",        color: "gold" },
];

export const NIVEAU_LABELS: Record<string, { label: string; color: string }> = {
  N1_DEBUTANT:      { label: "N1 – Débutant",      color: "#ff4d4f" },
  N2_ELEMENTAIRE:   { label: "N2 – Élémentaire",   color: "#fa8c16" },
  N3_INTERMEDIAIRE: { label: "N3 – Intermédiaire", color: "#fadb14" },
  N4_AVANCE:        { label: "N4 – Avancé",        color: "#52c41a" },
  N5_EXPERT:        { label: "N5 – Expert",        color: "#1890ff" },
};

/** Shorthand list with color — same data as NIVEAU_SAVOIR_OPTIONS */
export const NIVEAU_OPTIONS = NIVEAU_SAVOIR_OPTIONS;
