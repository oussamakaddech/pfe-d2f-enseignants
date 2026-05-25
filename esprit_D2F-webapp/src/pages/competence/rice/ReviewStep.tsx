import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Input,
  Space,
  Tag,
  Typography,
  message,
  Form,
  Select,
  Popconfirm,
  Segmented,
} from "antd";
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  CopyOutlined,
  EyeOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
} from "@ant-design/icons";
import SavoirCard from "./SavoirCard";
import { cloneDeep, DepartmentBadge } from "./constants";
import "@/styles/pages/review-step.css";

const { Text } = Typography;

type EnseignantRef = { id?: unknown; nom?: string; prenom?: string; [key: string]: unknown };
type SavoirNode = { code?: string; nom?: string; niveau?: string; type?: string; enseignantsSuggeres?: unknown[] };
type SousCompNode = { code?: string; nom?: string; savoirs?: SavoirNode[] };
type CompNode = { code?: string; nom?: string; savoirs?: SavoirNode[]; sousCompetences?: SousCompNode[] };
type DomaineNode = { code?: string; nom?: string; competences?: CompNode[] };

function addOrphansFromSavoirs(orphans: Set<string>, savoirs: SavoirNode[], validIds: Set<string>) {
  (savoirs ?? []).forEach((s) => {
    (s.enseignantsSuggeres ?? []).forEach((id) => {
      const sid = String(id);
      if (!validIds.has(sid)) orphans.add(sid);
    });
  });
}

function collectOrphanIds(tree: DomaineNode[], validIds: Set<string>): Set<string> {
  const orphans = new Set<string>();
  (tree ?? []).forEach((d) => {
    (d.competences ?? []).forEach((c) => {
      addOrphansFromSavoirs(orphans, c.savoirs ?? [], validIds);
      (c.sousCompetences ?? []).forEach((sc) => addOrphansFromSavoirs(orphans, sc.savoirs ?? [], validIds));
    });
  });
  return orphans;
}

function cleanupSavoirOrphans(savoirs: SavoirNode[], invalid: Set<string>) {
  (savoirs ?? []).forEach((s) => {
    s.enseignantsSuggeres = (s.enseignantsSuggeres ?? []).filter((id) => !invalid.has(String(id)));
  });
}

function cleanupCompOrphans(comp: CompNode, invalid: Set<string>) {
  cleanupSavoirOrphans(comp.savoirs ?? [], invalid);
  (comp.sousCompetences ?? []).forEach((sc) => cleanupSavoirOrphans(sc.savoirs ?? [], invalid));
}

function appendSavoirText(lines: string[], s: SavoirNode, ensMap: Map<string, EnseignantRef>, niveauLabel: Record<string, string>, indent: string) {
  const teachers = (s.enseignantsSuggeres ?? []).map((id) => {
    const e = ensMap.get(String(id));
    if (!e) return String(id);
    return `${e.prenom ?? ""} ${e.nom ?? ""}`.trim() || String(id);
  });
  lines.push(
    `${indent}- ${s.code ?? ""} | ${s.nom ?? ""} | ${niveauLabel[s.niveau ?? ""] ?? (s.niveau ?? "")} | ${s.type ?? ""}`,
    `${indent}  Enseignants: ${teachers.length ? teachers.join(", ") : "Aucun"}`
  );
}

function appendCompText(lines: string[], c: CompNode, ensMap: Map<string, EnseignantRef>, niveauLabel: Record<string, string>) {
  lines.push(`  Competence: ${c.code ?? ""} - ${c.nom ?? ""}`.trim());
  (c.savoirs ?? []).forEach((s) => appendSavoirText(lines, s, ensMap, niveauLabel, "    "));
  (c.sousCompetences ?? []).forEach((sc) => {
    lines.push(`    Sous-competence: ${sc.code ?? ""} - ${sc.nom ?? ""}`.trim());
    (sc.savoirs ?? []).forEach((s) => appendSavoirText(lines, s, ensMap, niveauLabel, "      "));
  });
}

