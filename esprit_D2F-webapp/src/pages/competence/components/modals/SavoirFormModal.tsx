import { Form, Input, Modal, Radio, Select, Space } from "antd";
import type { FormInstance } from "antd";
import type useCompetenceCrud from "@/hooks/competence/useCompetenceCrud";
import {
  NIVEAU_SAVOIR_OPTIONS,
  TYPE_SAVOIR_OPTIONS,
} from "@/utils/constants/competenceOptions";

const { Option } = Select;

interface SavoirFormModalProps {
  crud: ReturnType<typeof useCompetenceCrud>;
  savoirForm: FormInstance;
}

export default function SavoirFormModal({ crud, savoirForm }: SavoirFormModalProps) {
  return (
    <Modal
      forceRender
      title={crud.editingSavoir ? "Modifier le savoir" : "Nouveau savoir"}
      open={crud.savoirModal}
      onOk={() => crud.handleSavoirSubmit(savoirForm)}
      onCancel={() => crud.setSavoirModal(false)}
      afterClose={() => {
        savoirForm.resetFields();
        crud.setEditingSavoir(null);
        crud.setSavoirMode("sc");
      }}
      okText="Enregistrer"
      cancelText="Annuler"
    >
      <Form
        form={savoirForm}
        layout="vertical"
        onValuesChange={(changedValues) => {
          if (crud.editingSavoir) return;
          if (
            changedValues.sousCompetenceId !== undefined ||
            changedValues.competenceId !== undefined
          ) {
            const scId = savoirForm.getFieldValue("sousCompetenceId");
            const compId = savoirForm.getFieldValue("competenceId");
            let newPrefix = "";
            if (crud.savoirMode === "sc" && scId) {
              const sousComp = crud.leafSousComps?.find((sc) => sc.id === scId);
              if (sousComp?.code) {
                newPrefix = `${sousComp.code}-`;
              }
            } else if (crud.savoirMode === "direct" && compId) {
              const comp = crud.competences?.find((c) => c.id === compId);
              if (comp?.code) {
                newPrefix = `${comp.code}-`;
              }
            }
            const currentPrefix = savoirForm.getFieldValue("codePrefix") || "";
            if (currentPrefix !== newPrefix) {
              savoirForm.setFieldValue("codePrefix", newPrefix);
            }
          }
        }}
      >
        <Form.Item label="Mode de rattachement">
          <Radio.Group
            value={crud.savoirMode}
            onChange={(e) => {
              const mode = e.target.value;
              crud.setSavoirMode(mode);
              if (mode === "sc") savoirForm.setFieldValue("competenceId", null);
              else savoirForm.setFieldValue("sousCompetenceId", null);
            }}
            disabled={!!crud.editingSavoir}
          >
            <Radio.Button value="sc">Via competence fille</Radio.Button>
            <Radio.Button value="direct">Direct sur competence</Radio.Button>
          </Radio.Group>
        </Form.Item>
        {crud.savoirMode === "sc" ? (
          <Form.Item
            name="sousCompetenceId"
            label="Competence fille"
            rules={[
              { required: !crud.editingSavoir, message: "Competence fille obligatoire" },
            ]}
          >
            <Select
              placeholder="Selectionner une competence fille"
              disabled={!!crud.editingSavoir}
              showSearch
              optionFilterProp="children"
            >
              {crud.leafSousComps.map((sc) => (
                <Option key={sc.id} value={sc.id}>
                  {sc.nom} ({(sc as { competenceNom?: string }).competenceNom})
                </Option>
              ))}
            </Select>
          </Form.Item>
        ) : (
          <Form.Item
            name="competenceId"
            label="Competence mere"
            rules={[
              { required: !crud.editingSavoir, message: "Competence mere obligatoire" },
            ]}
          >
            <Select
              placeholder="Selectionner une competence mere"
              disabled={!!crud.editingSavoir}
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
        )}
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
                { pattern: /^[A-Z0-9_]+$/, message: "Majuscules, chiffres et _ uniquement" },
                {
                  validator: (_, value) => {
                    const prefix = savoirForm.getFieldValue("codePrefix") || "";
                    const suffix = value || "";
                    if (`${prefix}${suffix}`.length > 100) {
                      return Promise.reject(new Error("Le code ne doit pas depasser 100 caracteres"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder="ex: S1"
                maxLength={100}
                style={{ width: "100%" }}
                onChange={(e) => {
                  const sanitized = (e.target.value || "")
                    .toUpperCase()
                    .replaceAll(/[^A-Z0-9_]/g, "");
                  savoirForm.setFieldValue("codeSuffix", sanitized);
                }}
              />
            </Form.Item>
          </Space.Compact>
        </Form.Item>
        <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Nom obligatoire" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="type" label="Type" rules={[{ required: true, message: "Type obligatoire" }]}>
          <Select placeholder="Type de savoir">
            {TYPE_SAVOIR_OPTIONS.map((t) => (
              <Option key={t} value={t}>{t}</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="niveau" label="Niveau" rules={[{ required: true, message: "Niveau obligatoire" }]}>
          <Select placeholder="Niveau de complexite">
            {NIVEAU_SAVOIR_OPTIONS.map((n) => (
              <Option key={n.value} value={n.value}>{n.label}</Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
