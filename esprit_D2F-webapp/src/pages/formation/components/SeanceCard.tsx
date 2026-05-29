import { Button, Col, Input, InputNumber, Popconfirm, Row, Select, Typography } from "antd";
import { DeleteOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import type { EnseignantItem, SeanceState } from "../formationWorkflowTypes";

interface SeanceCardProps {
  seance: SeanceState;
  index: number;
  typeFormation: string;
  optionsAnim: EnseignantItem[];
  getEnseignantLabel: (e: EnseignantItem | null) => string;
  onUpdate: (field: string, value: unknown) => void;
  onRemove: () => void;
  onToggle: () => void;
}

const { Text } = Typography;

export default function SeanceCard({
  seance: s, index: i, typeFormation, optionsAnim, getEnseignantLabel,
  onUpdate, onRemove, onToggle,
}: Readonly<SeanceCardProps>) {
  return (
    <Col span={24}>
      <div className="workflow-edit-session-card">
        <div className="workflow-edit-session-header">
          <span className="workflow-edit-session-number">Séance #{i + 1}</span>
          <div className="workflow-edit-session-actions">
            <Button type="text" size="small" icon={s.expanded ? <UpOutlined /> : <DownOutlined />} onClick={onToggle} />
            <Popconfirm title="Supprimer cette séance ?" onConfirm={onRemove}>
              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
        </div>

        <div style={{ padding: "12px 16px" }}>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Text type="secondary">Date</Text>
              <Input type="date" value={s.dateSeance} onChange={(e) => onUpdate("dateSeance", e.target.value)} />
            </Col>
            <Col span={6}>
              <Text type="secondary">Heure Début</Text>
              <Input type="time" value={s.heureDebut} onChange={(e) => onUpdate("heureDebut", e.target.value)} />
            </Col>
            <Col span={6}>
              <Text type="secondary">Heure Fin</Text>
              <Input type="time" value={s.heureFin} onChange={(e) => onUpdate("heureFin", e.target.value)} />
            </Col>
            <Col span={6}>
              <Text type="secondary">Salle</Text>
              <Input value={s.salle} onChange={(e) => onUpdate("salle", e.target.value)} />
            </Col>
            <Col span={24} style={{ marginTop: 8 }}>
              <Text type="secondary">Animateurs</Text>
              <Select
                mode="multiple"
                disabled={typeFormation === "EXTERNE"}
                options={optionsAnim.map((o) => ({ value: o.id, label: getEnseignantLabel(o) }))}
                value={s.animateurs.map((a) => a.id)}
                onChange={(ids) => onUpdate("animateurs", optionsAnim.filter((o) => ids.includes(o.id)))}
                style={{ width: "100%" }}
                optionFilterProp="label"
                showSearch
              />
            </Col>
          </Row>

          {s.expanded && (
            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
              <Col span={6}>
                <Text type="secondary">Type</Text>
                <Select
                  value={s.typeSeance}
                  onChange={(val) => onUpdate("typeSeance", val)}
                  style={{ width: "100%" }}
                  options={[{ value: "THEORIQUE", label: "THEORIQUE" }, { value: "PRATIQUE", label: "PRATIQUE" }]}
                />
              </Col>
              <Col span={6}>
                <Text type="secondary">Durée théo (h)</Text>
                <InputNumber value={s.dureeTheorique} onChange={(val) => onUpdate("dureeTheorique", val)} style={{ width: "100%" }} min={0} />
              </Col>
              <Col span={6}>
                <Text type="secondary">Durée prat (h)</Text>
                <InputNumber value={s.dureePratique} onChange={(val) => onUpdate("dureePratique", val)} style={{ width: "100%" }} min={0} />
              </Col>
              <Col span={6}>
                <Text type="secondary">Contenus</Text>
                <Input value={s.contenus} onChange={(e) => onUpdate("contenus", e.target.value)} />
              </Col>
              <Col span={24}>
                <Text type="secondary">Méthodes</Text>
                <Input value={s.methodes} onChange={(e) => onUpdate("methodes", e.target.value)} />
              </Col>
            </Row>
          )}
        </div>
      </div>
    </Col>
  );
}