function flattenSousComp(rows: Record<string, unknown>[], d: DomaineNode, di: number, c: CompNode, ci: number) {
  (c.sousCompetences ?? []).forEach((sc, sci) => {
    (sc.savoirs ?? []).forEach((s, si) => {
      rows.push({ ...s, di, ci, sci, si, domaineNom: d.nom });
    });
  });
}

function flattenTree(tree: DomaineNode[]) {
  const rows: Record<string, unknown>[] = [];
  (tree ?? []).forEach((d, di) => (d.competences ?? []).forEach((c, ci) => {
    (c.savoirs ?? []).forEach((s, si) => {
      rows.push({ ...s, di, ci, sci: -1, si, domaineNom: d.nom });
    });
    flattenSousComp(rows, d, di, c, ci);
  }));
  return rows;
}

function pushScCompOpts(opts: { label: string; value: string }[], d: DomaineNode, di: number, c: CompNode, ci: number) {
  (c.sousCompetences ?? []).forEach((sc, sci) => {
    opts.push({ label: `${d.code ?? ""} · ${c.code ?? ""} · ${sc.code ?? ""}`, value: JSON.stringify([di, ci, sci]) });
  });
}

// Top-level render helpers to reduce nested function depth inside the component
function renderSavoirItem(savoir, di, ci, sci, si, ctx) {
  const {
    setSelectedNode, editingNom, setEditingNom, commitRename, startRename,
    toggleType, setNiveau, setEnseignants, deleteSavoir, openMerge, setMergeModal,
    onSavoirDragStart, onSavoirDragEnd, mergedEnseignants, showInlineHint,
  } = ctx;

  return (
    <div
      key={savoir.tmpId ?? `${di}-${ci}-${sci}-${si}`}
      role="button"
      tabIndex={0}
      className={`tree-node-row ${ctx.selectedNode?.type === "savoir" && ctx.selectedNode.path?.[0] === di && ctx.selectedNode.path?.[1] === ci && ctx.selectedNode.path?.[2] === sci && ctx.selectedNode.path?.[3] === si ? "selected" : ""}`}
      onClick={() => setSelectedNode({ type: "savoir", path: [di, ci, sci, si], data: cloneDeep(savoir) })}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedNode({ type: "savoir", path: [di, ci, sci, si], data: cloneDeep(savoir) }); } }}
    >
      <SavoirCard
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
        onSavoirDragStart={onSavoirDragStart}
        onSavoirDragEnd={onSavoirDragEnd}
        isBeingDragged={false}
        allEnseignants={mergedEnseignants}
        inlineHint={showInlineHint && (savoir.enseignantsSuggeres ?? []).length === 0}
      />
    </div>
  );
}

function renderSavoirsList(list, di, ci, sci, ctx) {
  return (
    <div className="tree-savoirs">
      {(list ?? []).map((savoir, si) => renderSavoirItem(savoir, di, ci, sci, si, ctx))}
    </div>
  );
}

function renderSousCompBlock(sc, di, ci, sci, ctx) {
  const { treeFilteredIndices, isEditingPath, markMatch, setSelectedNode, editingNom, setEditingNom, commitRename } = ctx;
  if (treeFilteredIndices && !treeFilteredIndices.visibleSci.has(`${di}-${ci}-${sci}`)) return null;
  return (
    <div className="tree-sous-comp" key={`sc-${di}-${ci}-${sci}`}>
      <div
        role="button"
        tabIndex={0}
        className={`tree-node-row ${ctx.selectedNode?.type === "sousComp" && ctx.selectedNode.path?.[0] === di && ctx.selectedNode.path?.[1] === ci && ctx.selectedNode.path?.[2] === sci ? "selected" : ""}`}
        onClick={() => setSelectedNode({ type: "sousComp", path: [di, ci, sci], data: cloneDeep(sc) })}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedNode({ type: "sousComp", path: [di, ci, sci], data: cloneDeep(sc) }); } }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}
      >
        <Space>
          <Tag color="cyan">{sc.code}</Tag>
          {isEditingPath([di, ci, sci]) ? (
            <Input
              size="small"
              value={editingNom.value}
              onChange={(e) => setEditingNom((p) => ({ ...p, value: e.target.value }))}
              onPressEnter={commitRename}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === "Escape" && setEditingNom(null)}
              autoFocus
              style={{ width: 240 }}
            />
          ) : (
            <Text>{markMatch(sc.nom)}</Text>
          )}
          <Tag>{(sc.savoirs ?? []).length} savoirs</Tag>
        </Space>
        <Space>
          <Button size="small" type="text" onClick={(e) => { e.stopPropagation(); setSelectedNode({ type: "sousComp", path: [di, ci, sci], data: cloneDeep(sc) }); }} icon={<EditOutlined />} />
        </Space>
      </div>

      {renderSavoirsList(sc.savoirs, di, ci, sci, ctx)}
    </div>
  );
}

