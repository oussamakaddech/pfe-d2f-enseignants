import { useEffect, useReducer, useRef, useMemo, useState, useCallback } from "react";
import {
  Row, Col, Input, Button, Spin, Layout, Form, Modal, Badge, Space, Pagination, Tag, Avatar, Select,
} from "antd";
import {
  PlusOutlined, SaveOutlined, CheckCircleOutlined, ClockCircleOutlined,
  UserOutlined, FilterOutlined,
} from "@ant-design/icons";
import {
  useRiceSavoirs, useRiceEnseignants, useRiceEnseignantAffectations,
  useRiceRemoveAssignment, useRiceAssignCompetence,
  useRiceCreateEnseignant, useRiceUpdateEnseignant, useRiceDeactivateEnseignant,
} from "@/hooks/analyse/useRiceService";
import SavoirMatchCard from "./SavoirMatchCard";
import TeacherLoadCard from "./TeacherLoadCard";
import { DEPARTMENT_OPTIONS, avatarColor, getInitials } from "./constants";
import useAppNotification from "@/hooks/ui/useAppNotification";
import "@/styles/pages/matchmaking-page.css";

const { Header, Content, Footer } = Layout;
const { Option } = Select;
const DEFAULT_ASSIGN_LEVEL = "N2_ELEMENTAIRE";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Savoir { id: number | string; code?: string; nom?: string; type?: string; niveau?: string | number; domaine?: string; [key: string]: unknown }
interface Enseignant { id: number | string; nom?: string; prenom?: string; departement?: string; grade?: string; etat?: string; [key: string]: unknown }
interface PendingItem { savoirId: number | string; enseignantId: number | string }
interface MatchState {
  savoirs: Savoir[];
  enseignants: Enseignant[];
  assignments: Map<number | string, Set<number | string>>;
  assignmentIds: Map<string, number | string>;
  pendingChanges: { add: PendingItem[]; remove: PendingItem[] };
  filters: { departement: string | null; domaine: string; type: string; statut: string; search: string };
  loading: { savoirs: boolean; enseignants: boolean; saving: boolean };
  error: unknown;
}
type MatchAction =
  | { type: "SET_LOADING"; key: string; value: boolean }
  | { type: "SET_SAVOIRS"; savoirs: Savoir[] }
  | { type: "SET_ENSEIGNANTS"; enseignants: Enseignant[] }
  | { type: "SET_ASSIGNMENTS"; assignments: Map<number | string, Set<number | string>> }
  | { type: "SET_ASSIGNMENT_IDS"; assignmentIds: Map<string, number | string> }
  | { type: "ASSIGN_CHANGE"; savoirId: number | string; newSet: (number | string)[] }
  | { type: "CLEAR_PENDING" }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS" }
  | { type: "SET_ERROR"; error: unknown }
  | { type: "CREATE_TEACHER"; teacher: Enseignant }
  | { type: "UPDATE_TEACHER"; teacher: Enseignant }
  | { type: "DEACTIVATE_TEACHER"; id: number | string }
  | { type: "SET_FILTER"; filters: Partial<MatchState["filters"]> };

const normalizeNiveau = (value: unknown): string => {
  const mapping: Record<number, string> = { 1: "N1_DEBUTANT", 2: "N2_ELEMENTAIRE", 3: "N3_INTERMEDIAIRE", 4: "N4_AVANCE", 5: "N5_EXPERT" };
  if (typeof value === "string" && /^N[1-5]_[A-Z_]+$/.test(value)) return value;
  return mapping[Number(value)] || DEFAULT_ASSIGN_LEVEL;
};

const initialState: MatchState = {
  savoirs: [], enseignants: [],
  assignments: new Map(), assignmentIds: new Map(),
  pendingChanges: { add: [], remove: [] },
  filters: { departement: null, domaine: "all", type: "all", statut: "all", search: "" },
  loading: { savoirs: false, enseignants: false, saving: false },
  error: null,
};

function reducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: { ...state.loading, [action.key]: action.value } };
    case "SET_SAVOIRS":
      return { ...state, savoirs: action.savoirs };
    case "SET_ENSEIGNANTS":
      return { ...state, enseignants: action.enseignants };
    case "SET_ASSIGNMENTS":
      return { ...state, assignments: action.assignments };
    case "SET_ASSIGNMENT_IDS":
      return { ...state, assignmentIds: action.assignmentIds };
    case "ASSIGN_CHANGE": {
      const { savoirId, newSet } = action;
      const assignments = new Map(state.assignments);
      assignments.set(savoirId, new Set(newSet));
      const prev = state.assignments.get(savoirId) || new Set();
      const added = newSet.filter((id) => !prev.has(id)).map((enseignantId) => ({ savoirId, enseignantId }));
      const removed = [...prev].filter((id) => !newSet.includes(id)).map((enseignantId) => ({ savoirId, enseignantId }));
      return { ...state, assignments, pendingChanges: { add: [...state.pendingChanges.add, ...added], remove: [...state.pendingChanges.remove, ...removed] } };
    }
    case "CLEAR_PENDING":
      return { ...state, pendingChanges: { add: [], remove: [] } };
    case "SAVE_START":
      return { ...state, loading: { ...state.loading, saving: true } };
    case "SAVE_SUCCESS":
      return { ...state, loading: { ...state.loading, saving: false }, pendingChanges: { add: [], remove: [] } };
    case "SET_ERROR":
      return { ...state, error: action.error, loading: { ...state.loading, saving: false } };
    case "CREATE_TEACHER":
      return { ...state, enseignants: [action.teacher, ...state.enseignants] };
    case "UPDATE_TEACHER":
      return { ...state, enseignants: state.enseignants.map((e) => (e.id === action.teacher.id ? action.teacher : e)) };
    case "DEACTIVATE_TEACHER": {
      const id = action.id;
      const assignments = new Map(state.assignments);
      const extraRemoves: PendingItem[] = [];
      for (const [sId, setOf] of assignments.entries()) {
        if (setOf.has(id)) { setOf.delete(id); extraRemoves.push({ savoirId: sId, enseignantId: id }); }
      }
      return { ...state, enseignants: state.enseignants.map((e) => (e.id === id ? { ...e, etat: "I" } : e)), assignments, pendingChanges: { add: [...state.pendingChanges.add], remove: [...state.pendingChanges.remove, ...extraRemoves] } };
    }
    case "SET_FILTER":
      return { ...state, filters: { ...state.filters, ...action.filters } };
    default:
      return state;
  }
}

// ── Savoir code map for Teacher chips ─────────────────────────────────────────
function buildSavoirCodeMap(savoirs: Savoir[]): Map<string, string> {
  const map = new Map<string, string>();
  savoirs.forEach((s) => map.set(String(s.id), s.code || String(s.id)));
  return map;
}

