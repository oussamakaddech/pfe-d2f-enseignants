import { Row, Col, Input, InputNumber, Select, Switch, Typography, Alert as AntAlert } from "antd";
import {
  BookOutlined, TagOutlined, CheckSquareOutlined, CalendarOutlined,
  EnvironmentOutlined, ApartmentOutlined, TeamOutlined, ClockCircleOutlined, CheckOutlined,
  GlobalOutlined, LaptopOutlined, BankOutlined,
} from "@ant-design/icons";
import type { LookupNode, BesoinInfoShape } from "../hooks/useFormationWorkflow";
import { PERIOD_OPTIONS } from "../FormationWorkflowForm";

const { Text } = Typography;

type ChargeHProps = {
  chargeH: number;
  setChargeH: (v: number) => void;
  seances: { heureDebut?: unknown; heureFin?: unknown }[];
  toMinutes: (t: unknown) => number | null;
};

function ChargeHoraireField({ chargeH, setChargeH, seances, toMinutes }: ChargeHProps) {
  const totalMin = seances.reduce((acc: number, s) => {
    const start = toMinutes(s.heureDebut) ?? 0;
    const end = toMinutes(s.heureFin) ?? 0;
    return acc + Math.max(0, end - start);
  }, 0);
  const calc = totalMin > 0 ? `${(totalMin / 60).toFixed(1)}h` : null;
  return (
    <div className="creation-field">
      <label className="creation-field-label"><ClockCircleOutlined /> Charge Horaire (h)</label>
      <InputNumber size="large" style={{ width: "100%" }} value={chargeH} onChange={(val) => setChargeH(val ?? 0)} min={0} addonAfter="h" />
      <span className="creation-field-help">
        {calc ? <>Calculé depuis les séances&nbsp;: <strong>{calc}</strong> — auto-synchronisé à l'étape suivante.</> : "Sera calculée automatiquement depuis les séances (étape 3)."}
      </span>
    </div>
  );
}

export type GeneralStepProps = {
  besoinInfo?: BesoinInfoShape;
  titre: string; setTitre: (v: string) => void;
  typeFormation: string; setTypeFormation: (v: string) => void;
  etatFormation: string; setEtatFormation: (v: string) => void;
  dateDebut: string; setDateDebut: (v: string) => void;
  dateFin: string; setDateFin: (v: string) => void;
  salle: string; setSalle: (v: string) => void;
  periodCode: string; setPeriodCode: (v: string) => void;
  customPeriodLabel: string; setCustomPeriodLabel: (v: string) => void;
  chargeH: number; setChargeH: (v: number) => void;
  seances: { heureDebut?: unknown; heureFin?: unknown }[];
  toMinutes: (t: unknown) => number | null;
  ups: LookupNode[]; depts: LookupNode[];
  selectedUp: LookupNode | null; setSelectedUp: (v: LookupNode | null) => void;
  selectedDept: LookupNode | null; setSelectedDept: (v: LookupNode | null) => void;
  ouverte: boolean; setOuverte: (v: boolean) => void;
};

export default function GeneralStep({ besoinInfo, titre, setTitre, typeFormation, setTypeFormation, etatFormation, setEtatFormation, dateDebut, setDateDebut, dateFin, setDateFin, salle, setSalle, periodCode, setPeriodCode, customPeriodLabel, setCustomPeriodLabel, chargeH, setChargeH, seances, toMinutes, ups, depts, selectedUp, setSelectedUp, selectedDept, setSelectedDept, ouverte, setOuverte }: Readonly<GeneralStepProps>) {
  return (
    <div>
      {besoinInfo && (
        <AntAlert type="info" showIcon className="creation-alert-besoin" style={{ marginBottom: 20, borderRadius: "var(--radius-md)" }}
          message={<Text strong>Pré-rempli depuis le besoin de formation</Text>}
          description={<div style={{ marginTop: 4, fontSize: "0.875rem" }}>
            {besoinInfo.propositionAnimateur && <div>• <strong>Animateur proposé :</strong> {besoinInfo.propositionAnimateur}</div>}
            {(besoinInfo.dateDebut || besoinInfo.dateFin) && <div>• <strong>Période :</strong> {besoinInfo.dateDebut || "?"} → {besoinInfo.dateFin || "?"}</div>}
            {besoinInfo.priorite && <div>• <strong>Priorité :</strong> {besoinInfo.priorite}</div>}
          </div>}
        />
      )}
      <div className="creation-section-box">
        <div className="creation-section-box-title"><BookOutlined /> Identité de la Formation</div>
        <div className="creation-field" style={{ marginBottom: 20 }}>
          <label className="creation-field-label" htmlFor="wf-titre"><BookOutlined /> Titre de la Formation <span className="creation-field-required" aria-hidden="true">*</span></label>
          <Input id="wf-titre" size="large" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : Formation Angular avancé pour les enseignants..." aria-required="true" aria-label="Titre de la formation (obligatoire)" maxLength={120} showCount />
          <span className="creation-field-help">Minimum 5 caractères — sera affiché dans le catalogue et le calendrier</span>
        </div>
        <div className="creation-field" style={{ marginBottom: 20 }}>
          <label className="creation-field-label"><TagOutlined /> Type de Formation</label>
          <div className="creation-type-grid" role="radiogroup" aria-label="Type de formation">
            {[{ value: "INTERNE", label: "Interne (Esprit)", desc: "Animée par un enseignant Esprit", icon: <BankOutlined /> }, { value: "EXTERNE", label: "Externe", desc: "Dispensée par un prestataire externe", icon: <GlobalOutlined /> }, { value: "EN_LIGNE", label: "En ligne (Teams)", desc: "À distance via Microsoft Teams", icon: <LaptopOutlined /> }].map(opt => (
              <div key={opt.value} className={`creation-type-card ${typeFormation === opt.value ? "selected" : ""}`} onClick={() => setTypeFormation(opt.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTypeFormation(opt.value); } }} role="radio" aria-checked={typeFormation === opt.value} tabIndex={0}>
                <div className="creation-type-card-check" aria-hidden="true"><CheckOutlined /></div>
                <div className="creation-type-card-icon" aria-hidden="true">{opt.icon}</div>
                <span className="creation-type-card-label">{opt.label}</span>
                <span className="creation-type-card-desc">{opt.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="creation-field">
          <label className="creation-field-label"><CheckSquareOutlined /> État de la Formation</label>
          <div className="creation-etat-grid" role="radiogroup" aria-label="État de la formation">
            {[{ value: "ENREGISTRE", label: "Enregistré" }, { value: "PLANIFIE", label: "Planifié" }, { value: "EN_COURS", label: "En cours" }, { value: "ACHEVE", label: "Achevé" }].map(opt => (
              <button key={opt.value} type="button" className={`creation-etat-badge ${opt.value} ${etatFormation === opt.value ? "selected" : ""}`} onClick={() => setEtatFormation(opt.value)} role="radio" aria-checked={etatFormation === opt.value}>
                <span className="creation-etat-dot" aria-hidden="true" />{opt.label}
              </button>
            ))}
          </div>
          <span className="creation-field-help">Peut être mis à jour à tout moment depuis la liste des formations</span>
        </div>
      </div>
      <div className="creation-section-box">
        <div className="creation-section-box-title"><CalendarOutlined /> Dates &amp; Planning</div>
        <Row gutter={[20, 16]}>
          <Col xs={24} sm={12}><div className="creation-field"><label className="creation-field-label"><CalendarOutlined /> Date Début <span style={{ color: "var(--color-error)" }}>*</span></label><Input size="large" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} /></div></Col>
          <Col xs={24} sm={12}><div className="creation-field"><label className="creation-field-label"><CalendarOutlined /> Date Fin <span style={{ color: "var(--color-error)" }}>*</span></label><Input size="large" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} /></div></Col>
          <Col xs={24} sm={12}><div className="creation-field"><label className="creation-field-label"><EnvironmentOutlined /> Salle / Lieu de la Formation</label><Input size="large" value={salle} onChange={(e) => setSalle(e.target.value)} placeholder="Ex : Salle A101, Amphi B..." prefix={<EnvironmentOutlined style={{ color: "#a0aec0" }} />} /><span className="creation-field-help">Utilisé comme titre de l'événement Outlook : D2f‑{salle || "Salle"}‑{titre || "Formation"}‑Animateur</span></div></Col>
          <Col xs={24} sm={12}><div className="creation-field"><label className="creation-field-label"><TagOutlined /> Période de Formation</label><Select size="large" style={{ width: "100%" }} value={periodCode} onChange={(val) => setPeriodCode(val)}>{PERIOD_OPTIONS.map((opt) => <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>)}</Select></div></Col>
          <Col xs={24} sm={12}>{periodCode === "OTHER" ? (<div className="creation-field"><label className="creation-field-label">Précisez la période</label><Input size="large" value={customPeriodLabel} onChange={(e) => setCustomPeriodLabel(e.target.value)} placeholder="Ex : Mai - Juin 2024" /></div>) : (<ChargeHoraireField chargeH={chargeH} setChargeH={setChargeH} seances={seances} toMinutes={toMinutes} />)}</Col>
          {periodCode !== "OTHER" ? null : (<Col xs={24} sm={12}><ChargeHoraireField chargeH={chargeH} setChargeH={setChargeH} seances={seances} toMinutes={toMinutes} /></Col>)}
        </Row>
      </div>
      <div className="creation-section-box">
        <div className="creation-section-box-title"><ApartmentOutlined /> Structure Organisationnelle</div>
        <Row gutter={[20, 16]}>
          <Col xs={24} sm={12}><div className="creation-field"><label className="creation-field-label"><TeamOutlined /> UP (Unité Pédagogique)</label><Select size="large" showSearch style={{ width: "100%" }} value={selectedUp?.id} onChange={(val) => setSelectedUp(ups.find(u => u.id === val) ?? null)} optionFilterProp="label" options={ups.map(u => ({ value: u.id, label: u.libelle }))} placeholder="Sélectionner l'UP" /></div></Col>
          <Col xs={24} sm={12}><div className="creation-field"><label className="creation-field-label"><ApartmentOutlined /> Département</label><Select size="large" showSearch style={{ width: "100%" }} value={selectedDept?.id} onChange={(val) => setSelectedDept(depts.find(d => d.id === val) ?? null)} optionFilterProp="label" options={depts.map(d => ({ value: d.id, label: d.libelle }))} placeholder="Sélectionner le département" /></div></Col>
          <Col span={24}><div className="creation-switch-row"><Switch checked={ouverte} onChange={(val) => setOuverte(val)} /><Text style={{ fontWeight: 600, color: "var(--text-body)" }}>Inscriptions Ouvertes</Text><Text type="secondary" style={{ fontSize: "var(--text-xs)" }}>{ouverte ? "Accessible à toutes les UPs" : "Réservée aux participants de l'UP uniquement"}</Text></div></Col>
        </Row>
      </div>
    </div>
  );
}
