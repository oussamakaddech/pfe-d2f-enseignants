import { Alert, Button, Col, Divider, Row, Select, Space, Typography } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { EnseignantItem, SeanceState, UPItem, DeptItem } from "../formationWorkflowTypes";
import SeanceCard from "./SeanceCard";

interface FormationSeancesSectionProps {
  seances: SeanceState[];
  addSeance: () => void;
  updateSeance: (i: number, field: string, value: unknown) => void;
  removeSeance: (i: number) => void;
  toggleSeance: (i: number) => void;
  overlapWarnings: string[];
  typeFormation: string;
  optionsAnim: EnseignantItem[];
  optionsPart: EnseignantItem[];
  getEnseignantLabel: (e: EnseignantItem | null) => string;
  animSel: EnseignantItem[];
  setAnimSel: (v: EnseignantItem[]) => void;
  partSel: EnseignantItem[];
  setPartSel: (v: EnseignantItem[]) => void;
  partFilterUp: UPItem | null;
  setPartFilterUp: (v: UPItem | null) => void;
  partFilterDept: DeptItem | null;
  setPartFilterDept: (v: DeptItem | null) => void;
  ups: UPItem[];
  depts: DeptItem[];
  handleFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenUpload: () => void;
  onOpenDocModal: () => void;
}

const { Title, Text } = Typography;

export default function FormationSeancesSection({
  seances, addSeance, updateSeance, removeSeance, toggleSeance,
  overlapWarnings, typeFormation, optionsAnim, optionsPart, getEnseignantLabel,
  animSel, setAnimSel, partSel, setPartSel, partFilterUp, setPartFilterUp, partFilterDept, setPartFilterDept,
  ups, depts, handleFile, onOpenUpload, onOpenDocModal,
}: Readonly<FormationSeancesSectionProps>) {
  return (
    <div className="workflow-edit-section">
      <div className="workflow-edit-section-title">Séances</div>
      <Row gutter={[16, 16]}>
        {seances.map((s, i) => (
          <SeanceCard
            key={s.idSeance || s.id}
            seance={s}
            index={i}
            onUpdate={(field, value) => updateSeance(i, field, value)}
            onRemove={() => removeSeance(i)}
            onToggle={() => toggleSeance(i)}
          />
        ))}

        <Col span={24}>
          <Button type="dashed" danger onClick={addSeance}>+ Ajouter Séance</Button>
        </Col>

        {overlapWarnings.length > 0 && (
          <Col span={24}>
            <Alert
              message="Chevauchements détectés"
              description={
                <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                  {overlapWarnings.map((msg) => <li key={msg}>{msg}</li>)}
                </ul>
              }
              type="warning"
              showIcon
            />
          </Col>
        )}

        <input accept=".xls,.xlsx" style={{ display: "none" }} id="upload-participants" type="file" onChange={handleFile} />
        <Col span={24}>
          <label htmlFor="upload-participants">
            <Button icon={<UploadOutlined />} danger type="primary">Importer Participants (Excel)</Button>
          </label>
        </Col>

        <Col span={24} style={{ marginTop: 24 }}>
          <Title level={5}>Animateurs (Formateurs)</Title>
          <Text type="secondary">
            {typeFormation === "EXTERNE"
              ? "Formation externe : renseignez l'animateur externe dans la section générale."
              : "Sélectionner les animateurs de la formation"}
          </Text>
          <Select
            mode="multiple"
            disabled={typeFormation === "EXTERNE"}
            options={optionsAnim.map((o) => ({ value: o.id, label: getEnseignantLabel(o) }))}
            value={animSel.map((a) => a.id)}
            onChange={(ids) => setAnimSel(optionsAnim.filter((o) => ids.includes(o.id)))}
            style={{ width: "100%" }} optionFilterProp="label" showSearch
            placeholder="Sélectionner les animateurs..."
          />
        </Col>

        <Col span={24} style={{ marginTop: 24 }}>
          <Title level={5}>Participants</Title>
          <Row gutter={[16, 16]} style={{ marginBottom: 8 }}>
            <Col span={12}>
              <Text type="secondary">Filtrer UP</Text>
              <Select showSearch allowClear placeholder="Toutes" value={partFilterUp?.id}
                onChange={(val) => setPartFilterUp(ups.find((u) => u.id === val) ?? null)}
                style={{ width: "100%" }} options={ups.map((u) => ({ value: u.id, label: u.libelle }))} optionFilterProp="label" />
            </Col>
            <Col span={12}>
              <Text type="secondary">Filtrer Département</Text>
              <Select showSearch allowClear placeholder="Tous" value={partFilterDept?.id}
                onChange={(val) => setPartFilterDept(depts.find((d) => d.id === val) ?? null)}
                style={{ width: "100%" }} options={depts.map((d) => ({ value: d.id, label: d.libelle }))} optionFilterProp="label" />
            </Col>
          </Row>
          <Text type="secondary">Sélectionner Participants</Text>
          <Select
            mode="multiple"
            options={optionsPart.map((o) => ({ value: o.id, label: getEnseignantLabel(o) }))}
            value={partSel.map((p) => p.id)}
            onChange={(ids) => setPartSel(optionsPart.filter((o) => ids.includes(o.id)))}
            style={{ width: "100%" }} optionFilterProp="label" showSearch
          />
        </Col>

        <Col span={24} style={{ marginTop: 16 }}>
          <Divider>Gestion du Dossier</Divider>
          <Space style={{ display: "flex", justifyContent: "center" }}>
            <Button icon={<UploadOutlined />} onClick={onOpenUpload}>Scanner / Ajouter Document</Button>
            <Button onClick={onOpenDocModal}>Consulter Dossier (CRUD)</Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
