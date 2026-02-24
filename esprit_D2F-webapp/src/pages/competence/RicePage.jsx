// src/pages/competence/RicePage.jsx
// RICE – Référentiel Intelligent de Compétences Enseignants
// 4-step wizard: Upload → Analyser → Revoir & Corriger → Rapport
//
// Optimisations :
//  · SavoirCard extrait + React.memo (évite les re-renders)
//  · useMemo pour allSavoirsFlat, effectiveEnseignants, filteredEffectiveEns
//  · structuredClone au lieu de JSON.parse(JSON.stringify)
//  · recherche live dans la liste enseignants
//  · animation de chargement étape par étape
//  · indicateurs temps-réel pendant la révision
//  · barre d'action sticky en bas
//  · meilleur feedback visuel (empty states, drag-over, transitions)

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useId,
  useMemo,
  memo,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Steps,
  Upload,
  Button,
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
  Empty,
  Flex,
  Table,
} from "antd";
import PropTypes from "prop-types";
import {
  InboxOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  UserAddOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  DragOutlined,
  BookOutlined,
  ExperimentOutlined,
  SearchOutlined,
  FileTextOutlined,
  MergeCellsOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  SaveOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import RiceService from "../../services/RiceService";
import EnseignantService from "../../services/EnseignantService";
import "./RicePage.css";

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;
const { Dragger } = Upload;

// ── constants ─────────────────────────────────────────────────────────────────
const NIVEAU_OPTIONS = [
  { value: "N1_DEBUTANT",      label: "N1 – Débutant",      color: "default",  emoji: "🟤" },
  { value: "N2_ELEMENTAIRE",   label: "N2 – Élémentaire",   color: "blue",     emoji: "🔵" },
  { value: "N3_INTERMEDIAIRE", label: "N3 – Intermédiaire", color: "cyan",     emoji: "🟢" },
  { value: "N4_AVANCE",        label: "N4 – Avancé",        color: "green",    emoji: "🟡" },
  { value: "N5_EXPERT",        label: "N5 – Expert",        color: "gold",     emoji: "🟠" },
];

const TYPE_COLOR = { THEORIQUE: "purple", PRATIQUE: "volcano" };
const TYPE_ICON  = { THEORIQUE: <BookOutlined />, PRATIQUE: <ExperimentOutlined /> };
const TYPE_LABEL = { THEORIQUE: "Théorique", PRATIQUE: "Pratique" };

// ── helpers ───────────────────────────────────────────────────────────────────
const cloneDeep = (x) =>
  typeof structuredClone === "function"
    ? structuredClone(x)
    : JSON.parse(JSON.stringify(x));

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SavoirCard – extracted & memoized
// ═══════════════════════════════════════════════════════════════════════════════

const SavoirCard = memo(function SavoirCard({
  savoir,
  di,
  ci,
  sci,
  si,
  editingNom,
  setEditingNom,
  commitRename,
  startRename,
  toggleType,
  setNiveau,
  setEnseignants,
  deleteSavoir,
  openMerge,
  setMergeModal,
  onSavoirDragStart,
  onSavoirDragEnd,
  isBeingDragged,
  allEnseignants,
}) {
  const isEditing =
    editingNom?.path[0] === di &&
    editingNom?.path[1] === ci &&
    editingNom?.path[2] === sci &&
    editingNom?.path[3] === si;

  const niveauOpt = NIVEAU_OPTIONS.find((n) => n.value === savoir.niveau);

  return (
    <Card
      size="small"
      draggable
      onDragStart={(e) => onSavoirDragStart(e, di, ci, sci, si)}
      onDragEnd={onSavoirDragEnd}
      className={`rice-savoir-card${isBeingDragged ? " rice-savoir-dragging" : ""}`}
      style={{
        borderLeft: `4px solid ${savoir.type === "THEORIQUE" ? "#722ed1" : "#fa541c"}`,
        opacity: isBeingDragged ? 0.5 : 1,
      }}
      styles={{ body: { padding: "8px 12px" } }}
    >
      {/* Header row */}
      <div className="rice-savoir-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <Input
              size="small"
              value={editingNom.value}
              onChange={(e) =>
                setEditingNom((prev) => ({ ...prev, value: e.target.value }))
              }
              onPressEnter={commitRename}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === "Escape" && setEditingNom(null)}
              autoFocus
              style={{ maxWidth: 320 }}
              placeholder="Nom du savoir"
            />
          ) : (
            <Space size={4}>
              <span className="rice-drag-handle" title="Glisser pour assigner">⠇</span>
              <Text strong className="rice-savoir-name">
                {savoir.nom}
              </Text>
              <Text className="rice-savoir-code">[{savoir.code}]</Text>
            </Space>
          )}
        </div>
        <Space size={2}>
          <Tooltip title="Renommer (Échap pour annuler)">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => startRename([di, ci, sci, si], savoir.nom)}
            />
          </Tooltip>
          <Tooltip title="Fusionner avec un autre savoir">
            <Button
              size="small"
              type="text"
              icon={<MergeCellsOutlined />}
              onClick={() => {
                openMerge(di, ci, sci, si);
                setMergeModal(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Supprimer ce savoir ?"
            description="Cette action est irréversible."
            okText="Supprimer"
            cancelText="Annuler"
            onConfirm={() => deleteSavoir(di, ci, sci, si)}
          >
            <Tooltip title="Supprimer">
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      </div>

      {/* Type / Niveau / Enseignants */}
      <div className="rice-savoir-controls">
        <Tooltip title="Cliquer pour basculer le type">
          <Tag
            icon={TYPE_ICON[savoir.type]}
            color={TYPE_COLOR[savoir.type]}
            className="rice-type-badge"
            onClick={() => toggleType(di, ci, sci, si)}
          >
            {TYPE_LABEL[savoir.type]}
          </Tag>
        </Tooltip>
        <Select
          size="small"
          value={savoir.niveau}
          onChange={(v) => setNiveau(di, ci, sci, si, v)}
          style={{ width: 180 }}
          popupMatchSelectWidth={false}
        >
          {NIVEAU_OPTIONS.map((n) => (
            <Option key={n.value} value={n.value}>
              <span>{n.emoji}</span>{" "}
              <Tag color={n.color} style={{ margin: 0, fontSize: 11 }}>
                {n.label}
              </Tag>
            </Option>
          ))}
        </Select>
        <Select
          mode="multiple"
          size="small"
          placeholder="+ Assigner des enseignants"
          value={savoir.enseignantsSuggeres ?? []}
          onChange={(ids) => setEnseignants(di, ci, sci, si, ids)}
          style={{ flex: 1, minWidth: 200 }}
          maxTagCount="responsive"
          optionFilterProp="label"
          showSearch
          allowClear
          options={allEnseignants.map((e) => {
            const id = String(e.id ?? e.enseignantId);
            const label = e.prenom ? `${e.prenom} ${e.nom}` : e.nom;
            return {
              key: id,
              value: id,
              label,
            };
          })}
        />
      </div>

      {/* Current niveau display */}
      {niveauOpt && (
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Niveau : {niveauOpt.emoji} {niveauOpt.label}
            {savoir.enseignantsSuggeres?.length > 0 && (
              <> · {savoir.enseignantsSuggeres.length} enseignant(s)</>
            )}
          </Text>
        </div>
      )}
    </Card>
  );
});

