/* ─────────────────────────────────────────────────────────────────────────
 * BesoinCompetencesStep — Step 3: Référentiel RICE competences selection
 * ─────────────────────────────────────────────────────────────────────── */
import { Select, Input, Button, Spin, Empty } from "antd";
import { NodeIndexOutlined, PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import SectionLabel from "@/components/besoin/SectionLabel";
import type { BesoinCompetenceLink } from "@/models/besoin";

type ReferentielDomaine    = { id?: string | number; nom?: string };
type ReferentielCompetence = { id?: string | number; nom?: string; domaineId?: string | number };
type ReferentielSavoir     = { id?: string | number; nom?: string; type?: string };

interface BesoinCompetencesStepProps {
  compLoaded: boolean;
  compDomaines: ReferentielDomaine[];
  compCompetences: ReferentielCompetence[];
  selectedCompLinks: BesoinCompetenceLink[];
  setSelectedCompLinks: (links: BesoinCompetenceLink[]) => void;
  rowSavoirs: Record<number, ReferentielSavoir[]>;
  setRowSavoirs: (savoirs: Record<number, ReferentielSavoir[]>) => void;
  compSearch: string;
  setCompSearch: (v: string) => void;
  onCompetenceChange: (idx: number, competence: ReferentielCompetence | null) => void;
}

export default function BesoinCompetencesStep({
  compLoaded,
  compDomaines,
  compCompetences,
  selectedCompLinks,
  setSelectedCompLinks,
  rowSavoirs,
  setRowSavoirs,
  compSearch,
  setCompSearch,
  onCompetenceChange,
}: BesoinCompetencesStepProps) {
  return (
    <div className="bf-step">
      <SectionLabel
        icon={<NodeIndexOutlined />}
        title="Compétences visées (référentiel RICE)"
        hint="Optionnel — sélectionnez les compétences et savoirs ciblés par cette formation"
      />

      {!compLoaded && (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <Spin tip="Chargement du référentiel…" />
        </div>
      )}

      {compLoaded && compDomaines.length === 0 && compCompetences.length === 0 && (
        <Empty description="Référentiel non disponible" />
      )}

      {compLoaded && (compDomaines.length > 0 || compCompetences.length > 0) && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Input
              allowClear
              placeholder="Rechercher une compétence…"
              prefix={<NodeIndexOutlined style={{ color: "#999" }} />}
              value={compSearch}
              onChange={(e) => setCompSearch(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            {compSearch && (
              <span style={{ fontSize: 12, color: "#888" }}>
                {compCompetences.filter((c) => c.nom?.toLowerCase().includes(compSearch.trim().toLowerCase())).length} résultat(s)
              </span>
            )}
          </div>

          {selectedCompLinks.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune compétence sélectionnée — cliquez sur « Ajouter » pour en associer" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
              {selectedCompLinks.map((link, idx) => (
                <div key={`comp-${link.competenceId ?? idx}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 8, padding: "12px 14px" }}>
                  <span style={{ minWidth: 22, fontWeight: 600, color: "#999", paddingTop: 4 }}>{idx + 1}</span>
                  <div style={{ flex: 1, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Select
                      placeholder="Domaine (filtre)"
                      allowClear
                      style={{ minWidth: 180 }}
                      value={link.domaineId}
                      onChange={(val) => {
                        const u = [...selectedCompLinks];
                        u[idx] = { ...u[idx], domaineId: val ?? null, competenceId: null, savoirId: null };
                        setSelectedCompLinks(u);
                        const ns: Record<number, ReferentielSavoir[]> = { ...rowSavoirs };
                        ns[idx] = [];
                        setRowSavoirs(ns);
                      }}
                      options={compDomaines.map((d) => ({ value: d.id, label: d.nom }))}
                      showSearch
                      optionFilterProp="label"
                    />
                    <Select
                      placeholder="Rechercher une compétence…"
                      allowClear
                      style={{ minWidth: 220 }}
                      value={link.competenceId}
                      onChange={(val) => onCompetenceChange(idx, compCompetences.find((c) => c.id === val) || null)}
                      options={compCompetences
                        .filter((c) => {
                          const kw = compSearch.trim().toLowerCase();
                          return (!link.domaineId || c.domaineId === link.domaineId) && (!kw || c.nom?.toLowerCase().includes(kw));
                        })
                        .map((c) => ({ value: c.id, label: c.nom }))}
                      showSearch
                      optionFilterProp="label"
                    />
                    <Select
                      placeholder="Savoir (optionnel)"
                      allowClear
                      style={{ minWidth: 200 }}
                      value={link.savoirId}
                      disabled={!link.competenceId}
                      onChange={(val) => {
                        const u = [...selectedCompLinks];
                        u[idx] = {
                          ...u[idx],
                          savoirId:  val ?? null,
                          savoirNom: (rowSavoirs[idx] || []).find((s) => s.id === val)?.nom || "",
                        };
                        setSelectedCompLinks(u);
                      }}
                      options={(rowSavoirs[idx] || []).map((s) => ({ value: s.id, label: `${s.nom} (${s.type || ""})` }))}
                      showSearch
                      optionFilterProp="label"
                    />
                  </div>
                  <Button
                    type="text"
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => setSelectedCompLinks(selectedCompLinks.filter((_, i) => i !== idx))}
                  />
                </div>
              ))}
            </div>
          )}

          <Button
            icon={<PlusOutlined />}
            onClick={() => setSelectedCompLinks([...selectedCompLinks, { domaineId: null, competenceId: null, savoirId: null }])}
            style={{ marginTop: 4 }}
          >
            Ajouter une compétence
          </Button>
        </>
      )}
    </div>
  );
}