// ── Main Component ─────────────────────────────────────────────────────────────
function MatchmakingPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const savoirRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { message: msgApi } = useAppNotification();

  const [teacherForm] = Form.useForm();
  const [teacherModalVisible, setTeacherModalVisible] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Enseignant | null>(null);

  const removeAssignment = useRiceRemoveAssignment();
  const assignCompetence = useRiceAssignCompetence();
  const createEnseignantHook = useRiceCreateEnseignant();
  const updateEnseignantHook = useRiceUpdateEnseignant();
  const deactivateEnseignantHook = useRiceDeactivateEnseignant();

  const { data: savoirsData = [] } = useRiceSavoirs(state.filters.departement);
  const { data: enseignantsData = [] } = useRiceEnseignants(state.filters.departement);
  const { data: affectationsData } = useRiceEnseignantAffectations();

  const hydrateFromHooks = useCallback(() => {
    dispatch({ type: "SET_SAVOIRS", savoirs: savoirsData as Savoir[] });
    dispatch({ type: "SET_ENSEIGNANTS", enseignants: enseignantsData as Enseignant[] });

    const assignments = new Map<number | string, Set<number | string>>();
    const assignmentIds = new Map<string, number | string>();

    let affectationList: Record<string, unknown>[];
    if (Array.isArray(affectationsData)) affectationList = affectationsData;
    else if (Array.isArray((affectationsData as Record<string, unknown>)?.content)) affectationList = (affectationsData as Record<string, unknown[][]>).content;
    else if (Array.isArray((affectationsData as Record<string, unknown>)?.data)) affectationList = (affectationsData as Record<string, unknown[][]>).data;
    else affectationList = [];

    if (affectationList.length > 0) {
      affectationList.forEach((a) => {
        const ecId = a.id ?? a.ecId ?? a.enseignantCompetenceId;
        const sId = a.savoirId ?? a.savoir_id ?? a.savoir;
        const eId = a.enseignantId ?? a.enseignant_id ?? a.enseignant;
        if (!sId || !eId) return;
        if (!assignments.has(sId as number)) assignments.set(sId as number, new Set());
        assignments.get(sId as number)!.add(eId as number);
        if (ecId != null) assignmentIds.set(`${String(sId)}|${String(eId)}`, ecId as number);
      });
    }

    dispatch({ type: "SET_ASSIGNMENTS", assignments });
    dispatch({ type: "SET_ASSIGNMENT_IDS", assignmentIds });
  }, [savoirsData, enseignantsData, affectationsData]);

  useEffect(() => { hydrateFromHooks(); }, [hydrateFromHooks]);

  // ── Domaine options (dynamic) ──────────────────────────────────────────────
  const domaineOptions = useMemo(() => {
    const all = new Set(state.savoirs.map((s) => s.domaine).filter(Boolean));
    return Array.from(all) as string[];
  }, [state.savoirs]);

  // ── Filtered savoirs ───────────────────────────────────────────────────────
  const filteredSavoirs = useMemo(() => {
    let list = state.savoirs;
    const f = state.filters;
    if (f.domaine !== "all") list = list.filter((s) => s.domaine === f.domaine);
    if (f.type !== "all") list = list.filter((s) => (s.type || s.type_savoir) === f.type);
    if (f.statut !== "all") {
      if (f.statut === "assigned") list = list.filter((s) => (state.assignments.get(s.id) || new Set()).size > 0);
      else list = list.filter((s) => (state.assignments.get(s.id) || new Set()).size === 0);
    }
    if (f.search) {
      const q = f.search.toLowerCase();
      list = list.filter((s) => `${String(s.code || "")} ${String(s.nom || "")}`.toLowerCase().includes(q));
    }
    return list;
  }, [state.savoirs, state.filters, state.assignments]);

  const total = filteredSavoirs.length;
  const pageItems = filteredSavoirs.slice((page - 1) * pageSize, page * pageSize);

  const savoirCodeMap = useMemo(() => buildSavoirCodeMap(state.savoirs), [state.savoirs]);

  const pendingCount = state.pendingChanges.add.length + state.pendingChanges.remove.length;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const assignedCount = useMemo(
    () => filteredSavoirs.filter((s) => (state.assignments.get(s.id) || new Set()).size > 0).length,
    [filteredSavoirs, state.assignments],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAssignChange = useCallback((savoirId: number | string, newIds: (number | string)[]) => {
    dispatch({ type: "ASSIGN_CHANGE", savoirId, newSet: newIds });
  }, []);

  const handleUnassign = useCallback((savoirId: number | string, enseignantId: number | string) => {
    const prev = state.assignments.get(savoirId) || new Set();
    dispatch({ type: "ASSIGN_CHANGE", savoirId, newSet: [...prev].filter((id) => id !== enseignantId) });
  }, [state.assignments]);

  const scrollToSavoir = useCallback((savoirId: number | string) => {
    const el = savoirRefs.current[String(savoirId)];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.classList?.add("match-highlight");
    setTimeout(() => el?.classList?.remove("match-highlight"), 1400);
  }, []);

  const handleSave = async () => {
    const key = (p: PendingItem) => `${String(p.savoirId)}|${String(p.enseignantId)}`;
    const norm = (p: PendingItem) => ({
      savoirId: typeof p.savoirId === "string" && /^\d+$/.test(p.savoirId) ? Number(p.savoirId) : p.savoirId,
      enseignantId: typeof p.enseignantId === "string" && /^\d+$/.test(p.enseignantId) ? Number(p.enseignantId) : p.enseignantId,
    });

    const adds = new Map<string, PendingItem>();
    const removes = new Map<string, PendingItem>();
    state.pendingChanges.add.forEach((p) => { if (p.savoirId != null && p.enseignantId != null) adds.set(key(p), norm(p)); });
    state.pendingChanges.remove.forEach((p) => { if (p.savoirId != null && p.enseignantId != null) removes.set(key(p), norm(p)); });
    for (const k of Array.from(adds.keys())) { if (removes.has(k)) { adds.delete(k); removes.delete(k); } }

    const payload = { add: Array.from(adds.values()), remove: Array.from(removes.values()) };
    if (payload.add.length === 0 && payload.remove.length === 0) {
      msgApi.info("Aucune modification à sauvegarder");
      dispatch({ type: "CLEAR_PENDING" });
      return;
    }

    dispatch({ type: "SAVE_START" });
    try {
      for (const item of payload.remove) {
        const ecId = state.assignmentIds.get(`${String(item.savoirId)}|${String(item.enseignantId)}`);
        if (ecId == null) throw new Error(`Affectation introuvable: savoir ${item.savoirId}, enseignant ${item.enseignantId}`);
        await removeAssignment.mutateAsync(ecId);
      }
      for (const item of payload.add) {
        const savoir = state.savoirs.find((s) => String(s.id) === String(item.savoirId));
        await assignCompetence.mutateAsync({ enseignantId: String(item.enseignantId), savoirId: Number(item.savoirId), niveau: normalizeNiveau(savoir?.niveau) });
      }
      dispatch({ type: "SAVE_SUCCESS" });
      msgApi.success(`${payload.add.length + payload.remove.length} affectation(s) sauvegardée(s)`);
      hydrateFromHooks();
    } catch (err: unknown) {
      dispatch({ type: "SET_ERROR", error: err });
      const e = err as Record<string, unknown>;
      const msg = (e?.response as Record<string, unknown>)?.data ?? e?.message ?? String(err);
      msgApi.error(`Erreur lors de la sauvegarde: ${String(msg)}`);
    }
  };

  const handleCreateTeacher = async (values: Record<string, unknown>) => {
    try {
      const created = await createEnseignantHook.mutateAsync(values);
      dispatch({ type: "CREATE_TEACHER", teacher: created as Enseignant });
      msgApi.success("Enseignant créé");
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      msgApi.error(`Erreur: ${(e?.response as Record<string, unknown>)?.data ?? e?.message}`);
    }
  };

  const handleUpdateTeacher = async (id: number | string, values: Record<string, unknown>) => {
    try {
      const updated = await updateEnseignantHook.mutateAsync({ id, data: values });
      dispatch({ type: "UPDATE_TEACHER", teacher: updated as Enseignant });
      msgApi.success("Enseignant mis à jour");
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      msgApi.error(`Erreur: ${(e?.response as Record<string, unknown>)?.data ?? e?.message}`);
    }
  };

  const handleDeactivateTeacher = async (id: number | string) => {
    try {
      await deactivateEnseignantHook.mutateAsync(id);
      dispatch({ type: "DEACTIVATE_TEACHER", id });
      msgApi.success("Enseignant désactivé");
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      msgApi.error(`Erreur: ${(e?.response as Record<string, unknown>)?.data ?? e?.message}`);
    }
  };

  const openCreateModal = () => { setEditingTeacher(null); teacherForm.resetFields(); setTeacherModalVisible(true); };
  const openEditModal = (teacher: Enseignant) => {
    setEditingTeacher(teacher);
    teacherForm.setFieldsValue({ prenom: teacher.prenom, nom: teacher.nom, email: teacher.email, departement: teacher.departement, grade: teacher.grade });
    setTeacherModalVisible(true);
  };
  const submitTeacher = async () => {
    try {
      const vals = await teacherForm.validateFields();
      if (editingTeacher) await handleUpdateTeacher(editingTeacher.id, vals);
      else await handleCreateTeacher(vals);
      setTeacherModalVisible(false);
    } catch { /* validation error */ }
  };

  const activeTeachers = state.enseignants.filter((t) => t.etat !== "I");

  return (
    <Layout className="mm-layout">
      {/* ── Toolbar ── */}
      <Header className="mm-toolbar">
        <div className="mm-toolbar__left">
          <FilterOutlined className="mm-toolbar__icon" />
          <Select
            value={state.filters.departement}
            onChange={(v) => dispatch({ type: "SET_FILTER", filters: { departement: v ?? null } })}
            style={{ width: 170 }}
            allowClear
            placeholder="Département"
            options={DEPARTMENT_OPTIONS}
            optionFilterProp="labelText"
            showSearch
          />
          <Select
            value={state.filters.domaine}
            onChange={(v) => { dispatch({ type: "SET_FILTER", filters: { domaine: v } }); setPage(1); }}
            style={{ width: 160 }}
          >
            <Option value="all">Tous domaines</Option>
            {domaineOptions.map((d) => <Option key={d} value={d}>{d}</Option>)}
          </Select>
          <Select
            value={state.filters.type}
            onChange={(v) => { dispatch({ type: "SET_FILTER", filters: { type: v } }); setPage(1); }}
            style={{ width: 140 }}
          >
            <Option value="all">Tous types</Option>
            <Option value="THEORIQUE">Théorique</Option>
            <Option value="PRATIQUE">Pratique</Option>
          </Select>
          <Select
            value={state.filters.statut}
            onChange={(v) => { dispatch({ type: "SET_FILTER", filters: { statut: v } }); setPage(1); }}
            style={{ width: 150 }}
          >
            <Option value="all">Tous statuts</Option>
            <Option value="assigned">✅ Affecté</Option>
            <Option value="unassigned">⚠️ Non affecté</Option>
          </Select>
        </div>
        <Input.Search
          placeholder="Code / nom du savoir..."
          onSearch={(q) => { dispatch({ type: "SET_FILTER", filters: { search: q } }); setPage(1); }}
          onChange={(e) => !e.target.value && dispatch({ type: "SET_FILTER", filters: { search: "" } })}
          style={{ width: 280 }}
          allowClear
        />
      </Header>

      {/* ── Stats bar ── */}
      <div className="mm-statsbar">
        <span className="mm-stat">
          <CheckCircleOutlined className="mm-stat__icon mm-stat__icon--ok" />
          <strong>{assignedCount}</strong> affectés
        </span>
        <span className="mm-stat">
          <ClockCircleOutlined className="mm-stat__icon mm-stat__icon--warn" />
          <strong>{total - assignedCount}</strong> sans enseignant
        </span>
        <span className="mm-stat">
          <UserOutlined className="mm-stat__icon" />
          <strong>{activeTeachers.length}</strong> enseignant{activeTeachers.length > 1 ? "s" : ""}
        </span>
        <span className="mm-stat mm-stat--total">{total} savoir{total > 1 ? "s" : ""} affichés</span>
      </div>

      {/* ── Content ── */}
      <Content className="mm-content">
        <Row gutter={0} style={{ height: "100%" }}>
          {/* Left — Savoirs */}
          <Col span={13} className="mm-col mm-col--savoirs">
            <div className="mm-col-head">
              <span className="mm-col-head__title">Savoirs</span>
              <Badge count={total} style={{ background: "#4f46e5" }} />
            </div>

            {state.loading.savoirs ? (
              <div className="mm-loading"><Spin tip="Chargement…" /></div>
            ) : (
              <div className="mm-savoir-list">
                {pageItems.map((s) => (
                  <div key={s.id} ref={(el) => { savoirRefs.current[String(s.id)] = el; }}>
                    <SavoirMatchCard
                      savoir={s}
                      assignedTeacherIds={[...(state.assignments.get(s.id) || new Set())]}
                      allTeachers={activeTeachers}
                      onAssignChange={handleAssignChange}
                      onUnassign={handleUnassign}
                    />
                  </div>
                ))}

                {total > pageSize && (
                  <div className="mm-pagination">
                    <Pagination
                      current={page}
                      pageSize={pageSize}
                      total={total}
                      onChange={(p) => { setPage(p); }}
                      showTotal={(n, r) => `${r[0]}-${r[1]} sur ${n}`}
                      size="small"
                    />
                  </div>
                )}
              </div>
            )}
          </Col>

          {/* Right — Enseignants */}
          <Col span={11} className="mm-col mm-col--teachers">
            <div className="mm-col-head">
              <span className="mm-col-head__title">Enseignants</span>
              <Badge count={activeTeachers.length} style={{ background: "#059669" }} />
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreateModal} className="mm-add-btn">
                Créer
              </Button>
            </div>

            {state.loading.enseignants ? (
              <div className="mm-loading"><Spin tip="Chargement…" /></div>
            ) : (
              <div className="mm-teacher-list">
                {activeTeachers.length === 0 && (
                  <div className="mm-empty">
                    <UserOutlined style={{ fontSize: 32, opacity: 0.3 }} />
                    <p>Aucun enseignant disponible</p>
                  </div>
                )}
                {activeTeachers.map((t) => {
                  const assigned: (number | string)[] = [];
                  for (const [sId, setOf] of state.assignments.entries()) {
                    if (setOf.has(t.id)) assigned.push(sId);
                  }
                  return (
                    <TeacherLoadCard
                      key={t.id}
                      teacher={t}
                      assignedSavoirIds={assigned}
                      savoirCodeMap={savoirCodeMap}
                      totalSavoirs={filteredSavoirs.length}
                      onChipClick={(sId) => scrollToSavoir(sId)}
                      onUnassign={(sId) => handleUnassign(sId, t.id)}
                      onEditRequest={(teacher) => openEditModal(teacher)}
                      onDeactivate={() => handleDeactivateTeacher(t.id)}
                    />
                  );
                })}
              </div>
            )}
          </Col>
        </Row>
      </Content>

      {/* ── Footer / Save bar ── */}
      <Footer className="mm-savebar">
        <div className="mm-savebar__info">
          {pendingCount > 0 ? (
            <span className="mm-savebar__pending">
              <span className="mm-savebar__dot" />
              {pendingCount} modification{pendingCount > 1 ? "s" : ""} en attente
            </span>
          ) : (
            <span className="mm-savebar__clean">Aucune modification non sauvegardée</span>
          )}
        </div>
        <Space>
          {pendingCount > 0 && (
            <Button size="small" onClick={() => dispatch({ type: "CLEAR_PENDING" })}>
              Annuler les changements
            </Button>
          )}
          <Badge count={pendingCount} size="small">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={state.loading.saving}
              onClick={handleSave}
              disabled={pendingCount === 0}
              className="mm-save-btn"
            >
              Sauvegarder
            </Button>
          </Badge>
        </Space>
      </Footer>

      {/* ── Teacher create/edit modal ── */}
      <Modal
        title={
          <Space>
            <Avatar style={{ background: editingTeacher ? avatarColor(editingTeacher.id) : "#4f46e5", size: 28 }}>
              {editingTeacher ? getInitials(editingTeacher.nom ?? "", editingTeacher.prenom ?? "") : <PlusOutlined />}
            </Avatar>
            {editingTeacher ? `Modifier — ${editingTeacher.prenom} ${editingTeacher.nom}` : "Créer un enseignant"}
          </Space>
        }
        open={teacherModalVisible}
        onOk={submitTeacher}
        onCancel={() => setTeacherModalVisible(false)}
        okText={editingTeacher ? "Enregistrer" : "Créer"}
        width={480}
      >
        <Form form={teacherForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="prenom" label="Prénom" rules={[{ required: true, message: "Requis" }]}>
                <Input placeholder="Prénom" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Requis" }]}>
                <Input placeholder="Nom" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ type: "email", message: "Email invalide" }]}>
            <Input placeholder="prenom.nom@esprit.tn" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="departement" label="Département">
                <Select options={DEPARTMENT_OPTIONS} optionFilterProp="labelText" showSearch allowClear placeholder="Département" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="grade" label="Grade">
                <Select allowClear placeholder="Grade">
                  <Option value="PES">PES</Option>
                  <Option value="MCA">MCA</Option>
                  <Option value="MCB">MCB</Option>
                  <Option value="MAA">MAA</Option>
                  <Option value="MAB">MAB</Option>
                  <Option value="Vacataire">Vacataire</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Layout>
  );
}

export default MatchmakingPage;
