/* ─────────────────────────────────────────────────────────────────────────
 * BesoinDetailsStep — Step 2: Formateur, période, horaire & charge
 * ─────────────────────────────────────────────────────────────────────── */
import { Form, Input, Select, DatePicker, Row, Col } from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  TeamOutlined,
  SolutionOutlined,
} from "@ant-design/icons";
import SectionLabel from "@/components/besoin/SectionLabel";

const { Option } = Select;

export interface ActeurOption {
  value: string;
  label: string;
}

interface BesoinDetailsStepProps {
  acteurOptions: ActeurOption[];
  acteursLoading?: boolean;
}

const PERIOD_OPTIONS = [
  { value: "WINTER",   label: "Winter" },
  { value: "SUMMER",   label: "Summer" },
  { value: "SPRINT",   label: "Sprint" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "OTHER",    label: "Autre" },
];

export default function BesoinDetailsStep({ acteurOptions, acteursLoading }: Readonly<BesoinDetailsStepProps>) {
  return (
    <div className="bf-step">
      <SectionLabel
        icon={<UserOutlined />}
        title="Formateur souhaité"
        hint="Optionnel — vous pouvez proposer un nom"
      />
      <Form.Item label="Proposition de formateur" name="propositionAnimateur">
        <Input placeholder="Nom du formateur proposé (optionnel)" size="large" prefix={<UserOutlined />} />
      </Form.Item>

      <SectionLabel
        icon={<SolutionOutlined />}
        title="Acteurs proposés"
        hint="Optionnel — sélectionnez les animateurs et enseignants depuis la base"
      />
      <Row gutter={[16, 12]}>
        <Col xs={24} md={12}>
          <Form.Item label="Animateurs proposés" name="animateurs">
            <Select
              mode="multiple"
              size="large"
              allowClear
              loading={acteursLoading}
              placeholder="Sélectionner les animateurs"
              optionFilterProp="label"
              options={acteurOptions}
              maxTagCount="responsive"
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Enseignants participants" name="enseignants">
            <Select
              mode="multiple"
              size="large"
              allowClear
              loading={acteursLoading}
              placeholder="Sélectionner les enseignants"
              optionFilterProp="label"
              options={acteurOptions}
              maxTagCount="responsive"
            />
          </Form.Item>
        </Col>
      </Row>

      <SectionLabel
        icon={<CalendarOutlined />}
        title="Période de formation"
        hint="Quand la formation devrait-elle se tenir ?"
      />
      <Row gutter={[16, 12]}>
        <Col xs={24} md={12}>
          <Form.Item label="Période" name="periodCode" rules={[{ required: true, message: "Choisissez une période" }]} initialValue="OTHER">
            <Select placeholder="Choisir la période" size="large">
              {PERIOD_OPTIONS.map((opt) => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Date de début" name="dateDebut" rules={[{ required: true, message: "Précisez la date de début" }]}>
            <DatePicker format="YYYY-MM-DD" placeholder="Date de début" size="large" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Date de fin" name="dateFin" rules={[{ required: true, message: "Précisez la date de fin" }]}>
            <DatePicker format="YYYY-MM-DD" placeholder="Date de fin" size="large" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Form.Item noStyle shouldUpdate={(p, c) => p.periodCode !== c.periodCode}>
          {({ getFieldValue }) => getFieldValue("periodCode") === "OTHER" ? (
            <Col xs={24}>
              <Form.Item
                label="Précisez la période"
                name="customPeriodLabel"
                rules={[{ required: true, message: "Précisez la période" }]}
              >
                <Input placeholder="Ex : Mai - Juin 2024" size="large" />
              </Form.Item>
            </Col>
          ) : null}
        </Form.Item>
      </Row>

      <SectionLabel icon={<TeamOutlined />} title="Charge horaire" hint="Durée et taille du groupe" />
      <Row gutter={[16, 12]}>
        <Col xs={24} md={12}>
          <Form.Item label="Durée prévue (heures)" name="dureeFormation">
            <Input type="number" placeholder="Ex : 40" size="large" suffix="h" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Nombre participants" name="nbMaxParticipants" rules={[{ required: true, message: "Précisez le nombre de participants" }]}>
            <Input type="number" placeholder="Ex : 20" size="large" />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
