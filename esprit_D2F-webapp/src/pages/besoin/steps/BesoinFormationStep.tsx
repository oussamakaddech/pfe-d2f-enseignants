/* ─────────────────────────────────────────────────────────────────────────
 * BesoinFormationStep — Step 1: Titre, objectifs & priorité
 * ─────────────────────────────────────────────────────────────────────── */
import { Form, Input, Row, Col } from "antd";
import { BookOutlined, AimOutlined } from "@ant-design/icons";
import SectionLabel from "@/components/besoin/SectionLabel";
import ChoiceCardGroup from "@/components/besoin/ChoiceCardGroup";

const { TextArea } = Input;

const prioriteOptions = [
  { value: "BASSE",    label: "Basse",    description: "Peut attendre",        accent: "#10b981", accentBg: "#ecfdf5" },
  { value: "MOYENNE",  label: "Moyenne",  description: "À planifier",          accent: "#f59e0b", accentBg: "#fffbeb" },
  { value: "HAUTE",    label: "Haute",    description: "Important",            accent: "#ef4444", accentBg: "#fef2f2" },
  { value: "CRITIQUE", label: "Critique", description: "Urgent — délai serré", accent: "#b91c1c", accentBg: "#fef2f2" },
];

export default function BesoinFormationStep() {
  return (
    <div className="bf-step">
      <SectionLabel
        icon={<BookOutlined />}
        title="Identité de la formation"
        hint="Comment cette formation sera-t-elle reconnue ?"
      />
      <Row gutter={[16, 12]}>
        <Col xs={24} md={12}>
          <Form.Item label="Nom de la formation" name="titre" rules={[{ required: true, message: "Le titre est obligatoire" }]}>
            <Input placeholder="Ex : Formation Angular avancé" size="large" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Domaine / Thème" name="theme">
            <Input placeholder="Ex : Informatique, Management..." size="large" />
          </Form.Item>
        </Col>
      </Row>

      <SectionLabel
        icon={<AimOutlined />}
        title="Objectifs pédagogiques"
        hint="Décrivez ce que les participants doivent acquérir"
      />
      <Row gutter={[16, 12]}>
        <Col xs={24}>
          <Form.Item label="Objectif général" name="objectifFormation" rules={[{ required: true, message: "L'objectif est obligatoire" }]}>
            <TextArea rows={2} placeholder="Décrire l'objectif général..." showCount maxLength={500} />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item label="Objectifs pédagogiques détaillés" name="objectifsPedagogiques">
            <TextArea rows={3} placeholder="Compétences spécifiques à acquérir..." showCount maxLength={1000} />
          </Form.Item>
        </Col>
      </Row>

      <SectionLabel icon={<AimOutlined />} title="Urgence & impact" hint="Niveau de priorité et alignement stratégique" />
      <Form.Item name="priorite" rules={[{ required: true, message: "Sélectionnez la priorité" }]}>
        <Form.Item noStyle shouldUpdate={(p, c) => p.priorite !== c.priorite}>
          {({ getFieldValue, setFieldsValue }) => (
            <ChoiceCardGroup
              variant="priorite"
              options={prioriteOptions}
              value={getFieldValue("priorite")}
              onChange={(v) => setFieldsValue({ priorite: v })}
            />
          )}
        </Form.Item>
      </Form.Item>
      <Form.Item label="Impact stratégique" name="impactStrategique">
        <Input placeholder="Ex : Alignement avec la stratégie D2F..." size="large" />
      </Form.Item>
    </div>
  );
}
