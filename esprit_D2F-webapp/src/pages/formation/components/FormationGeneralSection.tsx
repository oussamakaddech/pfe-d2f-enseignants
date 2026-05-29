import { Col, Input, InputNumber, Radio, Row, Select, Typography } from "antd";
import type { UPItem, DeptItem } from "../formationWorkflowTypes";
import { PERIOD_OPTIONS } from "../formationWorkflowTypes";

interface FormationGeneralSectionProps {
  titre: string; setTitre: (v: string) => void;
  dateDebut: string; setDateDebut: (v: string) => void;
  dateFin: string; setDateFin: (v: string) => void;
  typeFormation: string; setTypeFormation: (v: string) => void;
  etatFormation: string; setEtatFormation: (v: string) => void;
  cout: number; setCout: (v: number) => void;
  organisme: string; setOrganisme: (v: string) => void;
  chargeH: number; setChargeH: (v: number) => void;
  formNom: string; setFormNom: (v: string) => void;
  formPrenom: string; setFormPrenom: (v: string) => void;
  formEmail: string; setFormEmail: (v: string) => void;
  coutTransport: number; setCoutTransport: (v: number) => void;
  coutHebergement: number; setCoutHebergement: (v: number) => void;
  coutRepas: number; setCoutRepas: (v: number) => void;
  selectedUp: UPItem | null; setSelectedUp: (v: UPItem | null) => void;
  selectedDept: DeptItem | null; setSelectedDept: (v: DeptItem | null) => void;
  ups: UPItem[]; depts: DeptItem[];
  ouverte: boolean; setOuverte: (v: boolean) => void;
  periodCode: string; setPeriodCode: (v: string) => void;
  customPeriodLabel: string; setCustomPeriodLabel: (v: string) => void;
  isResponsableDossier: boolean;
}

const { Text } = Typography;

export default function FormationGeneralSection({
  titre, setTitre, dateDebut, setDateDebut, dateFin, setDateFin,
  typeFormation, setTypeFormation, etatFormation, setEtatFormation,
  cout, setCout, organisme, setOrganisme, chargeH, setChargeH,
  formNom, setFormNom, formPrenom, setFormPrenom, formEmail, setFormEmail,
  coutTransport, setCoutTransport, coutHebergement, setCoutHebergement, coutRepas, setCoutRepas,
  selectedUp, setSelectedUp, selectedDept, setSelectedDept, ups, depts,
  ouverte, setOuverte, periodCode, setPeriodCode, customPeriodLabel, setCustomPeriodLabel,
  isResponsableDossier,
}: Readonly<FormationGeneralSectionProps>) {
  return (
    <div className="workflow-edit-section">
      <div className="workflow-edit-section-title">Informations générales</div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Text type="secondary">Titre Formation</Text>
          <Input value={titre} onChange={(e) => setTitre(e.target.value)} required disabled={isResponsableDossier} />
        </Col>
        <Col span={12}>
          <Text type="secondary">Date Début</Text>
          <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required disabled={isResponsableDossier} />
        </Col>
        <Col span={12}>
          <Text type="secondary">Date Fin</Text>
          <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} required disabled={isResponsableDossier} />
        </Col>
        <Col span={12}>
          <Text type="secondary">Type Formation</Text>
          <Select value={typeFormation} onChange={setTypeFormation} disabled={isResponsableDossier} style={{ width: "100%" }}
            options={[{ value: "INTERNE", label: "INTERNE" }, { value: "EXTERNE", label: "EXTERNE" }, { value: "EN_LIGNE", label: "EN_LIGNE" }]} />
        </Col>
        <Col span={12}>
          <Text type="secondary">État Formation</Text>
          <Select value={etatFormation} onChange={setEtatFormation} disabled={isResponsableDossier} style={{ width: "100%" }}
            options={["ENREGISTRE","PLANIFIE","EN_COURS","ACHEVE","ANNULE","VISIBLE"].map((v) => ({ value: v, label: v }))} />
        </Col>

        {typeFormation === "EXTERNE" && (
          <>
            <Col span={8}><Text type="secondary">Nom Formateur Ext.</Text><Input value={formNom} onChange={(e) => setFormNom(e.target.value)} /></Col>
            <Col span={8}><Text type="secondary">Prénom Formateur Ext.</Text><Input value={formPrenom} onChange={(e) => setFormPrenom(e.target.value)} /></Col>
            <Col span={8}><Text type="secondary">Email Formateur Ext.</Text><Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} /></Col>
            <Col span={8}><Text type="secondary">Coût Formation</Text><InputNumber value={cout} onChange={(v) => setCout(v ?? 0)} style={{ width: "100%" }} min={0} /></Col>
            <Col span={8}><Text type="secondary">Organisme Externe</Text><Input value={organisme} onChange={(e) => setOrganisme(e.target.value)} /></Col>
            <Col span={8}><Text type="secondary">Coût Transport</Text><InputNumber value={coutTransport} onChange={(v) => setCoutTransport(v ?? 0)} style={{ width: "100%" }} min={0} /></Col>
            <Col span={8}><Text type="secondary">Coût Hébergement</Text><InputNumber value={coutHebergement} onChange={(v) => setCoutHebergement(v ?? 0)} style={{ width: "100%" }} min={0} /></Col>
            <Col span={8}><Text type="secondary">Coût Repas</Text><InputNumber value={coutRepas} onChange={(v) => setCoutRepas(v ?? 0)} style={{ width: "100%" }} min={0} /></Col>
          </>
        )}

        <Col xs={24} sm={6}>
          <Text>Formation ouverte ?</Text>
          <Radio.Group value={ouverte ? "oui" : "non"} onChange={(e) => setOuverte(e.target.value === "oui")} disabled={isResponsableDossier}>
            <Radio value="oui">Oui</Radio>
            <Radio value="non">Non</Radio>
          </Radio.Group>
        </Col>
        <Col span={8}>
          <Text type="secondary">UP</Text>
          <Select showSearch placeholder="Sélectionner UP" value={selectedUp?.id}
            onChange={(val) => setSelectedUp(ups.find((u) => u.id === val) ?? null)}
            disabled={isResponsableDossier} style={{ width: "100%" }}
            options={ups.map((u) => ({ value: u.id, label: u.libelle }))} optionFilterProp="label" />
        </Col>
        <Col span={8}>
          <Text type="secondary">Département</Text>
          <Select showSearch placeholder="Sélectionner Département" value={selectedDept?.id}
            onChange={(val) => setSelectedDept(depts.find((d) => d.id === val) ?? null)}
            disabled={isResponsableDossier} style={{ width: "100%" }}
            options={depts.map((d) => ({ value: d.id, label: d.libelle }))} optionFilterProp="label" />
        </Col>
        <Col span={8}>
          <Text type="secondary">Charge Horaire</Text>
          <InputNumber value={chargeH} onChange={(v) => setChargeH(v ?? 0)} disabled={isResponsableDossier} style={{ width: "100%" }} min={0} />
        </Col>
        <Col xs={24} sm={12}>
          <Text type="secondary">Période de Formation</Text>
          <Select value={periodCode} onChange={setPeriodCode} disabled={isResponsableDossier} style={{ width: "100%" }}
            options={PERIOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </Col>
        <Col xs={24} sm={12}>
          {periodCode === "OTHER" && (
            <>
              <Text type="secondary">Précisez la période</Text>
              <Input value={customPeriodLabel} onChange={(e) => setCustomPeriodLabel(e.target.value)}
                disabled={isResponsableDossier} placeholder="Ex : Mai - Juin 2024" />
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}
