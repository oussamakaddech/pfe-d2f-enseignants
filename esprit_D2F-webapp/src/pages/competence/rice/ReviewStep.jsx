import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Divider,
  Empty,
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
import PropTypes from "prop-types";
import SavoirCard from "./SavoirCard.jsx";
import { cloneDeep, DepartmentBadge } from "./constants.jsx";
import "./ReviewStep.css";

const { Text } = Typography;

function flattenTree(tree) {
  const rows = [];
  (tree ?? []).forEach((d, di) => (d.competences ?? []).forEach((c, ci) => {
    (c.savoirs ?? []).forEach((s, si) => {
      rows.push({ ...s, di, ci, sci: -1, si, domaineNom: d.nom });
    });
    (c.sousCompetences ?? []).forEach((sc, sci) => (sc.savoirs ?? []).forEach((s, si) => {
      rows.push({ ...s, di, ci, sci, si, domaineNom: d.nom });
    }));
  }));
  return rows;
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
}) {
  const [expandedDomainKeys, setExpandedDomainKeys] = useState([]);
  const [expandedCompKeys, setExpandedCompKeys] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showInlineHint, setShowInlineHint] = useState(true);
  // Removed: `creatingFrom` and `creating` + extracted-names UI and handlers.
  // New: `localTeachers` holds user-created local teachers and any edited DB teachers.
  const [localTeachers, setLocalTeachers] = useState([]);
  // Selected node for the properties panel
  const [selectedNode, setSelectedNode] = useState(null);
  const [propsForm] = Form.useForm();

  const mergedEnseignants = useMemo(() => {
    const dbMap = new Map((dbEnseignants ?? []).map((e) => [String(e.id ?? e.enseignantId), e]));
    // localTeachers overrides DB entries when ids collide (edits or local-created)
    localTeachers.forEach((e) => dbMap.set(String(e.id), e));
    return Array.from(dbMap.values());
  }, [dbEnseignants, localTeachers]);

  const filteredTeachers = useMemo(() => mergedEnseignants, [mergedEnseignants]);

  
  const orphanIds = useMemo(() => {
    const validIds = new Set(mergedEnseignants.map((e) => String(e.id ?? e.enseignantId)));
    const orphans = new Set();
    (tree ?? []).forEach((d) => (d.competences ?? []).forEach((c) => {
      (c.savoirs ?? []).forEach((s) => {
        (s.enseignantsSuggeres ?? []).forEach((id) => {
          const sid = String(id);
          if (!validIds.has(sid)) orphans.add(sid);
        });
      });
      (c.sousCompetences ?? []).forEach((sc) => (sc.savoirs ?? []).forEach((s) => {
        (s.enseignantsSuggeres ?? []).forEach((id) => {
          const sid = String(id);
          if (!validIds.has(sid)) orphans.add(sid);
        });
      }));
    }));
    return orphans;
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
  const progressColor = coverage <= 33 ? "#ef4444" : coverage <= 66 ? "#f59e0b" : coverage < 100 ? "#eab308" : "#22c55e";

  const totalSavoirs = allSavoirsFlat.length;

  const assignedByTeacher = useMemo(() => {
    const map = new Map();
    const rows = flattenTree(tree);
    rows.forEach((s) => {
      (s.enseignantsSuggeres ?? []).forEach((id) => {
        const sid = String(id);
        if (!map.has(sid)) map.set(sid, []);
        map.get(sid).push(s);
      });
    });
    return map;
  }, [tree]);

  

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
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    (next ?? []).forEach((d) => (d.competences ?? []).forEach((c) => {
      (c.savoirs ?? []).forEach((s) => {
        s.enseignantsSuggeres = (s.enseignantsSuggeres ?? []).filter((id) => !invalid.has(String(id)));
      });
      (c.sousCompetences ?? []).forEach((sc) => (sc.savoirs ?? []).forEach((s) => {
        s.enseignantsSuggeres = (s.enseignantsSuggeres ?? []).filter((id) => !invalid.has(String(id)));
      }));
    }));
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

    const lines = [];
    (tree ?? []).forEach((d) => {
      lines.push(`Domaine: ${d.code ?? ""} - ${d.nom ?? ""}`.trim());
      (d.competences ?? []).forEach((c) => {
        lines.push(`  Competence: ${c.code ?? ""} - ${c.nom ?? ""}`.trim());
        (c.savoirs ?? []).forEach((s) => {
          const teachers = (s.enseignantsSuggeres ?? []).map((id) => {
            const e = ensMap.get(String(id));
            if (!e) return String(id);
            return `${e.prenom ?? ""} ${e.nom ?? ""}`.trim() || String(id);
          });
          lines.push(
            `    - ${s.code ?? ""} | ${s.nom ?? ""} | ${niveauLabel[s.niveau] ?? (s.niveau ?? "")} | ${s.type ?? ""}`,
          );
          lines.push(`      Enseignants: ${teachers.length ? teachers.join(", ") : "Aucun"}`);
        });
        (c.sousCompetences ?? []).forEach((sc) => {
          lines.push(`    Sous-competence: ${sc.code ?? ""} - ${sc.nom ?? ""}`.trim());
          (sc.savoirs ?? []).forEach((s) => {
            const teachers = (s.enseignantsSuggeres ?? []).map((id) => {
              const e = ensMap.get(String(id));
              if (!e) return String(id);
              return `${e.prenom ?? ""} ${e.nom ?? ""}`.trim() || String(id);
            });
            lines.push(
              `      - ${s.code ?? ""} | ${s.nom ?? ""} | ${niveauLabel[s.niveau] ?? (s.niveau ?? "")} | ${s.type ?? ""}`,
            );
            lines.push(`        Enseignants: ${teachers.length ? teachers.join(", ") : "Aucun"}`);
          });
        });
      });
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
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      message.success("Texte du résultat copié");
    } catch {
      message.error("Copie impossible");
    }
  };

    const scOptions = useMemo(() => {
      const opts = [];
      (tree ?? []).forEach((d, di) => (d.competences ?? []).forEach((c, ci) => {
        opts.push({ label: `${d.code ?? ""} · ${c.code ?? ""}`, value: JSON.stringify([di, ci, -1]) });
        (c.sousCompetences ?? []).forEach((sc, sci) => opts.push({ label: `${d.code ?? ""} · ${c.code ?? ""} · ${sc.code ?? ""}`, value: JSON.stringify([di, ci, sci]) }));
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
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);

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

        {(tree ?? []).map((domaine, di) => {
          if (treeFilteredIndices && !treeFilteredIndices.visibleDi.has(di)) return null;
          const dKey = `d-${di}`;
          const dOpen = expandedDomainKeys.includes(dKey);
          return (
            <div key={dKey} className="tree-domaine">
              <div
                className={`tree-node-row ${selectedNode?.type === "domaine" && selectedNode.path?.[0] === di ? "selected" : ""}`}
                onClick={() => setSelectedNode({ type: "domaine", path: [di], data: cloneDeep(domaine) })}
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

              {dOpen && (domaine.competences ?? []).map((comp, ci) => {
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
                        <div className="tree-savoirs">
                          {(comp.savoirs ?? []).map((savoir, si) => (
                            <div
                              key={savoir.tmpId ?? `${di}-${ci}--1-${si}`}
                              className={`tree-node-row ${selectedNode?.type === "savoir" && selectedNode.path?.[0] === di && selectedNode.path?.[1] === ci && selectedNode.path?.[2] === -1 && selectedNode.path?.[3] === si ? "selected" : ""}`}
                              onClick={() => setSelectedNode({ type: "savoir", path: [di, ci, -1, si], data: cloneDeep(savoir) })}
                            >
                              <SavoirCard
                                savoir={savoir}
                                di={di}
                                ci={ci}
                                sci={-1}
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
                          ))}
                        </div>
                      </div>
                    )}

                    {cOpen && (comp.sousCompetences ?? []).map((sc, sci) => {
                      if (treeFilteredIndices && !treeFilteredIndices.visibleSci.has(`${di}-${ci}-${sci}`)) return null;
                      return (
                        <div className="tree-sous-comp" key={`sc-${di}-${ci}-${sci}`}>
                          <div
                            className={`tree-node-row ${selectedNode?.type === "sousComp" && selectedNode.path?.[0] === di && selectedNode.path?.[1] === ci && selectedNode.path?.[2] === sci ? "selected" : ""}`}
                            onClick={() => setSelectedNode({ type: "sousComp", path: [di, ci, sci], data: cloneDeep(sc) })}
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

                          <div className="tree-savoirs">
                            {(sc.savoirs ?? []).map((savoir, si) => (
                              <div
                                key={savoir.tmpId ?? `${di}-${ci}-${sci}-${si}`}
                                className={`tree-node-row ${selectedNode?.type === "savoir" && selectedNode.path?.[0] === di && selectedNode.path?.[1] === ci && selectedNode.path?.[2] === sci && selectedNode.path?.[3] === si ? "selected" : ""}`}
                                onClick={() => setSelectedNode({ type: "savoir", path: [di, ci, sci, si], data: cloneDeep(savoir) })}
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
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      

      <div className="review-props-panel">
        {!selectedNode ? (
          <div className="props-panel-empty">
            <ApartmentOutlined style={{ fontSize: 64, color: "var(--color-text-tertiary)" }} />
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <Text style={{ opacity: 0.85 }}>Sélectionnez un élément dans l'arbre pour modifier ses propriétés</Text>
            </div>
          </div>
        ) : (
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

ReviewStep.propTypes = {
  tree: PropTypes.array.isRequired,
  setTree: PropTypes.func.isRequired,
  treeSearch: PropTypes.string.isRequired,
  setTreeSearch: PropTypes.func.isRequired,
  editingNom: PropTypes.object,
  setEditingNom: PropTypes.func.isRequired,
  startRename: PropTypes.func.isRequired,
  commitRename: PropTypes.func.isRequired,
  deleteSavoir: PropTypes.func.isRequired,
  deleteSC: PropTypes.func.isRequired,
  deleteComp: PropTypes.func.isRequired,
  deleteDomaine: PropTypes.func.isRequired,
  toggleType: PropTypes.func.isRequired,
  setNiveau: PropTypes.func.isRequired,
  setEnseignants: PropTypes.func.isRequired,
  openMerge: PropTypes.func.isRequired,
  setMergeModal: PropTypes.func.isRequired,
  liveStats: PropTypes.object.isRequired,
  treeFilteredIndices: PropTypes.object,
  departement: PropTypes.string.isRequired,
  dbEnseignants: PropTypes.array.isRequired,
  allSavoirsFlat: PropTypes.array.isRequired,
  onSavoirDragStart: PropTypes.func.isRequired,
  onSavoirDragEnd: PropTypes.func.isRequired,
  setCurrentStep: PropTypes.func.isRequired,
  updateNodeField: PropTypes.func.isRequired,
  moveSavoirToSC: PropTypes.func.isRequired,
  setCreateEnsTarget: PropTypes.func,
  setCreateEnsData: PropTypes.func,
  setCreateEnsModal: PropTypes.func,
};
