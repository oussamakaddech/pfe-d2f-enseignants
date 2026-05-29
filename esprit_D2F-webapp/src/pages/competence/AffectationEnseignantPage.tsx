// Tableau des affectations enseignants ↔ savoirs (résultat de l'analyse RICE)

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table, Input, Button, Empty, Modal, Form, Select, Row, Col, Statistic,
} from "antd";
import {
  SearchOutlined, ReloadOutlined, RobotOutlined, DownloadOutlined, PlusOutlined,
  TeamOutlined, BookOutlined, SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useEnseignantCompetenceApi, useSavoirApi } from "@/hooks/competence/useCompetenceService";
import { useEnseignants } from "@/hooks/enseignant/useEnseignants";
import AppPageHeader from "@/components/common/AppPageHeader";
import "@/styles/pages/affectation-enseignant-page.css";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { NIVEAU_OPTIONS } from "@/utils/constants/competenceOptions";
import type { EnseignantCompetence, Savoir } from "@/models/competence";
import type { Id } from "@/models/common";
import {
  NIVEAU_LABEL, toNiveauEnum,
  type AffectationSavoirRow, type EnseignantRow,
  buildMainColumns, buildExpandedColumns,
} from "./components/affectationColumns";

const { Option } = Select;

interface AssignFormValues {
  enseignantId: Id;
  savoirId: Id;
  niveau: string;
  dateAcquisition?: string;
  commentaire?: string;
}

