import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Form, Input, Space, Typography, message } from "antd";
import { ApartmentOutlined, ArrowLeftOutlined, CopyOutlined, EyeOutlined, SearchOutlined } from "@ant-design/icons";
import { cloneDeep, DepartmentBadge } from "./constants";
import TreeBrowser from "./review/TreeBrowser";
import NodePropsPanel from "./review/NodePropsPanel";
import type { DomaineNode, SavoirNode, EnseignantRef, SelectedNode, TreeCtx } from "./review/TreeBrowser";
import "@/styles/pages/review-step.css";

const { Text } = Typography;

function collectSavoirs(c: { savoirs?: { enseignantsSuggeres?: unknown[] }[]; sousCompetences?: { savoirs?: { enseignantsSuggeres?: unknown[] }[] }[] }): { enseignantsSuggeres?: unknown[] }[] {
  return [...(c.savoirs ?? []), ...(c.sousCompetences ?? []).flatMap((sc) => sc.savoirs ?? [])];
}

function collectOrphanIds(tree: DomaineNode[], validIds: Set<string>): Set<string> {
  const orphans = new Set<string>();
  for (const d of tree ?? [])
    for (const c of d.competences ?? [])
      for (const s of collectSavoirs(c))
        for (const id of s.enseignantsSuggeres ?? []) {
          const sid = String(id);
          if (!validIds.has(sid)) orphans.add(sid);
        }
  return orphans;
}

function flattenTree(tree: DomaineNode[]) {
  const rows: Record<string, unknown>[] = [];
  for (const [di, d] of (tree ?? []).entries()) {
    for (const [ci, c] of (d.competences ?? []).entries()) {
      appendDirectSavoirs(rows, d, di, c, ci);
      for (const [sci, sc] of (c.sousCompetences ?? []).entries()) {
        appendSCSavoirs(rows, d, di, c, ci, sc, sci);
      }
    }
  }
  return rows;
}

function appendDirectSavoirs(
  rows: Record<string, unknown>[],
  d: DomaineNode,
  di: number,
  c: { savoirs?: { enseignantsSuggeres?: unknown[] }[] },
  ci: number,
) {
  for (const [si, s] of (c.savoirs ?? []).entries()) {
    rows.push({ ...s, di, ci, sci: -1, si, domaineNom: d.nom });
  }
}

function appendSCSavoirs(
  rows: Record<string, unknown>[],
  d: DomaineNode,
  di: number,
  c: { savoirs?: { enseignantsSuggeres?: unknown[] }[]; sousCompetences?: { savoirs?: { enseignantsSuggeres?: unknown[] }[] }[] },
  ci: number,
  sc: { savoirs?: { enseignantsSuggeres?: unknown[] }[] },
  sci: number,
) {
  for (const [si, s] of (sc.savoirs ?? []).entries()) {
    rows.push({ ...s, di, ci, sci, si, domaineNom: d.nom });
  }
}

interface LiveStats { totalSavoirs: number; enseignantsAssigned: number; totalComp?: number; totalSC?: number; }

interface ReviewStepProps {
  tree: DomaineNode[]; setTree: (tree: DomaineNode[]) => void;
  treeSearch: string; setTreeSearch: (v: string) => void;
  editingNom: Record<string, string> | null; setEditingNom: (v: Record<string, string> | null) => void;
  startRename: (id: string) => void; commitRename: (id: string, val: string) => void;
  deleteSavoir: (...args: number[]) => void; deleteSC: (...args: number[]) => void;
  deleteComp: (...args: number[]) => void; deleteDomaine: (di: number) => void;
  toggleType: (di: number, ci: number, sci: number) => void;
  setNiveau: (di: number, ci: number, sci: number, niveau: string) => void;
  setEnseignants: (di: number, ci: number, sci: number, ids: string[]) => void;
  openMerge: (source: string, target: string) => void;
  setMergeModal: (v: { open: boolean; source: string; target: string } | null) => void;
  liveStats: LiveStats; treeFilteredIndices?: Record<string, Set<string>>;
  departement: string; dbEnseignants: EnseignantRef[]; allSavoirsFlat: SavoirNode[];
  onSavoirDragStart: (e: React.DragEvent, node: SavoirNode) => void;
  onSavoirDragEnd: (e: React.DragEvent) => void;
  setCurrentStep: (step: number) => void;
  updateNodeField: (path: number[], field: string, value: unknown) => void;
  moveSavoirToSC: (srcPath: number[], tgtPath: number[]) => void;
  setCreateEnsTarget?: (v: { path: number[] } | null) => void;
  setCreateEnsData?: (v: { nom: string; prenom: string; mail: string } | null) => void;
  setCreateEnsModal?: (v: boolean) => void;
}

function pushScOpts(opts: { label: string; value: string }[], d: DomaineNode, di: number, c: { code?: string }, ci: number): void {
  opts.push({ label: `${d.code ?? ""} · ${c.code ?? ""}`, value: JSON.stringify([di, ci, -1]) });
  for (const [sci, sc] of (c.sousCompetences ?? []).entries())
    opts.push({ label: `${d.code ?? ""} · ${c.code ?? ""} · ${sc.code ?? ""}`, value: JSON.stringify([di, ci, sci]) });
}

