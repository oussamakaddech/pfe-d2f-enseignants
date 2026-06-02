import { useState } from "react";
import { Row, Col, Input, Select, Button, Typography, Card, Space, Alert as AntAlert, Tag } from "antd";
import {
  UpOutlined, DownOutlined, PlusOutlined, DeleteOutlined, TeamOutlined,
  CalendarOutlined, ClockCircleOutlined, LinkOutlined, EnvironmentOutlined,
  TagOutlined, UserAddOutlined, BankOutlined, FilterOutlined,
} from "@ant-design/icons";
import type { PersonItem, LookupNode } from "../hooks/useFormationWorkflow";
import type { AnimateurExterne } from "@/models/bureau";
import type { AnimateurAdditionConfig, ParticipantAdditionConfig } from "../formationWorkflowTypes";
import ExterneAnimateursSection from "../components/ExterneAnimateursSection";
import AddActorModal, { type ActorDraft, type ActorKind } from "@/components/formation/AddActorModal";
import ActorToolbar from "@/components/formation/ActorToolbar";
import InternalFormationActorsStep from "./InternalFormationActorsStep";
import ExternalFormationActorsStep from "./ExternalFormationActorsStep";

const { Text } = Typography;

const ANIM_EXCEL_INPUT_ID = "excel-import-animateur";
const PART_EXCEL_INPUT_ID = "excel-import-participant";

export type PlanningStepProps = {
  seances: { id?: unknown; dateSeance: string; heureDebut: string; heureFin: string; salle: string; onlineMeetingUrl: string; typeSeance: string; contenus: string; methodes: string; dureeTheorique: number; dureePratique: number; expanded: boolean }[];
  addSeance: () => void;
  updateSeance: (i: number, f: string, v: unknown) => void;
  removeSeance: (i: number) => void;
  toggleSeance: (i: number) => void;
  typeFormation: string;
  isAdminUser: boolean;
  ups: LookupNode[]; depts: LookupNode[];
  animSel: PersonItem[]; setAnimSel: (v: PersonItem[]) => void;
  animFilterUp: LookupNode | null; setAnimFilterUp: (v: LookupNode | null) => void;
  animFilterDept: LookupNode | null; setAnimFilterDept: (v: LookupNode | null) => void;
  animateurConfig?: AnimateurAdditionConfig | null; setAnimateurConfig?: (v: AnimateurAdditionConfig | null) => void;
  partSel: PersonItem[]; setPartSel: (v: PersonItem[]) => void;
  partFilterUp: LookupNode | null; setPartFilterUp: (v: LookupNode | null) => void;
  partFilterDept: LookupNode | null; setPartFilterDept: (v: LookupNode | null) => void;
  participantConfig?: ParticipantAdditionConfig | null; setParticipantConfig?: (v: ParticipantAdditionConfig | null) => void;
  optionsAnim: PersonItem[];
  optionsPart: PersonItem[];
  overlapWarnings: unknown[];
  formNom: string; setFormNom: (v: string) => void;
  formPrenom: string; setFormPrenom: (v: string) => void;
  formEmail: string; setFormEmail: (v: string) => void;
  bureauNom: string; setBureauNom: (v: string) => void;
  bureauMail: string; setBureauMail: (v: string) => void;
  bureauTelephone: string; setBureauTelephone: (v: string) => void;
  externeBureauId: number | null; setExterneBureauId: (v: number | null) => void;
  animExterneSel: AnimateurExterne[]; setAnimExterneSel: (v: AnimateurExterne[]) => void;
  getAnimateurLabel: (opt: PersonItem | null) => string;
  getEnseignantLabel: (opt: { type?: string; cup?: string; chefDepartement?: string; nom?: string; prenom?: string; mail?: string } | null) => string;
  handleExcelImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExcelImportAnimateurFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportAnimateursExcel: () => void;
  exportParticipantsExcel: () => void;
  addManualAnimateur: (d: ActorDraft) => void;
  addManualParticipant: (d: ActorDraft) => void;
  selectAllVisibleAnim: () => void;
  selectAllVisiblePart: () => void;
  clearAnimSel: () => void;
  clearPartSel: () => void;
  getAllEmailsAnimateurs: () => string[];
  getAllEmailsParticipants: () => string[];
};

