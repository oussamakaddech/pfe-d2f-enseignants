/* ─────────────────────────────────────────────────────────────────────────
 * BesoinReviewStep — Summary/review before submission
 * ─────────────────────────────────────────────────────────────────────── */
import { EditOutlined } from "@ant-design/icons";
import type { BesoinCompetenceLink } from "@/models/besoin";

interface SummaryItem {
  label: string;
  value: string;
  strong?: boolean;
  pillColor?: string;
}

interface SummarySection {
  key: string;
  title: string;
  icon: React.ReactNode;
  items: SummaryItem[];
}

interface BesoinReviewStepProps {
  sections: SummarySection[];
  onEditSection: (idx: number) => void;
}

export default function BesoinReviewStep({ sections, onEditSection }: Readonly<BesoinReviewStepProps>) {
  return (
    <div className="bf-summary">
      <header className="bf-summary__header">
        <div className="bf-summary__icon"><EditOutlined /></div>
        <div>
          <h2 className="bf-summary__title">Récapitulatif de votre demande</h2>
          <p className="bf-summary__sub">Vérifiez les informations avant de soumettre. Cliquez sur "Modifier" pour revenir à une étape.</p>
        </div>
      </header>

      <div className="bf-summary__grid">
        {sections.map((section, idx) => (
          <article key={section.key} className="bf-summary-card">
            <header className="bf-summary-card__head">
              <span className="bf-summary-card__icon">{section.icon}</span>
              <h3 className="bf-summary-card__title">{section.title}</h3>
              <button
                type="button"
                className="bf-summary-card__edit"
                onClick={() => onEditSection(idx)}
              >
                <EditOutlined /> Modifier
              </button>
            </header>
            <dl className="bf-summary-card__list">
              {section.items.map((it) => (
                <div key={it.label} className="bf-summary-card__row">
                  <dt>{it.label}</dt>
                  <dd className={it.strong ? "is-strong" : ""}>
                    {it.pillColor ? (
                      <span className="bf-summary-pill" style={{ "--pill": it.pillColor } as React.CSSProperties}>
                        {it.value}
                      </span>
                    ) : (
                      it.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

// Helper to build summary sections (pure function, no hooks)
const PERIOD_OPTIONS = [
  { value: "WINTER",   label: "Winter" },
  { value: "SUMMER",   label: "Summer" },
  { value: "SPRINT",   label: "Sprint" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "OTHER",    label: "Autre" },
];

const typeOptions = [
  { value: "INDIVIDUEL", label: "Individuel" },
  { value: "COLLECTIF",  label: "Collectif" },
];

const prioriteOptions = [
  { value: "BASSE",    label: "Basse",    accent: "#10b981" },
  { value: "MOYENNE",  label: "Moyenne",  accent: "#f59e0b" },
  { value: "HAUTE",    label: "Haute",    accent: "#ef4444" },
  { value: "CRITIQUE", label: "Critique", accent: "#b91c1c" },
];

interface LookupItem { id?: string | number; name?: string; libelle?: string }

export function buildSummarySections(
  values: Record<string, unknown>,
  ups: LookupItem[],
  departements: LookupItem[],
  selectedCompLinks: BesoinCompetenceLink[],
  canManageParticipants: boolean,
  formatParticipantsSummary: (v: unknown) => string,
): SummarySection[] {
  const upObj  = ups.find((u) => String(u.id) === String(values.up));
  const depObj = departements.find((d) => String(d.id) === String(values.departement));
  const typeLabel  = typeOptions.find((t) => t.value === values.typeBesoin)?.label;
  const prioMeta   = prioriteOptions.find((p) => p.value === values.priorite);
  const periodLabel = values.periodCode === "OTHER"
    ? (String(values.customPeriodLabel || "Autre"))
    : (PERIOD_OPTIONS.find((o) => o.value === values.periodCode)?.label || "—");

  const formatActeurs = (raw: unknown): string => {
    const list = Array.isArray(raw)
      ? raw.map((v) => String(v).trim()).filter(Boolean)
      : String(raw || "").split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
    if (list.length === 0) return "—";
    const names = list.map((v) => v.replace(/\s*<[^>]*>\s*$/, "").trim());
    return `${list.length} — ${names.join(", ")}`;
  };

  return [
    {
      key: "contexte", title: "Contexte", icon: null,
      items: [
        { label: "Unité Pédagogique", value: upObj?.name || upObj?.libelle || "—" },
        { label: "Département",       value: depObj?.name || depObj?.libelle || "—" },
        { label: "Type de besoin",    value: typeLabel || "—" },
        ...((canManageParticipants || values.typeBesoin === "INDIVIDUEL" || values.typeBesoin === "COLLECTIF")
          ? [{ label: "Participants", value: formatParticipantsSummary(values.publicCible) }] : []),
      ],
    },
    {
      key: "formation", title: "Formation", icon: null,
      items: [
        { label: "Nom",               value: String(values.titre || "—"), strong: true },
        { label: "Domaine",           value: String(values.theme || "—") },
        { label: "Objectif",          value: String(values.objectifFormation || "—") },
        { label: "Objectifs pédago",  value: String(values.objectifsPedagogiques || "—") },
        { label: "Priorité",          value: prioMeta?.label || "—", pillColor: prioMeta?.accent },
        { label: "Impact stratégique",value: String(values.impactStrategique || "—") },
      ],
    },
    {
      key: "details", title: "Détails & planning", icon: null,
      items: [
        { label: "Formateur proposé", value: String(values.propositionAnimateur || "—") },
        { label: "Animateurs",        value: formatActeurs(values.animateurs) },
        { label: "Enseignants",       value: formatActeurs(values.enseignants) },
        { label: "Période",           value: periodLabel },
        { label: "Date de début",     value: values.dateDebut ? (values.dateDebut as { format: (f: string) => string }).format("DD/MM/YYYY") : "—" },
        { label: "Date de fin",       value: values.dateFin   ? (values.dateFin   as { format: (f: string) => string }).format("DD/MM/YYYY") : "—" },
        { label: "Durée",             value: values.dureeFormation ? `${values.dureeFormation} h` : "—" },
        { label: "Participants max",  value: values.nbMaxParticipants ? String(values.nbMaxParticipants) : "—" },
      ],
    },
    {
      key: "competences", title: "Compétences RICE", icon: null,
      items: selectedCompLinks.filter((l) => l.competenceId).length === 0
        ? [{ label: "Compétences", value: "—" }]
        : selectedCompLinks.filter((l) => l.competenceId).map((l, i) => ({
            label: `Compétence ${i + 1}`,
            value: [l.competenceNom, l.savoirNom].filter(Boolean).join(" → ") || "—",
          })),
    },
    {
      key: "parametres", title: "Paramètres", icon: null,
      items: [
        { label: "Type de formation",   value: values.estOuverte ? "Ouverte (toutes UPs)" : "Fermée (UP uniquement)" },
        { label: "Évaluation",          value: String(values.methodesEvaluationAcquis || "—") },
        { label: "Autres informations", value: String(values.autresInformations || "—") },
      ],
    },
  ];
}
