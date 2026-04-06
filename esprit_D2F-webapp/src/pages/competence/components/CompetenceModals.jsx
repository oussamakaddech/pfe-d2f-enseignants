/* eslint-disable react/prop-types */
import { useEffect } from "react";
import {
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  NIVEAU_LABELS,
  NIVEAU_OPTIONS,
  NIVEAU_SAVOIR_OPTIONS,
  TYPE_SAVOIR_OPTIONS,
} from "../constants/competenceOptions";

const { Option } = Select;
const { Text } = Typography;

export default function CompetenceModals({
  crud,
  structure,
  domaineForm,
  compForm,
  scForm,
  savoirForm,
  addNiveauForm,
}) {
  // Mettre à jour le prefix des savoirs quand le parent ou le mode change
  useEffect(() => {
    if (!crud.savoirModal || crud.editingSavoir) return;

    const updateSavoirCodePrefix = async () => {
      try {
        const scId = savoirForm.getFieldValue("sousCompetenceId");
        const compId = savoirForm.getFieldValue("competenceId");

        let newPrefix = "";
        if (crud.savoirMode === "sc" && scId) {
          const sousComp = crud.leafSousComps.find((sc) => sc.id === scId);
          if (sousComp?.code) {
            newPrefix = `${sousComp.code}-`;
          }
        } else if (crud.savoirMode === "direct" && compId) {
          const comp = crud.competences.find((c) => c.id === compId);
          if (comp?.code) {
            newPrefix = `${comp.code}-`;
          }
        }

        const currentPrefix = savoirForm.getFieldValue("codePrefix") || "";
        if (currentPrefix !== newPrefix) {
          savoirForm.setFieldValue("codePrefix", newPrefix);
        }
      } catch (err) {
        console.error("Error updating savoir code prefix:", err);
      }
    };

    updateSavoirCodePrefix();
  }, [
    crud.savoirModal,
    crud.editingSavoir,
    crud.leafSousComps,
    crud.competences,
    crud.savoirMode,
    savoirForm,
  ]);
  return (
    <>
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
            <Input placeholder="ex: INF" />
          </Form.Item>
          <Form.Item
            name="nom"
            label="Nom"
            rules={[{ required: true, message: "Nom obligatoire" }]}
          >
            <Input placeholder="ex: Informatique" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="actif" label="Actif" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

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
              const domaine = crud.domaines.find(d => d.id === changedValues.domaineId);
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
            <Input.Group compact>
              <Form.Item name="codePrefix" noStyle>
                <Input
                  readOnly
                  style={{
                    width: "60%",
                    backgroundColor: "#f5f5f5",
                    color: "#888",
                    cursor: "not-allowed",
                    borderRight: "none",
                  }}
                />
              </Form.Item>
              <Form.Item
                name="codeSuffix"
                style={{ display: "inline-block", width: "40%", marginBottom: 0 }}
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
                  onChange={(e) => {
                    const sanitized = (e.target.value || "")
                      .toUpperCase()
                      .replace(/[^A-Z0-9_]/g, "");
                    scForm.setFieldValue("codeSuffix", sanitized);
                  }}
                />
              </Form.Item>
            </Input.Group>
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
            // Mettre à jour le prefix quand la sous-compétence ou compétence change
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
                    {sc.nom} ({sc.competenceNom})
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
            <Input.Group compact>
              <Form.Item name="codePrefix" noStyle>
                <Input
                  readOnly
                  style={{
                    width: "60%",
                    backgroundColor: "#f5f5f5",
                    color: "#888",
                    cursor: "not-allowed",
                    borderRight: "none",
                  }}
                />
              </Form.Item>
              <Form.Item
                name="codeSuffix"
                style={{ display: "inline-block", width: "40%", marginBottom: 0 }}
                rules={[
                  { required: true, message: "Completez le code" },
                  {
                    pattern: /^[A-Z0-9_]+$/,
                    message: "Majuscules, chiffres et _ uniquement",
                  },
                  {
                    validator: (_, value) => {
                      const prefix = savoirForm.getFieldValue("codePrefix") || "";
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
                  placeholder="ex: S1"
                  maxLength={100}
                  onChange={(e) => {
                    const sanitized = (e.target.value || "")
                      .toUpperCase()
                      .replace(/[^A-Z0-9_]/g, "");
                    savoirForm.setFieldValue("codeSuffix", sanitized);
                  }}
                />
              </Form.Item>
            </Input.Group>
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
            name="type"
            label="Type"
            rules={[{ required: true, message: "Type obligatoire" }]}
          >
            <Select placeholder="Type de savoir">
              {TYPE_SAVOIR_OPTIONS.map((t) => (
                <Option key={t} value={t}>
                  {t}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="niveau"
            label="Niveau"
            rules={[{ required: true, message: "Niveau obligatoire" }]}
          >
            <Select placeholder="Niveau de complexite">
              {NIVEAU_SAVOIR_OPTIONS.map((n) => (
                <Option key={n.value} value={n.value}>
                  {n.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        forceRender
        title={`Niveaux de competence - ${structure.niveauTarget?.nom || ""}`}
        open={structure.niveauModalVisible}
        onCancel={() => structure.setNiveauModalVisible(false)}
        footer={null}
        width={800}
      >
        {structure.niveauLoading ? (
          <Spin />
        ) : (
          <div>
            <Collapse
              defaultActiveKey={Object.keys(NIVEAU_LABELS)}
              items={Object.entries(NIVEAU_LABELS).map(([key, val]) => {
                const levelItems = structure.niveauData[key] || [];
                return {
                  key,
                  label: (
                    <Space>
                      <Badge color={val.color} />
                      <Text strong>{val.label}</Text>
                      <Tag>{levelItems.length} savoir(s) requis</Tag>
                    </Space>
                  ),
                  children:
                    levelItems.length > 0 ? (
                      <Table
                        size="small"
                        dataSource={levelItems}
                        rowKey="id"
                        pagination={false}
                        columns={[
                          {
                            title: "Code",
                            dataIndex: "savoirCode",
                            width: 100,
                          },
                          { title: "Savoir", dataIndex: "savoirNom" },
                          {
                            title: "Description",
                            dataIndex: "description",
                            ellipsis: true,
                          },
                          {
                            title: "",
                            width: 50,
                            render: (_, record) => (
                              <Popconfirm
                                title="Supprimer ce savoir requis ?"
                                onConfirm={() =>
                                  structure.handleRemoveNiveauSavoir(record.id)
                                }
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            ),
                          },
                        ]}
                      />
                    ) : (
                      <Text type="secondary">
                        Aucun savoir requis defini pour ce niveau
                      </Text>
                    ),
                };
              })}
            />

            <Card
              size="small"
              title="Ajouter un savoir requis"
              style={{ marginTop: 16 }}
            >
              <Form
                form={addNiveauForm}
                layout="inline"
                onFinish={async (values) => {
                  await structure.handleAddNiveauSavoir(values);
                  addNiveauForm.resetFields();
                }}
              >
                <Form.Item
                  name="niveau"
                  rules={[{ required: true, message: "Requis" }]}
                >
                  <Select placeholder="Niveau" style={{ width: 180 }}>
                    {NIVEAU_OPTIONS.map((opt) => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  name="savoirId"
                  rules={[{ required: true, message: "Requis" }]}
                >
                  <Select
                    placeholder="Savoir"
                    showSearch
                    optionFilterProp="children"
                    style={{ width: 250 }}
                  >
                    {structure.allSavoirsHierarchie.map((s) => (
                      <Option key={s.id} value={s.id}>
                        {s.code} - {s.nom}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="description">
                  <Input
                    placeholder="Description (optionnel)"
                    style={{ width: 200 }}
                  />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                    Ajouter
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </div>
        )}
      </Modal>
    </>
  );
}
