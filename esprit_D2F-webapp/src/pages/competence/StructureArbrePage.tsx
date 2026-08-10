import React, { useCallback, useMemo } from 'react';
import {
  Tree,
  Card,
  Tabs,
  Tag,
  Space,
  Typography,
  Spin,
  Badge,
  Collapse,
  Empty,
  Modal,
  Form,
  Button,
  Popconfirm,
  Table,
  Input,
  Select,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  ApartmentOutlined,
  BookOutlined,
  BulbOutlined,
  ExperimentOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { NIVEAU_LABELS, NIVEAU_OPTIONS } from '@/utils/constants/competenceOptions';
import StructureSearchResultsView, {
  type SearchResults,
} from './components/StructureSearchResultsView';
import TreeFilters from './components/tree/TreeFilters';
import { useStructureArbre } from './hooks/useStructureArbre';
import '@/styles/pages/structure-arbre-page.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

function countSavoirsForDomaine(d: Record<string, unknown>): number {
  const comps = (d.competences as Record<string, unknown>[]) ?? [];
  let total = 0;
  for (const c of comps) {
    const scs = (c.sousCompetences as Record<string, unknown>[]) ?? [];
    const savDirect = (c.savoirsDirect as Record<string, unknown>[]) ?? [];
    total += savDirect.length;
    for (const sc of scs) {
      total += (sc.savoirs as Record<string, unknown>[])?.length ?? 0;
    }
  }
  return total;
}

function listSavoirsForDomaine(d: Record<string, unknown>): Record<string, unknown>[] {
  const comps = (d.competences as Record<string, unknown>[]) ?? [];
  const out: Record<string, unknown>[] = [];
  for (const c of comps) {
    const scs = (c.sousCompetences as Record<string, unknown>[]) ?? [];
    const savDirect = (c.savoirsDirect as Record<string, unknown>[]) ?? [];
    out.push(...savDirect);
    for (const sc of scs) {
      out.push(...((sc.savoirs as Record<string, unknown>[]) ?? []));
    }
  }
  return out;
}

export default function StructureArbrePage() {
  const {
    loading,
    structure,
    allSavoirs,
    searchResults,
    searchKeyword,
    setSearchKeyword,
    selectedDomaine,
    setSelectedDomaine,
    searchLoading,
    activeTab,
    setActiveTab,
    handleSearch,
    handleClearSearch,
    niveauModalVisible,
    setNiveauModalVisible,
    niveauTarget,
    niveauData,
    niveauLoading,
    addNiveauForm,
    handleAddNiveauSavoir,
    handleRemoveNiveauSavoir,
    loadStructure,
    filterUpId,
    filterDeptId,
    setFilterUpId,
    setFilterDeptId,
  } = useStructureArbre();

  const handleRefresh = useCallback(() => {
    void loadStructure();
  }, [loadStructure]);

  const domaines = (structure || []) as {
    id: number | string;
    nom: string;
    code: string;
    upId?: string;
    departementId?: string;
  }[];

  const stats = useMemo(() => {
    const totalDomaines = domaines.length;
    const totalCompetences = domaines.reduce(
      (acc: number, d: Record<string, unknown>) =>
        acc + ((d.competences as Record<string, unknown>[])?.length ?? 0),
      0,
    );
    const totalSousComp = domaines.reduce((acc: number, d: Record<string, unknown>) => {
      const comps = (d.competences as Record<string, unknown>[]) ?? [];
      return (
        acc +
        comps.reduce(
          (a: number, c: Record<string, unknown>) =>
            a + ((c.sousCompetences as Record<string, unknown>[])?.length ?? 0),
          0,
        )
      );
    }, 0);
    const totalSavoirs = domaines.reduce(
      (acc: number, d: Record<string, unknown>) => acc + countSavoirsForDomaine(d),
      0,
    );
    const allSavoirsList = domaines.flatMap(listSavoirsForDomaine);
    const totalTheoriques = allSavoirsList.filter(
      (s: Record<string, unknown>) => String(s.type) === 'THEORIQUE',
    ).length;
    const totalPratiques = allSavoirsList.filter(
      (s: Record<string, unknown>) => String(s.type) === 'PRATIQUE',
    ).length;

    return {
      totalDomaines,
      totalCompetences,
      totalSousComp,
      totalSavoirs,
      totalTheoriques,
      totalPratiques,
    };
  }, [domaines]);

  const buildTree = useCallback((nodes: Record<string, unknown>[], level = 0): any[] => {
    const getIcon = (node: Record<string, unknown>) => {
      const nom = String(node.nom || '');
      if (nom.includes('Domaine') || node.code) {
        return <FolderOpenOutlined style={{ color: '#3b82f6' }} />;
      }
      if (String(node.type) === 'THEORIQUE') {
        return <BookOutlined style={{ color: '#7c3aed' }} />;
      }
      if (String(node.type) === 'PRATIQUE') {
        return <ExperimentOutlined style={{ color: '#06b6d4' }} />;
      }
      return <ApartmentOutlined style={{ color: '#22c55e' }} />;
    };

    return (structure || []).map((node: any) => {
      const key = `node-${node.id}`;
      const childKeys = [
        'competences',
        'sousCompetences',
        'savoirs',
        'savoirsDirect',
        'enfants',
      ].filter((k) => Array.isArray((node as Record<string, unknown>)[k]));

      const children: any[] = [];
      childKeys.forEach((k) => {
        const childArr = (node as Record<string, unknown>)[k] as
          | Record<string, unknown>[]
          | undefined;
        if (childArr && childArr.length > 0) {
          children.push(...buildTree(childArr, level + 1));
        }
      });

      const hasChildren = children.length > 0;
      const nodeType = String(node.type || '');
      const isSavoir = nodeType === 'THEORIQUE' || nodeType === 'PRATIQUE';

      return {
        key,
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                flexShrink: 0,
              }}
            >
              {getIcon(node)}
            </span>
            <span
              style={{
                fontWeight: isSavoir ? 500 : 600,
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {String(node.nom || node.code || '?')}
            </span>
            {node.code && !isSavoir && node.code != null && (
              <Tag
                style={{
                  borderRadius: 6,
                  fontSize: 11,
                  marginInlineStart: 6,
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                }}
              >
                {String(node.code)}
              </Tag>
            )}
            {node.nombreSavoirs != null && (
              <Badge
                count={node.nombreSavoirs as number}
                style={{
                  backgroundColor: isSavoir ? '#7c3aed' : '#22c55e',
                  borderRadius: 10,
                  fontSize: 11,
                  height: 20,
                  minWidth: 20,
                }}
                overflowCount={99}
              />
            )}
          </div>
        ),
        isLeaf: !hasChildren,
        children: hasChildren ? children : undefined,
        _node: node,
        _level: level,
      };
    });
  }, []);

  const treeData = useMemo(() => {
    if (!structure || !Array.isArray(structure)) return [];
    return buildTree(structure as unknown as Record<string, unknown>[]);
  }, [structure, buildTree]);

  const expandedKeys = useMemo(() => {
    return treeData.slice(0, 4).map((n: any) => n.key);
  }, [treeData]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <Spin size="large" tip="Chargement de la structure..." />
      </div>
    );
  }

  return (
    <div className="modern-arbre-page">
      {/* ── Header ── */}
      <div className="ma-header">
        <div>
          <Title level={2} style={{ margin: 0, color: '#fff', fontWeight: 700 }}>
            <ApartmentOutlined style={{ marginRight: 12 }} />
            Structure des Compétences
          </Title>
          <Paragraph style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
            Arbre interactif des domaines, compétences, sous-compétences et savoirs
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          size="middle"
          style={{
            background: 'rgba(255,255,255,0.2)',
            borderColor: 'rgba(255,255,255,0.4)',
            fontWeight: 600,
            backdropFilter: 'blur(10px)',
          }}
        >
          Actualiser
        </Button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="ma-container">
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" className="ma-card">
              <Statistic
                title="Domaines"
                value={stats.totalDomaines}
                prefix={<AppstoreOutlined />}
                valueStyle={{ color: '#3b82f6' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" className="ma-card">
              <Statistic
                title="Compétences"
                value={stats.totalCompetences}
                prefix={<BulbOutlined />}
                valueStyle={{ color: '#22c55e' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" className="ma-card">
              <Statistic
                title="Sous-comp."
                value={stats.totalSousComp}
                prefix={<ExperimentOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" className="ma-card">
              <Statistic
                title="Savoirs"
                value={stats.totalSavoirs}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#7c3aed' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" className="ma-card">
              <Statistic
                title="Théoriques"
                value={stats.totalTheoriques}
                valueStyle={{ color: stats.totalTheoriques === 0 ? '#9ca3af' : '#7c3aed' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" className="ma-card">
              <Statistic
                title="Pratiques"
                value={stats.totalPratiques}
                valueStyle={{ color: stats.totalPratiques === 0 ? '#9ca3af' : '#06b6d4' }}
              />
            </Card>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="ma-tabs"
          items={[
            {
              key: 'tree',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ApartmentOutlined /> Vue Arborescente
                </span>
              ),
              children: (
                <Card className="ma-card ma-card--tree">
                  {treeData.length > 0 ? (
                    <Tree
                      treeData={treeData}
                      defaultExpandAll
                      showLine={{ showLeafIcon: false }}
                      defaultExpandedKeys={expandedKeys}
                      blockNode
                      style={{ fontSize: 13 }}
                      switcherIcon={
                        <svg
                          viewBox="0 0 24 24"
                          width={16}
                          height={16}
                          style={{ transition: 'transform 0.2s' }}
                        >
                          <path
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 9l6 6 6-6"
                          />
                        </svg>
                      }
                      height={600}
                    />
                  ) : (
                    <Empty description="Aucune donnée dans la structure" style={{ padding: 40 }} />
                  )}
                </Card>
              ),
            },
            {
              key: 'search',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SearchOutlined /> Recherche
                </span>
              ),
              children: (
                <Card className="ma-card">
                  <TreeFilters
                    domaines={domaines}
                    searchKeyword={searchKeyword}
                    selectedDomaine={selectedDomaine}
                    selectedUp={filterUpId}
                    selectedDept={filterDeptId}
                    searchLoading={searchLoading}
                    onSearchChange={setSearchKeyword}
                    onSearch={handleSearch}
                    onClearSearch={handleClearSearch}
                    onDomaineChange={setSelectedDomaine}
                    onUpChange={setFilterUpId}
                    onDeptChange={setFilterDeptId}
                  />
                  {searchLoading && (
                    <Spin
                      size="large"
                      style={{ display: 'block', margin: '40px auto' }}
                      tip="Recherche en cours..."
                    />
                  )}
                  {!searchLoading && searchResults && (
                    <div style={{ marginTop: 16 }}>
                      <StructureSearchResultsView
                        results={searchResults as unknown as SearchResults}
                      />
                    </div>
                  )}
                  {!searchLoading && !searchResults && (
                    <div style={{ marginTop: 16 }}>
                      <Empty
                        description="Saisissez un mot-clé (min. 2 caractères) pour lancer la recherche"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    </div>
                  )}
                </Card>
              ),
            },
          ]}
        />
      </div>

      {/* ── Niveau Definition Modal ── */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#3b82f6' }} />
            <span>Niveaux de compétence — {niveauTarget?.nom || ''}</span>
          </Space>
        }
        open={niveauModalVisible}
        onCancel={() => setNiveauModalVisible(false)}
        footer={null}
        width={800}
        centered
        classNames={{ body: 'ma-modal-body' }}
      >
        {niveauLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin tip="Chargement..." />
          </div>
        ) : (
          <div className="ma-modal-content">
            <Collapse
              defaultActiveKey={Object.keys(NIVEAU_LABELS)}
              ghost
              items={Object.entries(NIVEAU_LABELS).map(([key, val]) => {
                const niveauItems = niveauData.filter(
                  (nd) => nd.niveau === key,
                ) as unknown as Record<string, unknown>[];
                const meta = val as { color: string; label: string };
                return {
                  key,
                  label: (
                    <Space>
                      <Badge color={meta.color} />
                      <Text strong style={{ fontSize: 14 }}>
                        {meta.label}
                      </Text>
                      <Tag
                        style={{
                          borderRadius: 10,
                          fontSize: 11,
                          backgroundColor: '#f8fafc',
                          borderColor: '#e2e8f0',
                        }}
                      >
                        {niveauItems.length} savoir(s)
                      </Tag>
                    </Space>
                  ),
                  children:
                    niveauItems.length > 0 ? (
                      <Table
                        size="small"
                        dataSource={niveauItems}
                        rowKey="id"
                        pagination={false}
                        columns={[
                          {
                            title: 'Code',
                            dataIndex: 'savoirCode',
                            width: 100,
                            render: (v) => (
                              <Tag style={{ borderRadius: 6, fontSize: 11 }}>{v || '-'}</Tag>
                            ),
                          },
                          {
                            title: 'Savoir',
                            dataIndex: 'savoirNom',
                            render: (v) => <Text style={{ fontWeight: 500 }}>{v}</Text>,
                          },
                          {
                            title: 'Description',
                            dataIndex: 'description',
                            render: (value: string) => (
                              <span
                                style={{
                                  display: 'inline-block',
                                  maxWidth: 420,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={value || ''}
                              >
                                {value || '-'}
                              </span>
                            ),
                          },
                          {
                            title: '',
                            width: 50,
                            render: (_: unknown, record: Record<string, unknown>) => (
                              <Popconfirm
                                title="Supprimer ce savoir requis ?"
                                onConfirm={() => handleRemoveNiveauSavoir(record.id as number)}
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            ),
                          },
                        ]}
                      />
                    ) : (
                      <Text type="secondary" style={{ padding: '10px 0', display: 'block' }}>
                        Aucun savoir requis défini pour ce niveau
                      </Text>
                    ),
                };
              })}
            />
            <Card
              size="small"
              title={
                <Space>
                  <PlusOutlined style={{ color: '#3b82f6' }} />
                  <Text strong>Ajouter un savoir requis</Text>
                </Space>
              }
            >
              <Form form={addNiveauForm} layout="inline" onFinish={handleAddNiveauSavoir}>
                <Form.Item name="niveau" rules={[{ required: true, message: 'Requis' }]}>
                  <Select placeholder="Niveau" style={{ width: 180 }}>
                    {NIVEAU_OPTIONS.map((opt: { value: string; label: string }) => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="savoirId" rules={[{ required: true, message: 'Requis' }]}>
                  <Select
                    placeholder="Savoir"
                    showSearch
                    optionFilterProp="children"
                    style={{ width: 250 }}
                  >
                    {allSavoirs.map((s: Record<string, unknown>) => (
                      <Option key={String(s.id)} value={s.id}>
                        {String(s.code)} — {String(s.nom)}
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
