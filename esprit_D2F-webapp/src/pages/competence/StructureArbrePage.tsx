import { useCallback, useMemo } from "react";
import {
  Tree, Card, Tabs, Tag, Space, Typography, Spin, Statistic,
  Row, Col, Badge, Tooltip, Collapse, Empty, Modal,
  Form, Button, Popconfirm, Table,
} from "antd";
import {
  ApartmentOutlined, BookOutlined, TeamOutlined,
  BulbOutlined, ExperimentOutlined, FolderOpenOutlined, PlusOutlined,
  DeleteOutlined, InfoCircleOutlined, SearchOutlined,
} from "@ant-design/icons";
import { Input, Select } from "antd";
import { NIVEAU_LABELS, NIVEAU_OPTIONS } from "@/utils/constants/competenceOptions";
import StructureSearchResultsView, { type SearchResults } from "./components/StructureSearchResultsView";
import TreeFilters from "./components/tree/TreeFilters";
import { useStructureArbre } from "./hooks/useStructureArbre";
import "@/styles/pages/structure-arbre-page.css";

const { Title, Text } = Typography;
const { Option } = Select;

export default function StructureArbrePage() {
  const {
    loading, structure, allSavoirs,
    searchResults, searchKeyword, setSearchKeyword, selectedDomaine, setSelectedDomaine,
    searchLoading, activeTab, setActiveTab, handleSearch, handleClearSearch,
    niveauModalVisible, setNiveauModalVisible, niveauTarget, niveauData, niveauLoading,
    addNiveauForm, openNiveauModal, handleAddNiveauSavoir, handleRemoveNiveauSavoir,
  } = useStructureArbre();

  // ── Tree node builders ───────────────────────────────────────────────────

  const buildSavoirNode = useCallback((s: Record<string, unknown>) => ({
    key: `sav-${s.id}`,
    title: (
      <Space>
        {s.type === "THEORIQUE" ? <BookOutlined style={{ color: "#722ed1" }} /> : <ExperimentOutlined style={{ color: "#13c2c2" }} />}
        <Text type="secondary">{String(s.nom)}</Text>
        <Tag color={s.type === "THEORIQUE" ? "purple" : "cyan"}>{s.type === "THEORIQUE" ? "Théorique" : "Pratique"}</Tag>
        <Tag>{String(s.code)}</Tag>
      </Space>
    ),
    isLeaf: true,
  }), []);

  const buildDirectSavoirNode = useCallback((s: Record<string, unknown>) => ({
    key: `sav-direct-${s.id}`,
    title: (
      <Space>
        {s.type === "THEORIQUE" ? <BookOutlined style={{ color: "#722ed1" }} /> : <ExperimentOutlined style={{ color: "#13c2c2" }} />}
        <Text type="secondary">{String(s.nom)}</Text>
        <Tag color={s.type === "THEORIQUE" ? "purple" : "cyan"}>{s.type === "THEORIQUE" ? "Théorique" : "Pratique"}</Tag>
        <Tag>{String(s.code)}</Tag>
        <Tag color="gold">Direct</Tag>
      </Space>
    ),
    isLeaf: true,
  }), []);

  const buildSousCompNode = useCallback((sc: Record<string, unknown>) => ({
    key: `sc-${sc.id}`,
    title: (
      <Space>
        <BulbOutlined style={{ color: "#fa8c16" }} />
        <Text>{String(sc.nom)}</Text>
        <Tag color="orange">{String(sc.code)}</Tag>
        <Tooltip title={`${sc.nombreSavoirs} savoir(s)`}><Tag icon={<BookOutlined />}>{String(sc.nombreSavoirs)}</Tag></Tooltip>
        <Tooltip title={`${sc.nombreEnseignants} enseignant(s)`}><Tag icon={<TeamOutlined />} color="purple">{String(sc.nombreEnseignants)}</Tag></Tooltip>
        <Tooltip title="Voir les niveaux">
          <Button size="small" type="link" icon={<InfoCircleOutlined />}
            onClick={(e) => { e.stopPropagation(); openNiveauModal("sousCompetence", sc.id as number, String(sc.nom)); }} />
        </Tooltip>
      </Space>
    ),
    children: (sc.savoirs as Record<string, unknown>[] | undefined)?.map(buildSavoirNode),
  }), [openNiveauModal, buildSavoirNode]);

  const buildCompetenceNode = useCallback((comp: Record<string, unknown>) => ({
    key: `comp-${comp.id}`,
    title: (
      <Space>
        <ApartmentOutlined style={{ color: "#52c41a" }} />
        <Text>{String(comp.nom)}</Text>
        <Tag color="green">{String(comp.code)}</Tag>
        <Tooltip title={`${String(comp.nombreSousCompetences)} sous-compétences, ${String(comp.nombreSavoirs)} savoirs`}>
          <Tag>{String(comp.nombreSousCompetences)} SC / {String(comp.nombreSavoirs)} S</Tag>
        </Tooltip>
        <Tooltip title={`${comp.nombreEnseignants} enseignant(s)`}><Tag icon={<TeamOutlined />} color="purple">{String(comp.nombreEnseignants)}</Tag></Tooltip>
        <Tooltip title="Voir les niveaux">
          <Button size="small" type="link" icon={<InfoCircleOutlined />}
            onClick={(e) => { e.stopPropagation(); openNiveauModal("competence", comp.id as number, String(comp.nom)); }} />
        </Tooltip>
      </Space>
    ),
    children: [
      ...((comp.sousCompetences as Record<string, unknown>[] | undefined)?.map(buildSousCompNode) || []),
      ...((comp.savoirsDirect as Record<string, unknown>[] | undefined)?.map(buildDirectSavoirNode) || []),
    ],
  }), [openNiveauModal, buildSousCompNode, buildDirectSavoirNode]);

  const buildDomaineNode = useCallback((domaine: Record<string, unknown>) => ({
    key: `dom-${domaine.id}`,
    title: (
      <Space>
        <FolderOpenOutlined style={{ color: "#1890ff" }} />
        <Text strong>{String(domaine.nom)}</Text>
        <Tag color="blue">{String(domaine.code)}</Tag>
        <Badge count={domaine.nombreCompetences as number} showZero style={{ backgroundColor: "#52c41a" }} overflowCount={99} title="Compétences" />
        <Tooltip title={`${domaine.nombreEnseignants} enseignant(s)`}><Tag icon={<TeamOutlined />} color="purple">{String(domaine.nombreEnseignants)}</Tag></Tooltip>
        {!domaine.actif && <Tag color="red">Inactif</Tag>}
      </Space>
    ),
    children: (domaine.competences as Record<string, unknown>[] | undefined)?.map(buildCompetenceNode) || [],
  }), [buildCompetenceNode]);

  const treeData = useMemo(() => {
    if (!structure) return [];
    return structure.map((domaine) => buildDomaineNode(domaine as unknown as Record<string, unknown>));
  }, [structure, buildDomaineNode]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Spin size="large" tip="Chargement de la structure..."><div /></Spin>
      </div>
    );
  }

  const domaines = structure ?? [];

  let searchContent;
  if (searchLoading) searchContent = <Spin />;
  else if (searchResults) searchContent = <StructureSearchResultsView results={searchResults as unknown as SearchResults} />;
  else searchContent = <Empty description="Saisissez un mot-clé (min. 2 caractères) pour lancer la recherche" />;

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}><ApartmentOutlined /> Structure des Compétences</Title>


      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "tree",
            label: <span><ApartmentOutlined /> Vue Arborescente</span>,
            children: (
              <Card>
                {treeData.length > 0
                  ? <Tree treeData={treeData} defaultExpandedKeys={treeData.map((d) => d.key)} showLine={{ showLeafIcon: false }} blockNode style={{ fontSize: 14 }} />
                  : <Empty description="Aucune donnée dans la structure" />}
              </Card>
            ),
          },
          {
            key: "search",
            label: <span><SearchOutlined /> Recherche</span>,
            children: (
              <Card>
                <TreeFilters
                  domaines={domaines as { id: number | string; nom: string; code: string }[]}
                  searchKeyword={searchKeyword}
                  selectedDomaine={selectedDomaine}
                  searchLoading={searchLoading}
                  onSearchChange={setSearchKeyword}
                  onSearch={handleSearch}
                  onClearSearch={handleClearSearch}
                  onDomaineChange={setSelectedDomaine}
                />
                {searchContent}
              </Card>
            ),
          },
        ]}
      />

      {/* Niveau Definition Modal */}
      <Modal title={`Niveaux de compétence — ${niveauTarget?.nom || ""}`} open={niveauModalVisible} onCancel={() => setNiveauModalVisible(false)} footer={null} width={800} forceRender>
        {niveauLoading ? <Spin /> : (
          <div>
            <Collapse
              defaultActiveKey={Object.keys(NIVEAU_LABELS)}
              items={Object.entries(NIVEAU_LABELS).map(([key, val]) => {
                const niveauItems = niveauData.filter((nd) => nd.niveau === key) as unknown as Record<string, unknown>[];
                return {
                  key,
                  label: (
                    <Space>
                      <Badge color={(val as { color: string; label: string }).color} />
                      <Text strong>{(val as { color: string; label: string }).label}</Text>
                      <Tag>{niveauItems.length} savoir(s) requis</Tag>
                    </Space>
                  ),
                  children: niveauItems.length > 0 ? (
                    <Table size="small" dataSource={niveauItems} rowKey="id" pagination={false}
                      columns={[
                        { title: "Code", dataIndex: "savoirCode", width: 100 },
                        { title: "Savoir", dataIndex: "savoirNom" },
                        { title: "Description", dataIndex: "description", render: (value: string) => <span style={{ display: "inline-block", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={value || ""}>{value || "-"}</span> },
                        { title: "", width: 50, render: (_: unknown, record: Record<string, unknown>) => <Popconfirm title="Supprimer ce savoir requis ?" onConfirm={() => handleRemoveNiveauSavoir(record.id as number)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm> },
                      ]}
                    />
                  ) : <Text type="secondary">Aucun savoir requis défini pour ce niveau</Text>,
                };
              })}
            />
            <Card size="small" title="Ajouter un savoir requis" style={{ marginTop: 16 }}>
              <Form form={addNiveauForm} layout="inline" onFinish={handleAddNiveauSavoir}>
                <Form.Item name="niveau" rules={[{ required: true, message: "Requis" }]}>
                  <Select placeholder="Niveau" style={{ width: 180 }}>
                    {NIVEAU_OPTIONS.map((opt: { value: string; label: string }) => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="savoirId" rules={[{ required: true, message: "Requis" }]}>
                  <Select placeholder="Savoir" showSearch optionFilterProp="children" style={{ width: 250 }}>
                    {allSavoirs.map((s: Record<string, unknown>) => <Option key={String(s.id)} value={s.id}>{String(s.code)} — {String(s.nom)}</Option>)}
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
    </div>
  );
}

import React from "react";