export default function PlanningStep(props: Readonly<PlanningStepProps>) {
  const {
    seances, addSeance, updateSeance, removeSeance, toggleSeance,
    typeFormation, isAdminUser, ups, depts,
    animSel, setAnimSel, animFilterUp, setAnimFilterUp, animFilterDept, setAnimFilterDept,
    animateurConfig, setAnimateurConfig,
    partSel, setPartSel, partFilterUp, setPartFilterUp, partFilterDept, setPartFilterDept,
    participantConfig, setParticipantConfig,
    optionsAnim, optionsPart, overlapWarnings,
    formNom, setFormNom, formPrenom, setFormPrenom, formEmail, setFormEmail,
    bureauNom, setBureauNom, bureauMail, setBureauMail, bureauTelephone, setBureauTelephone,
    externeBureauId, setExterneBureauId, animExterneSel, setAnimExterneSel,
    getAnimateurLabel, getEnseignantLabel,
    handleExcelImportFile, handleExcelImportAnimateurFile,
    exportAnimateursExcel, exportParticipantsExcel,
    addManualAnimateur, addManualParticipant,
    selectAllVisibleAnim, selectAllVisiblePart, clearAnimSel, clearPartSel,
    getAllEmailsAnimateurs, getAllEmailsParticipants,
  } = props;

  const [animModalOpen, setAnimModalOpen] = useState(false);
  const [partModalOpen, setPartModalOpen] = useState(false);

  const upSelectOptions = ups.map((u) => ({ value: String(u.libelle || u.id || ""), label: String(u.libelle || u.id || "") }));
  const deptSelectOptions = depts.map((d) => ({ value: String(d.libelle || d.id || ""), label: String(d.libelle || d.id || "") }));

  const allAnimateurEmails = getAllEmailsAnimateurs();
  const allParticipantEmails = getAllEmailsParticipants();

  return (
    <div>
      <div className="creation-section-box">
        <div className="creation-section-box-title"><CalendarOutlined /> Séances de Formation</div>
        {seances.map((s, i) => (
          <Card key={String(s.id)} className="creation-seance-card">
            <div className="creation-seance-header">
              <Text className="creation-seance-title"><CalendarOutlined style={{ marginRight: 6, color: "var(--primary-500)" }} />Séance #{i + 1}</Text>
              <Space>
                <Button type="text" size="small" onClick={() => toggleSeance(i)}>{s.expanded ? <UpOutlined /> : <DownOutlined />}</Button>
                <Button type="text" danger size="small" onClick={() => removeSeance(i)}><DeleteOutlined /></Button>
              </Space>
            </div>
            {s.expanded && (
              <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
                <Col xs={24} sm={8}><div className="creation-field"><label className="creation-field-label"><CalendarOutlined /> Date</label><Input size="large" type="date" value={s.dateSeance} onChange={(e) => updateSeance(i, "dateSeance", e.target.value)} /></div></Col>
                <Col xs={12} sm={8}><div className="creation-field"><label className="creation-field-label"><ClockCircleOutlined /> Heure Début</label><Input size="large" type="time" value={s.heureDebut} onChange={(e) => updateSeance(i, "heureDebut", e.target.value)} /></div></Col>
                <Col xs={12} sm={8}><div className="creation-field"><label className="creation-field-label"><ClockCircleOutlined /> Heure Fin</label><Input size="large" type="time" value={s.heureFin} onChange={(e) => updateSeance(i, "heureFin", e.target.value)} /></div></Col>
                <Col xs={24} sm={12}><div className="creation-field">{typeFormation === "EN_LIGNE" ? (<><label className="creation-field-label"><LinkOutlined /> Lien Réunion (Teams)</label><Input size="large" prefix={<LinkOutlined />} value={s.onlineMeetingUrl} onChange={(e) => updateSeance(i, "onlineMeetingUrl", e.target.value)} placeholder="https://teams.microsoft.com/..." /></>) : (<><label className="creation-field-label"><EnvironmentOutlined /> Salle / Lieu</label><Input size="large" value={s.salle} onChange={(e) => updateSeance(i, "salle", e.target.value)} placeholder="Ex : Salle A101" /></>)}</div></Col>
                <Col xs={24} sm={12}><div className="creation-field"><label className="creation-field-label"><TagOutlined /> Type de Séance</label><Select size="large" style={{ width: "100%" }} value={s.typeSeance} onChange={(val) => updateSeance(i, "typeSeance", val)}><Select.Option value="THEORIQUE">THÉORIQUE</Select.Option><Select.Option value="PRATIQUE">PRATIQUE</Select.Option></Select></div></Col>
              </Row>
            )}
          </Card>
        ))}
        <Button className="creation-btn-add-seance" type="dashed" onClick={addSeance} icon={<PlusOutlined />}>Ajouter une séance</Button>
      </div>

      <div className="creation-section-box">
        <div className="creation-section-box-title"><TeamOutlined /> Animateurs &amp; Participants</div>
        <Row gutter={[20, 20]}>
          <Col span={24}>
            <div className="creation-field">
              <div className="creation-acteur-header">
                <label className="creation-field-label"><TeamOutlined />{typeFormation === "EXTERNE" ? " Animateur Externe" : " Animateurs (Formateurs internes)"}</label>
                {animSel.length > 0 && <span className="creation-acteur-count">{animSel.length} sélectionné(s)</span>}
              </div>
              {typeFormation !== "EXTERNE" && (
                <ActorToolbar
                  variant="primary"
                  count={animSel.length}
                  total={optionsAnim.length}
                  fileInputId={ANIM_EXCEL_INPUT_ID}
                  onAdd={() => setAnimModalOpen(true)}
                  onSelectAll={selectAllVisibleAnim}
                  onClear={clearAnimSel}
                  onImportExcel={handleExcelImportAnimateurFile}
                  onExportExcel={exportAnimateursExcel}
                  addLabel="Ajouter"
                  selectAllLabel="Tous"
                  clearLabel="Vider"
                  importLabel="Import Excel"
                  selectAllDisabled={optionsAnim.length === 0}
                />
              )}
              {typeFormation !== "EXTERNE" && (
                <div className="creation-acteur-filters">
                  <FilterOutlined className="creation-acteur-filter-icon" />
                  <Select size="small" allowClear placeholder="UP" style={{ flex: 1, minWidth: 100 }} value={animFilterUp?.id ?? null} onChange={(val) => setAnimFilterUp(ups.find(u => u.id === val) ?? null)} options={ups.map(u => ({ value: u.id, label: u.libelle }))} />
                  <Select size="small" allowClear placeholder="Département" style={{ flex: 1, minWidth: 120 }} value={animFilterDept?.id ?? null} onChange={(val) => setAnimFilterDept(depts.find(d => d.id === val) ?? null)} options={depts.map(d => ({ value: d.id, label: d.libelle }))} />
                </div>
              )}
              <Select
                mode="multiple"
                size="large"
                disabled={typeFormation === "EXTERNE"}
                style={{ width: "100%" }}
                value={animSel.map(a => a.id)}
                onChange={(vals) => setAnimSel(optionsAnim.filter(a => vals.includes(a.id)))}
                optionFilterProp="label"
                options={optionsAnim.map(a => ({ value: a.id, label: getAnimateurLabel(a) }))}
                placeholder="Sélectionner les animateurs..."
                tagRender={(props) => {
                  const item = optionsAnim.find((o) => o.id === props.value);
                  const isManual = item?.isManual;
                  return (
                    <Tag color={isManual ? "red" : "default"} closable={props.closable} onClose={props.onClose} style={{ marginRight: 4 }}>
                      {props.label}{isManual ? " (ajouté)" : ""}
                    </Tag>
                  );
                }}
              />
              <span className="creation-field-help">
                {typeFormation === "EXTERNE"
                  ? "Pour une formation externe, renseignez l'animateur dans le bloc ci-dessous."
                  : `${optionsAnim.length} formateur(s) disponible(s) — utilisez “Ajouter” pour la saisie manuelle, “Tous” pour la sélection automatique, ou “Import Excel” pour un import en masse.`}
              </span>
            </div>
          </Col>

          {(isAdminUser || typeFormation === "EXTERNE") && (
            <Col span={24}>
              <div className="creation-externe-box">
                <Text className="creation-externe-title"><UserAddOutlined style={{ marginRight: 6 }} />Animateur Externe (déclaratif)</Text>
                <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
                  <Col xs={24} sm={8}><div className="creation-field"><label className="creation-field-label" htmlFor="anim-nom">Nom</label><Input id="anim-nom" size="large" value={formNom} onChange={(e) => setFormNom(e.target.value)} placeholder="Nom de l'animateur" /></div></Col>
                  <Col xs={24} sm={8}><div className="creation-field"><label className="creation-field-label" htmlFor="anim-prenom">Prénom</label><Input id="anim-prenom" size="large" value={formPrenom} onChange={(e) => setFormPrenom(e.target.value)} placeholder="Prénom de l'animateur" /></div></Col>
                  <Col xs={24} sm={8}><div className="creation-field"><label className="creation-field-label" htmlFor="anim-email">Email</label><Input id="anim-email" size="large" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@organisme.com" /></div></Col>
                </Row>
              </div>
            </Col>
          )}

          {typeFormation === "EXTERNE" && (
            <Col span={24}>
              <div className="creation-externe-box">
                <Text className="creation-externe-title"><BankOutlined style={{ marginRight: 6 }} />Bureau de Formation</Text>
                <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
                  <Col xs={24} sm={8}><div className="creation-field"><label className="creation-field-label" htmlFor="bureau-nom">Nom du bureau</label><Input id="bureau-nom" size="large" value={bureauNom} onChange={(e) => setBureauNom(e.target.value)} placeholder="Ex : Centre de Formation ESPRIT" /></div></Col>
                  <Col xs={24} sm={8}><div className="creation-field"><label className="creation-field-label" htmlFor="bureau-mail">Email du bureau</label><Input id="bureau-mail" size="large" type="email" value={bureauMail} onChange={(e) => setBureauMail(e.target.value)} placeholder="contact@bureau.com" /></div></Col>
                  <Col xs={24} sm={8}><div className="creation-field"><label className="creation-field-label" htmlFor="bureau-telephone">Numéro de téléphone</label><Input id="bureau-telephone" size="large" value={bureauTelephone} onChange={(e) => setBureauTelephone(e.target.value)} placeholder="+216 XX XXX XXX" /></div></Col>
                </Row>
              </div>
            </Col>
          )}

          {typeFormation === "EXTERNE" && (
            <Col span={24}>
              <ExterneAnimateursSection
                bureauId={externeBureauId}
                setBureauId={setExterneBureauId}
                animExterneSel={animExterneSel}
                setAnimExterneSel={setAnimExterneSel}
              />
            </Col>
          )}

          <Col span={24}>
            <div className="creation-field">
              <div className="creation-acteur-header">
                <label className="creation-field-label"><TeamOutlined /> Participants (Enseignants)</label>
                {partSel.length > 0 && <span className="creation-acteur-count">{partSel.length} sélectionné(s)</span>}
              </div>
              <ActorToolbar
                variant="primary"
                count={partSel.length}
                total={optionsPart.length}
                fileInputId={PART_EXCEL_INPUT_ID}
                onAdd={() => setPartModalOpen(true)}
                onSelectAll={selectAllVisiblePart}
                onClear={clearPartSel}
                onImportExcel={handleExcelImportFile}
                onExportExcel={exportParticipantsExcel}
                addLabel="Ajouter"
                selectAllLabel="Tous"
                clearLabel="Vider"
                importLabel="Import Excel"
                selectAllDisabled={optionsPart.length === 0}
              />
              <div className="creation-acteur-filters">
                <FilterOutlined className="creation-acteur-filter-icon" />
                <Select size="small" allowClear placeholder="UP" style={{ flex: 1, minWidth: 100 }} value={partFilterUp?.id ?? null} onChange={(val) => setPartFilterUp(ups.find(u => u.id === val) ?? null)} options={ups.map(u => ({ value: u.id, label: u.libelle }))} />
                <Select size="small" allowClear placeholder="Département" style={{ flex: 1, minWidth: 120 }} value={partFilterDept?.id ?? null} onChange={(val) => setPartFilterDept(depts.find(d => d.id === val) ?? null)} options={depts.map(d => ({ value: d.id, label: d.libelle }))} />
              </div>
              <Select
                mode="multiple"
                size="large"
                style={{ width: "100%" }}
                value={partSel.map(p => p.id)}
                onChange={(vals) => setPartSel(optionsPart.filter(p => vals.includes(p.id)))}
                optionFilterProp="label"
                options={optionsPart.map(p => ({ value: p.id, label: getEnseignantLabel(p) }))}
                placeholder="Sélectionner les participants..."
                tagRender={(props) => {
                  const item = optionsPart.find((o) => o.id === props.value);
                  const isManual = item?.isManual;
                  return (
                    <Tag color={isManual ? "blue" : "default"} closable={props.closable} onClose={props.onClose} style={{ marginRight: 4 }}>
                      {props.label}{isManual ? " (ajouté)" : ""}
                    </Tag>
                  );
                }}
              />
              <span className="creation-field-help">
                {optionsPart.length} enseignant(s) disponible(s) — “Ajouter” (saisie manuelle), “Tous” (sélection auto selon filtres), “Import Excel” (en masse).
              </span>
            </div>
          </Col>
        </Row>
      </div>

      {overlapWarnings.length > 0 && (
        <AntAlert type="warning" showIcon className="creation-alert-overlap" message={<strong>Chevauchements détectés</strong>}
          description={<ul style={{ margin: "4px 0 0 16px", padding: 0 }}>{overlapWarnings.map((msg) => <li key={String(msg)}>{String(msg)}</li>)}</ul>}
        />
      )}

      <AddActorModal
        open={animModalOpen}
        kind={"ANIMATEUR" satisfies ActorKind}
        onCancel={() => setAnimModalOpen(false)}
        onSubmit={(d) => { addManualAnimateur(d); setAnimModalOpen(false); }}
        upOptions={upSelectOptions}
        deptOptions={deptSelectOptions}
        existingEmails={allAnimateurEmails}
      />
      <AddActorModal
        open={partModalOpen}
        kind={"PARTICIPANT" satisfies ActorKind}
        onCancel={() => setPartModalOpen(false)}
        onSubmit={(d) => { addManualParticipant(d); setPartModalOpen(false); }}
        upOptions={upSelectOptions}
        deptOptions={deptSelectOptions}
        existingEmails={allParticipantEmails}
      />
    </div>
  );
}