function renderCompetenceBlock(comp, di, ci, ctx) {
  const { treeFilteredIndices, expandedCompKeys, setExpandedCompKeys, isEditingPath, markMatch, setSelectedNode, editingNom, setEditingNom, commitRename } = ctx;
  if (treeFilteredIndices && !treeFilteredIndices.visibleCi.has(`${di}-${ci}`)) return null;
  const cKey = `d-${di}-c-${ci}`;
  const cOpen = expandedCompKeys.includes(cKey);
  return (
    <div className="tree-competence" key={cKey}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Space>
          <Tag color="purple">{comp.code}</Tag>
          {isEditingPath([di, ci]) ? (
            <Input
              size="small"
              value={editingNom.value}
              onChange={(e) => setEditingNom((p) => ({ ...p, value: e.target.value }))}
              onPressEnter={commitRename}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === "Escape" && setEditingNom(null)}
              autoFocus
              style={{ width: 260 }}
            />
          ) : (
            <Text>{markMatch(comp.nom)}</Text>
          )}
        </Space>
        <Space>
          <Tag>{(comp.sousCompetences ?? []).length} SC</Tag>
          <Tag color="geekblue">{(comp.savoirs ?? []).length} savoirs</Tag>
          <Button size="small" type="text" onClick={(e) => { e.stopPropagation(); setExpandedCompKeys((prev) => prev.includes(cKey) ? prev.filter((k) => k !== cKey) : [...prev, cKey]); }}>{cOpen ? "▾" : "▸"}</Button>
          <Button size="small" type="text" onClick={(e) => { e.stopPropagation(); setSelectedNode({ type: "competence", path: [di, ci], data: cloneDeep(comp) }); }} icon={<EditOutlined />} />
        </Space>
      </div>

      {cOpen && (
        <div className="tree-sous-comp">
          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <Space>
              <Text>Savoirs de la compétence</Text>
              <Tag>{(comp.savoirs ?? []).length} savoirs</Tag>
            </Space>
          </div>
          {renderSavoirsList(comp.savoirs, di, ci, -1, ctx)}
        </div>
      )}

      {cOpen && (comp.sousCompetences ?? []).map((sc, sci) => renderSousCompBlock(sc, di, ci, sci, ctx))}
    </div>
  );
}

