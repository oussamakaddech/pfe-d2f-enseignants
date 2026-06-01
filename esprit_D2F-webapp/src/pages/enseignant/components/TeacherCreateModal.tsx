import { Modal, Form, Input, Select } from "antd";
import type { FormInstance } from "antd";

const { Option } = Select;

interface Up {
  id: number | string;
  libelle: string;
}

interface Dept {
  id: number | string;
  libelle: string;
}

interface ExtractedTeacher {
  nom_complet?: string;
  mail?: string;
  fichier?: string;
}

interface TeacherCreateModalProps {
  open: boolean;
  extractedTeacher: ExtractedTeacher | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  ups: Up[];
  depts: Dept[];
  form: FormInstance;
}

export default function TeacherCreateModal({
  open,
  extractedTeacher,
  onConfirm,
  onCancel,
  loading,
  ups,
  depts,
  form,
}: Readonly<TeacherCreateModalProps>) {
  const title = extractedTeacher?.nom_complet
    ? `Créer enseignant extrait — ${extractedTeacher.nom_complet}`
    : "Créer enseignant extrait";

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      confirmLoading={loading}
      okText="Créer"
      cancelText="Annuler"
      destroyOnHidden
      width={560}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ type: "P", etat: "A", cup: "N", chefDepartement: "N" }}
      >
        <Form.Item
          name="prenom"
          label="Prénom"
          rules={[{ required: true, message: "Le prénom est requis" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="nom"
          label="Nom"
          rules={[{ required: true, message: "Le nom est requis" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="mail"
          label="Email"
          rules={[
            { required: true, message: "L'email est requis" },
            { type: "email", message: "Email invalide" },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="type"
          label="Type"
          rules={[{ required: true, message: "Le type est requis" }]}
        >
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
            {ups.map((u) => (
              <Option key={u.id} value={u.id}>
                {u.libelle}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="deptId" label="Département">
          <Select allowClear placeholder="Sélectionner un département">
            {depts.map((d) => (
              <Option key={d.id} value={d.id}>
                {d.libelle}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
