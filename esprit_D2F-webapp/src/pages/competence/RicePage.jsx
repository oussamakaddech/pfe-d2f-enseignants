// src/pages/competence/RicePage.jsx
// RICE – Référentiel Intelligent de Compétences Enseignants
// 4-step wizard: Upload → Analyser → Revoir & Corriger → Rapport

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Steps,
  Upload,
  Button,
  Checkbox,
  Table,
  Tag,
  Select,
  Input,
  Modal,
  Card,
  Row,
  Col,
  Statistic,
  Collapse,
  Spin,
  Alert,
  Space,
  Typography,
  Tooltip,
  Popconfirm,
  message,
  Badge,
  Divider,
  Progress,
} from "antd";
import {
  InboxOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  DragOutlined,
  BookOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import RiceService from "../../services/RiceService";
import EnseignantService from "../../services/EnseignantService";

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;
const { Dragger } = Upload;

// ── constants ─────────────────────────────────────────────────────────────────
const NIVEAU_OPTIONS = [
  { value: "N1_DEBUTANT",      label: "N1 – Débutant",      color: "default" },
  { value: "N2_ELEMENTAIRE",   label: "N2 – Élémentaire",   color: "blue" },
  { value: "N3_INTERMEDIAIRE", label: "N3 – Intermédiaire", color: "cyan" },
  { value: "N4_AVANCE",        label: "N4 – Avancé",        color: "green" },
  { value: "N5_EXPERT",        label: "N5 – Expert",        color: "gold" },
];

const TYPE_COLOR = { THEORIQUE: "purple", PRATIQUE: "orange" };
const TYPE_ICON  = { THEORIQUE: <BookOutlined />, PRATIQUE: <ExperimentOutlined /> };

function niveauLabel(v) {
  return NIVEAU_OPTIONS.find((n) => n.value === v)?.label ?? v;
}
function niveauColor(v) {
  return NIVEAU_OPTIONS.find((n) => n.value === v)?.color ?? "default";
}

// ─── deep clone helper ────────────────────────────────────────────────────────
const deepClone = (x) => JSON.parse(JSON.stringify(x));

// ═════════════════════════════════════════════════════════════════════════════
export default function RicePage() {
  const [msgApi, msgCtx] = message.useMessage();

  const [currentStep, setCurrentStep] = useState(0);

  // Step 0 – upload
  const [files, setFiles]                       = useState([]);
  const [allEnseignants, setAllEnseignants]     = useState([]);
  const [selectedEnsIds, setSelectedEnsIds]     = useState([]);
  const [loadingEns, setLoadingEns]             = useState(false);

  // Step 1 – analysis
  const [analyzing, setAnalyzing]               = useState(false);
  const [aiStats, setAiStats]                   = useState(null);

  // Step 2 – review (mutable clone of AI propositions)
  const [tree, setTree]                         = useState([]);  // DomaineProposition[]
  const [editingNom, setEditingNom]             = useState(null); // { path, value }
  const [mergeModal, setMergeModal]             = useState(false);
  const [mergeSrc, setMergeSrc]                 = useState(null);
  const [mergeDst, setMergeDst]                 = useState(null);

  // Step 3 – report
  const [importing, setImporting]               = useState(false);
  const [report, setReport]                     = useState(null);

  // Drag state
  const dragInfo = useRef(null);  // { domaineIdx, compIdx, scIdx, savoirIdx }
  const [dragOverEns, setDragOverEns]           = useState(null);

  // ── fetch enseignants once ───────────────────────────────────────────────
  useEffect(() => {
    setLoadingEns(true);
    EnseignantService.getAllEnseignants()
      .then((data) => setAllEnseignants(Array.isArray(data) ? data : []))
      .catch(() => msgApi.warning("Impossible de charger la liste des enseignants"))
      .finally(() => setLoadingEns(false));
  }, []);

  // ── helpers: update tree state immutably ─────────────────────────────────
  const updateTree = useCallback((updater) => {
    setTree((prev) => {
      const next = deepClone(prev);
      updater(next);
      return next;
    });
  }, []);

  const getSavoir = (t, di, ci, sci, si) =>
    t[di].competences[ci].sousCompetences[sci].savoirs[si];

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 0 – Upload
  // ────────────────────────────────────────────────────────────────────────────
  const handleUploadChange = useCallback(({ fileList }) => {
    setFiles(fileList.map((f) => f.originFileObj ?? f));
  }, []);

  const handleAnalyze = async () => {
    if (files.length === 0) {
      msgApi.warning("Veuillez charger au moins un fichier.");
      return;
    }
    const enseignants = allEnseignants
      .filter((e) => selectedEnsIds.includes(e.id ?? e.enseignantId))
      .map((e) => ({
        id: String(e.id ?? e.enseignantId),
        nom: e.nom ?? "",
        prenom: e.prenom ?? "",
        modules: e.modules ?? [],
      }));

    setAnalyzing(true);
    setCurrentStep(1);
    try {
      const result = await RiceService.analyze(
        files.filter(Boolean),
        enseignants,
      );
      setTree(deepClone(result.propositions));
      setAiStats(result.stats);
      setCurrentStep(2);
    } catch (err) {
      const msg = err.response?.data?.detail ?? err.message ?? "Erreur d'analyse IA";
      msgApi.error(msg);
      setCurrentStep(0);
    } finally {
      setAnalyzing(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 2 – Review & Edit
  // ────────────────────────────────────────────────────────────────────────────

  // ── Rename ──
  const startRename = (path, currentVal) =>
    setEditingNom({ path, value: currentVal });

  const commitRename = () => {
    if (!editingNom) return;
    const { path, value } = editingNom;
    updateTree((t) => {
      const [di, ci, sci, si] = path;
      if (si !== undefined)       getSavoir(t, di, ci, sci, si).nom = value;
      else if (sci !== undefined) t[di].competences[ci].sousCompetences[sci].nom = value;
      else if (ci !== undefined)  t[di].competences[ci].nom = value;
      else                        t[di].nom = value;
    });
    setEditingNom(null);
  };

  // ── Delete ──
  const deleteSavoir = (di, ci, sci, si) =>
    updateTree((t) => t[di].competences[ci].sousCompetences[sci].savoirs.splice(si, 1));

  const deleteSC = (di, ci, sci) =>
    updateTree((t) => t[di].competences[ci].sousCompetences.splice(sci, 1));

  const deleteComp = (di, ci) =>
    updateTree((t) => t[di].competences.splice(ci, 1));

  const deleteDomaine = (di) =>
    updateTree((t) => t.splice(di, 1));

  // ── Toggle type / niveau ──
  const toggleType = (di, ci, sci, si) =>
    updateTree((t) => {
      const s = getSavoir(t, di, ci, sci, si);
      s.type = s.type === "THEORIQUE" ? "PRATIQUE" : "THEORIQUE";
    });

  const setNiveau = (di, ci, sci, si, niveau) =>
    updateTree((t) => {
      getSavoir(t, di, ci, sci, si).niveau = niveau;
    });

  // ── Enseignant assignment toggle ──
  const toggleEnsAssign = (di, ci, sci, si, ensId) =>
    updateTree((t) => {
      const s = getSavoir(t, di, ci, sci, si);
      const ids = s.enseignantsSuggeres ?? [];
      const idx = ids.indexOf(ensId);
      if (idx === -1) ids.push(ensId);
      else ids.splice(idx, 1);
      s.enseignantsSuggeres = ids;
    });

  // ── Multi-select enseignant assignment (for a savoir) ──
  const setEnseignants = (di, ci, sci, si, ids) =>
    updateTree((t) => {
      getSavoir(t, di, ci, sci, si).enseignantsSuggeres = ids;
    });

  // ── Drag-and-drop: drag savoir → drop on enseignant card ──
  const onSavoirDragStart = (di, ci, sci, si) => {
    dragInfo.current = { di, ci, sci, si };
  };

  const onEnsDragOver = (e, ensId) => {
    e.preventDefault();
    setDragOverEns(ensId);
  };

  const onEnsDrop = (e, ensId) => {
    e.preventDefault();
    setDragOverEns(null);
    if (!dragInfo.current) return;
    const { di, ci, sci, si } = dragInfo.current;
    toggleEnsAssign(di, ci, sci, si, ensId);
    dragInfo.current = null;
    const savoirNom = tree[di]?.competences[ci]?.sousCompetences[sci]?.savoirs[si]?.nom;
    msgApi.success(`"${savoirNom}" assigné/retiré pour cet enseignant`);
  };

  // ── Merge two savoirs ──
  const openMerge = (di, ci, sci, si) =>
    setMergeSrc({ di, ci, sci, si });

  const confirmMerge = () => {
    if (!mergeSrc || !mergeDst) return;
    const { di, ci, sci, si } = mergeSrc;
    const { di: di2, ci: ci2, sci: sci2, si: si2 } = mergeDst;
    updateTree((t) => {
      const src = getSavoir(t, di, ci, sci, si);
      const dst = getSavoir(t, di2, ci2, sci2, si2);
      // Merge enseignant lists
      const merged = Array.from(new Set([
        ...(src.enseignantsSuggeres ?? []),
        ...(dst.enseignantsSuggeres ?? []),
      ]));
      dst.enseignantsSuggeres = merged;
      dst.nom = `${dst.nom} / ${src.nom}`;
      // Remove src
      t[di].competences[ci].sousCompetences[sci].savoirs.splice(si, 1);
    });
    setMergeModal(false);
    setMergeSrc(null);
    setMergeDst(null);
    msgApi.success("Savoirs fusionnés");
  };

  // ── Get enseignant display info ──
  const ensById = Object.fromEntries(
    allEnseignants.map((e) => [
      String(e.id ?? e.enseignantId),
      `${e.prenom ?? ""} ${e.nom ?? ""}`.trim(),
    ]),
  );

  const selectedEnseignantObjects = allEnseignants.filter((e) =>
    selectedEnsIds.includes(String(e.id ?? e.enseignantId)),
  );

  // ── Collect all savoirs from tree (flat) for merge modal ──
  const allSavoirsFlat = [];
  tree.forEach((d, di) =>
    d.competences?.forEach((c, ci) =>
      c.sousCompetences?.forEach((sc, sci) =>
        sc.savoirs?.forEach((s, si) =>
          allSavoirsFlat.push({ ...s, di, ci, sci, si, label: `${d.nom} > ${c.nom} > ${sc.nom} > ${s.nom}` }),
        ),
      ),
    ),
  );

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 3 – Import to DB
  // ────────────────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true);
    try {
      // Build payload matching RiceImportRequest Java DTO
      const payload = {
        domaines: tree.map((d) => ({
          code: d.code,
          nom: d.nom,
          description: d.description ?? null,
          competences: (d.competences ?? []).map((c) => ({
            code: c.code,
            nom: c.nom,
            description: c.description ?? null,
            ordre: c.ordre ?? 1,
            sousCompetences: (c.sousCompetences ?? []).map((sc) => ({
              code: sc.code,
              nom: sc.nom,
              description: sc.description ?? null,
              savoirs: (sc.savoirs ?? []).map((s) => ({
                code: s.code,
                nom: s.nom,
                description: s.description ?? null,
                type: s.type,
                niveau: s.niveau,
                enseignantIds: s.enseignantsSuggeres ?? [],
              })),
            })),
          })),
        })),
      };
      const result = await RiceService.importToDb(payload);
      setReport(result);
      setCurrentStep(3);
    } catch (err) {
      msgApi.error(err.response?.data?.message ?? "Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Sub-components
  // ────────────────────────────────────────────────────────────────────────────

  const SavoirCard = ({ savoir, di, ci, sci, si }) => {
    const isEditing =
      editingNom?.path[0] === di &&
      editingNom?.path[1] === ci &&
      editingNom?.path[2] === sci &&
      editingNom?.path[3] === si;

    return (
      <Card
        size="small"
        draggable
        onDragStart={() => onSavoirDragStart(di, ci, sci, si)}
        style={{
          marginBottom: 8,
          cursor: "grab",
          border: "1px solid #d9d9d9",
          borderLeft: `4px solid ${savoir.type === "THEORIQUE" ? "#722ed1" : "#fa8c16"}`,
        }}
        bodyStyle={{ padding: "8px 12px" }}
      >
        {/* Header row */}
        <Row justify="space-between" align="middle" gutter={[8, 4]} wrap={false}>
          <Col flex="auto">
            {isEditing ? (
              <Input
                size="small"
                value={editingNom.value}
                onChange={(e) => setEditingNom((prev) => ({ ...prev, value: e.target.value }))}
                onPressEnter={commitRename}
                onBlur={commitRename}
                autoFocus
                style={{ maxWidth: 280 }}
              />
            ) : (
              <Space wrap>
                <DragOutlined style={{ color: "#bbb", fontSize: 12 }} />
                <Text strong style={{ fontSize: 13 }}>{savoir.nom}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>[{savoir.code}]</Text>
              </Space>
            )}
          </Col>
          <Col>
            <Space size={4}>
              <Tooltip title="Renommer">
                <Button size="small" icon={<EditOutlined />}
                  onClick={() => startRename([di, ci, sci, si], savoir.nom)} />
              </Tooltip>
              <Tooltip title="Fusionner avec un autre savoir">
                <Button size="small" onClick={() => { setMergeSrc({ di, ci, sci, si }); setMergeModal(true); }}>⊕</Button>
              </Tooltip>
              <Popconfirm title="Supprimer ce savoir ?" okText="Oui" cancelText="Non"
                onConfirm={() => deleteSavoir(di, ci, sci, si)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          </Col>
        </Row>

        {/* Type / Niveau / Enseignants */}
        <Row gutter={[8, 4]} style={{ marginTop: 6 }} align="middle">
          <Col>
            <Tag
              icon={TYPE_ICON[savoir.type]}
              color={TYPE_COLOR[savoir.type]}
              style={{ cursor: "pointer" }}
              onClick={() => toggleType(di, ci, sci, si)}
            >
              {savoir.type}
            </Tag>
          </Col>
          <Col>
            <Select
              size="small"
              value={savoir.niveau}
              onChange={(v) => setNiveau(di, ci, sci, si, v)}
              style={{ width: 170 }}
            >
              {NIVEAU_OPTIONS.map((n) => (
                <Option key={n.value} value={n.value}>
                  <Tag color={n.color} style={{ margin: 0 }}>{n.label}</Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col flex="auto">
            <Select
              mode="multiple"
              size="small"
              placeholder="Enseignants assignés"
              value={savoir.enseignantsSuggeres ?? []}
              onChange={(ids) => setEnseignants(di, ci, sci, si, ids)}
              style={{ width: "100%", minWidth: 200 }}
              maxTagCount="responsive"
              optionFilterProp="children"
              showSearch
            >
              {allEnseignants.map((e) => {
                const id = String(e.id ?? e.enseignantId);
                return (
                  <Option key={id} value={id}>
                    {e.prenom} {e.nom}
                  </Option>
                );
              })}
            </Select>
          </Col>
        </Row>
      </Card>
    );
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  const steps = [
    { title: "Upload", icon: <InboxOutlined /> },
    { title: "Analyse IA", icon: <RobotOutlined /> },
    { title: "Révision", icon: <EditOutlined /> },
    { title: "Rapport", icon: <BarChartOutlined /> },
  ];

  return (
    <>
      {msgCtx}
      <div style={{ padding: 20 }}>
        <Title level={4}>
          <RobotOutlined /> RICE – Référentiel Intelligent de Compétences Enseignants
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          Générez automatiquement la structure de compétences à partir des fiches UE et modules,
          validez par glisser-déposer, puis enregistrez en base de données.
        </Paragraph>

        <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

        {/* ════════════════════════════════════════════════════════════════════
            STEP 0 – Upload
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 0 && (
          <Row gutter={[24, 24]}>
            {/* File upload */}
            <Col xs={24} lg={12}>
              <Card title={<><InboxOutlined /> Fiches UE / Modules</>} bordered={false}>
                <Dragger
                  multiple
                  accept=".pdf,.docx,.doc,.txt"
                  beforeUpload={() => false}
                  onChange={handleUploadChange}
                  fileList={files.map((f, i) => ({
                    uid: i,
                    name: f.name ?? f,
                    status: "done",
                    originFileObj: f,
                  }))}
                >
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p className="ant-upload-text">Glissez vos fichiers ici ou cliquez</p>
                  <p className="ant-upload-hint">PDF, DOCX, TXT acceptés (plusieurs fichiers)</p>
                </Dragger>
              </Card>
            </Col>

            {/* Enseignant selection */}
            <Col xs={24} lg={12}>
              <Card
                title={<><UserOutlined /> Enseignants concernés</>}
                bordered={false}
                extra={
                  <Space>
                    <Button size="small"
                      onClick={() => setSelectedEnsIds(allEnseignants.map((e) => String(e.id ?? e.enseignantId)))}>
                      Tous
                    </Button>
                    <Button size="small" onClick={() => setSelectedEnsIds([])}>Aucun</Button>
                  </Space>
                }
              >
                {loadingEns ? (
                  <Spin />
                ) : (
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    <Checkbox.Group
                      value={selectedEnsIds}
                      onChange={setSelectedEnsIds}
                      style={{ width: "100%" }}
                    >
                      <Row gutter={[0, 4]}>
                        {allEnseignants.map((e) => {
                          const id = String(e.id ?? e.enseignantId);
                          return (
                            <Col span={24} key={id}>
                              <Checkbox value={id}>
                                {e.prenom} {e.nom}
                                {e.up && (
                                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                                    ({e.up})
                                  </Text>
                                )}
                              </Checkbox>
                            </Col>
                          );
                        })}
                      </Row>
                    </Checkbox.Group>
                  </div>
                )}
                <Divider style={{ margin: "12px 0" }} />
                <Text type="secondary">
                  {selectedEnsIds.length} enseignant(s) sélectionné(s)
                </Text>
              </Card>
            </Col>

            <Col span={24} style={{ textAlign: "center" }}>
              <Button
                type="primary"
                size="large"
                icon={<RobotOutlined />}
                onClick={handleAnalyze}
                disabled={files.length === 0}
              >
                Analyser par IA
              </Button>
            </Col>
          </Row>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 1 – Analyzing (loading)
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div style={{ textAlign: "center", padding: 80 }}>
            <Spin size="large" />
            <br /><br />
            <Title level={4} type="secondary">Analyse en cours…</Title>
            <Paragraph type="secondary">
              L&apos;IA extrait les compétences, savoirs et suggestions d&apos;affectation
              depuis vos fichiers.
            </Paragraph>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 2 – Review
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <>
            {/* AI stats banner */}
            {aiStats && (
              <Alert
                type="success"
                style={{ marginBottom: 20 }}
                message={
                  <Space split={<Divider type="vertical" />} wrap>
                    <Text><strong>{aiStats.totalDomaines}</strong> domaines</Text>
                    <Text><strong>{aiStats.totalCompetences}</strong> compétences</Text>
                    <Text><strong>{aiStats.totalSousCompetences}</strong> sous-compétences</Text>
                    <Text><strong>{aiStats.totalSavoirs}</strong> savoirs</Text>
                    <Text><strong>{aiStats.enseignantsCoverts}</strong> enseignants couverts
                      ({aiStats.tauxCouverture}%)</Text>
                  </Space>
                }
                icon={<CheckCircleOutlined />}
                showIcon
              />
            )}

            <Alert
              type="info"
              style={{ marginBottom: 20 }}
              message="Conseil : Glissez un savoir (carte) sur la zone d'un enseignant pour l'assigner / désassigner rapidement."
              showIcon
            />

            <Row gutter={[16, 16]}>
              {/* ── Left: Tree ── */}
              <Col xs={24} xl={14}>
                <Card
                  title={<><ApartmentOutlined /> Structure de compétences proposée</>}
                  size="small"
                  extra={
                    <Text type="secondary">
                      Cliquez <EditOutlined /> pour renommer · <DeleteOutlined /> supprimer · ⊕
                      fusionner · glissez vers un enseignant
                    </Text>
                  }
                  styles={{ body: { maxHeight: "70vh", overflowY: "auto", padding: "8px" } }}
                >
                  {tree.length === 0 && (
                    <Alert type="warning" message="Aucun élément généré. Retournez à l'étape upload." />
                  )}
                  {tree.map((domaine, di) => (
                    <Collapse key={domaine.tmpId} defaultActiveKey={[domaine.tmpId]}
                      style={{ marginBottom: 8 }}>
                      <Panel
                        key={domaine.tmpId}
                        header={
                          <Space>
                            <Tag color="blue">{domaine.code}</Tag>
                            {editingNom?.path[0] === di && editingNom?.path.length === 1 ? (
                              <Input size="small" value={editingNom.value}
                                onChange={(e) => setEditingNom((p) => ({ ...p, value: e.target.value }))}
                                onPressEnter={commitRename} onBlur={commitRename}
                                style={{ width: 200 }} autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <Text strong>{domaine.nom}</Text>
                            )}
                          </Space>
                        }
                        extra={
                          <Space onClick={(e) => e.stopPropagation()}>
                            <Tooltip title="Renommer le domaine">
                              <Button size="small" icon={<EditOutlined />}
                                onClick={() => startRename([di], domaine.nom)} />
                            </Tooltip>
                            <Popconfirm title="Supprimer ce domaine et tout son contenu ?"
                              okText="Oui" cancelText="Non"
                              onConfirm={() => deleteDomaine(di)}>
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        }
                      >
                        {(domaine.competences ?? []).map((comp, ci) => (
                          <Collapse key={comp.tmpId} style={{ marginBottom: 6 }}>
                            <Panel
                              key={comp.tmpId}
                              header={
                                <Space>
                                  <Tag color="geekblue">{comp.code}</Tag>
                                  {editingNom?.path[0] === di && editingNom?.path[1] === ci &&
                                   editingNom?.path.length === 2 ? (
                                    <Input size="small" value={editingNom.value}
                                      onChange={(e) => setEditingNom((p) => ({ ...p, value: e.target.value }))}
                                      onPressEnter={commitRename} onBlur={commitRename}
                                      style={{ width: 200 }} autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <Text>{comp.nom}</Text>
                                  )}
                                </Space>
                              }
                              extra={
                                <Space onClick={(e) => e.stopPropagation()}>
                                  <Button size="small" icon={<EditOutlined />}
                                    onClick={() => startRename([di, ci], comp.nom)} />
                                  <Popconfirm title="Supprimer cette compétence ?"
                                    okText="Oui" cancelText="Non"
                                    onConfirm={() => deleteComp(di, ci)}>
                                    <Button size="small" danger icon={<DeleteOutlined />} />
                                  </Popconfirm>
                                </Space>
                              }
                            >
                              {(comp.sousCompetences ?? []).map((sc, sci) => (
                                <div key={sc.tmpId} style={{ marginBottom: 12 }}>
                                  <Space style={{ marginBottom: 6 }}>
                                    <Tag color="cyan">{sc.code}</Tag>
                                    {editingNom?.path[0] === di && editingNom?.path[1] === ci &&
                                     editingNom?.path[2] === sci && editingNom?.path.length === 3 ? (
                                      <Input size="small" value={editingNom.value}
                                        onChange={(e) => setEditingNom((p) => ({ ...p, value: e.target.value }))}
                                        onPressEnter={commitRename} onBlur={commitRename}
                                        style={{ width: 180 }} autoFocus />
                                    ) : (
                                      <Text italic>{sc.nom}</Text>
                                    )}
                                    <Button size="small" icon={<EditOutlined />}
                                      onClick={() => startRename([di, ci, sci], sc.nom)} />
                                    <Popconfirm title="Supprimer cette sous-compétence ?"
                                      okText="Oui" cancelText="Non"
                                      onConfirm={() => deleteSC(di, ci, sci)}>
                                      <Button size="small" danger icon={<DeleteOutlined />} />
                                    </Popconfirm>
                                  </Space>

                                  {(sc.savoirs ?? []).map((savoir, si) => (
                                    <SavoirCard
                                      key={savoir.tmpId}
                                      savoir={savoir}
                                      di={di} ci={ci} sci={sci} si={si}
                                    />
                                  ))}
                                </div>
                              ))}
                            </Panel>
                          </Collapse>
                        ))}
                      </Panel>
                    </Collapse>
                  ))}
                </Card>
              </Col>

              {/* ── Right: Enseignants drop zone ── */}
              <Col xs={24} xl={10}>
                <Card
                  title={<><UserOutlined /> Affectations par enseignant</>}
                  size="small"
                  extra={<Text type="secondary">Déposez un savoir ici pour l&apos;assigner</Text>}
                  styles={{ body: { maxHeight: "70vh", overflowY: "auto", padding: "8px" } }}
                >
                  {selectedEnseignantObjects.length === 0 && (
                    <Alert type="info"
                      message="Aucun enseignant sélectionné. Revenez à l'étape Upload pour en choisir." />
                  )}
                  {selectedEnseignantObjects.map((ens) => {
                    const eid = String(ens.id ?? ens.enseignantId);
                    const isOver = dragOverEns === eid;
                    const assignedSavoirs = allSavoirsFlat.filter(
                      (s) => (s.enseignantsSuggeres ?? []).includes(eid),
                    );
                    return (
                      <Card
                        key={eid}
                        size="small"
                        style={{
                          marginBottom: 8,
                          border: isOver
                            ? "2px dashed #1677ff"
                            : "1px solid #f0f0f0",
                          background: isOver ? "#e6f4ff" : "#fafafa",
                          transition: "all 0.15s",
                        }}
                        onDragOver={(e) => onEnsDragOver(e, eid)}
                        onDragLeave={() => setDragOverEns(null)}
                        onDrop={(e) => onEnsDrop(e, eid)}
                      >
                        <Space style={{ marginBottom: 4 }}>
                          <UserOutlined />
                          <Text strong>{ens.prenom} {ens.nom}</Text>
                          <Badge count={assignedSavoirs.length} showZero
                            style={{ backgroundColor: assignedSavoirs.length > 0 ? "#52c41a" : "#d9d9d9" }} />
                        </Space>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, minHeight: 28 }}>
                          {assignedSavoirs.map((s) => (
                            <Tag
                              key={s.tmpId}
                              closable
                              color={TYPE_COLOR[s.type]}
                              style={{ fontSize: 11 }}
                              onClose={() => toggleEnsAssign(s.di, s.ci, s.sci, s.si, eid)}
                            >
                              {s.nom.length > 30 ? s.nom.slice(0, 28) + "…" : s.nom}
                            </Tag>
                          ))}
                          {assignedSavoirs.length === 0 && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Déposez un savoir ici…
                            </Text>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </Card>
              </Col>
            </Row>

            {/* Bottom actions */}
            <Divider />
            <Row justify="space-between" align="middle">
              <Col>
                <Button onClick={() => setCurrentStep(0)} icon={<InboxOutlined />}>
                  ← Recommencer
                </Button>
              </Col>
              <Col>
                <Space>
                  <Text type="secondary">
                    {allSavoirsFlat.length} savoirs · {
                      new Set(allSavoirsFlat.flatMap((s) => s.enseignantsSuggeres ?? [])).size
                    } enseignants assignés
                  </Text>
                  <Button
                    type="primary"
                    size="large"
                    icon={<CheckCircleOutlined />}
                    loading={importing}
                    onClick={handleImport}
                  >
                    Générer en base de données
                  </Button>
                </Space>
              </Col>
            </Row>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 3 – Report
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && report && (
          <>
            <Alert
              type="success"
              message="Import RICE réussi !"
              description={report.message}
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              {[
                { title: "Domaines créés",         value: report.domainesCreated,        color: "#1677ff" },
                { title: "Compétences créées",      value: report.competencesCreated,     color: "#52c41a" },
                { title: "Sous-comp. créées",        value: report.sousCompetencesCreated, color: "#13c2c2" },
                { title: "Savoirs créés",            value: report.savoirsCreated,         color: "#722ed1" },
                { title: "Affectations créées",     value: report.affectationsCreated,    color: "#fa8c16" },
                { title: "Enseignants couverts",    value: report.enseignantsCovered,     color: "#eb2f96" },
              ].map(({ title, value, color }) => (
                <Col xs={12} sm={8} lg={4} key={title}>
                  <Card bordered={false} style={{ textAlign: "center" }}>
                    <Statistic title={title} value={value} valueStyle={{ color }} />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Coverage per domaine */}
            {report.tauxCouvertureParDomaine &&
              Object.keys(report.tauxCouvertureParDomaine).length > 0 && (
              <Card title="Taux de couverture par domaine" size="small" style={{ marginBottom: 24 }}>
                {Object.entries(report.tauxCouvertureParDomaine).map(([nom, taux]) => (
                  <Row key={nom} align="middle" gutter={16} style={{ marginBottom: 8 }}>
                    <Col xs={8} sm={6}><Text>{nom}</Text></Col>
                    <Col flex="auto">
                      <Progress percent={taux} size="small"
                        strokeColor={taux >= 70 ? "#52c41a" : taux >= 40 ? "#faad14" : "#ff4d4f"} />
                    </Col>
                  </Row>
                ))}
              </Card>
            )}

            <Row justify="center" gutter={16}>
              <Col>
                <Button
                  type="primary"
                  size="large"
                  icon={<ApartmentOutlined />}
                  onClick={() => (window.location.href = "/home/competences")}
                >
                  Consulter le référentiel
                </Button>
              </Col>
              <Col>
                <Button
                  size="large"
                  icon={<RobotOutlined />}
                  onClick={() => {
                    setCurrentStep(0);
                    setFiles([]);
                    setTree([]);
                    setReport(null);
                    setAiStats(null);
                  }}
                >
                  Nouvelle analyse
                </Button>
              </Col>
            </Row>
          </>
        )}

        {/* ── Merge Modal ────────────────────────────────────────────────────── */}
        <Modal
          title="Fusionner deux savoirs"
          open={mergeModal}
          onOk={confirmMerge}
          onCancel={() => { setMergeModal(false); setMergeSrc(null); setMergeDst(null); }}
          okText="Fusionner"
          cancelText="Annuler"
          okButtonProps={{ disabled: !mergeDst }}
        >
          <Paragraph>
            Le savoir source sera supprimé et ses enseignants seront ajoutés au savoir cible.
          </Paragraph>
          {mergeSrc && (
            <div style={{ marginBottom: 12 }}>
              <Text strong>Source : </Text>
              <Tag color="red">
                {allSavoirsFlat.find(
                  (s) => s.di === mergeSrc.di && s.ci === mergeSrc.ci &&
                         s.sci === mergeSrc.sci && s.si === mergeSrc.si,
                )?.nom ?? "?"}
              </Tag>
            </div>
          )}
          <div>
            <Text strong>Cible :</Text>
            <Select
              showSearch
              optionFilterProp="children"
              placeholder="Sélectionner le savoir cible"
              style={{ width: "100%", marginTop: 8 }}
              onChange={(key) => {
                const [di, ci, sci, si] = key.split("-").map(Number);
                setMergeDst({ di, ci, sci, si });
              }}
            >
              {allSavoirsFlat
                .filter(
                  (s) =>
                    !(mergeSrc &&
                      s.di === mergeSrc.di && s.ci === mergeSrc.ci &&
                      s.sci === mergeSrc.sci && s.si === mergeSrc.si),
                )
                .map((s) => (
                  <Option key={`${s.di}-${s.ci}-${s.sci}-${s.si}`}
                    value={`${s.di}-${s.ci}-${s.sci}-${s.si}`}>
                    {s.label}
                  </Option>
                ))}
            </Select>
          </div>
        </Modal>
      </div>
    </>
  );
}
