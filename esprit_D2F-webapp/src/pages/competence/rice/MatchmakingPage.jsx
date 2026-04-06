import React, { useEffect, useReducer, useRef, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Row,
  Col,
  Input,
  Select,
  Button,
  Spin,
  Layout,
  Form,
  Modal,
  Badge,
  Space,
  Pagination,
  notification,
} from "antd";
import { PlusOutlined, SaveOutlined } from "@ant-design/icons";
import RiceService from "../../../services/RiceService";
import SavoirMatchCard from "./SavoirMatchCard";
import TeacherLoadCard from "./TeacherLoadCard";
import "./MatchmakingPage.css";

const { Header, Content, Footer } = Layout;
const DEFAULT_ASSIGN_LEVEL = "N2_ELEMENTAIRE";

const normalizeNiveau = (value) => {
  const mapping = {
    1: "N1_DEBUTANT",
    2: "N2_ELEMENTAIRE",
    3: "N3_INTERMEDIAIRE",
    4: "N4_AVANCE",
    5: "N5_EXPERT",
  };
  if (typeof value === "string" && /^N[1-5]_[A-Z_]+$/.test(value)) return value;
  const numeric = Number(value);
  return mapping[numeric] || DEFAULT_ASSIGN_LEVEL;
};

const initialState = {
  savoirs: [],
  enseignants: [],
  assignments: new Map(),
  assignmentIds: new Map(),
  pendingChanges: { add: [], remove: [] },
  filters: { departement: null, domaine: "all", type: "all", statut: "all", search: "" },
  loading: { savoirs: false, enseignants: false, saving: false },
  error: null,
};

function reducer(state, action) {
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
      const added = [...newSet].filter((id) => !prev.has(id)).map((enseignantId) => ({ savoirId, enseignantId }));
      const removed = [...prev].filter((id) => !newSet.includes(id)).map((enseignantId) => ({ savoirId, enseignantId }));

      return {
        ...state,
        assignments,
        pendingChanges: { add: [...state.pendingChanges.add, ...added], remove: [...state.pendingChanges.remove, ...removed] },
      };
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
      const extraRemoves = [];
      for (const [sId, setOf] of assignments.entries()) {
        if (setOf.has(id)) {
          setOf.delete(id);
          extraRemoves.push({ savoirId: sId, enseignantId: id });
        }
      }
      const enseignants = state.enseignants.map((e) => (e.id === id ? { ...e, etat: "I" } : e));
      return { ...state, enseignants, assignments, pendingChanges: { add: [...state.pendingChanges.add], remove: [...state.pendingChanges.remove, ...extraRemoves] } };
    }
    case "SET_FILTER":
      return { ...state, filters: { ...state.filters, ...action.filters } };
    default:
      return state;
  }
}

function MatchmakingPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const savoirRefs = useRef({});

  const [teacherForm] = Form.useForm();
  const [teacherModalVisible, setTeacherModalVisible] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [api, contextHolder] = notification.useNotification();

  async function loadData(isMounted = () => true, options = { reportErrors: true }) {
    dispatch({ type: "SET_LOADING", key: "savoirs", value: true });
    dispatch({ type: "SET_LOADING", key: "enseignants", value: true });
    try {
      const [savoirs, enseignants, affectations] = await Promise.all([
        RiceService.getSavoirs(state.filters.departement),
        RiceService.getEnseignants(state.filters.departement),
        RiceService.getEnseignantAffectations(),
      ]);

      if (!isMounted()) return;

      dispatch({ type: "SET_SAVOIRS", savoirs });
      dispatch({ type: "SET_ENSEIGNANTS", enseignants });

      const assignments = new Map();
      const assignmentIds = new Map();
      const affectationList = Array.isArray(affectations)
        ? affectations
        : Array.isArray(affectations?.content)
          ? affectations.content
          : Array.isArray(affectations?.data)
            ? affectations.data
            : [];

      if (Array.isArray(affectationList) && affectationList.length > 0) {
        affectationList.forEach((a) => {
          const ecId = a.id ?? a.ecId ?? a.enseignantCompetenceId;
          const sId = a.savoirId ?? a.savoir_id ?? a.savoir;
          const eId = a.enseignantId ?? a.enseignant_id ?? a.enseignant;
          if (!sId || !eId) return;
          if (!assignments.has(sId)) assignments.set(sId, new Set());
          assignments.get(sId).add(eId);
          if (ecId != null) assignmentIds.set(`${String(sId)}|${String(eId)}`, ecId);
        });
      } else if (affectations && typeof affectations === "object") {
        Object.entries(affectations).forEach(([enseignantId, list]) => {
          (Array.isArray(list) ? list : []).forEach((sId) => {
            if (!assignments.has(sId)) assignments.set(sId, new Set());
            assignments.get(sId).add(enseignantId);
          });
        });
      }

      dispatch({ type: "SET_ASSIGNMENTS", assignments });
      dispatch({ type: "SET_ASSIGNMENT_IDS", assignmentIds });
    } catch (err) {
      console.error(err);
      if (options.reportErrors) {
        dispatch({ type: "SET_ERROR", error: err });
      }
    } finally {
      dispatch({ type: "SET_LOADING", key: "savoirs", value: false });
      dispatch({ type: "SET_LOADING", key: "enseignants", value: false });
    }
  }

  useEffect(() => {
    let mounted = true;
    void loadData(() => mounted);
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filters.departement]);

  const allTeachers = state.enseignants || [];

  const filteredSavoirs = useMemo(() => {
    let list = state.savoirs || [];
    const f = state.filters;
    if (f.domaine && f.domaine !== "all") list = list.filter((s) => s.domaine === f.domaine);
    if (f.type && f.type !== "all") list = list.filter((s) => (s.type || s.type_savoir) === f.type);
    if (f.statut && f.statut !== "all") {
      if (f.statut === "Affecté") list = list.filter((s) => (state.assignments.get(s.id) || new Set()).size > 0);
      else list = list.filter((s) => (state.assignments.get(s.id) || new Set()).size === 0);
    }
    if (f.search) {
      const q = f.search.toLowerCase();
      list = list.filter((s) => `${String(s.code || "")} ${String(s.nom || "")}`.toLowerCase().includes(q));
    }
    return list;
  }, [state.savoirs, state.filters, state.assignments]);

  const total = filteredSavoirs.length;
  const start = (page - 1) * pageSize;
  const pageItems = filteredSavoirs.slice(start, start + pageSize);

  function handleAssignChange(savoirId, newIds) {
    dispatch({ type: "ASSIGN_CHANGE", savoirId, newSet: newIds });
  }

  function handleUnassign(savoirId, enseignantId) {
    const prev = state.assignments.get(savoirId) || new Set();
    const newSet = [...prev].filter((id) => id !== enseignantId);
    dispatch({ type: "ASSIGN_CHANGE", savoirId, newSet });
  }

  function scrollToSavoir(savoirId) {
    const el = savoirRefs.current[savoirId];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList && el.classList.add("match-highlight");
      setTimeout(() => el.classList && el.classList.remove("match-highlight"), 1400);
    }
  }

  async function handleSave() {
    // Normalize & dedupe pending changes before sending to backend
    const normalizePending = (pending) => {
      const key = (p) => `${String(p.savoirId)}|${String(p.enseignantId)}`;
      const norm = (p) => ({
        savoirId: typeof p.savoirId === "string" && /^\d+$/.test(p.savoirId) ? Number(p.savoirId) : p.savoirId,
        enseignantId: typeof p.enseignantId === "string" && /^\d+$/.test(p.enseignantId) ? Number(p.enseignantId) : p.enseignantId,
      });

      const adds = new Map();
      const removes = new Map();
      (pending.add || []).forEach((p) => { if (p && p.savoirId != null && p.enseignantId != null) adds.set(key(p), norm(p)); });
      (pending.remove || []).forEach((p) => { if (p && p.savoirId != null && p.enseignantId != null) removes.set(key(p), norm(p)); });

      // Cancel out operations present in both lists
      for (const k of Array.from(adds.keys())) {
        if (removes.has(k)) {
          adds.delete(k);
          removes.delete(k);
        }
      }

      return { add: Array.from(adds.values()), remove: Array.from(removes.values()) };
    };

    const payload = normalizePending(state.pendingChanges);
    if ((payload.add.length === 0) && (payload.remove.length === 0)) {
      api.info({ message: "Aucune modification à sauvegarder" });
      dispatch({ type: "CLEAR_PENDING" });
      return;
    }

    dispatch({ type: "SAVE_START" });
    try {
      for (const item of payload.remove) {
        const ecId = state.assignmentIds.get(`${String(item.savoirId)}|${String(item.enseignantId)}`);
        if (ecId == null) {
          throw new Error(`Affectation introuvable pour suppression: savoir ${item.savoirId}, enseignant ${item.enseignantId}`);
        }
        await RiceService.removeAssignment(ecId);
      }

      for (const item of payload.add) {
        const savoir = state.savoirs.find((s) => String(s.id) === String(item.savoirId));
        const niveau = normalizeNiveau(savoir?.niveau);
        await RiceService.assignCompetence({
          enseignantId: String(item.enseignantId),
          savoirId: Number(item.savoirId),
          niveau,
        });
      }

      dispatch({ type: "SAVE_SUCCESS" });
      api.success({ message: "Affectations sauvegardées" });
      await loadData(() => true, { reportErrors: false });
    } catch (err) {
      console.error("saveAssignments error:", err?.response ?? err);
      dispatch({ type: "SET_ERROR", error: err });
      const backendMsg = err?.response?.data?.message ?? err?.response?.data ?? err?.message ?? String(err);
      api.error({ message: "Erreur lors de la sauvegarde", description: String(backendMsg) });
    }
  }

  // Teacher CRUD handlers
  async function handleCreateTeacher(values) {
    try {
      const created = await RiceService.createEnseignant(values);
      dispatch({ type: "CREATE_TEACHER", teacher: created });
      api.success({ message: "Enseignant créé" });
    } catch (err) {
      console.error(err);
      api.error({ message: "Erreur création enseignant", description: err?.response?.data?.message ?? err?.message });
    }
  }

  async function handleUpdateTeacher(id, values) {
    try {
      const updated = await RiceService.updateEnseignant(id, values);
      dispatch({ type: "UPDATE_TEACHER", teacher: updated });
      api.success({ message: "Enseignant mis à jour" });
    } catch (err) {
      console.error(err);
      api.error({ message: "Erreur mise à jour enseignant", description: err?.response?.data?.message ?? err?.message });
    }
  }

  async function handleDeactivateTeacher(id) {
    try {
      await RiceService.deactivateEnseignant(id);
      dispatch({ type: "DEACTIVATE_TEACHER", id });
      api.success({ message: "Enseignant désactivé" });
    } catch (err) {
      console.error(err);
      api.error({ message: "Erreur désactivation", description: err?.response?.data?.message ?? err?.message });
    }
  }

  function openCreateModal() {
    setEditingTeacher(null);
    teacherForm.resetFields();
    setTeacherModalVisible(true);
  }

  function openEditModal(teacher) {
    setEditingTeacher(teacher);
    teacherForm.setFieldsValue({ prenom: teacher.prenom, nom: teacher.nom, email: teacher.email, departement: teacher.departement, grade: teacher.grade });
    setTeacherModalVisible(true);
  }

  async function submitTeacher() {
    try {
      const vals = await teacherForm.validateFields();
      if (editingTeacher) {
        await handleUpdateTeacher(editingTeacher.id, vals);
      } else {
        await handleCreateTeacher(vals);
      }
      setTeacherModalVisible(false);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Layout className="matchmaking-container">
      {contextHolder}
      <Header className="matchmaking-header">
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Space>
            <Select
              value={state.filters.departement}
              onChange={(v) => dispatch({ type: "SET_FILTER", filters: { departement: v } })}
              style={{ width: 160 }}
              allowClear
              placeholder="Département"
            >
              <Select.Option value="gc">GC</Select.Option>
              <Select.Option value="info">INFO</Select.Option>
              <Select.Option value="ge">GE</Select.Option>
              <Select.Option value="meca">MECA</Select.Option>
            </Select>
            <Select
              value={state.filters.domaine}
              onChange={(v) => dispatch({ type: "SET_FILTER", filters: { domaine: v } })}
              style={{ width: 160 }}
            >
              <Select.Option value="all">Tous domaines</Select.Option>
            </Select>
            <Select
              value={state.filters.statut}
              onChange={(v) => dispatch({ type: "SET_FILTER", filters: { statut: v } })}
              style={{ width: 160 }}
            >
              <Select.Option value="all">Tous</Select.Option>
              <Select.Option value="Affecté">Affecté</Select.Option>
              <Select.Option value="Non affecté">Non affecté</Select.Option>
            </Select>
          </Space>

          <Input.Search
            placeholder="Recherche savoir par code / nom"
            onSearch={(q) => dispatch({ type: "SET_FILTER", filters: { search: q } })}
            style={{ width: 320 }}
            allowClear
          />
        </Space>
      </Header>

      <Content className="matchmaking-content">
        <Row gutter={16} style={{ height: "calc(100% - 120px)" }}>
          <Col span={12} className="matchmaking-left">
            {state.loading.savoirs ? (
              <div className="savoir-skeleton"><Spin /></div>
            ) : (
              <div className="savoir-list">
                {pageItems.map((s) => (
                  <div key={s.id} ref={(el) => (savoirRefs.current[s.id] = el)}>
                    <SavoirMatchCard
                      savoir={s}
                      assignedTeacherIds={[...((state.assignments.get(s.id) || new Set()))]}
                      allTeachers={allTeachers}
                      onAssignChange={handleAssignChange}
                      onUnassign={handleUnassign}
                    />
                  </div>
                ))}

                {total > pageSize && (
                  <div className="savoir-pagination">
                    <Pagination current={page} pageSize={pageSize} total={total} onChange={(p) => setPage(p)} />
                  </div>
                )}
              </div>
            )}
          </Col>

          <Col span={12} className="matchmaking-right">
            {state.loading.enseignants ? (
              <div className="teacher-skeleton"><Spin /></div>
            ) : (
              <div className="teacher-list">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3>Enseignants</h3>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>Créer un enseignant</Button>
                </div>

                <div style={{ maxHeight: "70vh", overflow: "auto" }}>
                  {allTeachers.map((t) => {
                    const assigned = [];
                    for (const [sId, setOf] of state.assignments.entries()) {
                      if (setOf.has(t.id)) assigned.push(sId);
                    }
                    return (
                      <TeacherLoadCard
                        key={t.id}
                        teacher={t}
                        assignedSavoirIds={assigned}
                        totalSavoirs={state.savoirs.length}
                        onChipClick={(sId) => scrollToSavoir(sId)}
                        onUnassign={(sId) => handleUnassign(sId, t.id)}
                        onEditRequest={(teacher) => openEditModal(teacher)}
                        onDeactivate={() => handleDeactivateTeacher(t.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </Col>
        </Row>
      </Content>

      <Footer className="matchmaking-footer">
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <div>
            <Badge count={state.pendingChanges.add.length + state.pendingChanges.remove.length} showZero>
              <Button type="primary" icon={<SaveOutlined />} loading={state.loading.saving} onClick={handleSave}>
                Sauvegarder les affectations
              </Button>
            </Badge>
          </div>
          <div>{state.pendingChanges.add.length + state.pendingChanges.remove.length} modification(s) en attente</div>
        </Space>
      </Footer>

      <Modal title={editingTeacher ? "Éditer enseignant" : "Créer enseignant"} open={teacherModalVisible} onOk={submitTeacher} onCancel={() => setTeacherModalVisible(false)}>
        <Form form={teacherForm} layout="vertical">
          <Form.Item name="prenom" label="Prénom" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="nom" label="Nom" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="departement" label="Département">
            <Select>
              <Select.Option value="gc">GC</Select.Option>
              <Select.Option value="info">INFO</Select.Option>
              <Select.Option value="ge">GE</Select.Option>
              <Select.Option value="meca">MECA</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="grade" label="Grade">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

export default MatchmakingPage;
