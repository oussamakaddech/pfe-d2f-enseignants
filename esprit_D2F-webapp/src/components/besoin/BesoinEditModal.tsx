import { memo } from "react";
import { Modal, Form, Input, Select, Row, Col, DatePicker } from "antd";
import { FileTextOutlined, UserOutlined } from "@ant-design/icons";
import type { ActeurOption } from "@/utils/besoin/acteurs";

const { TextArea } = Input;
const { Option } = Select;
const PERIOD_OPTIONS = [
  { value: "S1", label: "Semestre 1 (Septembre-Janvier)" },
  { value: "S2", label: "Semestre 2 (Février-Juin)" },
  { value: "S3", label: "Semestre 3 (Été)" },
  { value: "OTHER", label: "Autre" },
];

interface BesoinEditModalProps {
  open: boolean;
  saving: boolean;
  ups: Array<{ id: string | number; name?: string; libelle?: string }>;
  departements: Array<{ id: string | number; name?: string; libelle?: string }>;
  acteurOptions?: ActeurOption[];
  form: ReturnType<typeof Form.useForm>[0];
  onOk: () => void;
  onCancel: () => void;
}

const BesoinEditModal = memo(function BesoinEditModal({ open, saving, ups, departements, acteurOptions = [], form, onOk, onCancel }: BesoinEditModalProps) {
  return (
    <Modal
      title="Modifier le besoin"
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={saving}
      okText="Enregistrer"
      cancelText="Annuler"
      width={760}
      className="bf-modal"
      okButtonProps={{ className: "bf-btn bf-btn--primary" }}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Nom de la formation" name="titre" rules={[{ required: true }]}>
              <Input size="large" prefix={<FileTextOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Type" name="typeBesoin" rules={[{ required: true }]}>
              <Select size="large" placeholder="Sélectionner le type">
                <Option value="INDIVIDUEL">Individuel</Option>
                <Option value="COLLECTIF">Collectif</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Domaine / Thème" name="theme">
              <Input size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Période" name="periodCode" rules={[{ required: true }]}>
              <Select size="large">
                {PERIOD_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Form.Item noStyle shouldUpdate={(p, c) => p.periodCode !== c.periodCode}>
            {({ getFieldValue }) => getFieldValue("periodCode") === "OTHER" && (
              <Col xs={24}>
                <Form.Item label="Précisez la période" name="customPeriodLabel" rules={[{ required: true }]}>
                  <Input size="large" />
                </Form.Item>
              </Col>
            )}
          </Form.Item>
          <Col xs={24}>
            <Form.Item label="Objectif" name="objectifFormation" rules={[{ required: true }]}>
              <TextArea rows={2} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Priorité" name="priorite" rules={[{ required: true }]}>
              <Select size="large">
                <Option value="BASSE">Basse</Option>
                <Option value="MOYENNE">Moyenne</Option>
                <Option value="HAUTE">Haute</Option>
                <Option value="CRITIQUE">Critique</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Impact Stratégique" name="impactStrategique">
              <Input size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="UP" name="up" rules={[{ required: true }]}>
              <Select size="large">
                {ups.map((u) => <Option key={u.id} value={String(u.id)}>{u.name || u.libelle}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Département" name="departement" rules={[{ required: true }]}>
              <Select size="large">
                {departements.map((d) => <Option key={d.id} value={String(d.id)}>{d.name || d.libelle}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Formateur proposé" name="propositionAnimateur">
              <Input size="large" prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Horaire souhaité" name="horaireSouhaite">
              <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Animateurs proposés" name="animateurs">
              <Select
                mode="multiple"
                size="large"
                allowClear
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
                placeholder="Sélectionner les enseignants"
                optionFilterProp="label"
                options={acteurOptions}
                maxTagCount="responsive"
              />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Autres informations" name="autresInformations">
              <TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
});

export default BesoinEditModal;
