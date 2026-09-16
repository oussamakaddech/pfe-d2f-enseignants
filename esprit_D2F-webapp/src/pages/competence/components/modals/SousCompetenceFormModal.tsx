import { Form, Input, Modal, Select, Space } from "antd";
import type { FormInstance } from "antd";
import type useCompetenceCrud from "@/hooks/competence/useCompetenceCrud";

const { Option } = Select;

interface SousCompetenceFormModalProps {
  crud: ReturnType<typeof useCompetenceCrud>;
  scForm: FormInstance;
}

export default function SousCompetenceFormModal({ crud, scForm }: Readonly<SousCompetenceFormModalProps>) {
  return (
    <Modal
      forceRender
      title={crud.editingSc ? "Modifier la competence fille" : "Nouvelle competence fille"}
      open={crud.scModal}
      onOk={() => crud.handleScSubmit(scForm)}
      onCancel={() => crud.setScModal(false)}
      afterClose={() => {
        scForm.resetFields();
        crud.setEditingSc(null);
        crud.setScCreateTarget(null);
      }}
      okText="Enregistrer"
      cancelText="Annuler"
    >
      <Form form={scForm} layout="vertical">
        {crud.scCreateTarget?.type === "sousCompetence" && (
          <Form.Item name="parentNom" label="Sous-competence parente">
            <Input disabled />
          </Form.Item>
        )}
        <Form.Item
          name="competenceId"
          label="Competence mere"
          rules={[
            {
              required: !(crud.editingSc || crud.scCreateTarget?.type === "sousCompetence"),
              message: "Competence mere obligatoire",
            },
          ]}
        >
          <Select
            placeholder="Selectionner une competence mere"
            disabled={!!crud.editingSc || crud.scCreateTarget?.type === "sousCompetence"}
            showSearch
            optionFilterProp="children"
          >
            {crud.competences.map((c) => (
              <Option key={c.id} value={c.id}>
                {c.nom} ({c.domaineNom})
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="Code" required>
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item name="codePrefix" noStyle style={{ flex: "0 0 60%" }}>
              <Input
                readOnly
                style={{
                  width: "100%",
                  backgroundColor: "#f5f5f5",
                  color: "#888",
                  cursor: "not-allowed",
                }}
              />
            </Form.Item>
            <Form.Item
              name="codeSuffix"
              noStyle
              style={{ flex: "0 0 40%" }}
              rules={[
                { required: true, message: "Completez le code" },
                {
                  pattern: /^[A-Z0-9_]+$/,
                  message: "Majuscules, chiffres et _ uniquement",
                },
                {
                  validator: (_, value) => {
                    const prefix = scForm.getFieldValue("codePrefix") || "";
                    const suffix = value || "";
                    if (`${prefix}${suffix}`.length > 100) {
                      return Promise.reject(
                        new Error("Le code ne doit pas depasser 100 caracteres"),
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder="ex: 01"
                maxLength={100}
                style={{ width: "100%" }}
                onChange={(e) => {
                  const sanitized = (e.target.value || "")
                    .toUpperCase()
                    .replaceAll(/[^A-Z0-9_]/g, "");
                  scForm.setFieldValue("codeSuffix", sanitized);
                }}
              />
            </Form.Item>
          </Space.Compact>
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
      </Form>
    </Modal>
  );
}
