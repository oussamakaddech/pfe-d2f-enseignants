import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Badge, Button, Card, Collapse, Form, Input, Modal, Popconfirm, Select, Space, Spin, Table, Tag, Typography,
} from "antd";
import type { FormInstance } from "antd";
import type useStructureData from "@/hooks/competence/useStructureData";
import type { Id } from "@/models/common";
import {
  NIVEAU_LABELS,
  NIVEAU_OPTIONS,
} from "@/utils/constants/competenceOptions";

const { Text } = Typography;
const { Option } = Select;

interface NiveauDefinitionModalProps {
  structure: ReturnType<typeof useStructureData>;
  addNiveauForm: FormInstance;
}

export default function NiveauDefinitionModal({ structure, addNiveauForm }: NiveauDefinitionModalProps) {
  return (
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
              const niveauDataMap = structure.niveauData as Record<string, Array<{ id?: Id; savoirCode?: string; savoirNom?: string; description?: string }>>;
              const levelItems = niveauDataMap[key] || [];
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
                        { title: "Code", dataIndex: "savoirCode", width: 100 },
                        { title: "Savoir", dataIndex: "savoirNom" },
                        {
                          title: "Description",
                          dataIndex: "description",
                          render: (value) => (
                            <span style={{ display: "inline-block", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={value || ""}>
                              {value || "-"}
                            </span>
                          ),
                        },
                        {
                          title: "", width: 50,
                          render: (_: unknown, record: { id?: Id }) => (
                            <Popconfirm
                              title="Supprimer ce savoir requis ?"
                              onConfirm={() => record.id != null && structure.handleRemoveNiveauSavoir(record.id)}
                            >
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          ),
                        },
                      ]}
                    />
                  ) : (
                    <Text type="secondary">Aucun savoir requis defini pour ce niveau</Text>
                  ),
              };
            })}
          />
          <Card size="small" title="Ajouter un savoir requis" style={{ marginTop: 16 }}>
            <Form
              form={addNiveauForm}
              layout="inline"
              onFinish={async (values) => {
                await structure.handleAddNiveauSavoir(values);
                addNiveauForm.resetFields();
              }}
            >
              <Form.Item name="niveau" rules={[{ required: true, message: "Requis" }]}>
                <Select placeholder="Niveau" style={{ width: 180 }}>
                  {NIVEAU_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="savoirId" rules={[{ required: true, message: "Requis" }]}>
                <Select placeholder="Savoir" showSearch optionFilterProp="children" style={{ width: 250 }}>
                  {structure.allSavoirsHierarchie.map((s) => (
                    <Option key={s.id} value={s.id}>{s.code} - {s.nom}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="description">
                <Input placeholder="Description (optionnel)" style={{ width: 200 }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Ajouter</Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      )}
    </Modal>
  );
}
