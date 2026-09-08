import { Button, Input, Select } from 'antd';
import {
  ReadOutlined,
  PlusOutlined,
  DeleteOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { CompetencyRow, NullableId } from '../hooks/useFormationWorkflow';

export type SavoirItem = { id?: unknown; nom?: string; type?: string };
export type SousCompetenceItem = { id?: unknown; nom?: string; code?: string };

export type CompetenciesStepProps = {
  compDomaines: { id?: string | number | null; nom?: string }[];
  compCompetences: {
    id?: string | number | null;
    nom?: string;
    domaineId?: string | number | null;
  }[];
  compRows: CompetencyRow[];
  savoirsByCompetence: Record<number, SavoirItem[]>;
  sousCompetencesByCompetence: Record<number, SousCompetenceItem[]>;
  savoirsBySousCompetence: Record<number, SavoirItem[]>;
  compSearch: string;
  setCompSearch: (v: string) => void;
  addCompRow: () => void;
  removeCompRow: (idx: number) => void;
  handleRowDomaineChange: (
    idx: number,
    val: number | string | null | undefined,
  ) => void;
  handleRowCompetencesChange: (idx: number, vals: NullableId[]) => void;
  handleRowSousCompetencesChange: (idx: number, vals: NullableId[]) => void;
  handleRowSavoirsChange: (idx: number, vals: NullableId[]) => void;
  getRowSousCompetenceOptions: (row: CompetencyRow) => SousCompetenceItem[];
  getRowSavoirOptions: (row: CompetencyRow) => SavoirItem[];
  getCompetenceOptions: (
    domaineId: number | string | null | undefined,
  ) => { value: string | number | null | undefined; label: string | undefined }[];
};

export default function CompetenciesStep({
  compDomaines,
  compCompetences,
  compRows,
  savoirsByCompetence,
  sousCompetencesByCompetence,
  savoirsBySousCompetence,
  compSearch,
  setCompSearch,
  addCompRow,
  removeCompRow,
  handleRowDomaineChange,
  handleRowCompetencesChange,
  handleRowSousCompetencesChange,
  handleRowSavoirsChange,
  getRowSousCompetenceOptions,
  getRowSavoirOptions,
  getCompetenceOptions,
}: Readonly<CompetenciesStepProps>) {
  const totalLinks = compRows.reduce((acc, row) => {
    const comps = row.competenceIds.filter(Boolean).length;
    const scs = row.sousCompetenceIds.filter(Boolean).length;
    const savs = row.savoirIds.filter(Boolean).length;
    if (scs > 0) return acc + comps * scs * Math.max(savs, 1);
    return acc + comps * Math.max(savs, 1);
  }, 0);

  return (
    <div>
      <div className="creation-section-box">
        <div className="creation-section-box-title">
          <ReadOutlined /> Cartographie des Compétences (RICE)
        </div>
        {compDomaines.length === 0 && compCompetences.length === 0 ? (
          <div className="creation-comp-loading">
            <span className="creation-comp-loading-dot" /> Chargement du référentiel…
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Input
                allowClear
                placeholder="Rechercher une compétence…"
                prefix={<FilterOutlined style={{ color: '#999' }} />}
                value={compSearch}
                onChange={(e) => setCompSearch(e.target.value)}
                style={{ maxWidth: 320 }}
              />
              {compSearch && (
                <span style={{ fontSize: 12, color: '#888' }}>
                  {
                    compCompetences.filter((c) =>
                      c.nom?.toLowerCase().includes(compSearch.trim().toLowerCase()),
                    ).length
                  }{' '}
                  résultat(s)
                </span>
              )}
            </div>
            {compRows.length === 0 ? (
              <div
                className="creation-field-help"
                style={{ display: 'block', marginTop: 4, fontStyle: 'italic' }}
              >
                Aucune compétence rattachée pour l'instant. Cliquez sur « Ajouter une compétence
                RICE » pour commencer.
              </div>
            ) : (
              <div className="creation-comp-rows">
                {compRows.map((row, idx) => {
                  const rowSavoirs = getRowSavoirOptions(row);
                  return (
                    <div key={row._id || idx} className="creation-competence-row">
                      <div className="creation-field creation-comp-domain">
                        <label className="creation-field-label" htmlFor={`comp-domaine-${idx}`}>
                          Domaine
                        </label>
                        <Select
                          id={`comp-domaine-${idx}`}
                          showSearch
                          size="large"
                          style={{ width: '100%' }}
                          value={row.domaineId}
                          onChange={(val) => handleRowDomaineChange(idx, val)}
                          options={compDomaines.map((d) => ({ value: d.id, label: d.nom }))}
                          optionFilterProp="label"
                          placeholder="Filtrer par domaine…"
                          aria-label={`Domaine — ligne ${idx + 1}`}
                        />
                      </div>
                      <div className="creation-field creation-comp-select">
                        <label className="creation-field-label" htmlFor={`comp-comps-${idx}`}>
                          Compétence{row.competenceIds.length > 1 ? 's' : ''}
                        </label>
                        <Select
                          id={`comp-comps-${idx}`}
                          mode="multiple"
                          showSearch
                          allowClear
                          size="large"
                          style={{ width: '100%' }}
                          value={row.competenceIds.filter(Boolean)}
                          onChange={(vals) => handleRowCompetencesChange(idx, vals)}
                          options={getCompetenceOptions(row.domaineId)}
                          optionFilterProp="label"
                          placeholder="Rechercher des compétences…"
                          maxTagCount={2}
                          aria-label={`Compétences — ligne ${idx + 1}`}
                        />
                      </div>
                      <div className="creation-field creation-comp-select">
                        <label className="creation-field-label" htmlFor={`comp-scs-${idx}`}>
                          Sous-compétence{row.sousCompetenceIds.length > 1 ? 's' : ''}
                        </label>
                        <Select
                          id={`comp-scs-${idx}`}
                          mode="multiple"
                          showSearch
                          allowClear
                          size="large"
                          style={{ width: '100%' }}
                          value={row.sousCompetenceIds.filter(Boolean)}
                          onChange={(vals) => handleRowSousCompetencesChange(idx, vals)}
                          options={getRowSousCompetenceOptions(row).map((sc) => ({
                            value: sc.id,
                            label: `${sc.code ? sc.code + ' · ' : ''}${sc.nom}`,
                          }))}
                          optionFilterProp="label"
                          placeholder="Choisir des sous-compétences…"
                          disabled={row.competenceIds.length === 0}
                          maxTagCount={2}
                          notFoundContent={
                            row.competenceIds.length === 0
                              ? 'Choisissez d’abord des compétences'
                              : 'Aucune sous-compétence trouvée'
                          }
                          aria-label={`Sous-compétences — ligne ${idx + 1}`}
                        />
                      </div>
                      <div className="creation-field creation-comp-select">
                        <label className="creation-field-label" htmlFor={`comp-savoirs-${idx}`}>
                          Savoir{row.savoirIds.length > 1 ? 's' : ''}
                        </label>
                        <Select
                          id={`comp-savoirs-${idx}`}
                          mode="multiple"
                          showSearch
                          allowClear
                          size="large"
                          style={{ width: '100%' }}
                          value={row.savoirIds.filter(Boolean)}
                          onChange={(vals) => handleRowSavoirsChange(idx, vals)}
                          options={rowSavoirs.map((s) => ({
                            value: s.id,
                            label: `${s.nom} (${s.type})`,
                          }))}
                          optionFilterProp="label"
                          placeholder="Choisir des savoirs…"
                          disabled={
                            row.competenceIds.length === 0 && row.sousCompetenceIds.length === 0
                          }
                          maxTagCount={2}
                          notFoundContent={
                            row.competenceIds.length === 0 && row.sousCompetenceIds.length === 0
                              ? 'Choisissez d’abord des compétences / sous-compétences'
                              : 'Aucun savoir trouvé'
                          }
                          aria-label={`Savoirs — ligne ${idx + 1}`}
                        />
                      </div>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removeCompRow(idx)}
                        aria-label={`Supprimer la ligne ${idx + 1}`}
                        className="creation-comp-del-btn"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          <Button
              type="dashed"
              onClick={addCompRow}
              icon={<PlusOutlined />}
              className="creation-btn-add-seance"
              style={{ marginTop: 12, width: '100%' }}
            >
              Ajouter une compétence RICE
            </Button>
            {totalLinks > 0 && (
              <span className="creation-field-help" style={{ display: 'block', marginTop: 8 }}>
                {totalLinks} liaison{totalLinks > 1 ? 's' : ''} compétence/sous-compétence/savoir au
                total — chaque savoir coché est rattaché aux compétences (et sous-compétences) qui
                le possèdent.
              </span>
            )}
            <span className="creation-field-help" style={{ display: 'block', marginTop: 8 }}>
              Chaque ligne associe un <strong>Domaine</strong> → <strong>Compétence</strong> →{' '}
              <strong>Sous-compétence</strong> → <strong>Savoir</strong> du référentiel RICE Esprit
              à cette formation. Vous pouvez sélectionner <strong>plusieurs</strong> compétences,
              sous-compétences et savoirs par ligne.
            </span>
          </>
        )}
      </div>
    </div>
  );
}