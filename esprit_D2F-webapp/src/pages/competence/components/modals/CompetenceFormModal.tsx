import { Form, Input, Modal, Select } from "antd";
import type { FormInstance } from "antd";
import type useCompetenceCrud from "@/hooks/competence/useCompetenceCrud";

const { Option } = Select;

interface CompetenceFormModalProps {
  crud: ReturnType<typeof useCompetenceCrud>;
  compForm: FormInstance;
}

export default function CompetenceFormModal({ crud, compForm }: Readonly<CompetenceFormModalProps>) {
  return (
    <Modal
      forceRender
      title={crud.editingComp ? "Modifier la competence" : "Nouvelle competence"}
      open={crud.compModal}
      onOk={() => crud.handleCompSubmit(compForm)}
      onCancel={() => crud.setCompModal(false)}
      afterClose={() => {
        compForm.resetFields();
        crud.setEditingComp(null);
      }}
      okText="Enregistrer"
      cancelText="Annuler"
    >
      <Form
        form={compForm}
        layout="vertical"
        onValuesChange={(changedValues) => {
          if (!crud.editingComp && changedValues.domaineId) {
            const domaine = crud.domaines.find((d) => d.id === changedValues.domaineId);
            if (domaine?.code) {
              compForm.setFieldsValue({ code: `${domaine.code}-` });
            }
          }
        }}
      >
        <Form.Item
          name="domaineId"
          label="Domaine"
          rules={[
            { required: !crud.editingComp, message: "Domaine obligatoire" },
          ]}
        >
          <Select
            placeholder="Selectionner un domaine"
            disabled={!!crud.editingComp}
            showSearch
            optionFilterProp="children"
          >
            {crud.domaines.map((d) => (
              <Option key={d.id} value={d.id}>
                {d.nom}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          name="code"
          label="Code"
          rules={[{ required: true, message: "Code obligatoire" }]}
        >
          <Input placeholder="ex: INF-01" />
        </Form.Item>
        <Form.Item
          name="nom"
          label="Nom"
          rules={[{ required: true, message: "Nom obligatoire" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item
          name="prerequisiteManual"
          label="Prerequis"
          extra="Optionnel: saisie manuelle libre (ex: Java avance, Maven, SQL)."
        >
          <Input.TextArea rows={3} placeholder="Ecrire les prerequis manuellement" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
