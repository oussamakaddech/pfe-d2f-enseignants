// src/pages/competence/StructureArbrePage.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Tree, Card, Input, Select, Tabs, Tag, Space, Typography, Spin, Statistic,
  Row, Col, Badge, Tooltip, Collapse, Empty, Descriptions, message, Modal,
  Form, Button, Popconfirm, Table,
} from "antd";
import {
  ApartmentOutlined, SearchOutlined, BookOutlined, TeamOutlined,
  BulbOutlined, ExperimentOutlined, FolderOpenOutlined, PlusOutlined,
  DeleteOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import CompetenceService from "../../services/CompetenceService";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const NIVEAU_LABELS = {
  N1_DEBUTANT: { label: "N1 – Débutant", color: "#ff4d4f" },
  N2_ELEMENTAIRE: { label: "N2 – Élémentaire", color: "#fa8c16" },
  N3_INTERMEDIAIRE: { label: "N3 – Intermédiaire", color: "#fadb14" },
  N4_AVANCE: { label: "N4 – Avancé", color: "#52c41a" },
  N5_EXPERT: { label: "N5 – Expert", color: "#1890ff" },
};

const NIVEAU_OPTIONS = Object.entries(NIVEAU_LABELS).map(([key, val]) => ({
  value: key,
  label: val.label,
}));

// ─── Structure Tree Page ────────────────────────────────────────────────────

export default function StructureArbrePage() {
  const [loading, setLoading] = useState(true);
  const [structure, setStructure] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDomaine, setSelectedDomaine] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("tree");

  // Niveau definitions
  const [niveauModalVisible, setNiveauModalVisible] = useState(false);
  const [niveauTarget, setNiveauTarget] = useState(null); // { type: 'competence'|'sousCompetence', id, nom }
  const [niveauData, setNiveauData] = useState({});
  const [niveauLoading, setNiveauLoading] = useState(false);
  const [addNiveauForm] = Form.useForm();

  const fetchStructure = useCallback(async () => {
    setLoading(true);
    try {
      const data = await CompetenceService.structure.getArbreComplet();
      setStructure(data);
    } catch (err) {
      message.error("Erreur lors du chargement de la structure");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStructure();
  }, [fetchStructure]);

  // ─── Search ─────────────────────────────────────────────────────────

  const debounceRef = useRef(null);

  const doSearch = useCallback(
    async (keyword, domaine) => {
      if (!keyword || keyword.trim().length < 2) {
        setSearchResults(null);
        return;
      }
      setSearchLoading(true);
      try {
        let data;
        if (domaine) {
          data = await CompetenceService.structure.rechercheParDomaine(domaine, keyword.trim());
        } else {
          data = await CompetenceService.structure.rechercheGlobale(keyword.trim());
        }
        setSearchResults(data);
        setActiveTab("search");
      } catch (err) {
        message.error("Erreur de recherche");
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    },
    []
  );

  // Debounce search when keyword changes (typing)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchKeyword || searchKeyword.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(searchKeyword, selectedDomaine);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchKeyword]); // eslint-disable-line react-hooks/exhaustive-deps

  // Immediate search when domain filter changes (no debounce)
  const prevDomaineRef = useRef(undefined);
  useEffect(() => {
    if (prevDomaineRef.current === undefined) {
      prevDomaineRef.current = selectedDomaine;
      return;
    }
    prevDomaineRef.current = selectedDomaine;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchKeyword && searchKeyword.trim().length >= 2) {
      doSearch(searchKeyword, selectedDomaine);
    }
  }, [selectedDomaine]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(
    (value) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(value, selectedDomaine);
    },
    [selectedDomaine, doSearch]
  );

  const handleClearSearch = useCallback(() => {
    setSearchKeyword("");
    setSearchResults(null);
  }, []);

  // ─── Niveau modal ──────────────────────────────────────────────────

  const openNiveauModal = useCallback(async (type, id, nom) => {
    setNiveauTarget({ type, id, nom });
    setNiveauModalVisible(true);
    setNiveauLoading(true);
    try {
      let data;
      if (type === "competence") {
        data = await CompetenceService.niveauDefinition.getByCompetence(id);
      } else {
        data = await CompetenceService.niveauDefinition.getBySousCompetence(id);
      }
      setNiveauData(data);
    } catch (err) {
      message.error("Erreur lors du chargement des niveaux");
      console.error(err);
    } finally {
      setNiveauLoading(false);
    }
  }, []);

  const handleAddNiveauSavoir = useCallback(async (values) => {
    try {
      const request = {
        niveau: values.niveau,
        savoirId: values.savoirId,
        description: values.description,
      };
      if (niveauTarget.type === "competence") {
        request.competenceId = niveauTarget.id;
      } else {
        request.sousCompetenceId = niveauTarget.id;
      }
      await CompetenceService.niveauDefinition.add(request);
      message.success("Savoir requis ajouté au niveau");
      addNiveauForm.resetFields();
      // Refresh niveau data
      openNiveauModal(niveauTarget.type, niveauTarget.id, niveauTarget.nom);
    } catch (err) {
      message.error(err.response?.data?.message || "Erreur lors de l'ajout");
      console.error(err);
    }
  }, [niveauTarget, addNiveauForm, openNiveauModal]);

  const handleRemoveNiveauSavoir = useCallback(async (id) => {
    try {
      await CompetenceService.niveauDefinition.remove(id);
      message.success("Savoir requis supprimé du niveau");
      openNiveauModal(niveauTarget.type, niveauTarget.id, niveauTarget.nom);
    } catch (err) {
      message.error("Erreur lors de la suppression");
      console.error(err);
    }
  }, [niveauTarget, openNiveauModal]);

  // ─── Tree nodes ─────────────────────────────────────────────────────

  const treeData = useMemo(() => {
    if (!structure?.domaines) return [];
    return structure.domaines.map((domaine) => ({
      key: `dom-${domaine.id}`,
      title: (
        <Space>
          <FolderOpenOutlined style={{ color: "#1890ff" }} />
          <Text strong>{domaine.nom}</Text>
          <Tag color="blue">{domaine.code}</Tag>
          <Badge count={domaine.nombreCompetences} showZero style={{ backgroundColor: "#52c41a" }}
            overflowCount={99} title="Compétences" />
          <Tooltip title={`${domaine.nombreEnseignants} enseignant(s)`}>
            <Tag icon={<TeamOutlined />} color="purple">{domaine.nombreEnseignants}</Tag>
          </Tooltip>
          {!domaine.actif && <Tag color="red">Inactif</Tag>}
        </Space>
      ),
      children: domaine.competences?.map((comp) => ({
        key: `comp-${comp.id}`,
        title: (
          <Space>
            <ApartmentOutlined style={{ color: "#52c41a" }} />
            <Text>{comp.nom}</Text>
            <Tag color="green">{comp.code}</Tag>
            <Tooltip title={`${comp.nombreSousCompetences} sous-compétences, ${comp.nombreSavoirs} savoirs`}>
              <Tag>{comp.nombreSousCompetences} SC / {comp.nombreSavoirs} S</Tag>
            </Tooltip>
            <Tooltip title={`${comp.nombreEnseignants} enseignant(s)`}>
              <Tag icon={<TeamOutlined />} color="purple">{comp.nombreEnseignants}</Tag>
            </Tooltip>
            <Tooltip title="Voir les niveaux">
              <Button
                size="small" type="link"
                icon={<InfoCircleOutlined />}
                onClick={(e) => { e.stopPropagation(); openNiveauModal("competence", comp.id, comp.nom); }}
              />
            </Tooltip>
          </Space>
        ),
        children: [
          ...(comp.sousCompetences?.map((sc) => ({
            key: `sc-${sc.id}`,
            title: (
              <Space>
                <BulbOutlined style={{ color: "#fa8c16" }} />
                <Text>{sc.nom}</Text>
                <Tag color="orange">{sc.code}</Tag>
                <Tooltip title={`${sc.nombreSavoirs} savoir(s)`}>
                  <Tag icon={<BookOutlined />}>{sc.nombreSavoirs}</Tag>
                </Tooltip>
                <Tooltip title={`${sc.nombreEnseignants} enseignant(s)`}>
                  <Tag icon={<TeamOutlined />} color="purple">{sc.nombreEnseignants}</Tag>
                </Tooltip>
                <Tooltip title="Voir les niveaux">
                  <Button
                    size="small" type="link"
                    icon={<InfoCircleOutlined />}
                    onClick={(e) => { e.stopPropagation(); openNiveauModal("sousCompetence", sc.id, sc.nom); }}
                  />
                </Tooltip>
              </Space>
            ),
            children: sc.savoirs?.map((s) => ({
              key: `sav-${s.id}`,
              title: (
                <Space>
                  {s.type === "THEORIQUE" ? (
                    <BookOutlined style={{ color: "#722ed1" }} />
                  ) : (
                    <ExperimentOutlined style={{ color: "#13c2c2" }} />
                  )}
                  <Text type="secondary">{s.nom}</Text>
                  <Tag color={s.type === "THEORIQUE" ? "purple" : "cyan"}>
                    {s.type === "THEORIQUE" ? "Théorique" : "Pratique"}
                  </Tag>
                  <Tag>{s.code}</Tag>
                </Space>
              ),
              isLeaf: true,
            })),
          })) || []),
          ...(comp.savoirsDirect?.map((s) => ({
            key: `sav-direct-${s.id}`,
            title: (
              <Space>
                {s.type === "THEORIQUE" ? (
                  <BookOutlined style={{ color: "#722ed1" }} />
                ) : (
                  <ExperimentOutlined style={{ color: "#13c2c2" }} />
                )}
                <Text type="secondary">{s.nom}</Text>
                <Tag color={s.type === "THEORIQUE" ? "purple" : "cyan"}>
                  {s.type === "THEORIQUE" ? "Théorique" : "Pratique"}
                </Tag>
                <Tag>{s.code}</Tag>
                <Tag color="gold">Direct</Tag>
              </Space>
            ),
            isLeaf: true,
          })) || []),
        ],
      })) || [],
    }));
  }, [structure, openNiveauModal]);

  // ─── All savoirs for selection ─────────────────────────────────────

  const [allSavoirs, setAllSavoirs] = useState([]);
  useEffect(() => {
    CompetenceService.savoir.getAll().then(setAllSavoirs).catch(() => {});
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Spin size="large" tip="Chargement de la structure..." />
      </div>
    );
  }

  const stats = structure?.statistiques;

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>
        <ApartmentOutlined /> Structure des Compétences
      </Title>

      {/* ─── Statistics Cards ─────────────────────────────────────── */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Domaines" value={stats.totalDomaines}
                prefix={<FolderOpenOutlined />} valueStyle={{ color: "#1890ff" }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Compétences" value={stats.totalCompetences}
                prefix={<ApartmentOutlined />} valueStyle={{ color: "#52c41a" }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Sous-Compétences" value={stats.totalSousCompetences}
                prefix={<BulbOutlined />} valueStyle={{ color: "#fa8c16" }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Savoirs" value={stats.totalSavoirs}
                prefix={<BookOutlined />} valueStyle={{ color: "#722ed1" }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Théoriques" value={stats.totalSavoirsTheoriques}
                prefix={<BookOutlined />} valueStyle={{ color: "#722ed1" }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Pratiques" value={stats.totalSavoirsPratiques}
                prefix={<ExperimentOutlined />} valueStyle={{ color: "#13c2c2" }} />
            </Card>
          </Col>
        </Row>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "tree",
            label: (
              <span>
                <ApartmentOutlined /> Vue Arborescente
              </span>
            ),
            children: (
              <Card>
                {treeData.length > 0 ? (
                  <Tree
                    treeData={treeData}
                    defaultExpandedKeys={treeData.map((d) => d.key)}
                    showLine={{ showLeafIcon: false }}
                    blockNode
                    style={{ fontSize: 14 }}
                  />
                ) : (
                  <Empty description="Aucune donnée dans la structure" />
                )}
              </Card>
            ),
          },
          {
            key: "search",
            label: (
              <span>
                <SearchOutlined /> Recherche
              </span>
            ),
            children: (
              <Card>
                <Space style={{ marginBottom: 16, width: "100%" }} direction="vertical">
                  <Row gutter={16}>
                    <Col span={6}>
                      <Select
                        allowClear
                        placeholder="Filtrer par domaine"
                        style={{ width: "100%" }}
                        value={selectedDomaine}
                        onChange={(val) => {
                          setSelectedDomaine(val);
                        }}
                      >
                        {structure?.domaines?.map((d) => (
                          <Option key={d.id} value={d.id}>
                            {d.nom} ({d.code})
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={18}>
                      <Search
                        placeholder="Rechercher par mot-clé, code, description..."
                        enterButton={searchLoading ? "Recherche..." : "Rechercher"}
                        loading={searchLoading}
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        onSearch={handleSearch}
                        allowClear
                        onClear={handleClearSearch}
                      />
                    </Col>
                  </Row>
                  {searchKeyword.trim().length > 0 && searchKeyword.trim().length < 2 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Saisissez au moins 2 caractères
                    </Text>
                  )}
                  {selectedDomaine && (
                    <Space size={4}>
                      <SearchOutlined style={{ color: "#1890ff" }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Filtrage dans le domaine :
                      </Text>
                      <Tag
                        color="blue"
                        closable
                        onClose={() => setSelectedDomaine(null)}
                      >
                        {structure?.domaines?.find((d) => d.id === selectedDomaine)?.nom}
                      </Tag>
                    </Space>
                  )}
                </Space>

                {searchLoading ? (
                  <Spin />
                ) : searchResults ? (
                  <SearchResultsView results={searchResults} keyword={searchKeyword} />
                ) : (
                  <Empty description="Saisissez un mot-clé (min. 2 caractères) pour lancer la recherche" />
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* ─── Niveau Definition Modal ──────────────────────────────── */}
      <Modal
        title={`Niveaux de compétence — ${niveauTarget?.nom || ""}`}
        open={niveauModalVisible}
        onCancel={() => setNiveauModalVisible(false)}
        footer={null}
        width={800}
        forceRender
      >
        {niveauLoading ? (
          <Spin />
        ) : (
          <div>
            <Collapse
              defaultActiveKey={Object.keys(NIVEAU_LABELS)}
              items={Object.entries(NIVEAU_LABELS).map(([key, val]) => {
                const niveauItems = niveauData[key] || [];
                return {
                  key,
                  label: (
                    <Space>
                      <Badge color={val.color} />
                      <Text strong>{val.label}</Text>
                      <Tag>{niveauItems.length} savoir(s) requis</Tag>
                    </Space>
                  ),
                  children: niveauItems.length > 0 ? (
                    <Table
                      size="small"
                      dataSource={niveauItems}
                      rowKey="id"
                      pagination={false}
                      columns={[
                        { title: "Code", dataIndex: "savoirCode", width: 100 },
                        { title: "Savoir", dataIndex: "savoirNom" },
                        { title: "Description", dataIndex: "description", ellipsis: true },
                        {
                          title: "",
                          width: 50,
                          render: (_, record) => (
                            <Popconfirm
                              title="Supprimer ce savoir requis ?"
                              onConfirm={() => handleRemoveNiveauSavoir(record.id)}
                            >
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          ),
                        },
                      ]}
                    />
                  ) : (
                    <Text type="secondary">Aucun savoir requis défini pour ce niveau</Text>
                  ),
                };
              })}
            />

            <Card size="small" title="Ajouter un savoir requis" style={{ marginTop: 16 }}>
              <Form form={addNiveauForm} layout="inline" onFinish={handleAddNiveauSavoir}>
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
                    {allSavoirs.map((s) => (
                      <Option key={s.id} value={s.id}>
                        {s.code} — {s.nom}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="description">
                  <Input placeholder="Description (optionnel)" style={{ width: 200 }} />
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
    </div>
  );
}

// ─── Sub-component: Search Results ──────────────────────────────────────────

function SearchResultsView({ results }) {
  const { domaines = [], competences = [], sousCompetences = [], savoirs = [] } = results;
  const hasResults = domaines.length || competences.length || sousCompetences.length || savoirs.length;

  if (!hasResults) {
    return <Empty description="Aucun résultat trouvé" />;
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      {domaines.length > 0 && (
        <Card size="small" title={<><FolderOpenOutlined /> Domaines ({domaines.length})</>}>
          {domaines.map((d) => (
            <Tag key={d.id} color="blue" style={{ margin: 4, padding: "4px 8px" }}>
              <strong>{d.code}</strong> — {d.nom}
            </Tag>
          ))}
        </Card>
      )}

      {competences.length > 0 && (
        <Card size="small" title={<><ApartmentOutlined /> Compétences ({competences.length})</>}>
          <Descriptions column={1} size="small" bordered>
            {competences.map((c) => (
              <Descriptions.Item
                key={c.id}
                label={<Tag color="green">{c.code}</Tag>}
              >
                <strong>{c.nom}</strong>
                {c.domaineNom && <Text type="secondary"> — {c.domaineNom}</Text>}
                {c.description && <div><Text type="secondary">{c.description}</Text></div>}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}

      {sousCompetences.length > 0 && (
        <Card size="small" title={<><BulbOutlined /> Sous-Compétences ({sousCompetences.length})</>}>
          <Descriptions column={1} size="small" bordered>
            {sousCompetences.map((sc) => (
              <Descriptions.Item
                key={sc.id}
                label={<Tag color="orange">{sc.code}</Tag>}
              >
                <strong>{sc.nom}</strong>
                {sc.competenceNom && <Text type="secondary"> — {sc.competenceNom}</Text>}
                {sc.description && <div><Text type="secondary">{sc.description}</Text></div>}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}

      {savoirs.length > 0 && (
        <Card size="small" title={<><BookOutlined /> Savoirs ({savoirs.length})</>}>
          <Descriptions column={1} size="small" bordered>
            {savoirs.map((s) => (
              <Descriptions.Item
                key={s.id}
                label={
                  <Space>
                    <Tag>{s.code}</Tag>
                    <Tag color={s.type === "THEORIQUE" ? "purple" : "cyan"}>
                      {s.type === "THEORIQUE" ? "Th." : "Pr."}
                    </Tag>
                  </Space>
                }
              >
                <strong>{s.nom}</strong>
                {s.sousCompetenceNom && <Text type="secondary"> — {s.sousCompetenceNom}</Text>}
                {s.competenceNom && <Text type="secondary"> — {s.competenceNom}</Text>}
                {s.description && <div><Text type="secondary">{s.description}</Text></div>}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
    </Space>
  );
}
