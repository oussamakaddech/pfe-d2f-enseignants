import React, { useEffect, useReducer, useState, useMemo, useCallback, useRef } from "react";
import {
  Select,
  Input,
  Tag,
  Button,
  Space,
  Typography,
  Badge,
  Switch,
  Modal,
  Form,
  Skeleton,
  Empty,
  Progress,
} from "antd";
import {
  ReloadOutlined,
  SaveOutlined,
  UndoOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  BookOutlined,
  HolderOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import RiceService from "@/services/analyse/RiceService";
import AppPageHeader from "@/components/common/AppPageHeader";
import "@/styles/pages/competence-matching-page.css";

const { Title, Text } = Typography;

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  savoirs: [],
  enseignants: [],
  assignments: {},
  pendingChanges: { add: [], remove: [] },
  filters: {
    departement: "all",
    domaine: "all",
    search: "",
    showUnassignedOnly: false,
  },
  loading: { data: false, saving: false },
  error: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getAvatarColor = (id) => {
  const colors = [
    "#fa8c16", "#faad14", "#52c41a", "#1890ff", "#722ed1",
    "#13c2c2", "#eb2f96", "#2f54eb", "#a0d911", "#f5222d",
  ];
  let hash = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i++) {
    hash = (str.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const normalizePending = (pending) => {
  const key = (item) => `${item.savoirId}|${item.enseignantId}`;
  const adds = new Map();
  const removes = new Map();
  (pending?.add || []).forEach((item) => {
    if (item?.savoirId && item?.enseignantId) adds.set(key(item), item);
  });
  (pending?.remove || []).forEach((item) => {
    if (item?.savoirId && item?.enseignantId) removes.set(key(item), item);
  });
  for (const k of adds.keys()) {
    if (removes.has(k)) { adds.delete(k); removes.delete(k); }
  }
  return { add: Array.from(adds.values()), remove: Array.from(removes.values()) };
};

const normalizeNiveauForAssignment = (niveau) => {
  const raw = String(niveau ?? "").trim().toUpperCase();
  if (!raw) return "N1_DEBUTANT";

  if (["N1_DEBUTANT", "N2_ELEMENTAIRE", "N3_INTERMEDIAIRE", "N4_AVANCE", "N5_EXPERT"].includes(raw)) {
    return raw;
  }

  if (raw === "N1") return "N1_DEBUTANT";
  if (raw === "N2") return "N2_ELEMENTAIRE";
  if (raw === "N3") return "N3_INTERMEDIAIRE";
  if (raw === "N4") return "N4_AVANCE";
  if (raw === "N5") return "N5_EXPERT";

  return "N1_DEBUTANT";
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case "LOAD_SUCCESS": {
      const { savoirs, enseignants, assignments } = action.payload;
      return { ...state, savoirs, enseignants, assignments: assignments || {}, loading: { ...state.loading, data: false }, error: null };
    }
    case "ASSIGN_SAVOIR": {
      const { savoirId, enseignantId } = action.payload;
      const sId = String(savoirId);
      const eId = String(enseignantId);
      const assignments = { ...state.assignments };
      assignments[sId] = Array.from(new Set([...(assignments[sId] ?? []), eId]));
      const pending = { add: [...state.pendingChanges.add], remove: [...state.pendingChanges.remove] };
      const removeIdx = pending.remove.findIndex((p) => String(p.savoirId) === sId && String(p.enseignantId) === eId);
      if (removeIdx !== -1) pending.remove.splice(removeIdx, 1);
      else {
        const exists = pending.add.some((p) => String(p.savoirId) === sId && String(p.enseignantId) === eId);
        if (!exists) pending.add.push({ savoirId: sId, enseignantId: eId });
      }
      return { ...state, assignments, pendingChanges: pending };
    }
    case "UNASSIGN_SAVOIR": {
      const { savoirId, enseignantId } = action.payload;
      const sId = String(savoirId);
      const eId = String(enseignantId);
      const assignments = { ...state.assignments };
      assignments[sId] = (assignments[sId] ?? []).filter((id) => String(id) !== eId);
      const pending = { add: [...state.pendingChanges.add], remove: [...state.pendingChanges.remove] };
      const addIdx = pending.add.findIndex((p) => String(p.savoirId) === sId && String(p.enseignantId) === eId);
      if (addIdx !== -1) pending.add.splice(addIdx, 1);
      else {
        const exists = pending.remove.some((p) => String(p.savoirId) === sId && String(p.enseignantId) === eId);
        if (!exists) pending.remove.push({ savoirId: sId, enseignantId: eId });
      }
      return { ...state, assignments, pendingChanges: pending };
    }
    case "SAVE_SUCCESS":
      return { ...state, pendingChanges: { add: [], remove: [] }, loading: { ...state.loading, saving: false } };
    case "SET_FILTER":
      return { ...state, filters: { ...state.filters, [action.payload.key]: action.payload.value } };
    case "SET_LOADING":
      return { ...state, loading: { ...state.loading, [action.payload.key]: action.payload.value } };
    case "SET_ERROR":
      return { ...state, error: action.payload.error, loading: { data: false, saving: false } };
    case "RESET_PENDING":
      return { ...state, pendingChanges: { add: [], remove: [] } };
    default:
      return state;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompetenceMatchingPage() {
  const { message, modal } = useAppNotification();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverEns, setDragOverEns] = useState(null);
  const [ensSearch, setEnsSearch] = useState("");
  const [ensSort, setEnsSort] = useState("name");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEns, setEditingEns] = useState(null);
  const [form] = Form.useForm();
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Teacher Map ──────────────────────────────────────────────────────────
  const teacherById = useMemo(() => {
    const map = new Map();
    (state.enseignants || []).forEach((ens) => map.set(String(ens.id), ens));
    return map;
  }, [state.enseignants]);

  // ── Domain Options ───────────────────────────────────────────────────────
  const domainOptions = useMemo(() => {
    const map = new Map();
    (state.savoirs || []).forEach((s) => {
      const code = s.domaine?.code ?? s.domaine?.nom ?? s.domaine;
      if (!code) return;
      const label = s.domaine?.nom ?? s.domaine?.code ?? String(code);
      map.set(String(code), label);
    });
    return [
      { value: "all", label: "Tous les domaines" },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [state.savoirs]);

  // ── Load Data ────────────────────────────────────────────────────────────
  const reloadData = useCallback(async (dept = stateRef.current.filters.departement) => {
    const normalizedDept = dept === "all" ? null : dept;
    dispatch({ type: "SET_LOADING", payload: { key: "data", value: true } });
    try {
      const [savoirs, enseignants] = await Promise.all([
        RiceService.getSavoirs(normalizedDept),
        RiceService.getEnseignants(normalizedDept),
      ]);
      const assignments = {};
      (savoirs || []).forEach((s) => {
        assignments[String(s.id)] = (s.enseignants ?? s.enseignantIds ?? []).map(String);
      });
      dispatch({ type: "LOAD_SUCCESS", payload: { savoirs: savoirs || [], enseignants: enseignants || [], assignments } });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: { error: err?.message ?? String(err) } });
      message.error("Erreur lors du chargement");
    }
  }, []);

  useEffect(() => { reloadData(); }, []); // eslint-disable-line

  // ── Drag Handlers ────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(() => { setDraggingId(null); setDragOverEns(null); }, []);

  const handleEnsDrop = useCallback((e, ensId) => {
    e.preventDefault();
    e.stopPropagation();
    let payload = {};
    try { payload = JSON.parse(e.dataTransfer.getData("text/plain") || "{}"); } catch { payload = {}; }
    const sId = String(payload.savoirId ?? "");
    if (!sId) { handleDragEnd(); return; }
    const alreadyAssigned = (stateRef.current.assignments[sId] ?? []).includes(ensId);
    if (alreadyAssigned) { message.warning("Déjà assigné à cet enseignant", 2); handleDragEnd(); return; }
    dispatch({ type: "ASSIGN_SAVOIR", payload: { savoirId: sId, enseignantId: ensId } });
    const savoir = stateRef.current.savoirs.find((x) => String(x.id) === sId);
    const teacher = teacherById.get(ensId);
    const teacherName = teacher ? `${teacher.prenom} ${teacher.nom}`.trim() : ensId;
    message.success(`${savoir?.code ?? sId} → ${teacherName}`, 2);
    handleDragEnd();
  }, [teacherById, handleDragEnd]);

  // ── Unassign ─────────────────────────────────────────────────────────────
  const handleUnassign = useCallback((savoirId, enseignantId) => {
    dispatch({ type: "UNASSIGN_SAVOIR", payload: { savoirId: String(savoirId), enseignantId: String(enseignantId) } });
    message.info("Assignation retirée", 1.5);
  }, []);

  const makeUnassignHandler = (savoirId: string, enseignantId: string) =>
    () => handleUnassign(savoirId, enseignantId);

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const payload = normalizePending(stateRef.current.pendingChanges);
    if (payload.add.length === 0 && payload.remove.length === 0) { message.info("Aucune modification"); return; }

    const savoirById = new Map(
      (stateRef.current.savoirs || []).map((s) => [String(s.id), s]),
    );

    const payloadWithNiveaux = {
      ...payload,
      add: payload.add.map((item) => {
        const savoir = savoirById.get(String(item.savoirId));
        return {
          ...item,
          niveau: normalizeNiveauForAssignment(item.niveau ?? savoir?.niveau),
        };
      }),
    };

    dispatch({ type: "SET_LOADING", payload: { key: "saving", value: true } });
    try {
      await RiceService.saveAssignments(payloadWithNiveaux);
      dispatch({ type: "SAVE_SUCCESS" });
      message.success(`${payload.add.length + payload.remove.length} modification(s) sauvegardée(s)`);
      await reloadData();
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Erreur inconnue";
      dispatch({ type: "SET_ERROR", payload: { error: msg } });
      message.error("Erreur: " + msg, 3);
    } finally {
      dispatch({ type: "SET_LOADING", payload: { key: "saving", value: false } });
    }
  }, [reloadData]);

  const handleReset = useCallback(async () => {
    dispatch({ type: "RESET_PENDING" });
    await reloadData();
    message.info("Modifications annulées");
  }, [reloadData]);

  // ── Teacher CRUD ─────────────────────────────────────────────────────────
  const handleEditTeacher = useCallback((ens) => { setEditingEns(ens); form.setFieldsValue(ens); setShowCreateModal(true); }, [form]);
  const handleDeleteTeacher = useCallback((ens) => {
    modal.confirm({
      title: "Désactiver cet enseignant ?",
      content: `${ens.prenom} ${ens.nom} sera désactivé(e).`,
      okText: "Désactiver", okType: "danger",
      onOk: async () => {
        try { await RiceService.deactivateEnseignant(ens.id); message.success("Enseignant désactivé"); await reloadData(); }
        catch { message.error("Erreur lors de la désactivation"); }
      },
    });
  }, [reloadData]);

  const handleModalSubmit = useCallback(async (values) => {
    try {
      if (editingEns) await RiceService.updateEnseignant(editingEns.id, values);
      else await RiceService.createEnseignant(values);
      setShowCreateModal(false); form.resetFields(); await reloadData();
      message.success(editingEns ? "Enseignant mis à jour" : "Enseignant créé");
    } catch { message.error("Erreur lors de la sauvegarde"); }
  }, [editingEns, reloadData, form]);

  // ── Derived Values ───────────────────────────────────────────────────────
  const filteredSavoirs = useMemo(() => {
    const q = (state.filters.search ?? "").toLowerCase();
    return (state.savoirs || []).filter((s) => {
      if (q && !`${s.nom} ${s.code}`.toLowerCase().includes(q)) return false;
      if (state.filters.domaine !== "all") {
        const sd = s.domaine?.code ?? s.domaine?.nom ?? s.domaine ?? "";
        if (String(sd) !== String(state.filters.domaine)) return false;
      }
      if (state.filters.showUnassignedOnly && (state.assignments[String(s.id)] ?? []).length > 0) return false;
      return true;
    });
  }, [state.savoirs, state.filters, state.assignments]);

  const pendingTotal = useMemo(() => state.pendingChanges.add.length + state.pendingChanges.remove.length, [state.pendingChanges]);

  const assignmentCountByEns = useMemo(() => {
    const counts = {};
    state.enseignants.forEach((e) => (counts[String(e.id)] = 0));
    Object.values(state.assignments).forEach((ids) => (ids ?? []).forEach((id) => { if (counts[String(id)] !== undefined) counts[String(id)]++; }));
    return counts;
  }, [state.enseignants, state.assignments]);

  const maxLoad = useMemo(() => { const v = Object.values(assignmentCountByEns); return v.length ? Math.max(1, ...v) : 1; }, [assignmentCountByEns]);

  const assignedSavoirsByEns = useMemo(() => {
    const map = new Map();
    state.enseignants.forEach((e) => map.set(String(e.id), []));
    (state.savoirs || []).forEach((s) => {
      (state.assignments[String(s.id)] ?? []).forEach((ensId) => {
        const k = String(ensId);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(s);
      });
    });
    return map;
  }, [state.enseignants, state.savoirs, state.assignments]);

  const sortedEnseignants = useMemo(() => {
    let list = [...state.enseignants];
    if (ensSearch.trim()) { const q = ensSearch.toLowerCase(); list = list.filter((e) => `${e.prenom} ${e.nom}`.toLowerCase().includes(q)); }
    if (ensSort === "name") list.sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));
    else if (ensSort === "load_desc") list.sort((a, b) => (assignmentCountByEns[String(b.id)] || 0) - (assignmentCountByEns[String(a.id)] || 0));
    else list.sort((a, b) => (assignmentCountByEns[String(a.id)] || 0) - (assignmentCountByEns[String(b.id)] || 0));
    return list;
  }, [state.enseignants, ensSearch, ensSort, assignmentCountByEns]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    // Page-level drag-end listener captures stray drag releases; keyboard users
    // never trigger drag events. (S6848 — by-design DnD widget.)
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className={`competence-matching-page ${draggingId ? "is-dragging" : ""}`} onDragEnd={handleDragEnd}>
      {/* Header */}
      <AppPageHeader
        icon={<ThunderboltOutlined />}
        title="Matchmaking & Affectations"
        subtitle="Assignez intelligemment les savoirs aux enseignants"
        actions={
          <Space size="middle">
            <Select 
              value={state.filters.departement} 
              onChange={(v) => { dispatch({ type: "SET_FILTER", payload: { key: "departement", value: v } }); reloadData(v); }} 
              style={{ width: 180 }} 
              options={[{ value: "all", label: "Tous les départements" }]} 
            />
            <Select 
              value={state.filters.domaine ?? "all"} 
              onChange={(v) => dispatch({ type: "SET_FILTER", payload: { key: "domaine", value: v } })} 
              style={{ width: 180 }} 
              options={domainOptions} 
            />
            <Input.Search 
              placeholder="Rechercher..." 
              value={state.filters.search} 
              onChange={(e) => dispatch({ type: "SET_FILTER", payload: { key: "search", value: e.target.value } })} 
              style={{ width: 220 }} 
              allowClear 
            />
            <Button icon={<ReloadOutlined />} onClick={() => reloadData()} loading={state.loading.data} />
          </Space>
        }
      />

      {/* Main Content */}
      <div className="matching-main-content">
        {/* Savoirs Panel */}
        <section className="matching-panel savoirs-list-panel">
          <div className="panel-header-section">
            <div className="panel-title-section">
              <BookOutlined style={{ color: "#1890ff" }} /> Savoirs Disponibles
            </div>
            <div className="panel-controls-section">
              <Switch 
                checked={state.filters.showUnassignedOnly} 
                onChange={(v) => dispatch({ type: "SET_FILTER", payload: { key: "showUnassignedOnly", value: v } })} 
                size="small" 
              />
              <Text style={{ fontSize: 12 }}>Non affectés</Text>
            </div>
          </div>
          <div className="panel-body-scrollable">
            {(() => {
              if (state.loading.data) return <Skeleton active paragraph={{ rows: 10 }} />;
              if (filteredSavoirs.length === 0) return <Empty description="Aucun savoir trouvé" />;
              return filteredSavoirs.map((s) => {
                const sId = String(s.id);
                const assigned = (state.assignments[sId] ?? []).map((id) => teacherById.get(id)).filter(Boolean);
                return (
                  /* Draggable assignment card; keyboard users use the per-card menu actions. (S6848 — by-design DnD.) */
                  // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                  <div key={sId} className={`savoir-assignment-card ${assigned.length > 0 ? "assigned" : "unassigned"} ${draggingId === sId ? "dragging" : ""}`}
                    draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ savoirId: String(s.id), code: s.code, action: "assign" })); e.dataTransfer.effectAllowed = "copy"; setDraggingId(String(s.id)); }} onDragEnd={handleDragEnd}>
                    <div className="savoir-card-header">
                      <span className="savoir-drag-handle"><HolderOutlined /></span>
                      <span className="savoir-code-label">{s.code}</span>
                      <span className="savoir-name-inline">{s.nom}</span>
                    </div>
                    {assigned.length > 0 && (
                      <div className="savoir-assigned-teachers">
                        {assigned.map((ens) => (
                          <Tag key={ens.id} className="teacher-assignment-tag" closable onClose={makeUnassignHandler(String(s.id), String(ens.id))}>
                            {ens.prenom} {ens.nom}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </section>

        {/* Enseignants Panel */}
        <section className="matching-panel enseignants-list-panel">
          <div className="panel-header-section">
            <div className="panel-title-section">
              <TeamOutlined style={{ color: "#52c41a" }} /> Corps Enseignant
            </div>
            <div className="panel-controls-section">
              <Input prefix={<SearchOutlined />} placeholder="Filtrer..." value={ensSearch} onChange={(e) => setEnsSearch(e.target.value)} style={{ width: 150 }} allowClear size="small" />
              <Select value={ensSort} onChange={setEnsSort} options={[{ value: "name", label: "A-Z" }, { value: "load_desc", label: "Charge ↓" }]} style={{ width: 100 }} size="small" />
            </div>
          </div>
          <div className="panel-body-scrollable">
            {(() => {
              if (state.loading.data) return <Skeleton active avatar paragraph={{ rows: 10 }} />;
              if (sortedEnseignants.length === 0) return <Empty description="Aucun enseignant" />;
              return sortedEnseignants.map((ens) => {
                const ensId = String(ens.id);
                const count = assignmentCountByEns[ensId] ?? 0;
                const loadPct = Math.round((count / Math.max(maxLoad, 1)) * 100);
                const assigned = assignedSavoirsByEns.get(ensId) ?? [];
                const initials = `${ens.prenom?.[0] ?? ""}${ens.nom?.[0] ?? ""}`.toUpperCase() || "?";
                const avatarColor = getAvatarColor(ensId);
                return (
                  /* Drop target for the assignment; keyboard equivalent provided by the per-savoir menu. (S6848 — by-design DnD.) */
                  // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                  <div key={ensId} className={`enseignant-assignment-card ${draggingId ? "drag-mode-active" : ""} ${dragOverEns === ensId ? "drag-over-target" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOverEns(ensId); }}
                    onDragLeave={(e) => {
                      const related = e.relatedTarget;
                      if (related && e.currentTarget.contains(related)) return;
                      setDragOverEns(null);
                    }}
                    onDrop={(e) => handleEnsDrop(e, ensId)}>
                    
                    {dragOverEns === ensId && (
                      <div className="enseignant-drop-overlay">
                        <CheckCircleOutlined style={{ fontSize: 32, color: "#52c41a" }} />
                        <Text strong style={{ color: "#52c41a", marginTop: 8 }}>Relâcher pour assigner</Text>
                      </div>
                    )}

                    <div className="enseignant-card-header">
                      <div className="enseignant-avatar" style={{ backgroundColor: avatarColor }}>{initials}</div>
                      <div className="enseignant-info-section">
                        <span className="enseignant-full-name">{ens.prenom} {ens.nom}</span>
                        <span className="enseignant-details-text">{ens.departement || "Département N/A"}</span>
                      </div>
                      <div className="enseignant-action-buttons">
                        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditTeacher(ens)} />
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteTeacher(ens)} />
                      </div>
                    </div>

                    <div className="enseignant-statistics-section">
                      <div className="enseignant-progress-section">
                        <Progress percent={loadPct} size="small" strokeColor={loadPct > 80 ? "var(--color-error)" : "var(--color-success)"} />
                      </div>
                      <Badge count={count} style={{ backgroundColor: count > 0 ? 'var(--color-info)' : 'var(--neutral-300)' }} />
                    </div>

                    {assigned.length > 0 && (
                      <div className="enseignant-assigned-savoirs" style={{ marginTop: 12 }}>
                        {assigned.map((sv) => (
                          <Tag key={sv.id} color="blue" closable onClose={makeUnassignHandler(String(sv.id), ensId)} style={{ marginBottom: 4 }}>
                            {sv.code}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="matching-page-footer">
        <div className="footer-left-section">
          <Button className="footer-save-button" icon={<SaveOutlined />} disabled={pendingTotal === 0} loading={state.loading.saving} onClick={handleSave}>
            Enregistrer les modifications
            {pendingTotal > 0 && <Badge count={pendingTotal} style={{ marginLeft: 12, backgroundColor: "var(--neutral-0)", color: "var(--primary-500)" }} />}
          </Button>
        </div>
        <div className="footer-right-section">
          <Space>
             <Text type="secondary">{pendingTotal === 0 ? "Tout est à jour" : `${pendingTotal} modification(s) non sauvegardée(s)`}</Text>
             {pendingTotal > 0 && <Button icon={<UndoOutlined />} onClick={handleReset} type="link">Annuler tout</Button>}
          </Space>
        </div>
      </footer>

      {/* Teacher Modal */}
      <Modal title={editingEns ? "Modifier l'enseignant" : "Créer un enseignant"} open={showCreateModal} onCancel={() => { setShowCreateModal(false); form.resetFields(); }} footer={null}>
        <Form form={form} onFinish={handleModalSubmit} layout="vertical">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Form.Item name="prenom" label="Prénom" rules={[{ required: true, message: "Requis" }]}><Input /></Form.Item>
            <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Requis" }]}><Input /></Form.Item>
          </div>
          <Form.Item name="departement" label="Département"><Input /></Form.Item>
          <Form.Item name="grade" label="Grade"><Input /></Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setShowCreateModal(false); form.resetFields(); }}>Annuler</Button>
              <Button htmlType="submit" type="primary" className="footer-save-button">Enregistrer</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}






