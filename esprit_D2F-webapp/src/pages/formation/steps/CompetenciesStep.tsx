import { Button, Input, Select } from "antd";
import { ReadOutlined, PlusOutlined, DeleteOutlined, FilterOutlined } from "@ant-design/icons";
import type { BesoinLinkRaw } from "../hooks/useFormationWorkflow";

export type CompetenciesStepProps = {
  compDomaines: { id?: string | number | null; nom?: string }[];
  compCompetences: { id?: string | number | null; nom?: string; domaineId?: string | number | null }[];
  selectedCompLinks: BesoinLinkRaw[];
  setSelectedCompLinks: (v: BesoinLinkRaw[]) => void;
  rowSavoirs: Record<number, { id?: unknown; nom?: string; type?: string }[]>;
  compSearch: string; setCompSearch: (v: string) => void;
  handleCompetenceSelect: (idx: number, val: number | string | null) => void;
  handleSavoirSelect: (idx: number, val: number | null) => void;
  handleRemoveCompetenceLink: (idx: number) => void;
  getCompetenceOptions: (domaineId: number | string | null | undefined) => { value: string | number | null | undefined; label: string | undefined }[];
};

export default function CompetenciesStep({ compDomaines, compCompetences, selectedCompLinks, setSelectedCompLinks, rowSavoirs, compSearch, setCompSearch, handleCompetenceSelect, handleSavoirSelect, handleRemoveCompetenceLink, getCompetenceOptions }: Readonly<CompetenciesStepProps>) {
  return (
    <div>
      <div className="creation-section-box">
        <div className="creation-section-box-title"><ReadOutlined /> Cartographie des Compétences (RICE)</div>
        {compDomaines.length === 0 && compCompetences.length === 0 ? (
          <div className="creation-comp-loading"><span className="creation-comp-loading-dot" />{" "}Chargement du référentiel…</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
              <Input allowClear placeholder="Rechercher une compétence…" prefix={<FilterOutlined style={{ color: "#999" }} />} value={compSearch} onChange={(e) => setCompSearch(e.target.value)} style={{ maxWidth: 320 }} />
              {compSearch && <span style={{ fontSize: 12, color: "#888" }}>{compCompetences.filter(c => c.nom?.toLowerCase().includes(compSearch.trim().toLowerCase())).length} résultat(s)</span>}
            </div>
            {selectedCompLinks.length === 0 ? (
              <div className="creation-comp-empty"><ReadOutlined aria-hidden="true" /><span>Aucune compétence liée — cliquez sur &laquo;&nbsp;Ajouter&nbsp;&raquo; pour en associer une.</span></div>
            ) : (
              <div className="creation-competence-card">
                {selectedCompLinks.map((link, idx) => (
                  <div key={link._id} className="creation-competence-row">
                    <span className="creation-competence-num" aria-hidden="true">{idx + 1}</span>
                    <div className="creation-field creation-comp-select">
                      <label className="creation-field-label" htmlFor={`comp-domaine-${idx}`}>Domaine (filtre)</label>
                      <Select id={`comp-domaine-${idx}`} showSearch allowClear size="large" style={{ width: "100%" }} value={link.domaineId}
                        onChange={(val) => { const u = [...selectedCompLinks]; u[idx] = { ...u[idx], domaineId: val ?? null, competenceId: null, savoirId: null }; setSelectedCompLinks(u); }}
                        options={compDomaines.map(d => ({ value: d.id, label: d.nom }))} optionFilterProp="label" placeholder="Filtrer par domaine…" aria-label={`Domaine — ligne ${idx + 1}`}
                      />
                    </div>
                    <div className="creation-field creation-comp-select">
                      <label className="creation-field-label" htmlFor={`comp-comp-${idx}`}>Compétence</label>
                      <Select id={`comp-comp-${idx}`} showSearch size="large" style={{ width: "100%" }} value={link.competenceId} onChange={(val) => handleCompetenceSelect(idx, val)} options={getCompetenceOptions(link.domaineId)} optionFilterProp="label" placeholder="Rechercher une compétence…" aria-label={`Compétence — ligne ${idx + 1}`} />
                    </div>
                    <div className="creation-field creation-comp-select">
                      <label className="creation-field-label" htmlFor={`comp-savoir-${idx}`}>Savoir</label>
                      <Select id={`comp-savoir-${idx}`} showSearch size="large" style={{ width: "100%" }} value={link.savoirId} onChange={(val) => handleSavoirSelect(idx, val)} options={(rowSavoirs[idx] || []).map(s => ({ value: s.id, label: `${s.nom} (${s.type})` }))} optionFilterProp="label" placeholder="Choisir un savoir…" disabled={!link.competenceId} aria-label={`Savoir — ligne ${idx + 1}`} />
                    </div>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveCompetenceLink(idx)} aria-label={`Supprimer la ligne ${idx + 1}`} className="creation-comp-del-btn" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <Button type="dashed" onClick={() => setSelectedCompLinks([...selectedCompLinks, { _id: crypto.randomUUID(), domaineId: null, competenceId: null, savoirId: null }])} icon={<PlusOutlined />} className="creation-btn-add-seance" style={{ marginTop: 12, width: "100%" }}>
          Ajouter une compétence RICE
        </Button>
        <span className="creation-field-help" style={{ display: "block", marginTop: 8 }}>
          Chaque ligne associe un <strong>Domaine</strong> → <strong>Compétence</strong> → <strong>Savoir</strong> du référentiel RICE Esprit à cette formation.
        </span>
      </div>
    </div>
  );
}