SavoirCard.propTypes = {
  savoir: PropTypes.shape({
    nom: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    niveau: PropTypes.string,
    enseignantsSuggeres: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  di: PropTypes.number.isRequired,
  ci: PropTypes.number.isRequired,
  sci: PropTypes.number.isRequired,
  si: PropTypes.number.isRequired,
  editingNom: PropTypes.object,
  setEditingNom: PropTypes.func.isRequired,
  commitRename: PropTypes.func.isRequired,
  startRename: PropTypes.func.isRequired,
  toggleType: PropTypes.func.isRequired,
  setNiveau: PropTypes.func.isRequired,
  setEnseignants: PropTypes.func.isRequired,
  deleteSavoir: PropTypes.func.isRequired,
  openMerge: PropTypes.func.isRequired,
  setMergeModal: PropTypes.func.isRequired,
  onSavoirDragStart: PropTypes.func.isRequired,
  onSavoirDragEnd: PropTypes.func.isRequired,
  isBeingDragged: PropTypes.bool,
  allEnseignants: PropTypes.array.isRequired,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function RicePage() {
  const [msgApi, msgCtx] = message.useMessage();
  const navigate = useNavigate();
  const uniqueId = useId();

  const [currentStep, setCurrentStep] = useState(0);

  // Step 0 – upload
  const [files, setFiles] = useState([]);
  const [allEnseignants, setAllEnseignants] = useState([]);
  const [loadingEns, setLoadingEns] = useState(false);

  // Step 1 – analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Step 2 – right-panel teacher search
  const [ensSearchStep2, setEnsSearchStep2] = useState("");

  // Step 2 – review (mutable clone of AI propositions)
  const [tree, setTree] = useState([]); // DomaineProposition[]
  const [extractedEnseignants, setExtractedEnseignants] = useState([]); // professors found in fiches
  const [manuallyAddedExtracts, setManuallyAddedExtracts] = useState([]); // nom_complet values manually promoted to assignable list
  const [editingNom, setEditingNom] = useState(null); // { path, value }
  const [mergeModal, setMergeModal] = useState(false);
  const [mergeSrc, setMergeSrc] = useState(null);
  const [mergeDst, setMergeDst] = useState(null);

  // Step 3 – report
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState(null);

  // Drag state
  const dragInfo = useRef(null);
  const [dragOverEns, setDragOverEns] = useState(null);
  const [isDragging, setIsDragging] = useState(false);        // true while any savoir card is being dragged
  const [draggedSavoirInfo, setDraggedSavoirInfo] = useState(null); // { nom, type, di,ci,sci,si }

  // ── fetch enseignants (can be re-triggered) ────────────────────────────
  const loadEnseignants = useCallback(() => {
    setLoadingEns(true);
    EnseignantService.getAllEnseignants()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAllEnseignants(list);
      })
      .catch(() =>
        msgApi.warning("Impossible de charger la liste des enseignants"),
      )
      .finally(() => setLoadingEns(false));
  }, [msgApi]);

  useEffect(() => { loadEnseignants(); }, [loadEnseignants]);

  // ── helpers: update tree state immutably ─────────────────────────────────
  const updateTree = useCallback((updater) => {
    setTree((prev) => {
      const next = cloneDeep(prev);
      updater(next);
      return next;
    });
  }, []);

  const getSavoir = (t, di, ci, sci, si) =>
    t[di].competences[ci].sousCompetences[sci].savoirs[si];

  // ── memoized flat savoir list ────────────────────────────────────────────
  const allSavoirsFlat = useMemo(() => {
    const list = [];
    tree.forEach((d, di) =>
      d.competences?.forEach((c, ci) =>
        c.sousCompetences?.forEach((sc, sci) =>
          sc.savoirs?.forEach((s, si) =>
            list.push({
              ...s,
              di,
              ci,
              sci,
              si,
              label: `${d.nom} › ${c.nom} › ${sc.nom} › ${s.nom}`,
            }),
          ),
        ),
      ),
    );
    return list;
  }, [tree]);

  // ── effective enseignants for step-2 right panel ─────────────────────────
  // Combines loaded teachers + extracted teachers from AI + orphan IDs from tree
  const effectiveEnseignants = useMemo(() => {
    const knownIds = new Set(
      allEnseignants.map((e) => String(e.id ?? e.enseignantId)),
    );

    // ── Step 1: build extractedExtras + name map ──────────────────────────
    const extractedNameMap = {};
    const seenExtracted = new Set(); // tracks both syntheticId and nameKey to avoid dupes
    const extractedExtras = [];

    extractedEnseignants.forEach((ext, idx) => {
      if (ext.matched_id) {
        const sid = String(ext.matched_id);
        if (ext.nom_complet) extractedNameMap[sid] = ext.nom_complet;
        if (!knownIds.has(sid) && !seenExtracted.has(sid)) {
          seenExtracted.add(sid);
          extractedExtras.push({
            id: sid,
            enseignantId: sid,
            nom: ext.nom_complet ?? ext.matched_nom ?? sid,
            prenom: "",
            _fromExtraction: true,
            _matched: true,
          });
        }
      } else if (ext.nom_complet) {
        const syntheticId = `ext_${idx}`;
        const nameKey = ext.nom_complet.toLowerCase();
        if (!seenExtracted.has(nameKey) && !seenExtracted.has(syntheticId)) {
          seenExtracted.add(nameKey);
          seenExtracted.add(syntheticId);
          const isManuallyAdded = manuallyAddedExtracts.includes(ext.nom_complet);
          extractedExtras.push({
            id: syntheticId,
            enseignantId: syntheticId,
            nom: ext.nom_complet,
            prenom: "",
            _fromExtraction: true,
            _matched: isManuallyAdded,
            _manuallyAdded: isManuallyAdded,
          });
        }
      }
    });

    // ── Step 2: orphans = IDs referenced in tree but NOT already covered ──
    const coveredIds = new Set([
      ...allEnseignants.map((e) => String(e.id ?? e.enseignantId)),
      ...extractedExtras.map((e) => e.id),
    ]);
    const orphanIds = new Set();
    allSavoirsFlat.forEach((s) =>
      (s.enseignantsSuggeres ?? []).forEach((id) => {
        if (!coveredIds.has(String(id))) orphanIds.add(String(id));
      }),
    );
    const orphans = Array.from(orphanIds).map((id) => {
      const resolvedName = extractedNameMap[id];
      return {
        id,
        enseignantId: id,
        nom: resolvedName ?? id,
        prenom: "",
      };
    });

    return [...allEnseignants, ...extractedExtras, ...orphans];
  }, [allEnseignants, allSavoirsFlat, extractedEnseignants, manuallyAddedExtracts]);

  // ── filtered effective enseignants for step-2 right panel search ─────────
  const filteredEffectiveEns = useMemo(() => {
    if (!ensSearchStep2.trim()) return effectiveEnseignants;
    const q = ensSearchStep2.toLowerCase();
    return effectiveEnseignants.filter(
      (e) =>
        (e.nom ?? "").toLowerCase().includes(q) ||
        (e.prenom ?? "").toLowerCase().includes(q) ||
        String(e.id ?? e.enseignantId).toLowerCase().includes(q),
    );
  }, [effectiveEnseignants, ensSearchStep2]);

  // ── live stats ───────────────────────────────────────────────────────────
  const liveStats = useMemo(() => {
    const totalSavoirs = allSavoirsFlat.length;
    const assignedEns = new Set(
      allSavoirsFlat.flatMap((s) => s.enseignantsSuggeres ?? []),
    );
    const totalDomaines = tree.length;
    const totalComp = tree.reduce(
      (a, d) => a + (d.competences?.length ?? 0),
      0,
    );
    const totalSC = tree.reduce(
      (a, d) =>
        a +
        (d.competences ?? []).reduce(
          (b, c) => b + (c.sousCompetences?.length ?? 0),
          0,
        ),
      0,
    );
    return {
      totalDomaines,
      totalComp,
      totalSC,
      totalSavoirs,
      enseignantsAssigned: assignedEns.size,
    };
  }, [tree, allSavoirsFlat]);

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
      .map((e) => ({
        id: String(e.id ?? e.enseignantId),
        nom: e.nom ?? "",
        prenom: e.prenom ?? "",
        modules: e.modules ?? [],
      }));

    setAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentStep(1);

    // Simulated progress steps
    const progressTimer = setInterval(() => {
      setAnalysisProgress((p) => (p < 90 ? p + Math.random() * 15 : p));
    }, 800);

    try {
      const result = await RiceService.analyze(
        files.filter(Boolean),
        enseignants,
      );
      clearInterval(progressTimer);
      setAnalysisProgress(100);
      setTree(cloneDeep(result.propositions));
      setExtractedEnseignants(result.extractedEnseignants ?? []);
      setManuallyAddedExtracts([]); // reset on new analysis

      // Merge newly found teachers from DB into our list
      if (result.foundEnseignants?.length > 0) {
        setAllEnseignants((prev) => {
          const map = new Map();
          prev.forEach((e) => map.set(String(e.id ?? e.enseignantId), e));
          result.foundEnseignants.forEach((e) => {
            const eid = String(e.id);
            if (!map.has(eid)) {
              map.set(eid, { ...e, enseignantId: e.id });
            }
          });
          return Array.from(map.values());
        });
      }

      // Short delay to show 100% completion
      setTimeout(() => setCurrentStep(2), 400);
    } catch (err) {
      clearInterval(progressTimer);
      const msg =
        err.response?.data?.detail ?? err.message ?? "Erreur d'analyse IA";
      msgApi.error(msg);
      setCurrentStep(0);
    } finally {
      setAnalyzing(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 2 – Review & Edit
  // ────────────────────────────────────────────────────────────────────────────

  const startRename = useCallback(
    (path, currentVal) => setEditingNom({ path, value: currentVal }),
    [],
  );

  const commitRename = useCallback(() => {
    if (!editingNom) return;
    const { path, value } = editingNom;
    updateTree((t) => {
      const [di, ci, sci, si] = path;
      if (si !== undefined) getSavoir(t, di, ci, sci, si).nom = value;
      else if (sci !== undefined)
        t[di].competences[ci].sousCompetences[sci].nom = value;
      else if (ci !== undefined) t[di].competences[ci].nom = value;
      else t[di].nom = value;
    });
    setEditingNom(null);
  }, [editingNom, updateTree]);

  // Delete
  const deleteSavoir = useCallback(
    (di, ci, sci, si) =>
      updateTree((t) =>
        t[di].competences[ci].sousCompetences[sci].savoirs.splice(si, 1),
      ),
    [updateTree],
  );
  const deleteSC = useCallback(
    (di, ci, sci) =>
      updateTree((t) => t[di].competences[ci].sousCompetences.splice(sci, 1)),
    [updateTree],
  );
  const deleteComp = useCallback(
    (di, ci) => updateTree((t) => t[di].competences.splice(ci, 1)),
    [updateTree],
  );
  const deleteDomaine = useCallback(
    (di) => updateTree((t) => t.splice(di, 1)),
    [updateTree],
  );

  // Toggle type / niveau
  const toggleType = useCallback(
    (di, ci, sci, si) =>
      updateTree((t) => {
        const s = getSavoir(t, di, ci, sci, si);
        s.type = s.type === "THEORIQUE" ? "PRATIQUE" : "THEORIQUE";
      }),
    [updateTree],
  );

  const setNiveau = useCallback(
    (di, ci, sci, si, niveau) =>
      updateTree((t) => {
        getSavoir(t, di, ci, sci, si).niveau = niveau;
      }),
    [updateTree],
  );

  // Enseignant assignment
  const toggleEnsAssign = useCallback(
    (di, ci, sci, si, ensId) =>
      updateTree((t) => {
        const s = getSavoir(t, di, ci, sci, si);
        const ids = s.enseignantsSuggeres ?? [];
        const idx = ids.indexOf(ensId);
        if (idx === -1) ids.push(ensId);
        else ids.splice(idx, 1);
        s.enseignantsSuggeres = ids;
      }),
    [updateTree],
  );

  const setEnseignants = useCallback(
    (di, ci, sci, si, ids) =>
      updateTree((t) => {
        getSavoir(t, di, ci, sci, si).enseignantsSuggeres = ids;
      }),
    [updateTree],
  );

  // ── Drag-and-drop ────────────────────────────────────────────────────────
  const onSavoirDragStart = useCallback(
    (e, di, ci, sci, si) => {
      const savoir = tree[di]?.competences[ci]?.sousCompetences[sci]?.savoirs[si];
      const info = { di, ci, sci, si, nom: savoir?.nom ?? "", type: savoir?.type ?? "THEORIQUE" };
      dragInfo.current = info;
      setDraggedSavoirInfo(info);
      setIsDragging(true);
      try {
        e.dataTransfer.setData("application/json", JSON.stringify(info));
        e.dataTransfer.effectAllowed = "move";
      } catch (_) { /* ignore */ }
    },
    [tree],
  );

  const onSavoirDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedSavoirInfo(null);
    setDragOverEns(null);
    dragInfo.current = null;
  }, []);

  const onEnsDragOver = useCallback((e, ensId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverEns(ensId);
  }, []);

  const onEnsDragLeave = useCallback((e) => {
    // Only clear if we actually left the card (not just a child element)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverEns(null);
    }
  }, []);

  const onEnsDrop = useCallback(
    (e, ensId) => {
      e.preventDefault();
      setDragOverEns(null);
      setIsDragging(false);
      setDraggedSavoirInfo(null);

      let info = dragInfo.current;
      if (!info) {
        try { info = JSON.parse(e.dataTransfer.getData("application/json")); } catch (_) { return; }
      }
      if (!info) return;

      const { di, ci, sci, si, nom } = info;
      dragInfo.current = null;

      // Resolve teacher object
      const ensObj = effectiveEnseignants.find(
        (en) => String(en.id ?? en.enseignantId) === ensId,
      );

      // Block drop on unmatched extracted teachers (no real DB ID)
      if (ensObj?._fromExtraction && !ensObj?._matched) {
        msgApi.warning(
          `« ${ensObj?.nom ?? ensId} » n'est pas identifié en base — impossible d'assigner un savoir.`,
        );
        return;
      }

      toggleEnsAssign(di, ci, sci, si, ensId);

      const ensName = ensObj
        ? ensObj.prenom ? `${ensObj.prenom} ${ensObj.nom}` : ensObj.nom
        : ensId;
      msgApi.success(`« ${nom} » assigné à ${ensName}`);
    },
    [toggleEnsAssign, effectiveEnseignants, msgApi],
  );

  // Merge
  const openMerge = useCallback(
    (di, ci, sci, si) => setMergeSrc({ di, ci, sci, si }),
    [],
  );

  const confirmMerge = useCallback(() => {
    if (!mergeSrc || !mergeDst) return;
    const { di, ci, sci, si } = mergeSrc;
    const { di: di2, ci: ci2, sci: sci2, si: si2 } = mergeDst;
    updateTree((t) => {
      const src = getSavoir(t, di, ci, sci, si);
      const dst = getSavoir(t, di2, ci2, sci2, si2);
      dst.enseignantsSuggeres = Array.from(
        new Set([
          ...(src.enseignantsSuggeres ?? []),
          ...(dst.enseignantsSuggeres ?? []),
        ]),
      );
      dst.nom = `${dst.nom} / ${src.nom}`;
      t[di].competences[ci].sousCompetences[sci].savoirs.splice(si, 1);
    });
    setMergeModal(false);
    setMergeSrc(null);
    setMergeDst(null);
    msgApi.success("Savoirs fusionnés avec succès");
  }, [mergeSrc, mergeDst, updateTree, msgApi]);

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 3 – Import to DB
  // ────────────────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true);
    try {
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
                // Strip synthetic ext_* IDs (unmatched/manual extracted teachers have no real DB ID)
                enseignantIds: (s.enseignantsSuggeres ?? []).filter(
                  (id) => !String(id).startsWith("ext_") && !String(id).startsWith("manual_"),
                ),
              })),
            })),
          })),
        })),
      };
      const result = await RiceService.importToDb(payload);
      setReport(result);
      setCurrentStep(3);
      msgApi.success("Import réussi !");
    } catch (err) {
      msgApi.error(
        err.response?.data?.message ?? "Erreur lors de l'import en base",
      );
    } finally {
      setImporting(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Reset all
  // ────────────────────────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    setCurrentStep(0);
    setFiles([]);
    setTree([]);
    setReport(null);
    setEnsSearchStep2("");
    setAnalysisProgress(0);
    setManuallyAddedExtracts([]);
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  const steps = [
    {
      title: "Upload",
      icon: <InboxOutlined />,
      description: files.length > 0 ? `${files.length} fichier(s)` : "",
    },
    {
      title: "Analyse IA",
      icon: analyzing ? <LoadingOutlined /> : <RobotOutlined />,
      description: analyzing ? "En cours…" : "",
    },
    {
      title: "Révision",
      icon: <EditOutlined />,
      description:
        currentStep >= 2 ? `${liveStats.totalSavoirs} savoirs` : "",
    },
    {
      title: "Rapport",
      icon: <BarChartOutlined />,
    },
  ];

  return (
    <>
      {msgCtx}
      <div className="rice-page">
        {/* ── Hero banner ─────────────────────────────────────────────────── */}
        <div className="rice-hero">
          <div className="rice-hero-content">
            <div className="rice-hero-icon-wrap">
              <RobotOutlined />
            </div>
            <div className="rice-hero-text">
              <Title level={3} className="rice-hero-title">
                RICE – Référentiel Intelligent de Compétences
              </Title>
              <Paragraph className="rice-hero-subtitle">
                Importez vos fiches UE/modules, laissez l&apos;IA extraire automatiquement
                l&apos;arbre de compétences, révisez par glisser-déposer, puis enregistrez en base.
              </Paragraph>
            </div>
            <div className="rice-hero-badge">
              <ThunderboltOutlined style={{ marginRight: 5 }} />
              IA · NLP · Bloom
            </div>
          </div>
        </div>

        {/* ── Steps ───────────────────────────────────────────────────────── */}
        <div className="rice-steps-wrapper">
          <Steps
            current={currentStep}
            items={steps}
            size="small"
            responsive
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            STEP 0 – Upload
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 0 && (
          <Row gutter={[24, 24]}>
            {/* File upload */}
            <Col xs={24}>
              <Card
                title={
                  <Space>
                    <FileTextOutlined /> Fiches UE / Modules
                  </Space>
                }
                className="rice-upload-card"
                variant="borderless"
                style={{ maxWidth: 720, margin: "0 auto" }}
              >
                <Dragger
                  multiple
                  accept=".pdf,.docx,.doc,.txt"
                  beforeUpload={() => false}
                  onChange={handleUploadChange}
                  fileList={files.map((f, i) => ({
                    uid: `file-${i}`,
                    name: f.name ?? f,
                    size: f.size,
                    status: "done",
                    originFileObj: f,
                  }))}
                  itemRender={(originNode, file) => (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {originNode}
                      {file.size > 0 && (
                        <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                          {formatFileSize(file.size)}
                        </Text>
                      )}
                    </div>
                  )}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ color: "#1677ff", fontSize: 40 }} />
                  </p>
                  <p className="ant-upload-text">
                    Glissez vos fichiers ici ou cliquez pour sélectionner
                  </p>
                  <p className="ant-upload-hint">
                    Plusieurs fichiers possibles
                  </p>
                </Dragger>
                <div className="rice-format-chips">
                  <span className="rice-format-chip pdf">📄 PDF</span>
                  <span className="rice-format-chip docx">📝 DOCX</span>
                  <span className="rice-format-chip txt">📋 TXT</span>
                </div>

                {files.length > 0 && (
                  <div className="rice-file-count">
                    <CheckCircleOutlined />
                    {files.length} fichier(s) prêt(s) pour l&apos;analyse
                  </div>
                )}
              </Card>
            </Col>

            {/* Launch button */}
            <Col span={24} style={{ textAlign: "center", marginTop: 16 }}>
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={handleAnalyze}
                disabled={files.length === 0}
                loading={analyzing}
                className="rice-launch-btn"
              >
                Lancer l&apos;analyse IA
              </Button>
              {files.length === 0 && (
                <div style={{ marginTop: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Chargez au moins un fichier pour démarrer
                  </Text>
                </div>
              )}
            </Col>
          </Row>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 1 – Analyzing (animated loading)
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="rice-analyzing">
            <RobotOutlined className="rice-loading-icon" />
            <Title level={4} style={{ color: "#1677ff", marginBottom: 4 }}>
              Analyse en cours…
            </Title>
            <Paragraph type="secondary" style={{ maxWidth: 440, margin: "0 auto 24px" }}>
              L&apos;IA extrait les compétences, savoirs et niveaux de maîtrise
              depuis vos {files.length} fichier(s). Merci de patienter.
            </Paragraph>

            <Progress
              percent={Math.round(analysisProgress)}
              strokeColor={{ from: "#1677ff", to: "#52c41a" }}
              style={{ maxWidth: 400, margin: "0 auto 32px" }}
              status={analysisProgress >= 100 ? "success" : "active"}
            />

            <div className="rice-loading-steps">
              <Steps
                direction="vertical"
                size="small"
                current={
                  analysisProgress < 20
                    ? 0
                    : analysisProgress < 40
                      ? 1
                      : analysisProgress < 60
                        ? 2
                        : analysisProgress < 80
                          ? 3
                          : analysisProgress < 100
                            ? 4
                            : 5
                }
                items={[
                  {
                    title: "Extraction du texte",
                    description: "Lecture des fichiers PDF/DOCX",
                    icon:
                      analysisProgress >= 20 ? (
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                      ) : analysisProgress > 0 ? (
                        <LoadingOutlined />
                      ) : undefined,
                  },
                  {
                    title: "Analyse NLP",
                    description:
                      "Détection des acquis d'apprentissage et taxonomie de Bloom",
                    icon:
                      analysisProgress >= 40 ? (
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                      ) : analysisProgress >= 20 ? (
                        <LoadingOutlined />
                      ) : undefined,
                  },
                  {
                    title: "Construction de l'arbre",
                    description:
                      "Organisation en domaines → compétences → savoirs",
                    icon:
                      analysisProgress >= 60 ? (
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                      ) : analysisProgress >= 40 ? (
                        <LoadingOutlined />
                      ) : undefined,
                  },
                  {
                    title: "Extraction des noms d'enseignants",
                    description: "Identification des professeurs dans les fiches modules",
                    icon:
                      analysisProgress >= 80 ? (
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                      ) : analysisProgress >= 60 ? (
                        <LoadingOutlined />
                      ) : undefined,
                  },
                  {
                    title: "Matching enseignants",
                    description: "Attribution IA des enseignants aux savoirs",
                    icon:
                      analysisProgress >= 100 ? (
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                      ) : analysisProgress >= 80 ? (
                        <LoadingOutlined />
                      ) : undefined,
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 2 – Review
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <>
            {/* Live stats banner */}
            <Alert
              type="info"
              className="rice-stats-banner"
              message={
                <Flex gap={16} wrap="wrap" align="center">
                  <span className="rice-stat-item">
                    <ApartmentOutlined />
                    <span className="rice-stat-value">
                      {liveStats.totalDomaines}
                    </span>{" "}
                    domaines
                  </span>
                  <Divider type="vertical" />
                  <span className="rice-stat-item">
                    <span className="rice-stat-value">
                      {liveStats.totalComp}
                    </span>{" "}
                    compétences
                  </span>
                  <Divider type="vertical" />
                  <span className="rice-stat-item">
                    <span className="rice-stat-value">
                      {liveStats.totalSC}
                    </span>{" "}
                    sous-compétences
                  </span>
                  <Divider type="vertical" />
                  <span className="rice-stat-item">
                    <BookOutlined />
                    <span className="rice-stat-value">
                      {liveStats.totalSavoirs}
                    </span>{" "}
                    savoirs
                  </span>
                  <Divider type="vertical" />
                  <span className="rice-stat-item">
                    <UserOutlined />
                    <span className="rice-stat-value">
                      {liveStats.enseignantsAssigned}
                    </span>{" "}
                    enseignants assignés
                  </span>
                  {extractedEnseignants.length > 0 && (
                    <>
                      <Divider type="vertical" />
                      <span className="rice-stat-item">
                        <FileTextOutlined />
                        <span className="rice-stat-value">
                          {extractedEnseignants.length}
                        </span>{" "}
                        noms extraits des fiches
                        {extractedEnseignants.filter((e) => e.matched_id).length > 0 && (
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                            ({extractedEnseignants.filter((e) => e.matched_id).length} identifiés)
                          </Text>
                        )}
                      </span>
                    </>
                  )}
                </Flex>
              }
              icon={<CheckCircleOutlined />}
              showIcon
            />

            <Alert
              type="info"
              className="rice-dnd-tip"
              message={
                <Space size={8}>
                  <DragOutlined />
                  <Text style={{ fontSize: 13 }}>
                    Glissez les cartes{" "}
                    <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>⠿</Tag>
                    {" "}vers un enseignant à droite pour assigner.
                  </Text>
                </Space>
              }
              closable
            />

            <Row gutter={[16, 16]}>
              {/* ── Left: Tree ── */}
              <Col xs={24} xl={14}>
                <Card
                  title={
                    <Space>
                      <ApartmentOutlined />
                      Structure de compétences
                      <Badge
                        count={liveStats.totalSavoirs}
                        style={{ backgroundColor: "#1677ff" }}
                        overflowCount={999}
                      />
                    </Space>
                  }
                  size="small"
                  className="rice-tree-card"
                >
                  {tree.length === 0 && (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span>
                          Aucun élément généré.{" "}
                          <Button
                            type="link"
                            size="small"
                            onClick={() => setCurrentStep(0)}
                          >
                            Retour à l&apos;upload
                          </Button>
                        </span>
                      }
                    />
                  )}

                  {tree.map((domaine, di) => {
                    const domaineKey = domaine.tmpId ?? `${uniqueId}-d${di}`;
                    return (
                      <Collapse
                        key={domaineKey}
                        defaultActiveKey={[domaineKey]}
                        style={{ marginBottom: 8 }}
                      >
                        <Panel
                          key={domaineKey}
                          header={
                            <Space>
                              <Tag color="blue">{domaine.code}</Tag>
                              {editingNom?.path[0] === di &&
                              editingNom?.path.length === 1 ? (
                                <Input
                                  size="small"
                                  value={editingNom.value}
                                  onChange={(e) =>
                                    setEditingNom((p) => ({
                                      ...p,
                                      value: e.target.value,
                                    }))
                                  }
                                  onPressEnter={commitRename}
                                  onBlur={commitRename}
                                  onKeyDown={(e) =>
                                    e.key === "Escape" && setEditingNom(null)
                                  }
                                  style={{ width: 220 }}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <Text strong>{domaine.nom}</Text>
                              )}
                              <Badge
                                count={domaine.competences?.length ?? 0}
                                style={{ backgroundColor: "#e6f4ff", color: "#1677ff" }}
                                size="small"
                              />
                            </Space>
                          }
                          extra={
                            <Space
                              onClick={(e) => e.stopPropagation()}
                              size={2}
                            >
                              <Tooltip title="Renommer">
                                <Button
                                  size="small"
                                  type="text"
                                  icon={<EditOutlined />}
                                  onClick={() =>
                                    startRename([di], domaine.nom)
                                  }
                                />
                              </Tooltip>
                              <Popconfirm
                                title="Supprimer ce domaine ?"
                                description="Toutes ses compétences et savoirs seront supprimés."
                                okText="Supprimer"
                                cancelText="Annuler"
                                onConfirm={() => deleteDomaine(di)}
                              >
                                <Tooltip title="Supprimer">
                                  <Button
                                    size="small"
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                  />
                                </Tooltip>
                              </Popconfirm>
                            </Space>
                          }
                        >
                          {(domaine.competences ?? []).map((comp, ci) => {
                            const compKey =
                              comp.tmpId ?? `${uniqueId}-d${di}c${ci}`;
                            return (
                              <Collapse
                                key={compKey}
                                style={{ marginBottom: 6 }}
                              >
                                <Panel
                                  key={compKey}
                                  header={
                                    <Space>
                                      <Tag color="geekblue">{comp.code}</Tag>
                                      {editingNom?.path[0] === di &&
                                      editingNom?.path[1] === ci &&
                                      editingNom?.path.length === 2 ? (
                                        <Input
                                          size="small"
                                          value={editingNom.value}
                                          onChange={(e) =>
                                            setEditingNom((p) => ({
                                              ...p,
                                              value: e.target.value,
                                            }))
                                          }
                                          onPressEnter={commitRename}
                                          onBlur={commitRename}
                                          onKeyDown={(e) =>
                                            e.key === "Escape" &&
                                            setEditingNom(null)
                                          }
                                          style={{ width: 220 }}
                                          autoFocus
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <Text>{comp.nom}</Text>
                                      )}
                                      <Badge
                                        count={
                                          comp.sousCompetences?.reduce(
                                            (a, sc) =>
                                              a + (sc.savoirs?.length ?? 0),
                                            0,
                                          ) ?? 0
                                        }
                                        style={{
                                          backgroundColor: "#f0f5ff",
                                          color: "#2f54eb",
                                        }}
                                        size="small"
                                        overflowCount={99}
                                        title="Nombre de savoirs"
                                      />
                                    </Space>
                                  }
                                  extra={
                                    <Space
                                      onClick={(e) => e.stopPropagation()}
                                      size={2}
                                    >
                                      <Button
                                        size="small"
                                        type="text"
                                        icon={<EditOutlined />}
                                        onClick={() =>
                                          startRename([di, ci], comp.nom)
                                        }
                                      />
                                      <Popconfirm
                                        title="Supprimer cette compétence ?"
                                        okText="Supprimer"
                                        cancelText="Annuler"
                                        onConfirm={() => deleteComp(di, ci)}
                                      >
                                        <Button
                                          size="small"
                                          type="text"
                                          danger
                                          icon={<DeleteOutlined />}
                                        />
                                      </Popconfirm>
                                    </Space>
                                  }
                                >
                                  {(comp.sousCompetences ?? []).map(
                                    (sc, sci) => (
                                      <div
                                        key={
                                          sc.tmpId ??
                                          `${uniqueId}-d${di}c${ci}sc${sci}`
                                        }
                                        className="rice-sous-comp-section"
                                      >
                                        <div className="rice-sous-comp-header">
                                          <Tag color="cyan">{sc.code}</Tag>
                                          {editingNom?.path[0] === di &&
                                          editingNom?.path[1] === ci &&
                                          editingNom?.path[2] === sci &&
                                          editingNom?.path.length === 3 ? (
                                            <Input
                                              size="small"
                                              value={editingNom.value}
                                              onChange={(e) =>
                                                setEditingNom((p) => ({
                                                  ...p,
                                                  value: e.target.value,
                                                }))
                                              }
                                              onPressEnter={commitRename}
                                              onBlur={commitRename}
                                              onKeyDown={(e) =>
                                                e.key === "Escape" &&
                                                setEditingNom(null)
                                              }
                                              style={{ width: 200 }}
                                              autoFocus
                                            />
                                          ) : (
                                            <Text italic>{sc.nom}</Text>
                                          )}
                                          <Tooltip title="Renommer">
                                            <Button
                                              size="small"
                                              type="text"
                                              icon={<EditOutlined />}
                                              onClick={() =>
                                                startRename(
                                                  [di, ci, sci],
                                                  sc.nom,
                                                )
                                              }
                                            />
                                          </Tooltip>
                                          <Popconfirm
                                            title="Supprimer cette sous-compétence ?"
                                            okText="Supprimer"
                                            cancelText="Annuler"
                                            onConfirm={() =>
                                              deleteSC(di, ci, sci)
                                            }
                                          >
                                            <Button
                                              size="small"
                                              type="text"
                                              danger
                                              icon={<DeleteOutlined />}
                                            />
                                          </Popconfirm>
                                          <Text
                                            type="secondary"
                                            style={{ fontSize: 11 }}
                                          >
                                            ({sc.savoirs?.length ?? 0} savoirs)
                                          </Text>
                                        </div>

                                        {(sc.savoirs ?? []).map((savoir, si) => (
                                          <SavoirCard
                                            key={
                                              savoir.tmpId ??
                                              `${uniqueId}-d${di}c${ci}sc${sci}s${si}`
                                            }
                                            savoir={savoir}
                                            di={di}
                                            ci={ci}
                                            sci={sci}
                                            si={si}
                                            editingNom={editingNom}
                                            setEditingNom={setEditingNom}
                                            commitRename={commitRename}
                                            startRename={startRename}
                                            toggleType={toggleType}
                                            setNiveau={setNiveau}
                                            setEnseignants={setEnseignants}
                                            deleteSavoir={deleteSavoir}
                                            openMerge={openMerge}
                                            setMergeModal={setMergeModal}
                                            onSavoirDragStart={
                                              onSavoirDragStart
                                            }
                                            onSavoirDragEnd={onSavoirDragEnd}
                                            isBeingDragged={
                                              draggedSavoirInfo?.di === di &&
                                              draggedSavoirInfo?.ci === ci &&
                                              draggedSavoirInfo?.sci === sci &&
                                              draggedSavoirInfo?.si === si
                                            }
                                            allEnseignants={effectiveEnseignants}
                                          />
                                        ))}
                                      </div>
                                    ),
                                  )}
                                </Panel>
                              </Collapse>
                            );
                          })}
                        </Panel>
                      </Collapse>
                    );
                  })}
                </Card>
              </Col>

              {/* ── Right: Enseignants drop zone ── */}
              <Col xs={24} xl={10}>
                <Card
                  title={
                    <Space>
                      <UserOutlined />
                      Affectations enseignants
                      <Badge
                        count={liveStats.enseignantsAssigned}
                        style={{ backgroundColor: "#52c41a" }}
                        overflowCount={99}
                      />
                    </Space>
                  }
                  size="small"
                  className={`rice-ens-panel${isDragging ? " rice-dnd-active" : ""}`}
                  extra={
                    <Space size={4}>
                      {extractedEnseignants.length > 0 && (
                        <Tooltip title={`${extractedEnseignants.filter((e) => e.matched_id).length} identifié(s) · ${extractedEnseignants.filter((e) => !e.matched_id).length} non identifié(s)`}>
                          <Tag color="blue" style={{ margin: 0, fontSize: 11, cursor: "help" }}>
                            <FileTextOutlined /> {extractedEnseignants.length} extraits
                          </Tag>
                        </Tooltip>
                      )}
                      <Tooltip title="Recharger la liste">
                        <Button
                          size="small"
                          type="text"
                          icon={<ReloadOutlined />}
                          loading={loadingEns}
                          onClick={loadEnseignants}
                        />
                      </Tooltip>
                    </Space>
                  }
                >
                  {/* Drag-mode banner */}
                  {isDragging && draggedSavoirInfo && (
                    <div className="rice-drag-banner">
                      <DragOutlined style={{ marginRight: 6 }} />
                      Déposez{" "}
                      <strong style={{ color: TYPE_COLOR[draggedSavoirInfo.type] === "purple" ? "#722ed1" : "#fa541c" }}>
                        «&nbsp;{draggedSavoirInfo.nom}&nbsp;»
                      </strong>{" "}
                      sur un enseignant ci-dessous
                    </div>
                  )}

                  {/* Search bar for teachers */}
                  <Input
                    prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                    placeholder="Rechercher un enseignant…"
                    value={ensSearchStep2}
                    onChange={(e) => setEnsSearchStep2(e.target.value)}
                    allowClear
                    size="small"
                    className="rice-ens-search-input"
                  />

                  {effectiveEnseignants.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span>
                          Aucun enseignant disponible.{" "}
                          <Button type="link" size="small" onClick={loadEnseignants}>
                            Recharger
                          </Button>
                        </span>
                      }
                    />
                  ) : filteredEffectiveEns.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Aucun enseignant trouvé"
                    />
                  ) : null}

                  {/* ── Section: DB enseignants (identifiés) ── */}
                  {(() => {
                    const dbEns = filteredEffectiveEns.filter((e) => !e._fromExtraction || e._matched);
                    const unidentifiedEns = filteredEffectiveEns.filter((e) => e._fromExtraction && !e._matched);
                    return (
                      <>
                        {dbEns.length > 0 && (
                          <div className="rice-ens-section">
                            <div className="rice-ens-section-header">
                              <CheckCircleOutlined style={{ color: "#52c41a" }} />
                              <Text strong style={{ fontSize: 12 }}>Enseignants identifiés</Text>
                              <Badge count={dbEns.length} style={{ backgroundColor: "#52c41a" }} size="small" />
                            </div>
                            {dbEns.map((ens) => {
                              const eid = String(ens.id ?? ens.enseignantId);
                              const isOver = dragOverEns === eid;
                              const assignedSavoirs = allSavoirsFlat.filter((s) =>
                                (s.enseignantsSuggeres ?? []).includes(eid),
                              );
                              const ensName = ens.prenom ? `${ens.prenom} ${ens.nom}` : ens.nom;
                              // Find extraction details (role, file) for this teacher
                              const extInfo = ens._fromExtraction
                                ? extractedEnseignants.find((ex) => String(ex.matched_id) === eid)
                                : null;

                              return (
                                <div
                                  key={eid}
                                  className={[
                                    "rice-ens-drop-card",
                                    isDragging ? "rice-ens-ready" : "",
                                    isOver ? "rice-ens-drag-over" : "",
                                    assignedSavoirs.length > 0 ? "rice-ens-has-savoirs" : "",
                                  ].filter(Boolean).join(" ")}
                                  onDragOver={(e) => onEnsDragOver(e, eid)}
                                  onDragLeave={onEnsDragLeave}
                                  onDrop={(e) => onEnsDrop(e, eid)}
                                >
                                  <div className="rice-ens-header-row">
                                    <div className={`rice-ens-avatar${ens._fromExtraction ? " rice-ens-avatar-extracted" : ""}`}>
                                      {ensName.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <Text className="rice-ens-name" ellipsis={{ tooltip: ensName }}>
                                        {ensName}
                                      </Text>
                                      {extInfo && (
                                        <div className="rice-ens-meta">
                                          <Tag
                                            color={extInfo.role === "responsable" ? "blue" : extInfo.role === "coordinateur" ? "cyan" : "default"}
                                            style={{ fontSize: 9, margin: 0, lineHeight: "16px", padding: "0 4px" }}
                                          >
                                            {extInfo.role}
                                          </Tag>
                                          <Text type="secondary" style={{ fontSize: 10 }} ellipsis={{ tooltip: extInfo.fichier }}>
                                            {extInfo.fichier}
                                          </Text>
                                        </div>
                                      )}
                                    </div>
                                    <div className="rice-ens-count-badge">
                                      {assignedSavoirs.length}
                                    </div>
                                  </div>

                                  {isDragging && (
                                    <div className={`rice-drop-overlay${isOver ? " rice-drop-overlay-active" : ""}`}>
                                      {isOver ? <>✓ Relâchez pour assigner</> : <>⬇ Déposer ici</>}
                                    </div>
                                  )}

                                  {!isDragging && (
                                    <div className="rice-ens-tags">
                                      {assignedSavoirs.length === 0 ? (
                                        <span className="rice-ens-placeholder">
                                          Aucun savoir assigné — glissez-en un ici
                                        </span>
                                      ) : (
                                        assignedSavoirs.map((s) => (
                                          <Tag
                                            key={s.tmpId ?? `${s.di}-${s.ci}-${s.sci}-${s.si}`}
                                            closable
                                            color={TYPE_COLOR[s.type]}
                                            style={{ fontSize: 11, maxWidth: 220 }}
                                            onClose={() =>
                                              toggleEnsAssign(s.di, s.ci, s.sci, s.si, eid)
                                            }
                                          >
                                            {s.nom.length > 30 ? s.nom.slice(0, 28) + "…" : s.nom}
                                          </Tag>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* ── Section: Non-identifiés (collapsed) ── */}
                        {unidentifiedEns.length > 0 && (
                          <Collapse
                            ghost
                            size="small"
                            className="rice-unidentified-collapse"
                            items={[{
                              key: "unidentified",
                              label: (
                                <Space size={6}>
                                  <span style={{ color: "#faad14" }}>⚠</span>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    Non identifiés
                                  </Text>
                                  <Badge count={unidentifiedEns.length} style={{ backgroundColor: "#faad14" }} size="small" />
                                </Space>
                              ),
                              children: unidentifiedEns.map((ens) => {
                                const eid = String(ens.id ?? ens.enseignantId);
                                const ensName = ens.prenom ? `${ens.prenom} ${ens.nom}` : ens.nom;
                                const extInfo = extractedEnseignants.find(
                                  (ex) => ex.nom_complet && ex.nom_complet.toLowerCase() === ens.nom.toLowerCase()
                                );

                                return (
                                  <div key={eid} className="rice-ens-drop-card rice-ens-disabled">
                                    <div className="rice-ens-header-row">
                                      <div className="rice-ens-avatar rice-ens-avatar-unidentified">
                                        {ensName.charAt(0).toUpperCase()}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <Text className="rice-ens-name" ellipsis={{ tooltip: ensName }}>
                                          {ensName}
                                        </Text>
                                        {extInfo && (
                                          <div className="rice-ens-meta">
                                            <Tag
                                              color={extInfo.role === "responsable" ? "blue" : extInfo.role === "coordinateur" ? "cyan" : "default"}
                                              style={{ fontSize: 9, margin: 0, lineHeight: "16px", padding: "0 4px" }}
                                            >
                                              {extInfo.role}
                                            </Tag>
                                          </div>
                                        )}
                                      </div>
                                      {!manuallyAddedExtracts.includes(ens.nom) ? (
                                        <Tooltip title="Ajouter à la liste des enseignants assignables">
                                          <Button
                                            size="small"
                                            type="primary"
                                            ghost
                                            icon={<UserAddOutlined />}
                                            className="rice-add-ens-btn"
                                            onClick={() =>
                                              setManuallyAddedExtracts((prev) =>
                                                prev.includes(ens.nom) ? prev : [...prev, ens.nom]
                                              )
                                            }
                                          />
                                        </Tooltip>
                                      ) : (
                                        <Tag color="success" style={{ fontSize: 9, margin: 0 }}>
                                          <CheckCircleOutlined /> ajouté
                                        </Tag>
                                      )}
                                    </div>
                                  </div>
                                );
                              }),
                            }]}
                          />
                        )}
                      </>
                    );
                  })()}
                </Card>
              </Col>
            </Row>

            {/* ── Bottom action bar (sticky) ── */}
            <div className="rice-bottom-bar">
              <Row justify="space-between" align="middle">
                <Col>
                  <Button
                    onClick={() => setCurrentStep(0)}
                    icon={<ArrowLeftOutlined />}
                  >
                    Recommencer
                  </Button>
                </Col>
                <Col>
                  <Space size={16}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {liveStats.totalSavoirs} savoirs ·{" "}
                      {liveStats.enseignantsAssigned} enseignants
                    </Text>
                    <Button
                      type="primary"
                      size="large"
                      icon={<EyeOutlined />}
                      disabled={allSavoirsFlat.length === 0}
                      onClick={() => setCurrentStep(3)}
                      className="rice-recap-btn"
                    >
                      Voir le récapitulatif
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 3 – Report
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <>
            {report ? (
              <div className="rice-success-card">
                <div className="rice-success-icon">
                  <SafetyCertificateOutlined />
                </div>
                <div className="rice-success-text" style={{ flex: 1 }}>
                  <h4>Import RICE réussi !</h4>
                  <p>{report.message ?? "Le référentiel a été enregistré avec succès en base de données."}</p>
                </div>
              </div>
            ) : (
              <div className="rice-preview-card">
                <div className="rice-preview-icon">
                  <EyeOutlined />
                </div>
                <div className="rice-preview-text" style={{ flex: 1 }}>
                  <h4>Mode prévisualisation</h4>
                  <p>Les données ne sont pas encore enregistrées. Vérifiez le récapitulatif ci-dessous, puis cliquez sur « Enregistrer » lorsque vous êtes prêt.</p>
                </div>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={importing}
                  onClick={handleImport}
                  size="large"
                  style={{ borderRadius: 10, flexShrink: 0 }}
                >
                  Enregistrer
                </Button>
              </div>
            )}

            {report && <Row
              gutter={[16, 16]}
              style={{ marginBottom: 24 }}
              className="rice-report-stats"
            >
              {[
                {
                  title: "Domaines",
                  value: report.domainesCreated,
                  color: "#1677ff",
                  icon: <ApartmentOutlined />,
                },
                {
                  title: "Compétences",
                  value: report.competencesCreated,
                  color: "#52c41a",
                  icon: <BookOutlined />,
                },
                {
                  title: "Sous-compétences",
                  value: report.sousCompetencesCreated,
                  color: "#13c2c2",
                  icon: <ApartmentOutlined />,
                },
                {
                  title: "Savoirs",
                  value: report.savoirsCreated,
                  color: "#722ed1",
                  icon: <ExperimentOutlined />,
                },
                {
                  title: "Affectations",
                  value: report.affectationsCreated,
                  color: "#fa8c16",
                  icon: <UserOutlined />,
                },
                {
                  title: "Enseignants",
                  value: report.enseignantsCovered,
                  color: "#eb2f96",
                  icon: <UserOutlined />,
                },
              ].map(({ title, value, color, icon }) => (
                <Col xs={12} sm={8} lg={4} key={title}>
                  <Card variant="borderless" style={{ borderLeft: `4px solid ${color}` }}>
                    <Statistic
                      title={title}
                      value={value}
                      prefix={icon}
                      valueStyle={{ color, fontSize: 28 }}
                    />
                  </Card>
                </Col>
              ))}
            </Row>}

            {/* Coverage per domaine */}
            {report && report.tauxCouvertureParDomaine &&
              Object.keys(report.tauxCouvertureParDomaine).length > 0 && (
                <Card
                  title={
                    <Space>
                      <BarChartOutlined /> Taux de couverture par domaine
                    </Space>
                  }
                  size="small"
                  className="rice-report-coverage"
                >
                  {Object.entries(report.tauxCouvertureParDomaine).map(
                    ([nom, taux]) => (
                      <Row
                        key={nom}
                        align="middle"
                        gutter={16}
                        style={{ marginBottom: 10 }}
                      >
                        <Col xs={8} sm={6}>
                          <Text style={{ fontSize: 13 }}>{nom}</Text>
                        </Col>
                        <Col flex="auto">
                          <Progress
                            percent={taux}
                            size="small"
                            strokeColor={
                              taux >= 70
                                ? "#52c41a"
                                : taux >= 40
                                  ? "#faad14"
                                  : "#ff4d4f"
                            }
                            format={(p) => `${p}%`}
                          />
                        </Col>
                      </Row>
                    ),
                  )}
                </Card>
              )}

            {/* ── Enseignants → Savoirs acquis ──────────────────────────── */}
            {(() => {
              // Build map: ensId → [{ nom, label }]
              const ensSavoirsMap = new Map();
              // Helper: derive a short code from a structural code
              // "TV-01-C2-SC1-S2" → "C2-SC1-S2" (strip domain prefix)
              const shortenCode = (code) => {
                const parts = (code || "").split("-");
                // Domain is first 2 segments (e.g. TV-01, UP-IL), rest is competence path
                return parts.length > 2 ? parts.slice(2).join("-") : code;
              };
              allSavoirsFlat.forEach((s) => {
                (s.enseignantsSuggeres ?? []).forEach((eid) => {
                  const key = String(eid);
                  if (!ensSavoirsMap.has(key)) ensSavoirsMap.set(key, []);
                  // Use short GC referential codes (S2a, C3b…) when available, else shorten structural code
                  const shortCodes = (s.gcCodes && s.gcCodes.length > 0) ? s.gcCodes : [shortenCode(s.code)];
                  ensSavoirsMap.get(key).push({ nom: s.nom, code: s.code, gcCodes: shortCodes, label: s.label });
                });
              });
              if (ensSavoirsMap.size === 0) return null;

              const rows = Array.from(ensSavoirsMap.entries()).map(([eid, savoirs]) => {
                const ensObj = effectiveEnseignants.find(
                  (e) => String(e.id ?? e.enseignantId) === eid,
                );
                const name = ensObj
                  ? ensObj.prenom
                    ? `${ensObj.prenom} ${ensObj.nom}`
                    : ensObj.nom
                  : eid;
                const initials = ensObj
                  ? ((ensObj.prenom?.[0] ?? "") + (ensObj.nom?.[0] ?? "")).toUpperCase() || eid
                  : eid;
                // Flatten all GC codes for this teacher
                const allGcCodes = [...new Set(savoirs.flatMap((sv) => sv.gcCodes))];
                return { key: eid, name, initials, savoirs, allGcCodes };
              });

              const columns = [
                {
                  title: "Enseignant",
                  dataIndex: "name",
                  key: "name",
                  width: 180,
                  render: (name, row) => (
                    <Space>
                      <Tag color="blue" style={{ fontWeight: 700, minWidth: 38, textAlign: "center" }}>
                        {row.initials}
                      </Tag>
                      <Text style={{ fontSize: 13 }}>{name}</Text>
                    </Space>
                  ),
                },
                {
                  title: "Compétences techniques associées",
                  dataIndex: "allGcCodes",
                  key: "gcCodes",
                  render: (codes) => (
                    <Text style={{ fontSize: 13 }}>
                      {codes.join(" ; ")}
                    </Text>
                  ),
                },
                {
                  title: "Nb savoirs",
                  key: "count",
                  width: 90,
                  align: "center",
                  render: (_, row) => (
                    <Tag color="cyan" style={{ fontWeight: 700 }}>
                      {row.allGcCodes.length}
                    </Tag>
                  ),
                },
              ];

              return (
                <Card
                  title={
                    <Space>
                      <UserOutlined />
                      Enseignants — Compétences techniques associées
                    </Space>
                  }
                  size="small"
                  className="rice-table-card"
                  style={{ marginBottom: 16 }}
                  extra={
                    <Button
                      size="small"
                      type="text"
                      icon={<SaveOutlined />}
                      onClick={() => {
                        const csv =
                          "Enseignant;Compétences techniques associées\n" +
                          rows
                            .map((r) => `"${r.name}";"${r.allGcCodes.join("; ")}"`)
                            .join("\n");
                        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "enseignants_competences.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Exporter CSV
                    </Button>
                  }
                >
                  <Table
                    dataSource={rows}
                    columns={columns}
                    size="small"
                    pagination={false}
                    bordered={false}
                  />
                </Card>
              );
            })()}

            <div className="rice-step3-actions">
              {!report && (
                <Button
                  size="large"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => setCurrentStep(2)}
                  className="rice-action-btn"
                >
                  Retour à la révision
                </Button>
              )}
              {report && (
                <Button
                  type="primary"
                  size="large"
                  icon={<ApartmentOutlined />}
                  onClick={() => navigate("/home/competences")}
                  className="rice-action-btn rice-action-btn-primary"
                >
                  Consulter le référentiel
                </Button>
              )}
              <Button
                size="large"
                icon={<ReloadOutlined />}
                onClick={resetAll}
                className="rice-action-btn"
              >
                Nouvelle analyse
              </Button>
            </div>
          </>
        )}

        {/* ── Merge Modal ───────────────────────────────────────────────────── */}
        <Modal
          title={
            <Space>
              <MergeCellsOutlined /> Fusionner deux savoirs
            </Space>
          }
          open={mergeModal}
          onOk={confirmMerge}
          onCancel={() => {
            setMergeModal(false);
            setMergeSrc(null);
            setMergeDst(null);
          }}
          okText="Fusionner"
          cancelText="Annuler"
          okButtonProps={{ disabled: !mergeDst }}
          destroyOnClose
        >
          <Alert
            type="warning"
            message="Le savoir source sera supprimé et ses enseignants fusionnés vers le savoir cible."
            style={{ marginBottom: 16, borderRadius: 8 }}
            showIcon
          />
          {mergeSrc && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ marginRight: 8 }}>
                Source :
              </Text>
              <Tag color="red">
                {allSavoirsFlat.find(
                  (s) =>
                    s.di === mergeSrc.di &&
                    s.ci === mergeSrc.ci &&
                    s.sci === mergeSrc.sci &&
                    s.si === mergeSrc.si,
                )?.nom ?? "?"}
              </Tag>
            </div>
          )}
          <div>
            <Text strong>Cible :</Text>
            <Select
              showSearch
              optionFilterProp="children"
              placeholder="Rechercher et sélectionner le savoir cible…"
              style={{ width: "100%", marginTop: 8 }}
              onChange={(key) => {
                const [di, ci, sci, si] = key.split("-").map(Number);
                setMergeDst({ di, ci, sci, si });
              }}
              notFoundContent={
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Aucun savoir trouvé"
                />
              }
            >
              {allSavoirsFlat
                .filter(
                  (s) =>
                    !(
                      mergeSrc &&
                      s.di === mergeSrc.di &&
                      s.ci === mergeSrc.ci &&
                      s.sci === mergeSrc.sci &&
                      s.si === mergeSrc.si
                    ),
                )
                .map((s) => (
                  <Option
                    key={`${s.di}-${s.ci}-${s.sci}-${s.si}`}
                    value={`${s.di}-${s.ci}-${s.sci}-${s.si}`}
                  >
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