export default function ReviewStep({
  tree, setTree, treeSearch, setTreeSearch, editingNom, setEditingNom,
  startRename, commitRename, deleteSavoir, deleteSC, deleteComp, deleteDomaine,
  toggleType, setNiveau, setEnseignants, openMerge, setMergeModal,
  liveStats, treeFilteredIndices, departement, dbEnseignants, allSavoirsFlat,
  onSavoirDragStart, onSavoirDragEnd, setCurrentStep, updateNodeField, moveSavoirToSC,
  setCreateEnsTarget, setCreateEnsData, setCreateEnsModal,
}: Readonly<ReviewStepProps>) {
  const [expandedDomainKeys, setExpandedDomainKeys] = useState<string[]>([]);
  const [expandedCompKeys, setExpandedCompKeys] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showInlineHint, setShowInlineHint] = useState(true);
  const [localTeachers] = useState<EnseignantRef[]>([]);
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const [propsForm] = Form.useForm();

  const mergedEnseignants = useMemo(() => {
    const dbMap = new Map((dbEnseignants ?? []).map((e) => [String(e.id ?? e.enseignantId), e]));
    localTeachers.forEach((e) => dbMap.set(String(e.id), e));
    return Array.from(dbMap.values());
  }, [dbEnseignants, localTeachers]);

  const orphanIds = useMemo(() => {
    const validIds = new Set(mergedEnseignants.map((e) => String(e.id ?? e.enseignantId)));
    return collectOrphanIds(tree, validIds);
  }, [tree, mergedEnseignants]);

  const allExpanded = useMemo(() => {
    const dk = (tree ?? []).length;
    const ck = (tree ?? []).reduce((a, d) => a + (d.competences ?? []).length, 0);
    return expandedDomainKeys.length === dk && expandedCompKeys.length === ck;
  }, [tree, expandedDomainKeys, expandedCompKeys]);

  const assignedSavoirs = useMemo(() => allSavoirsFlat.filter((s) => (s.enseignantsSuggeres ?? []).length > 0).length, [allSavoirsFlat]);
  const coverage = allSavoirsFlat.length ? Math.round((assignedSavoirs * 100) / allSavoirsFlat.length) : 0;
  let progressColor = "#22c55e";
  if (coverage <= 33) progressColor = "#ef4444"; else if (coverage <= 66) progressColor = "#f59e0b"; else if (coverage < 100) progressColor = "#eab308";

  useEffect(() => {
    const hasAnyAssigned = allSavoirsFlat.some((s) => (s.enseignantsSuggeres ?? []).length > 0);
    if (hasAnyAssigned) { setShowInlineHint(false); return; }
    const t = setTimeout(() => setShowInlineHint(false), 10000);
    return () => clearTimeout(t);
  }, [allSavoirsFlat]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedNode(null); };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, []);

  const toggleExpandAll = () => {
    if (allExpanded) { setExpandedDomainKeys([]); setExpandedCompKeys([]); return; }
    const dk: string[] = []; const ck: string[] = [];
    (tree ?? []).forEach((d, di) => { dk.push(`d-${di}`); (d.competences ?? []).forEach((_, ci) => ck.push(`d-${di}-c-${ci}`)); });
    setExpandedDomainKeys(dk); setExpandedCompKeys(ck);
  };

  const markMatch = (value: string | undefined): React.ReactNode => {
    const q = (treeSearch || "").trim();
    if (!q || !value) return value;
    const escaped = q.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const re = new RegExp(`(${escaped})`, "ig");
    return String(value).split(re).map((chunk, idx) => (chunk.toLowerCase() === q.toLowerCase() ? <mark key={`${chunk}-${idx}`}>{chunk}</mark> : chunk));
  };

  const isEditingPath = (path: number[]) => (editingNom as { path?: number[] } | null)?.path?.join("-") === path.join("-");

  const cleanupOrphans = () => {
    const invalid = new Set(Array.from(orphanIds));
    if (invalid.size === 0) return;
    const next = cloneDeep(tree) as DomaineNode[];
    for (const d of next ?? [])
      for (const c of d.competences ?? [])
        for (const s of collectSavoirs(c))
          s.enseignantsSuggeres = (s.enseignantsSuggeres ?? []).filter((id) => !invalid.has(String(id)));
    setTree(next); message.success("IDs orphelins nettoyés");
  };

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll("\"", "\"\"")}"`;
    const header = ["savoir_code", "savoir_nom", "enseignants_ids"];
    const rows = flattenTree(tree).map((s) => [s.code, s.nom, (s.enseignantsSuggeres as unknown[] ?? []).join(";")]);
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })), download: "rice_review.csv" });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const copyResultText = async () => {
    const lines: string[] = [];
    (tree ?? []).forEach((d) => { lines.push(`Domaine: ${d.code ?? ""} - ${d.nom ?? ""}`.trim()); });
    const text = lines.join("\n").trim();
    if (!text) { message.warning("Aucun résultat à copier"); return; }
    try { await navigator.clipboard.writeText(text); message.success("Texte du résultat copié"); } catch { message.error("Copie impossible"); }
  };


  const scOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [];
    for (const [di, d] of (tree ?? []).entries())
      for (const [ci, c] of (d.competences ?? []).entries())
        pushScOpts(opts, d, di, c, ci);
    if (!selectedNode || selectedNode.type !== "savoir") return opts;
    const [srcDi, srcCi, srcSci] = selectedNode.path;
    return opts.filter((o) => { try { const arr = JSON.parse(o.value) as number[]; return !(arr[0] === srcDi && arr[1] === srcCi && arr[2] === srcSci); } catch { return true; } });
  }, [tree, selectedNode]);

  const handleUpdateField = (field: string, value: unknown) => {
    if (!selectedNode) return;
    updateNodeField(selectedNode.path, field, value);
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, [field]: value } });
  };

  const deleteNode = (node: SelectedNode) => {
    if (!node) return;
    const { type, path } = node;
    if (type === "domaine") deleteDomaine(path[0]);
    else if (type === "competence") deleteComp(path[0], path[1]);
    else if (type === "sousComp") deleteSC(path[0], path[1], path[2]);
    else if (type === "savoir") deleteSavoir(path[0], path[1], path[2], path[3]);
  };

  const ctx: TreeCtx = {
    treeFilteredIndices, expandedDomainKeys, setExpandedDomainKeys, expandedCompKeys, setExpandedCompKeys,
    isEditingPath, markMatch, selectedNode, setSelectedNode, editingNom, setEditingNom, commitRename,
    startRename, toggleType, setNiveau, setEnseignants, deleteSavoir, openMerge, setMergeModal,
    onSavoirDragStart, onSavoirDragEnd, mergedEnseignants, showInlineHint,
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
            <div className={`review-progress-fill${coverage === 100 ? " pulse" : ""}`} style={{ width: `${coverage}%`, background: progressColor }} />
          </div>
          <Text>{assignedSavoirs}/{allSavoirsFlat.length} savoirs couverts ({coverage}%)</Text>
        </div>
        <div style={{ marginLeft: "auto" }}>
          {showSearch ? <Input size="small" allowClear value={treeSearch} onChange={(e) => setTreeSearch(e.target.value)} placeholder="Rechercher..." style={{ width: 220 }} onBlur={() => !treeSearch && setShowSearch(false)} /> : <Button icon={<SearchOutlined />} size="small" onClick={() => setShowSearch(true)} />}
        </div>
      </div>

      <div className="review-tree-col">
        {orphanIds.size > 0 && (
          <Alert type="warning" showIcon style={{ marginBottom: 12 }}
            message={`⚠️ ${orphanIds.size} enseignant(s) assignés n'existent plus en base de données.`}
            description="Leurs IDs seront ignorés lors de l'import."
            action={<Button size="small" onClick={cleanupOrphans}>Nettoyer</Button>}
          />
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Space><ApartmentOutlined /><Text strong>Structure de compétences</Text><Badge count={liveStats.totalSavoirs} style={{ background: "#4f46e5" }} /></Space>
          <Space>
            <Button size="small" onClick={() => setExpandedDomainKeys([])}>Tout replier</Button>
            <Button size="small" onClick={toggleExpandAll}>{allExpanded ? "Tout replier" : "Tout déplier"}</Button>
            <Input size="small" placeholder="Rechercher..." value={treeSearch} onChange={(e) => setTreeSearch(e.target.value)} allowClear style={{ width: 180 }} />
          </Space>
        </div>
        <TreeBrowser tree={tree} ctx={ctx} />
      </div>

      <div className="review-props-panel">
        <NodePropsPanel
          selectedNode={selectedNode} setSelectedNode={setSelectedNode} propsForm={propsForm}
          mergedEnseignants={mergedEnseignants} scOptions={scOptions}
          handleUpdateField={handleUpdateField}
          handleRemoveEnseignant={(id) => { const cur = selectedNode?.data?.enseignantsSuggeres as unknown[] ?? []; handleUpdateField("enseignantsSuggeres", cur.filter((x) => String(x) !== String(id))); }}
          handleMoveSavoir={(targetPath) => { if (!selectedNode) return; moveSavoirToSC(selectedNode.path, targetPath); setSelectedNode(null); }}
          deleteNode={deleteNode}
          setCreateEnsTarget={setCreateEnsTarget} setCreateEnsData={setCreateEnsData} setCreateEnsModal={setCreateEnsModal}
        />
      </div>

      <div className="review-footer">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(0)}>Recommencer</Button>
        <Text type="secondary">{liveStats.totalSavoirs} savoirs · {liveStats.enseignantsAssigned} enseignants assignés</Text>
        <Space>
          <Button onClick={exportCsv}>Exporter CSV</Button>
          <Button icon={<CopyOutlined />} onClick={copyResultText}>Copier texte</Button>
          <Button type="primary" icon={<EyeOutlined />} onClick={() => setCurrentStep(3)}>Voir le récapitulatif →</Button>
        </Space>
      </div>
    </div>
  );
}