function renderDomainBlock(domaine, di, ctx) {
  const { treeFilteredIndices, expandedDomainKeys, setExpandedDomainKeys, isEditingPath, markMatch, setSelectedNode, editingNom, setEditingNom, commitRename } = ctx;
  if (treeFilteredIndices && !treeFilteredIndices.visibleDi.has(di)) return null;
  const dKey = `d-${di}`;
  const dOpen = expandedDomainKeys.includes(dKey);
  return (
    <div key={dKey} className="tree-domaine">
      <div
        role="button"
        tabIndex={0}
        className={`tree-node-row ${ctx.selectedNode?.type === "domaine" && ctx.selectedNode.path?.[0] === di ? "selected" : ""}`}
        onClick={() => setSelectedNode({ type: "domaine", path: [di], data: cloneDeep(domaine) })}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedNode({ type: "domaine", path: [di], data: cloneDeep(domaine) }); } }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <Space>
          <Tag color="blue">{domaine.code}</Tag>
          {isEditingPath([di]) ? (
            <Input
              size="small"
              value={editingNom.value}
              onChange={(e) => setEditingNom((p) => ({ ...p, value: e.target.value }))}
              onPressEnter={commitRename}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === "Escape" && setEditingNom(null)}
              autoFocus
              style={{ width: 260 }}
            />
          ) : (
            <Text strong>{markMatch(domaine.nom)}</Text>
          )}
        </Space>
        <Space>
          <Tag>{(domaine.competences ?? []).length} comp</Tag>
          <Button size="small" type="text" onClick={(e) => { e.stopPropagation(); setExpandedDomainKeys((prev) => prev.includes(dKey) ? prev.filter((k) => k !== dKey) : [...prev, dKey]); }}>{dOpen ? "▾" : "▸"}</Button>
          <Button size="small" type="text" onClick={(e) => { e.stopPropagation(); setSelectedNode({ type: "domaine", path: [di], data: cloneDeep(domaine) }); }} icon={<EditOutlined />} />
        </Space>
      </div>

      {dOpen && (domaine.competences ?? []).map((comp, ci) => renderCompetenceBlock(comp, di, ci, ctx))}
    </div>
  );
}

interface ReviewStepProps {
  tree: DomaineNode[];
  setTree: (tree: DomaineNode[]) => void;
  treeSearch: string;
  setTreeSearch: (v: string) => void;
  editingNom: Record<string, string> | null;
  setEditingNom: (v: Record<string, string> | null) => void;
  startRename: (id: string) => void;
  commitRename: (id: string, val: string) => void;
  deleteSavoir: (di: number, ci: number, sci: number) => void;
  deleteSC: (di: number, ci: number, sci: number) => void;
  deleteComp: (di: number, ci: number) => void;
  deleteDomaine: (di: number) => void;
  toggleType: (di: number, ci: number, sci: number) => void;
  setNiveau: (di: number, ci: number, sci: number, niveau: string) => void;
  setEnseignants: (di: number, ci: number, sci: number, ids: string[]) => void;
  openMerge: (source: string, target: string) => void;
  setMergeModal: (v: { open: boolean; source: string; target: string } | null) => void;
  liveStats: { totalSavoirs: number; enseignantsAssigned: number };
  treeFilteredIndices?: Record<string, number[]>;
  departement: string;
  dbEnseignants: EnseignantRef[];
  allSavoirsFlat: SavoirNode[];
  onSavoirDragStart: (e: React.DragEvent, node: SavoirNode) => void;
  onSavoirDragEnd: (e: React.DragEvent) => void;
  setCurrentStep: (step: number) => void;
  updateNodeField: (di: number, ci: number, sci: number, field: string, value: unknown) => void;
  moveSavoirToSC: (srcDi: number, srcCi: number, srcSci: number, tgtDi: number, tgtCi: number, tgtSci: number) => void;
  setCreateEnsTarget?: (v: { di: number; ci: number; sci: number } | null) => void;
  setCreateEnsData?: (v: { nom: string; prenom: string; email: string } | null) => void;
  setCreateEnsModal?: (v: boolean) => void;
}

