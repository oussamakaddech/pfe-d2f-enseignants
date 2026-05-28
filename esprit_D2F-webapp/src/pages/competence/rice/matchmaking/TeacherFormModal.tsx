import { Form, Modal, Input, Select, Row, Col, Avatar, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { FormInstance } from "antd";
import { DEPARTMENT_OPTIONS, avatarColor, getInitials } from "../constants";
import type { Enseignant } from "../../hooks/useMatchmaking";

const { Option } = Select;

interface TeacherFormModalProps {
  open: boolean;
  editingTeacher: Enseignant | null;
  form: FormInstance;
  onOk: () => Promise<void>;
  onCancel: () => void;
}

export function TeacherFormModal({ open, editingTeacher, form, onOk, onCancel }: TeacherFormModalProps) {
  return (
    <Modal
      title={
        <Space>
          <Avatar size={28} style={{ background: editingTeacher ? avatarColor(editingTeacher.id) : "#4f46e5" }}>
            {editingTeacher ? getInitials(editingTeacher.nom ?? "", editingTeacher.prenom ?? "") : <PlusOutlined />}
          </Avatar>
          {editingTeacher ? `Modifier — ${editingTeacher.prenom} ${editingTeacher.nom}` : "Créer un enseignant"}
        </Space>
      }
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText={editingTeacher ? "Enregistrer" : "Créer"}
      width={480}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="prenom" label="Prénom" rules={[{ required: true, message: "Requis" }]}>
              <Input placeholder="Prénom" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Requis" }]}>
              <Input placeholder="Nom" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="email" label="Email" rules={[{ type: "email", message: "Email invalide" }]}>
          <Input placeholder="prenom.nom@esprit.tn" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="departement" label="Département">
              <Select options={DEPARTMENT_OPTIONS} optionFilterProp="labelText" showSearch allowClear placeholder="Département" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="grade" label="Grade">
              <Select allowClear placeholder="Grade">
                <Option value="PES">PES</Option>
                <Option value="MCA">MCA</Option>
                <Option value="MCB">MCB</Option>
                <Option value="MAA">MAA</Option>
                <Option value="MAB">MAB</Option>
                <Option value="Vacataire">Vacataire</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