export default function AffectationEnseignantPage() {
  const { message: msgApi } = useAppNotification();
  const navigate = useNavigate();

  const ecApi = useEnseignantCompetenceApi();
  const savoirApi = useSavoirApi();
  const { data: enseignants = [] } = useEnseignants();

  const [affectations, setAffectations] = useState<EnseignantCompetence[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState("");

  const [savoirs,      setSavoirs]      = useState<Savoir[]>([]);
  const [assignModal,  setAssignModal]  = useState(false);
  const [niveauModal,  setNiveauModal]  = useState(false);
  const [assignForm]   = Form.useForm<AssignFormValues>();
  const [niveauForm]   = Form.useForm<{ niveau: string }>();
  const [editingRecord, setEditingRecord] = useState<AffectationSavoirRow | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [affResult, savResult] = await Promise.allSettled([ecApi.getAll(), savoirApi.getAll()]);
      if (affResult.status === "fulfilled") setAffectations(Array.isArray(affResult.value) ? affResult.value : []);
      else { msgApi.warning("Impossible de charger les affectations"); setAffectations([]); }
      if (savResult.status === "fulfilled") setSavoirs(Array.isArray(savResult.value) ? savResult.value : []);
      else setSavoirs([]);
    } catch { msgApi.error("Erreur inattendue lors du chargement des données"); }
    finally { setLoading(false); }
  }, [msgApi, ecApi, savoirApi]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const ensMap = useMemo(() => {
    const m = new Map<string, typeof enseignants[0]>();
    enseignants.forEach((e) => m.set(String(e.id), e));
    return m;
  }, [enseignants]);

  const savoirMap = useMemo(() => {
    const m = new Map<string, Savoir>();
    savoirs.forEach((s) => m.set(String(s.id), s));
    return m;
  }, [savoirs]);

  const rows = useMemo<EnseignantRow[]>(() => {
    const grouped = new Map<string, EnseignantRow>();
    affectations.forEach((a) => {
      const eid = String(a.enseignantId);
      if (!grouped.has(eid)) {
        const e = ensMap.get(eid);
        grouped.set(eid, {
          key: eid, enseignantId: eid,
          nom: e ? `${e.prenom ?? ""} ${e.nom ?? ""}`.trim() : eid.replace(/^EX-/i, ""),
          savoirs: [],
        });
      }
      grouped.get(eid)!.savoirs.push({
        affId: a.id!, code: a.savoirCode ?? "—", nom: a.savoirNom ?? "—",
        competenceNom: a.competenceNom ?? "—",
        niveau: (() => {
          const affNiveau = toNiveauEnum(a.niveau);
          const savNiveau = toNiveauEnum(savoirMap.get(String(a.savoirId))?.niveau);
          if (!affNiveau) return savNiveau;
          if (affNiveau === "N1_DEBUTANT" && savNiveau && savNiveau !== affNiveau) return savNiveau;
          return affNiveau;
        })(),
      });
    });
    return Array.from(grouped.values());
  }, [affectations, ensMap, savoirMap]);

  const filtered = useMemo<EnseignantRow[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.nom.toLowerCase().includes(q) ||
      r.savoirs.some((s) => s.code.toLowerCase().includes(q) || s.nom.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const exportAffectationsCsv = useCallback(() => {
    const filteredIds = new Set(filtered.map((r) => String(r.enseignantId)));
    const selected = affectations.filter((a) => filteredIds.has(String(a.enseignantId)));
    const header = ["affectation_id", "enseignant_id", "enseignant_nom", "savoir_code", "savoir_nom", "niveau_code", "niveau_label"];
    const resolveName = (eid: Id) => {
      const e = ensMap.get(String(eid));
      return e ? `${e.prenom ?? ""} ${e.nom ?? ""}`.trim() : String(eid).replace(/^EX-/i, "");
    };
    const rowsCsv = selected.map((a) => [a.id ?? "", String(a.enseignantId ?? ""), resolveName(a.enseignantId!), a.savoirCode ?? "", a.savoirNom ?? "", a.niveau ?? "", NIVEAU_LABEL[a.niveau ?? ""] ?? (a.niveau ?? "—")]);
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = [header, ...rowsCsv].map((r) => r.map(esc).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "affectations_enseignants_rice.csv"; a.click();
    URL.revokeObjectURL(url);
    msgApi.success(`CSV exporté (${rowsCsv.length} affectation(s))`);
  }, [affectations, ensMap, filtered, msgApi]);

  const handleAssign = async () => {
    try {
      const values = (await assignForm.validateFields()) as AssignFormValues;
      await ecApi.assign(values);
      msgApi.success("Affectation ajoutée avec succès");
      setAssignModal(false);
      loadAll();
    } catch (err: unknown) {
      if ((err as Record<string, unknown>)?.errorFields) return;
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Erreur lors de l'ajout";
      msgApi.error(msg);
    }
  };

  const handleUpdateNiveau = async () => {
    try {
      const { niveau } = (await niveauForm.validateFields()) as { niveau: string };
      await ecApi.updateNiveau(editingRecord!.affId, niveau);
      msgApi.success("Niveau mis à jour");
      setNiveauModal(false);
      loadAll();
    } catch (err: unknown) {
      if ((err as Record<string, unknown>)?.errorFields) return;
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Erreur lors de la mise à jour";
      msgApi.error(msg);
    }
  };

  const handleDeleteSavoir = async (affId: Id) => {
    try { await ecApi.remove(affId); msgApi.success("Affectation supprimée"); loadAll(); }
    catch { msgApi.error("Erreur lors de la suppression"); }
  };

  const openNiveauModal = (record: AffectationSavoirRow) => {
    setEditingRecord(record);
    niveauForm.setFieldsValue({ niveau: record.niveau ?? "" });
    setNiveauModal(true);
  };

  const handleDeleteAll = async (rec: EnseignantRow) => {
    try {
      await Promise.all(rec.savoirs.map((s) => ecApi.remove(s.affId)));
      msgApi.success("Affectations supprimées");
      loadAll();
    } catch { msgApi.error("Erreur lors de la suppression"); }
  };

  const columns = buildMainColumns({ openNiveauModal, handleDeleteSavoir, handleDeleteAll });

  const expandedRowRender = (record: EnseignantRow) => (
    <Table
      columns={buildExpandedColumns(openNiveauModal, handleDeleteSavoir)}
      dataSource={record.savoirs}
      pagination={false}
      rowKey={(r) => String(r.affId)}
      size="small"
    />
  );

  const stats = useMemo(() => [
    { icon: <TeamOutlined />, label: "Enseignants", value: rows.length, color: "var(--color-info)", bg: "var(--color-info-bg)" },
    { icon: <BookOutlined />, label: "Affectations", value: affectations.length, color: "var(--primary-500)", bg: "var(--primary-50)" },
    { icon: <SafetyCertificateOutlined />, label: "Savoirs", value: savoirs.length, color: "var(--color-success)", bg: "var(--color-success-bg)" },
  ], [rows.length, affectations.length, savoirs.length]);

  return (
    <div className="affectation-page">
      <AppPageHeader
        icon={<TeamOutlined />}
        title="Affectations Enseignants"
        subtitle="Résultat de l'analyse RICE : enseignants et leurs savoirs associés. Ajoutez des affectations manuellement."
        actions={<Button className="d2f-btn-primary" icon={<PlusOutlined />} onClick={() => setAssignModal(true)}>Nouvelle Affectation</Button>}
      />
      <Row gutter={[16, 16]} className="affectation-stats-row">
        {stats.map((s) => (
          <Col xs={12} sm={8} key={s.label}>
            <div className="affectation-stat-card">
              <div className="affectation-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <Statistic title={s.label} value={s.value} valueStyle={{ color: s.color, fontWeight: 700 }} />
            </div>
          </Col>
        ))}
      </Row>
      <div className="affectation-toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Rechercher enseignant ou code savoir…" allowClear value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 300 }} />
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>Actualiser</Button>
        <Button icon={<DownloadOutlined />} onClick={exportAffectationsCsv} disabled={loading || filtered.length === 0}>Export CSV</Button>
      </div>
      <div className="affectation-table-wrapper">
        <Table<EnseignantRow>
          dataSource={filtered}
          columns={columns}
          rowKey="enseignantId"
          expandable={{ expandedRowRender, expandRowByClick: false }}
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"], showTotal: (total) => `${total} enseignant(s)` }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span>Aucune affectation. <button type="button" className="link-button" onClick={() => navigate("/home/rice")}><RobotOutlined /> Analyser une fiche RICE</button></span>} /> }}
        />
      </div>
      <Modal title="Nouvelle affectation" className="affectation-modal" open={assignModal} onOk={handleAssign} onCancel={() => setAssignModal(false)} afterClose={() => assignForm.resetFields()} okText="Ajouter" cancelText="Annuler" forceRender>
        <Form form={assignForm} layout="vertical">
          <Form.Item name="enseignantId" label="Enseignant" rules={[{ required: true, message: "Enseignant obligatoire" }]}>
            <Select placeholder="Sélectionner un enseignant" showSearch optionFilterProp="children">
              {enseignants.map((e) => (<Option key={e.id} value={e.id}>{e.prenom} {e.nom}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="savoirId" label="Savoir" rules={[{ required: true, message: "Savoir obligatoire" }]}>
            <Select placeholder="Sélectionner un savoir" showSearch optionFilterProp="children">
              {savoirs.map((s) => (<Option key={s.id} value={s.id}>[{s.code}] {s.nom}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="niveau" label="Niveau de maîtrise" rules={[{ required: true, message: "Niveau obligatoire" }]}>
            <Select placeholder="Sélectionner un niveau">{NIVEAU_OPTIONS.map((n) => (<Option key={n.value} value={n.value}>{n.label}</Option>))}</Select>
          </Form.Item>
          <Form.Item name="dateAcquisition" label="Date d'acquisition (optionnel)"><Input type="date" placeholder="Sélectionner une date" /></Form.Item>
          <Form.Item name="commentaire" label="Commentaire (optionnel)"><Input placeholder="Commentaire libre" /></Form.Item>
        </Form>
      </Modal>
      <Modal title="Modifier le niveau de maîtrise" className="affectation-modal" open={niveauModal} onOk={handleUpdateNiveau} onCancel={() => setNiveauModal(false)} afterClose={() => niveauForm.resetFields()} okText="Mettre à jour" cancelText="Annuler" forceRender>
        <Form form={niveauForm} layout="vertical">
          <Form.Item name="niveau" label="Niveau" rules={[{ required: true, message: "Niveau obligatoire" }]}>
            <Select>{NIVEAU_OPTIONS.map((n) => (<Option key={n.value} value={n.value}>{n.label}</Option>))}</Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