export default function ReviewStep({
  tree,
  setTree,
  treeSearch,
  setTreeSearch,
  editingNom,
  setEditingNom,
  startRename,
  commitRename,
  deleteSavoir,
  deleteSC,
  deleteComp,
  deleteDomaine,
  toggleType,
  setNiveau,
  setEnseignants,
  openMerge,
  setMergeModal,
  liveStats,
  treeFilteredIndices,
  departement,
  dbEnseignants,
  allSavoirsFlat,
  onSavoirDragStart,
  onSavoirDragEnd,
  setCurrentStep,
  updateNodeField,
  moveSavoirToSC,
  setCreateEnsTarget,
  setCreateEnsData,
  setCreateEnsModal,
}: ReviewStepProps) {
  const [expandedDomainKeys, setExpandedDomainKeys] = useState([]);
  const [expandedCompKeys, setExpandedCompKeys] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showInlineHint, setShowInlineHint] = useState(true);
  // Removed: `creatingFrom` and `creating` + extracted-names UI and handlers.
  // New: `localTeachers` holds user-created local teachers and any edited DB teachers.
  const [localTeachers] = useState([]);
  // Selected node for the properties panel
  const [selectedNode, setSelectedNode] = useState(null);
  const [propsForm] = Form.useForm();

  const mergedEnseignants = useMemo(() => {
    const dbMap = new Map((dbEnseignants ?? []).map((e) => [String(e.id ?? e.enseignantId), e]));
    // localTeachers overrides DB entries when ids collide (edits or local-created)
    localTeachers.forEach((e) => dbMap.set(String(e.id), e));
    return Array.from(dbMap.values());
  }, [dbEnseignants, localTeachers]);

  const orphanIds = useMemo(() => {
    const validIds = new Set(mergedEnseignants.map((e) => String(e.id ?? e.enseignantId)));
    return collectOrphanIds(tree, validIds);
  }, [tree, mergedEnseignants]);

  // Removed: extractedEnseignants matching logic and the "noms extraits des fiches" UI.

  const allExpanded = useMemo(() => {
    const dk = (tree ?? []).length;
    const ck = (tree ?? []).reduce((a, d) => a + (d.competences ?? []).length, 0);
    return expandedDomainKeys.length === dk && expandedCompKeys.length === ck;
  }, [tree, expandedDomainKeys, expandedCompKeys]);

  const assignedSavoirs = useMemo(
    () => allSavoirsFlat.filter((s) => (s.enseignantsSuggeres ?? []).length > 0).length,
    [allSavoirsFlat],
  );

  const coverage = allSavoirsFlat.length ? Math.round((assignedSavoirs * 100) / allSavoirsFlat.length) : 0;
  let progressColor = "#22c55e";
  if (coverage <= 33) progressColor = "#ef4444";
  else if (coverage <= 66) progressColor = "#f59e0b";
  else if (coverage < 100) progressColor = "#eab308";

  const totalSavoirs = allSavoirsFlat.length;

  useEffect(() => {
    const hasAnyAssigned = allSavoirsFlat.some((s) => (s.enseignantsSuggeres ?? []).length > 0);
    if (hasAnyAssigned) {
      setShowInlineHint(false);
      return;
    }
    const t = setTimeout(() => setShowInlineHint(false), 10000);
    return () => clearTimeout(t);
  }, [allSavoirsFlat]);

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedDomainKeys([]);
      setExpandedCompKeys([]);
      return;
    }
    const dk = [];
    const ck = [];
    (tree ?? []).forEach((d, di) => {
      dk.push(`d-${di}`);
      (d.competences ?? []).forEach((_, ci) => ck.push(`d-${di}-c-${ci}`));
    });
    setExpandedDomainKeys(dk);
    setExpandedCompKeys(ck);
  };

  const markMatch = (value) => {
    const q = (treeSearch || "").trim();
    if (!q || !value) return value;
    const escaped = q.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const re = new RegExp(`(${escaped})`, "ig");
    return String(value).split(re).map((chunk, idx) => (
      chunk.toLowerCase() === q.toLowerCase() ? <mark key={`${chunk}-${idx}`}>{chunk}</mark> : chunk
    ));
  };

  const isEditingPath = (path) => (editingNom?.path?.join("-") === path.join("-"));

  const cleanupOrphans = () => {
    const invalid = new Set(Array.from(orphanIds));
    if (invalid.size === 0) return;
    const next = cloneDeep(tree);
    (next ?? []).forEach((d: DomaineNode) => {
      (d.competences ?? []).forEach((c: CompNode) => cleanupCompOrphans(c, invalid));
    });
    setTree(next);
    message.success("IDs orphelins nettoyés");
  };

  

  const exportCsv = () => {
    const header = ["savoir_code", "savoir_nom", "enseignants_ids"];
    const rows = flattenTree(tree).map((s) => [s.code, s.nom, (s.enseignantsSuggeres ?? []).join(";")]);
    const esc = (v) => `"${String(v ?? "").replaceAll("\"", "\"\"")}"`;
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rice_review.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyResultText = async () => {
    const ensMap = new Map(
      (mergedEnseignants ?? []).map((e) => [String(e.id ?? e.enseignantId), e]),
    );
    const niveauLabel = {
      N1_DEBUTANT: "Niveau 1",
      N2_ELEMENTAIRE: "Niveau 2",
      N3_INTERMEDIAIRE: "Niveau 3",
      N4_AVANCE: "Niveau 4",
      N5_EXPERT: "Niveau 5",
    };

    const lines: string[] = [];
    (tree ?? []).forEach((d: DomaineNode) => {
      lines.push(`Domaine: ${d.code ?? ""} - ${d.nom ?? ""}`.trim());
      (d.competences ?? []).forEach((c: CompNode) => appendCompText(lines, c, ensMap, niveauLabel));
    });

    const text = lines.join("\n").trim();
    if (!text) {
      message.warning("Aucun résultat à copier");
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy"); // NOSONAR — legacy fallback, modern Clipboard API used above
        ta.remove();
      }
      message.success("Texte du résultat copié");
    } catch {
      message.error("Copie impossible");
    }
  };

    const scOptions = useMemo(() => {
      const opts: { label: string; value: string }[] = [];
      (tree ?? []).forEach((d: DomaineNode, di) => (d.competences ?? []).forEach((c: CompNode, ci) => {
        opts.push({ label: `${d.code ?? ""} · ${c.code ?? ""}`, value: JSON.stringify([di, ci, -1]) });
        pushScCompOpts(opts, d, di, c, ci);
      }));
      if (!selectedNode || selectedNode.type !== "savoir") return opts;
      const srcDi = selectedNode.path[0];
      const srcCi = selectedNode.path[1];
      const srcSci = selectedNode.path[2];
      return opts.filter((o) => {
        try {
          const arr = JSON.parse(o.value);
          return !(arr[0] === srcDi && arr[1] === srcCi && arr[2] === srcSci);
        } catch {
          return true;
        }
      });
    }, [tree, selectedNode]);

    const handleUpdateField = (field, value) => {
      if (!selectedNode) return;
      updateNodeField(selectedNode.path, field, value);
      setSelectedNode((p) => ({ ...p, data: { ...p.data, [field]: value } }));
    };

    const handleRemoveEnseignant = (id) => {
      if (!selectedNode) return;
      const cur = selectedNode.data?.enseignantsSuggeres ?? [];
      const next = cur.filter((x) => String(x) !== String(id));
      handleUpdateField("enseignantsSuggeres", next);
    };

    const handleMoveSavoir = (targetPath) => {
      if (!selectedNode) return;
      moveSavoirToSC(selectedNode.path, targetPath);
      setSelectedNode(null);
    };

    const deleteNode = (node) => {
      if (!node) return;
      const { type, path } = node;
      if (type === "domaine") deleteDomaine(path[0]);
      else if (type === "competence") deleteComp(path[0], path[1]);
      else if (type === "sousComp") deleteSC(path[0], path[1], path[2]);
      else if (type === "savoir") deleteSavoir(path[0], path[1], path[2], path[3]);
    };

    useEffect(() => {
      const onKey = (e) => { if (e.key === "Escape") setSelectedNode(null); };
      globalThis.addEventListener("keydown", onKey);
      return () => globalThis.removeEventListener("keydown", onKey);
    }, []);

    const ctx = {
      treeFilteredIndices,
      expandedDomainKeys,
      setExpandedDomainKeys,
      expandedCompKeys,
      setExpandedCompKeys,
      isEditingPath,
      markMatch,
      setSelectedNode,
      editingNom,
      setEditingNom,
      commitRename,
      startRename,
      toggleType,
      setNiveau,
      setEnseignants,
      deleteSavoir,
      deleteSC,
      deleteComp,
      deleteDomaine,
      openMerge,
      setMergeModal,
      onSavoirDragStart,
      onSavoirDragEnd,
      mergedEnseignants,
      showInlineHint,
      selectedNode,
    };

    return (
    <div className="review-layout">
      <div className="review-header">
        <DepartmentBadge deptCode={departement} showIcon />
        <Text>1 domaine</Text>
        <Text>{liveStats.totalComp} compétence</Text>
        <Text>{liveStats.totalSC} sous-comp</Text>
        <Text>{liveStats.totalSavoirs} savoirs</Text>
        <div className="review-progress-wrap">
          <div className="review-progress-track">
            <div
              className={`review-progress-fill${coverage === 100 ? " pulse" : ""}`}
              style={{ width: `${coverage}%`, background: progressColor }}
            />
          </div>
          <Text>{assignedSavoirs}/{totalSavoirs} savoirs couverts ({coverage}%)</Text>
        </div>

        <div style={{ marginLeft: "auto" }}>
          {showSearch ? (
            <Input
              size="small"
              allowClear
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              placeholder="Rechercher..."
              style={{ width: 220 }}
              onBlur={() => !treeSearch && setShowSearch(false)}
            />
          ) : (
            <Button icon={<SearchOutlined />} size="small" onClick={() => setShowSearch(true)} />
          )}
        </div>
      </div>

      <div className="review-tree-col">
        {orphanIds.size > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={`⚠️ ${orphanIds.size} enseignant(s) assignés n'existent plus en base de données.`}
            description="Leurs IDs seront ignorés lors de l'import."
            action={<Button size="small" onClick={cleanupOrphans}>Nettoyer</Button>}
          />
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Space>
            <ApartmentOutlined />
            <Text strong>Structure de compétences</Text>
            <Badge count={liveStats.totalSavoirs} style={{ background: "#4f46e5" }} />
          </Space>
          <Space>
            <Button size="small" onClick={() => setExpandedDomainKeys([])}>Tout replier</Button>
            <Button size="small" onClick={toggleExpandAll}>{allExpanded ? "Tout replier" : "Tout déplier"}</Button>
            <Input
              size="small"
              placeholder="Rechercher..."
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              allowClear
              style={{ width: 180 }}
            />
          </Space>
        </div>

        {(tree ?? []).map((domaine, di) => renderDomainBlock(domaine, di, ctx))}
      </div>

      

      <div className="review-props-panel">
        {selectedNode ? (
          <div className="props-panel-inner">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                <div>
                  <Badge count={0} style={{ background: "transparent" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{`${selectedNode.data?.code ?? ""} · ${selectedNode.data?.nom ?? ""}`}</Text>
                  <Text type="secondary">{selectedNode.type}</Text>
                </div>
              </div>
            </div>

            <Form form={propsForm} layout="vertical">
              <Form.Item label="Code" rules={[{ required: true, min: 2, pattern: /^[A-Za-z0-9-]+$/, message: 'Code : min 2 caractères, lettres/chiffres/tirets' }]}>
                <Input value={selectedNode.data?.code ?? ""} onChange={(e) => handleUpdateField("code", e.target.value)} />
              </Form.Item>

              <Form.Item label="Nom" rules={[{ required: true, message: "Nom requis" }]}>
                <Input value={selectedNode.data?.nom ?? ""} onChange={(e) => handleUpdateField("nom", e.target.value)} />
              </Form.Item>

              <Form.Item label="Description">
                <Input.TextArea rows={3} value={selectedNode.data?.description ?? ""} onChange={(e) => handleUpdateField("description", e.target.value)} />
              </Form.Item>

              {selectedNode.type === "savoir" && (
                <>
                  <Button
                    block
                    type="primary"
                    icon={<UserOutlined />}
                    style={{ marginBottom: 12 }}
                    onClick={() => {
                      setCreateEnsTarget({ path: selectedNode.path });
                      setCreateEnsData({ nom: "", prenom: "", mail: "" });
                      setCreateEnsModal(true);
                    }}
                  >
                    Créer et lier à ce savoir
                  </Button>

                  <Form.Item label="Type">
                    <Segmented options={[{ label: "THEORIQUE", value: "THEORIQUE" }, { label: "PRATIQUE", value: "PRATIQUE" }]} value={selectedNode.data?.type ?? "THEORIQUE"} onChange={(v) => handleUpdateField("type", v)} />
                  </Form.Item>

                  <Form.Item label="Niveau">
                    <Select value={selectedNode.data?.niveau} onChange={(v) => handleUpdateField("niveau", v)} options={[{ value: "N1_DEBUTANT", label: "Niveau 1" }, { value: "N2_ELEMENTAIRE", label: "Niveau 2" }, { value: "N3_INTERMEDIAIRE", label: "Niveau 3" }, { value: "N4_AVANCE", label: "Niveau 4" }, { value: "N5_EXPERT", label: "Niveau 5" }]} />
                  </Form.Item>

                  <Form.Item label="Enseignants affectés">
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      {(selectedNode.data?.enseignantsSuggeres ?? []).map((id) => {
                        const e = (mergedEnseignants ?? []).find((m) => String(m.id ?? m.enseignantId) === String(id));
                        const label = e ? `${e.prenom ?? ""} ${e.nom ?? ""}`.trim() : String(id);
                        return <Tag key={id} closable onClose={() => handleRemoveEnseignant(id)}>{label}</Tag>;
                      })}
                    </div>
                    <Select mode="multiple" placeholder="Ajouter un enseignant" value={(selectedNode.data?.enseignantsSuggeres ?? [])} onChange={(val) => handleUpdateField("enseignantsSuggeres", val)} options={(mergedEnseignants ?? []).map((m) => ({ value: String(m.id ?? m.enseignantId), label: `${m.prenom ?? ""} ${m.nom ?? ""}` }))} />
                  </Form.Item>

                  <Form.Item label="Déplacer vers">
                    <Select placeholder="Déplacer ce savoir vers une autre sous-compétence" onChange={(v) => handleMoveSavoir(JSON.parse(v))} options={scOptions} />
                  </Form.Item>
                </>
              )}

              {(selectedNode.type === "competence" || selectedNode.type === "sousComp") && (
                <Form.Item label="Codes référentiels (refCodes)">
                  <Select mode="tags" tokenSeparators={[",", " "]} value={selectedNode.data?.refCodes ?? []} onChange={(v) => handleUpdateField("refCodes", v)} />
                </Form.Item>
              )}
            </Form>

            <div style={{ marginTop: 12, position: "sticky", bottom: 8 }}>
              <Popconfirm
                title="Supprimer ce nœud ?"
                description="Cette action supprimera aussi tous ses enfants."
                okText="Supprimer"
                cancelText="Annuler"
                okButtonProps={{ danger: true }}
                onConfirm={() => { deleteNode(selectedNode); setSelectedNode(null); }}
              >
                <Button danger block icon={<DeleteOutlined />}>Supprimer {selectedNode.type}</Button>
              </Popconfirm>
            </div>
          </div>
        ) : (
          <div className="props-panel-empty">
            <ApartmentOutlined style={{ fontSize: 64, color: "var(--color-text-tertiary)" }} />
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <Text style={{ opacity: 0.85 }}>Sélectionnez un élément dans l&apos;arbre pour modifier ses propriétés</Text>
            </div>
          </div>
        )}
      </div>

      <div className="review-footer">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(0)}>
          Recommencer
        </Button>

        <Text type="secondary">
          {liveStats.totalSavoirs} savoirs · {liveStats.enseignantsAssigned} enseignants assignés
        </Text>

        <Space>
          <Button onClick={exportCsv}>Exporter CSV</Button>
          <Button icon={<CopyOutlined />} onClick={copyResultText}>Copier texte</Button>
          <Button type="primary" icon={<EyeOutlined />} onClick={() => setCurrentStep(3)}>
            Voir le récapitulatif →
          </Button>
        </Space>
      </div>
    </div>
  );
}





