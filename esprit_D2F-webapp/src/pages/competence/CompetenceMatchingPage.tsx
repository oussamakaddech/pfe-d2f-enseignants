import React, { useEffect, useReducer, useState, useMemo, useCallback, useRef } from "react";
import {
  Select, Input, Tag, Button, Space, Typography, Badge, Switch, Modal, Form, Skeleton, Empty, Progress,
} from "antd";
import {
  ReloadOutlined, SaveOutlined, UndoOutlined, CheckCircleOutlined, SearchOutlined,
  BookOutlined, HolderOutlined, EditOutlined, DeleteOutlined, TeamOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useRiceSavoirs, useRiceEnseignants, useRiceSaveAssignments, useRiceCreateEnseignant, useRiceUpdateEnseignant, useRiceDeactivateEnseignant } from "@/hooks/analyse/useRiceService";
import AppPageHeader from "@/components/common/AppPageHeader";
import "@/styles/pages/competence-matching-page.css";
import {
  type RiceSavoirEntry, type RiceEnseignantEntry, type MatchingFilters,
  initialState, getAvatarColor, normalizePending, normalizeNiveauForAssignment, reducer,
} from "./components/matchingTypes";

const { Text } = Typography;

export default function CompetenceMatchingPage() {
  const saveAssignments = useRiceSaveAssignments();
  const createEnseignantHook = useRiceCreateEnseignant();
  const updateEnseignantHook = useRiceUpdateEnseignant();
  const deactivateEnseignantHook = useRiceDeactivateEnseignant();

  const { message, modal } = useAppNotification();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverEns, setDragOverEns] = useState<string | null>(null);
  const [ensSearch, setEnsSearch] = useState("");
  const [ensSort, setEnsSort] = useState("name");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEns, setEditingEns] = useState<RiceEnseignantEntry | null>(null);
  const [form] = Form.useForm<RiceEnseignantEntry>();
  const stateRef = useRef(state);
  stateRef.current = state;

  const teacherById = useMemo(() => {
    const map = new Map<string, RiceEnseignantEntry>();
    (state.enseignants || []).forEach((ens) => map.set(String(ens.id), ens));
    return map;
  }, [state.enseignants]);

  const domainOptions = useMemo(() => {
    const map = new Map<string, string>();
    (state.savoirs || []).forEach((s) => {
      const domaine = s.domaine;
      const code = typeof domaine === "object" && domaine !== null ? (domaine.code ?? domaine.nom) : (domaine as string | undefined);
      if (!code) return;
      const label = typeof domaine === "object" && domaine !== null ? (domaine.nom ?? domaine.code ?? String(code)) : String(code);
      map.set(String(code), String(label));
    });
    return [{ value: "all", label: "Tous les domaines" }, ...Array.from(map.entries()).map(([value, label]) => ({ value, label }))];
  }, [state.savoirs]);

  const dept = state.filters.departement;
  const normalizedDept = dept === "all" ? null : dept;
  const { data: savoirsData = [], refetch: refetchSavoirs } = useRiceSavoirs(normalizedDept);
  const { data: enseignantsData = [], refetch: refetchEnseignants } = useRiceEnseignants(normalizedDept);

  const reloadData = useCallback(async () => { await Promise.all([refetchSavoirs(), refetchEnseignants()]); }, [refetchSavoirs, refetchEnseignants]);

  useEffect(() => {
    if (savoirsData.length > 0 || enseignantsData.length > 0) {
      const assignments: Record<string, string[]> = {};
      (savoirsData as RiceSavoirEntry[] || []).forEach((s) => { assignments[String(s.id)] = (s.enseignants ?? s.enseignantIds ?? []).map(String); });
      dispatch({ type: "LOAD_SUCCESS", payload: { savoirs: savoirsData as RiceSavoirEntry[] || [], enseignants: enseignantsData as RiceEnseignantEntry[] || [], assignments } });
    }
  }, [savoirsData, enseignantsData]);

  const handleDragEnd = useCallback(() => { setDraggingId(null); setDragOverEns(null); }, []);

  const handleEnsDrop = useCallback((e: React.DragEvent, ensId: string) => {
    e.preventDefault(); e.stopPropagation();
    let payload: { savoirId?: string } = {};
    try { payload = JSON.parse(e.dataTransfer.getData("text/plain") || "{}") as { savoirId?: string }; } catch { payload = {}; }
    const sId = String(payload.savoirId ?? "");
    if (!sId) { handleDragEnd(); return; }
    if ((stateRef.current.assignments[sId] ?? []).includes(ensId)) { message.warning("Déjà assigné à cet enseignant", 2); handleDragEnd(); return; }
    dispatch({ type: "ASSIGN_SAVOIR", payload: { savoirId: sId, enseignantId: ensId } });
    const savoir = stateRef.current.savoirs.find((x) => String(x.id) === sId);
    const teacher = teacherById.get(ensId);
    message.success(`${savoir?.code ?? sId} → ${teacher ? `${teacher.prenom} ${teacher.nom}`.trim() : ensId}`, 2);
    handleDragEnd();
  }, [teacherById, handleDragEnd, message]);

  const handleUnassign = useCallback((savoirId: string, enseignantId: string) => {
    dispatch({ type: "UNASSIGN_SAVOIR", payload: { savoirId: String(savoirId), enseignantId: String(enseignantId) } });
    message.info("Assignation retirée", 1.5);
  }, [message]);

  const makeUnassignHandler = (savoirId: string, enseignantId: string) => () => handleUnassign(savoirId, enseignantId);

  const handleSave = useCallback(async () => {
    const payload = normalizePending(stateRef.current.pendingChanges);
    if (payload.add.length === 0 && payload.remove.length === 0) { message.info("Aucune modification"); return; }
    const savoirById = new Map<string, RiceSavoirEntry>((stateRef.current.savoirs || []).map((s) => [String(s.id), s]));
    const payloadWithNiveaux = { ...payload, add: payload.add.map((item) => ({ ...item, niveau: normalizeNiveauForAssignment(item.niveau ?? savoirById.get(String(item.savoirId))?.niveau) })) };
    dispatch({ type: "SET_LOADING", payload: { key: "saving", value: true } });
    try {
      await saveAssignments.mutateAsync(payloadWithNiveaux as unknown as { add?: Record<string, unknown>[]; remove?: Record<string, unknown>[] });
      dispatch({ type: "SAVE_SUCCESS" });
      message.success(`${payload.add.length + payload.remove.length} modification(s) sauvegardée(s)`);
      await Promise.all([refetchSavoirs(), refetchEnseignants()]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message ?? e?.message ?? "Erreur inconnue";
      dispatch({ type: "SET_ERROR", payload: { error: msg } });
      message.error("Erreur: " + msg, 3);
    } finally { dispatch({ type: "SET_LOADING", payload: { key: "saving", value: false } }); }
  }, [saveAssignments, refetchSavoirs, refetchEnseignants, message]);

  const handleReset = useCallback(async () => { dispatch({ type: "RESET_PENDING" }); await reloadData(); message.info("Modifications annulées"); }, [reloadData, message]);

  const handleEditTeacher = useCallback((ens: RiceEnseignantEntry) => { setEditingEns(ens); form.setFieldsValue({ prenom: ens.prenom, nom: ens.nom, departement: ens.departement, grade: ens.grade }); setShowCreateModal(true); }, [form]);
  const handleDeleteTeacher = useCallback((ens: RiceEnseignantEntry) => {
    modal.confirm({
      title: "Désactiver cet enseignant ?", content: `${ens.prenom} ${ens.nom} sera désactivé(e).`, okText: "Désactiver", okType: "danger",
      onOk: async () => { try { await deactivateEnseignantHook.mutateAsync(ens.id!); message.success("Enseignant désactivé"); await reloadData(); } catch { message.error("Erreur lors de la désactivation"); } },
    });
  }, [reloadData, deactivateEnseignantHook, modal, message]);

  const handleModalSubmit = useCallback(async (values: RiceEnseignantEntry) => {
    try {
      if (editingEns) await updateEnseignantHook.mutateAsync({ id: editingEns.id!, data: values as Record<string, unknown> });
      else await createEnseignantHook.mutateAsync(values as Record<string, unknown>);
      setShowCreateModal(false); form.resetFields(); await reloadData();
      message.success(editingEns ? "Enseignant mis à jour" : "Enseignant créé");
    } catch { message.error("Erreur lors de la sauvegarde"); }
  }, [editingEns, reloadData, form, updateEnseignantHook, createEnseignantHook, message]);

  const filteredSavoirs = useMemo(() => {
    const q = (state.filters.search ?? "").toLowerCase();
    return (state.savoirs || []).filter((s) => {
      if (q && !`${s.nom} ${s.code}`.toLowerCase().includes(q)) return false;
      if (state.filters.domaine !== "all") {
        const domaine = s.domaine;
        const sd = typeof domaine === "object" && domaine !== null ? (domaine.code ?? domaine.nom ?? "") : (domaine ?? "");
        if (String(sd) !== String(state.filters.domaine)) return false;
      }
      if (state.filters.showUnassignedOnly && (state.assignments[String(s.id)] ?? []).length > 0) return false;
      return true;
    });
  }, [state.savoirs, state.filters, state.assignments]);

  const pendingTotal = useMemo(() => state.pendingChanges.add.length + state.pendingChanges.remove.length, [state.pendingChanges]);

  const assignmentCountByEns = useMemo(() => {
    const counts: Record<string, number> = {};
    state.enseignants.forEach((e) => (counts[String(e.id)] = 0));
    Object.values(state.assignments).forEach((ids) => (ids ?? []).forEach((id) => { if (counts[String(id)] !== undefined) counts[String(id)]++; }));
    return counts;
  }, [state.enseignants, state.assignments]);

  const maxLoad = useMemo(() => { const v = Object.values(assignmentCountByEns); return v.length ? Math.max(1, ...v) : 1; }, [assignmentCountByEns]);

  const assignedSavoirsByEns = useMemo(() => {
    const map = new Map<string, RiceSavoirEntry[]>();
    state.enseignants.forEach((e) => map.set(String(e.id), []));
    (state.savoirs || []).forEach((s) => {
      (state.assignments[String(s.id)] ?? []).forEach((ensId) => {
        const k = String(ensId); if (!map.has(k)) map.set(k, []); map.get(k)!.push(s);
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

  return (
    <div className={`competence-matching-page ${draggingId ? "is-dragging" : ""}`} onDragEnd={handleDragEnd}>
      <AppPageHeader
        icon={<ThunderboltOutlined />} title="Matchmaking & Affectations" subtitle="Assignez intelligemment les savoirs aux enseignants"
        actions={
          <Space size="middle">
            <Select value={state.filters.departement} onChange={(v) => { dispatch({ type: "SET_FILTER", payload: { key: "departement", value: v } }); reloadData(); }} style={{ width: 180 }} options={[{ value: "all", label: "Tous les départements" }]} />
            <Select value={state.filters.domaine ?? "all"} onChange={(v) => dispatch({ type: "SET_FILTER", payload: { key: "domaine", value: v } })} style={{ width: 180 }} options={domainOptions} />
            <Input.Search placeholder="Rechercher..." value={state.filters.search} onChange={(e) => dispatch({ type: "SET_FILTER", payload: { key: "search", value: e.target.value } })} style={{ width: 220 }} allowClear />
            <Button icon={<ReloadOutlined />} onClick={() => reloadData()} loading={state.loading.data} />
          </Space>
        }
      />
      <div className="matching-main-content">
        <section className="matching-panel savoirs-list-panel">
          <div className="panel-header-section">
            <div className="panel-title-section"><BookOutlined style={{ color: "#1890ff" }} /> Savoirs Disponibles</div>
            <div className="panel-controls-section">
              <Switch checked={state.filters.showUnassignedOnly} onChange={(v) => dispatch({ type: "SET_FILTER", payload: { key: "showUnassignedOnly", value: v } })} size="small" />
              <Text style={{ fontSize: 12 }}>Non affectés</Text>
            </div>
          </div>
          <div className="panel-body-scrollable">
            {state.loading.data ? <Skeleton active paragraph={{ rows: 10 }} /> :
             filteredSavoirs.length === 0 ? <Empty description="Aucun savoir trouvé" /> :
             filteredSavoirs.map((s) => {
               const sId = String(s.id);
               const assigned = (state.assignments[sId] ?? []).map((id) => teacherById.get(id)).filter(Boolean) as RiceEnseignantEntry[];
               return (
                 <div key={sId} className={`savoir-assignment-card ${assigned.length > 0 ? "assigned" : "unassigned"} ${draggingId === sId ? "dragging" : ""}`}
                   draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ savoirId: String(s.id), code: s.code, action: "assign" })); e.dataTransfer.effectAllowed = "copy"; setDraggingId(String(s.id)); }} onDragEnd={handleDragEnd}>
                   <div className="savoir-card-header">
                     <span className="savoir-drag-handle"><HolderOutlined /></span>
                     <span className="savoir-code-label">{s.code as string}</span>
                     <span className="savoir-name-inline">{s.nom as string}</span>
                   </div>
                   {assigned.length > 0 && (
                     <div className="savoir-assigned-teachers">
                       {assigned.map((ens) => (
                         <Tag key={String(ens.id)} className="teacher-assignment-tag" closable onClose={makeUnassignHandler(String(s.id), String(ens.id))}>
                           {ens.prenom} {ens.nom}
                         </Tag>
                       ))}
                     </div>
                   )}
                 </div>
               );
             })}
          </div>
        </section>
        <section className="matching-panel enseignants-list-panel">
          <div className="panel-header-section">
            <div className="panel-title-section"><TeamOutlined style={{ color: "#52c41a" }} /> Corps Enseignant</div>
            <div className="panel-controls-section">
              <Input prefix={<SearchOutlined />} placeholder="Filtrer..." value={ensSearch} onChange={(e) => setEnsSearch(e.target.value)} style={{ width: 150 }} allowClear size="small" />
              <Select value={ensSort} onChange={setEnsSort} options={[{ value: "name", label: "A-Z" }, { value: "load_desc", label: "Charge ↓" }]} style={{ width: 100 }} size="small" />
            </div>
          </div>
          <div className="panel-body-scrollable">
            {state.loading.data ? <Skeleton active avatar paragraph={{ rows: 10 }} /> :
             sortedEnseignants.length === 0 ? <Empty description="Aucun enseignant" /> :
             sortedEnseignants.map((ens) => {
               const ensId = String(ens.id);
               const count = assignmentCountByEns[ensId] ?? 0;
               const loadPct = Math.round((count / Math.max(maxLoad, 1)) * 100);
               const assigned = assignedSavoirsByEns.get(ensId) ?? [];
               const initials = `${(ens.prenom as string)?.[0] ?? ""}${(ens.nom as string)?.[0] ?? ""}`.toUpperCase() || "?";
               return (
                 <div key={ensId} className={`enseignant-assignment-card ${draggingId ? "drag-mode-active" : ""} ${dragOverEns === ensId ? "drag-over-target" : ""}`}
                   onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOverEns(ensId); }}
                   onDragLeave={(e) => { const related = e.relatedTarget; if (related && e.currentTarget.contains(related as Node)) return; setDragOverEns(null); }}
                   onDrop={(e) => handleEnsDrop(e, ensId)}>
                   {dragOverEns === ensId && (
                     <div className="enseignant-drop-overlay">
                       <CheckCircleOutlined style={{ fontSize: 32, color: "#52c41a" }} />
                       <Text strong style={{ color: "#52c41a", marginTop: 8 }}>Relâcher pour assigner</Text>
                     </div>
                   )}
                   <div className="enseignant-card-header">
                     <div className="enseignant-avatar" style={{ backgroundColor: getAvatarColor(ensId) }}>{initials}</div>
                     <div className="enseignant-info-section">
                       <span className="enseignant-full-name">{ens.prenom as string} {ens.nom as string}</span>
                       <span className="enseignant-details-text">{(ens.departement as string) || "Département N/A"}</span>
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
                         <Tag key={String(sv.id)} color="blue" closable onClose={makeUnassignHandler(String(sv.id), ensId)} style={{ marginBottom: 4 }}>
                           {sv.code as string}
                         </Tag>
                       ))}
                     </div>
                   )}
                 </div>
               );
             })}
          </div>
        </section>
      </div>
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
