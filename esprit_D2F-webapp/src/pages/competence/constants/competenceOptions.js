// src/pages/competence/constants/competenceOptions.js

export const TYPE_SAVOIR_OPTIONS = ["THEORIQUE", "PRATIQUE"];

export const NIVEAU_SAVOIR_OPTIONS = [
  { value: "N1_DEBUTANT", label: "Niveau 1", color: "default" },
  { value: "N2_ELEMENTAIRE", label: "Niveau 2", color: "blue" },
  { value: "N3_INTERMEDIAIRE", label: "Niveau 3", color: "cyan" },
  { value: "N4_AVANCE", label: "Niveau 4", color: "green" },
  { value: "N5_EXPERT", label: "Niveau 5", color: "gold" },
];

export const NIVEAU_LABELS = {
  N1_DEBUTANT: { label: "Niveau 1", color: "#ff4d4f" },
  N2_ELEMENTAIRE: { label: "Niveau 2", color: "#fa8c16" },
  N3_INTERMEDIAIRE: { label: "Niveau 3", color: "#fadb14" },
  N4_AVANCE: { label: "Niveau 4", color: "#52c41a" },
  N5_EXPERT: { label: "Niveau 5", color: "#1890ff" },
};

export const NIVEAU_OPTIONS = NIVEAU_SAVOIR_OPTIONS.map(({ value, label }) => ({ value, label }));
