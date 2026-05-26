import { memo } from "react";
import { Form, Input, Select, Modal } from "antd";

const { Option } = Select;

interface TeacherEditModalProps {
  open: boolean;
  record: Record<string, unknown> | null;
  confirmLoading: boolean;
  ups: Array<{ id: string | number; libelle: string }>;
  depts: Array<{ id: string | number; libelle: string }>;
  form: ReturnType<typeof Form.useForm>[0];
  onOk: () => void;
  onCancel: () => void;
}

const TeacherEditModal = memo(function TeacherEditModal({ open, record, confirmLoading, ups, depts, form, onOk, onCancel }: TeacherEditModalProps) {
  return (
    <Modal
      title={`Modifier — ${record?.nom ?? ""} ${record?.prenom ?? ""}`}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
      okText="Enregistrer"
      cancelText="Annuler"
      destroyOnHidden
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Le nom est requis" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="prenom" label="Prénom" rules={[{ required: true, message: "Le prénom est requis" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="mail" label="Email" rules={[{ required: true, message: "L'email est requis" }, { type: "email", message: "Email invalide" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="type" label="Type" rules={[{ required: true, message: "Le type est requis" }]}>
          <Select>
            <Option value="P">Permanent (P)</Option>
            <Option value="V">Vacataire (V)</Option>
            <Option value="C">Contractuel (C)</Option>
          </Select>
        </Form.Item>
        <Form.Item name="etat" label="État">
          <Select>
            <Option value="A">Actif (A)</Option>
            <Option value="I">Inactif (I)</Option>
          </Select>
        </Form.Item>
        <Form.Item name="cup" label="CUP">
          <Select>
            <Option value="O">Oui</Option>
            <Option value="N">Non</Option>
          </Select>
        </Form.Item>
        <Form.Item name="chefDepartement" label="Chef de département">
          <Select>
            <Option value="O">Oui</Option>
            <Option value="N">Non</Option>
          </Select>
        </Form.Item>
        <Form.Item name="upId" label="UP">
          <Select allowClear placeholder="Sélectionner une UP">
            {ups.map((u) => (<Option key={u.id} value={u.id}>{u.libelle}</Option>))}
          </Select>
        </Form.Item>
        <Form.Item name="deptId" label="Département">
          <Select allowClear placeholder="Sélectionner un département">
            {depts.map((d) => (<Option key={d.id} value={d.id}>{d.libelle}</Option>))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
});

export default TeacherEditModal;
