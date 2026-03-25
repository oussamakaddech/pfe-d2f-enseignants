import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Collapse,
  Divider,
  Empty,
  Input,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  CopyOutlined,
  EyeOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import PropTypes from "prop-types";
import RiceService from "../../../services/RiceService";
import SavoirCard from "./SavoirCard.jsx";
import EnseignantDropCard from "./EnseignantDropCard.jsx";
import EnseignantCreateForm from "./EnseignantCreateForm.jsx";
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
  extractedEnseignants,
  dbEnseignants,
  result,
  ensSearchStep2,
  setEnsSearchStep2,
  loadingEns,
  loadEnseignants,
  remapEnseignant,
  allSavoirsFlat,
  isDragging,
  draggedSavoirInfo,
  onSavoirDragStart,
  onSavoirDragEnd,
  onTagDragStart,
  onEnsDragOver,
  onEnsDragLeave,
  onEnsDrop,
  dragOverEns,
  toggleEnsAssign,
  setCurrentStep,
}) {
  const [expandedDomainKeys, setExpandedDomainKeys] = useState([]);
  const [expandedCompKeys, setExpandedCompKeys] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showInlineHint, setShowInlineHint] = useState(true);
  const [creatingFrom, setCreatingFrom] = useState(null);
  const [creating, setCreating] = useState(false);
  const [localTeachers, setLocalTeachers] = useState([]);

  const mergedEnseignants = useMemo(() => {
    const dbMap = new Map((dbEnseignants ?? []).map((e) => [String(e.id ?? e.enseignantId), e]));
    (result?.foundEnseignants ?? []).forEach((e) => {
      const id = String(e.id ?? e.enseignantId);
      if (!dbMap.has(id)) dbMap.set(id, { ...e, id, enseignantId: id });
    });
    localTeachers.forEach((e) => dbMap.set(String(e.id), e));
    return Array.from(dbMap.values());
  }, [dbEnseignants, result, localTeachers]);

  const filteredTeachers = useMemo(() => {
    const q = ensSearchStep2.trim().toLowerCase();
    if (!q) return mergedEnseignants;
    return mergedEnseignants.filter((e) => {
      const full = `${e.prenom ?? ""} ${e.nom ?? ""}`.toLowerCase();
      return full.includes(q);
    });
  }, [ensSearchStep2, mergedEnseignants]);

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

  const matchedExtracted = useMemo(
    () => (extractedEnseignants ?? []).filter((e) => e.matched_id),
    [extractedEnseignants],
  );
  const unmatchedExtracted = useMemo(
    () => (extractedEnseignants ?? []).filter((e) => !e.matched_id),
    [extractedEnseignants],
  );

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

  const handleCreateTeacher = async (ex, values) => {
    setCreating(true);
    const payload = {
      nom: values.nom,
      prenom: values.prenom,
      email: values.email,
      mail: values.email,
      departement: values.departement,
      type: "P",
      etat: "A",
      grade: "",
      modules: [],
    };

    try {
      const created = await RiceService.createEnseignant(payload);
      const realId = String(created.id ?? created.enseignantId);
      remapEnseignant(`ext_${(extractedEnseignants ?? []).indexOf(ex)}`, realId);
      message.success("Enseignant créé et ajouté au panel");
      setCreatingFrom(null);
      loadEnseignants();
    } catch {
      const localId = `local-${Date.now()}`;
      setLocalTeachers((prev) => [
        ...prev,
        {
          id: localId,
          enseignantId: localId,
          nom: values.nom,
          prenom: values.prenom,
          email: values.email,
          departement: values.departement,
          modules: [],
          grade: "Local",
        },
      ]);
      remapEnseignant(`ext_${(extractedEnseignants ?? []).indexOf(ex)}`, localId);
      message.warning("API indisponible : enseignant ajouté localement (mode dégradé)");
      setCreatingFrom(null);
    } finally {
      setCreating(false);
    }
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                  <Button size="small" type="text" onClick={() => setExpandedDomainKeys((prev) =>
                    prev.includes(dKey) ? prev.filter((k) => k !== dKey) : [...prev, dKey])}>{dOpen ? "▾" : "▸"}</Button>
                  <Button size="small" type="text" onClick={() => startRename([di], domaine.nom)}>✎</Button>
                  <Button size="small" type="text" danger onClick={() => deleteDomaine(di)}>🗑</Button>
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
                        <Button size="small" type="text" onClick={() => setExpandedCompKeys((prev) =>
                          prev.includes(cKey) ? prev.filter((k) => k !== cKey) : [...prev, cKey])}>{cOpen ? "▾" : "▸"}</Button>
                        <Button size="small" type="text" onClick={() => startRename([di, ci], comp.nom)}>✎</Button>
                        <Button size="small" type="text" danger onClick={() => deleteComp(di, ci)}>🗑</Button>
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
                            <SavoirCard
                              key={savoir.tmpId ?? `${di}-${ci}--1-${si}`}
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
                              isBeingDragged={
                                draggedSavoirInfo?.di === di
                                && draggedSavoirInfo?.ci === ci
                                && draggedSavoirInfo?.sci === -1
                                && draggedSavoirInfo?.si === si
                              }
                              allEnseignants={mergedEnseignants}
                              inlineHint={showInlineHint && (savoir.enseignantsSuggeres ?? []).length === 0}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {cOpen && (comp.sousCompetences ?? []).map((sc, sci) => {
                      if (treeFilteredIndices && !treeFilteredIndices.visibleSci.has(`${di}-${ci}-${sci}`)) return null;
                      return (
                        <div className="tree-sous-comp" key={`sc-${di}-${ci}-${sci}`}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
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
                              <Button size="small" type="text" onClick={() => startRename([di, ci, sci], sc.nom)}>✎</Button>
                              <Button size="small" type="text" danger onClick={() => deleteSC(di, ci, sci)}>🗑</Button>
                            </Space>
                          </div>

                          <div className="tree-savoirs">
                            {(sc.savoirs ?? []).map((savoir, si) => (
                              <SavoirCard
                                key={savoir.tmpId ?? `${di}-${ci}-${sci}-${si}`}
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
                                isBeingDragged={
                                  draggedSavoirInfo?.di === di
                                  && draggedSavoirInfo?.ci === ci
                                  && draggedSavoirInfo?.sci === sci
                                  && draggedSavoirInfo?.si === si
                                }
                                allEnseignants={mergedEnseignants}
                                inlineHint={showInlineHint && (savoir.enseignantsSuggeres ?? []).length === 0}
                              />
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

      <div className="review-ens-col">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Space>
            <Text strong>Enseignants</Text>
            <Badge count={filteredTeachers.length} style={{ background: "#4f46e5" }} />
            <Tag color="green"><FileTextOutlined /> {matchedExtracted.length} extraits</Tag>
          </Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={loadEnseignants} loading={loadingEns}>Recharger</Button>
        </div>

        <Input
          placeholder="Rechercher un enseignant..."
          value={ensSearchStep2}
          onChange={(e) => setEnsSearchStep2(e.target.value)}
          allowClear
          style={{ marginBottom: 12 }}
        />

        {loadingEns && (
          <>
            <Skeleton active paragraph={{ rows: 2 }} style={{ marginBottom: 10 }} />
            <Skeleton active paragraph={{ rows: 2 }} style={{ marginBottom: 10 }} />
            <Skeleton active paragraph={{ rows: 2 }} style={{ marginBottom: 10 }} />
            <Text type="secondary">Chargement depuis la base de données...</Text>
          </>
        )}

        {!loadingEns && filteredTeachers.length === 0 && (
          <Empty
            description={
              <Space direction="vertical" size={4}>
                <Text>Aucun enseignant trouvé pour ce département</Text>
                <Button size="small" onClick={loadEnseignants}>Recharger</Button>
                <a href="/enseignants">Gérer les enseignants →</a>
              </Space>
            }
          />
        )}

        {!loadingEns && filteredTeachers.map((ens) => {
          const eid = String(ens.id ?? ens.enseignantId);
          const assigned = assignedByTeacher.get(eid) ?? [];
          const isOver = dragOverEns === eid;
          return (
            <EnseignantDropCard
              key={eid}
              enseignant={ens}
              assignedSavoirs={assigned}
              totalSavoirs={Math.max(totalSavoirs, 1)}
              isDragging={isDragging}
              isOver={isOver}
              onDragOver={onEnsDragOver}
              onDragLeave={onEnsDragLeave}
              onDrop={onEnsDrop}
              onTagDragStart={onTagDragStart}
              onTagDragEnd={onSavoirDragEnd}
              onRemoveChip={(s, id) => toggleEnsAssign(s.di, s.ci, s.sci, s.si, id)}
            />
          );
        })}

        <Divider />
        <Collapse
          defaultActiveKey={[]}
          items={[{
            key: "extracted",
            label: `📄 ${unmatchedExtracted.length} noms extraits des fiches`,
            children: (
              <Space direction="vertical" style={{ width: "100%" }}>
                {unmatchedExtracted.length === 0 && <Text type="secondary">Aucun nom non matché.</Text>}
                {unmatchedExtracted.map((ex, idx) => (
                  <div key={`unm-${idx}`} className="ens-unmatched-card">
                    <Text strong>⚠️ {ex.nom_complet}</Text>
                    <div><Text type="secondary">Extrait de : {ex.fichier}</Text></div>
                    <div><Text type="secondary">Non trouvé en base de données</Text></div>

                    {creatingFrom === idx ? (
                      <EnseignantCreateForm
                        defaultPrenom={(ex.nom_complet || "").split(" ").slice(0, -1).join(" ")}
                        defaultNom={(ex.nom_complet || "").split(" ").slice(-1).join(" ")}
                        defaultDepartement={departement === "auto" ? "gc" : departement}
                        loading={creating}
                        onSubmit={(values) => handleCreateTeacher(ex, values)}
                      />
                    ) : (
                      <Space style={{ marginTop: 8 }}>
                        <Button size="small" onClick={() => message.info("Nom ignoré")}>Ignorer</Button>
                        <Button size="small" type="primary" onClick={() => setCreatingFrom(idx)}>
                          Créer et affecter →
                        </Button>
                      </Space>
                    )}
                  </div>
                ))}
              </Space>
            ),
          }]}
        />
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
  extractedEnseignants: PropTypes.array.isRequired,
  dbEnseignants: PropTypes.array.isRequired,
  result: PropTypes.object,
  ensSearchStep2: PropTypes.string.isRequired,
  setEnsSearchStep2: PropTypes.func.isRequired,
  loadingEns: PropTypes.bool,
  loadEnseignants: PropTypes.func.isRequired,
  clearAllAssignments: PropTypes.func,
  remapEnseignant: PropTypes.func.isRequired,
  allSavoirsFlat: PropTypes.array.isRequired,
  isDragging: PropTypes.bool,
  draggedSavoirInfo: PropTypes.object,
  onSavoirDragStart: PropTypes.func.isRequired,
  onSavoirDragEnd: PropTypes.func.isRequired,
  onTagDragStart: PropTypes.func.isRequired,
  onEnsDragOver: PropTypes.func.isRequired,
  onEnsDragLeave: PropTypes.func.isRequired,
  onEnsDrop: PropTypes.func.isRequired,
  dragOverEns: PropTypes.string,
  toggleEnsAssign: PropTypes.func.isRequired,
  setCurrentStep: PropTypes.func.isRequired,
};
