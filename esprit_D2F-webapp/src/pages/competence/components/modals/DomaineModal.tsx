import { useEffect } from "react";
import { useAllUps } from "@/hooks/formation/useUpCrud";
import { useAllDepts } from "@/hooks/formation/useDeptCrud";
import { Form, Input, Modal, Select, Switch } from "antd";
import type { FormInstance } from "antd";
import type useCompetenceCrud from "@/hooks/competence/useCompetenceCrud";

const { Option } = Select;

interface RefItem {
  id?: string | number;
  nom?: string;
  libelle?: string;
  code?: string;
}

interface DomaineModalProps {
  crud: ReturnType<typeof useCompetenceCrud>;
  domaineForm: FormInstance;
}

export default function DomaineModal({ crud, domaineForm }: DomaineModalProps) {
  const { data: ups = [] } = useAllUps();
  const { data: depts = [] } = useAllDepts();

  return (
    <Modal
      forceRender
      title={crud.editingDomaine ? "Modifier le domaine" : "Nouveau domaine"}
      open={crud.domaineModal}
      onOk={() => crud.handleDomaineSubmit(domaineForm)}
      onCancel={() => crud.setDomaineModal(false)}
      afterClose={() => {
        domaineForm.resetFields();
        crud.setEditingDomaine(null);
      }}
      okText="Enregistrer"
      cancelText="Annuler"
    >
      <Form form={domaineForm} layout="vertical">
        <Form.Item
          name="code"
          label="Code"
          rules={[{ required: true, message: "Code obligatoire" }]}
        >
          <Input placeholder="ex: DOM-001" />
        </Form.Item>
        <Form.Item
          name="nom"
          label="Nom"
          rules={[{ required: true, message: "Nom obligatoire" }]}
        >
          <Input placeholder="ex: Informatique" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="Description du domaine" />
        </Form.Item>
        <Form.Item
          name="upId"
          label="UP"
          rules={[{ required: true, message: "UP obligatoire" }]}
        >
          <Select
            placeholder="Selectionner une UP"
            showSearch
            optionFilterProp="children"
            loading={ups.length === 0}
          >
            {(ups as RefItem[]).map((up) => (
              <Option key={up.id} value={up.id}>
                {up.nom ?? up.libelle ?? up.code ?? `UP ${up.id}`}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          name="departementId"
          label="Departement"
          rules={[{ required: true, message: "Departement obligatoire" }]}
        >
          <Select
            placeholder="Selectionner un departement"
            showSearch
            optionFilterProp="children"
            loading={depts.length === 0}
          >
            {(depts as RefItem[]).map((dept) => (
              <Option key={dept.id} value={dept.id}>
                {dept.nom ?? dept.libelle ?? dept.code ?? `Departement ${dept.id}`}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="actif" label="Actif" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
