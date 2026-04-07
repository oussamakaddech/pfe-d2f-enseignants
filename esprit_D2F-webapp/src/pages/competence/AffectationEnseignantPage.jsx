// src/pages/competence/AffectationEnseignantPage.jsx
// Tableau des affectations enseignants ↔ savoirs (résultat de l'analyse RICE)

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table, Tag, Space, Typography, Tooltip, Input, Button,
  message, Empty, Popconfirm, Badge, Modal, Form, Select, Row, Col, Divider
} from "antd";
import {
  SearchOutlined, ReloadOutlined, RobotOutlined, DeleteOutlined,
  DownloadOutlined, PlusOutlined, EditOutlined
} from "@ant-design/icons";
import CompetenceService from "../../services/CompetenceService";
import EnseignantService from "../../services/EnseignantService";

const { Text } = Typography;
const { Option } = Select;

const NIVEAU_COLOR = {
  N1_DEBUTANT:      "default",
  N2_ELEMENTAIRE:   "blue",
  N3_INTERMEDIAIRE: "cyan",
  N4_AVANCE:        "green",
  N5_EXPERT:        "gold",
};

const NIVEAU_OPTIONS = [
  { value: "N1_DEBUTANT", label: "N1 - Débutant" },
  { value: "N2_ELEMENTAIRE", label: "N2 - Élémentaire" },
  { value: "N3_INTERMEDIAIRE", label: "N3 - Intermédiaire" },
  { value: "N4_AVANCE", label: "N4 - Avancé" },
  { value: "N5_EXPERT", label: "N5 - Expert" },
];

const NIVEAU_LABEL = {
  N1_DEBUTANT:      "N1",
  N2_ELEMENTAIRE:   "N2",
  N3_INTERMEDIAIRE: "N3",
  N4_AVANCE:        "N4",
  N5_EXPERT:        "N5",
};

const toNiveauEnum = (niveau) => {
  const raw = String(niveau ?? "").trim().toUpperCase();
  if (!raw) return null;
  if (["N1_DEBUTANT", "N2_ELEMENTAIRE", "N3_INTERMEDIAIRE", "N4_AVANCE", "N5_EXPERT"].includes(raw)) {
    return raw;
  }
  if (raw === "N1") return "N1_DEBUTANT";
  if (raw === "N2") return "N2_ELEMENTAIRE";
  if (raw === "N3") return "N3_INTERMEDIAIRE";
  if (raw === "N4") return "N4_AVANCE";
  if (raw === "N5") return "N5_EXPERT";
  return raw;
};

export default function AffectationEnseignantPage() {
  const [msgApi, msgCtx] = message.useMessage();
  const navigate = useNavigate();

  const [affectations, setAffectations] = useState([]);
  const [enseignants,  setEnseignants]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState("");

  const [savoirs,      setSavoirs]      = useState([]);
  const [assignModal,  setAssignModal]  = useState(false);
  const [niveauModal,  setNiveauModal]  = useState(false);
  const [assignForm]   = Form.useForm();
  const [niveauForm]   = Form.useForm();
  const [editingRecord,setEditingRecord]= useState(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [affResult, ensResult, savResult] = await Promise.allSettled([
        CompetenceService.enseignantCompetence.getAll(),
        EnseignantService.getAllEnseignants(),
        CompetenceService.savoir.getAll(),
      ]);

      if (affResult.status === "fulfilled") {
        setAffectations(Array.isArray(affResult.value) ? affResult.value : []);
      } else {
        console.error("Erreur chargement affectations:", affResult.reason);
        msgApi.warning("Impossible de charger les affectations — vérifiez que le service compétence est démarré");
        setAffectations([]);
      }

      if (ensResult.status === "fulfilled") {
        setEnseignants(Array.isArray(ensResult.value) ? ensResult.value : []);
      } else {
        console.error("Erreur chargement enseignants:", ensResult.reason);
        const reasonMsg = ensResult.reason?.message || String(ensResult.reason);
        msgApi.error("Impossible de charger les enseignants: " + reasonMsg);
        // non-critical: table rows will fall back to showing the raw enseignantId
        setEnseignants([]);
      }

      if (savResult.status === "fulfilled") {
        setSavoirs(Array.isArray(savResult.value) ? savResult.value : []);
      } else {
        setSavoirs([]);
      }
    } catch (err) {
      console.error(err);
      msgApi.error("Erreur inattendue lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, [msgApi]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Build table rows: one row per enseignant ──────────────────────────────
  const ensMap = useMemo(() => {
    const m = new Map();
    enseignants.forEach((e) => m.set(String(e.id), e));
    return m;
  }, [enseignants]);

  const savoirMap = useMemo(() => {
    const m = new Map();
    savoirs.forEach((s) => m.set(String(s.id), s));
    return m;
  }, [savoirs]);

  const rows = useMemo(() => {
    const grouped = new Map();
    affectations.forEach((a) => {
      const eid = String(a.enseignantId);
      if (!grouped.has(eid)) {
        const e = ensMap.get(eid);
        grouped.set(eid, {
          key: eid,
          enseignantId: eid,
          nom: e
            ? `${e.prenom ?? ""} ${e.nom ?? ""}`.trim()
            : eid.replace(/^EX-/i, ""),
          savoirs: [],
        });
      }
      grouped.get(eid).savoirs.push({
        affId:   a.id,
        code:    a.savoirCode  ?? "—",
        nom:     a.savoirNom   ?? "—",
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nom.toLowerCase().includes(q) ||
        r.savoirs.some((s) => s.code.toLowerCase().includes(q) || s.nom.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const exportAffectationsCsv = useCallback(() => {
    const filteredIds = new Set(filtered.map((r) => String(r.enseignantId)));
    const selected = affectations.filter((a) => filteredIds.has(String(a.enseignantId)));

    const header = [
      "affectation_id",
      "enseignant_id",
      "enseignant_nom",
      "savoir_code",
      "savoir_nom",
      "niveau_code",
      "niveau_label",
    ];

    const niveauToLabel = (niv) => NIVEAU_LABEL[niv] ?? (niv || "—");
    const resolveName = (eid) => {
      const e = ensMap.get(String(eid));
      if (!e) return String(eid).replace(/^EX-/i, "");
      return `${e.prenom ?? ""} ${e.nom ?? ""}`.trim();
    };

    const rowsCsv = selected.map((a) => {
      const niveau = a.niveau ?? "";
      return [
        a.id ?? "",
        String(a.enseignantId ?? ""),
        resolveName(a.enseignantId),
        a.savoirCode ?? "",
        a.savoirNom ?? "",
        niveau,
        niveauToLabel(niveau),
      ];
    });

    const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = [header, ...rowsCsv].map((r) => r.map(esc).join(";")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "affectations_enseignants_rice.csv";
    a.click();
    URL.revokeObjectURL(url);
    msgApi.success(`CSV exporté (${rowsCsv.length} affectation(s))`);
  }, [affectations, ensMap, filtered, msgApi]);

  // ── Actions CRUD ──────────────────────────────────────────────────────────
  const handleAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      await CompetenceService.enseignantCompetence.assign(values);
      msgApi.success("Affectation ajoutée avec succès");
      setAssignModal(false);
      loadAll();
    } catch (err) {
      if (err?.errorFields) return;
      const msg = err.response?.data?.message || "Erreur lors de l'ajout";
      msgApi.error(msg);
    }
  };

  const handleUpdateNiveau = async () => {
    try {
      const { niveau } = await niveauForm.validateFields();
      await CompetenceService.enseignantCompetence.updateNiveau(editingRecord.affId, niveau);
      msgApi.success("Niveau mis à jour");
      setNiveauModal(false);
      loadAll();
    } catch (err) {
      if (err?.errorFields) return;
      const msg = err.response?.data?.message || "Erreur lors de la mise à jour";
      msgApi.error(msg);
    }
  };

  const handleDeleteSavoir = async (affId) => {
    try {
      await CompetenceService.enseignantCompetence.remove(affId);
      msgApi.success("Affectation supprimée");
      loadAll();
    } catch (err) {
      msgApi.error("Erreur lors de la suppression");
    }
  };

  const openNiveauModal = (record) => {
    setEditingRecord(record);
    niveauForm.setFieldsValue({ niveau: record.niveau });
    setNiveauModal(true);
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      title: "Enseignant",
      dataIndex: "nom",
      key: "nom",
      width: 220,
      sorter: (a, b) => a.nom.localeCompare(b.nom),
      render: (nom, rec) => (
        <Space size={8}>
          <div
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "#1677ff",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}
          >
            {nom?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{nom}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>ID: {rec.enseignantId}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Compétences",
      dataIndex: "savoirs",
      key: "competences",
      width: 260,
      sorter: (a, b) => {
        const aNames = Array.from(new Set(a.savoirs.map((s) => s.competenceNom).filter(Boolean))).sort().join(" | ");
        const bNames = Array.from(new Set(b.savoirs.map((s) => s.competenceNom).filter(Boolean))).sort().join(" | ");
        return aNames.localeCompare(bNames);
      },
      render: (savs) => (
        <Space size={[4, 4]} wrap>
          {Array.from(new Set(savs.map((s) => s.competenceNom).filter(Boolean))).map((compName) => (
            <Tag key={compName} color="geekblue" style={{ fontSize: 11 }}>
              {compName}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Codes savoirs",
      dataIndex: "savoirs",
      key: "codes",
      render: (savs) => (
        <Space size={[4, 4]} wrap>
          {savs.map((s) => (
            <Tooltip key={s.affId} title={s.nom}>
              <Tag
                color="purple"
                style={{ fontWeight: 600, letterSpacing: "0.02em", cursor: "default", fontSize: 11 }}
              >
                {s.code}
              </Tag>
            </Tooltip>
          ))}
        </Space>
      ),
    },
    {
      title: "Niveaux",
      dataIndex: "savoirs",
      key: "niveaux",
      width: 260,
      render: (savs) => (
        <Space size={[4, 4]} wrap>
          {savs.map((s) => (
            <Tooltip key={s.affId} title={`${s.code} – ${s.nom}`}>
              <Tag
                color={NIVEAU_COLOR[s.niveau] ?? "default"}
                style={{ cursor: "default", fontSize: 11 }}
              >
                {NIVEAU_LABEL[s.niveau] ?? s.niveau ?? "—"}
              </Tag>
            </Tooltip>
          ))}
        </Space>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      align: "center",
      render: (_, rec) => (
        <Popconfirm
          title={`Supprimer toutes les affectations de ${rec.nom} ?`}
          okText="Supprimer"
          okButtonProps={{ danger: true }}
          cancelText="Annuler"
          onConfirm={async () => {
            try {
              await Promise.all(rec.savoirs.map((s) => CompetenceService.enseignantCompetence.remove(s.affId)));
              msgApi.success("Affectations supprimées");
              loadAll();
            } catch {
              msgApi.error("Erreur lors de la suppression");
            }
          }}
        >
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const expandedRowRender = (record) => {
    const subColumns = [
      { title: "Code", dataIndex: "code", key: "code" },
      { title: "Nom du Savoir", dataIndex: "nom", key: "nom" },
      { 
        title: "Niveau", 
        dataIndex: "niveau", 
        key: "niveau",
        render: (niveau) => (
          <Tag color={NIVEAU_COLOR[niveau] ?? "default"}>
            {NIVEAU_LABEL[niveau] ?? niveau ?? "—"}
          </Tag>
        )
      },
      {
        title: "Actions",
        key: "actions",
        width: 100,
        render: (_, sRec) => (
          <Space>
            <Tooltip title="Modifier le niveau">
              <Button size="small" icon={<EditOutlined />} onClick={() => openNiveauModal(sRec)} />
            </Tooltip>
            <Tooltip title="Retirer">
              <Popconfirm
                title="Retirer ce savoir ?"
                onConfirm={() => handleDeleteSavoir(sRec.affId)}
                okText="Oui"
                cancelText="Non"
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          </Space>
        ),
      },
    ];

    return (
      <Table
        columns={subColumns}
        dataSource={record.savoirs}
        pagination={false}
        rowKey="affId"
        size="small"
      />
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {msgCtx}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Affectations Enseignants — RICE
        </div>
        <Text type="secondary">
          Résultat de l&apos;analyse RICE : enseignants et leurs savoirs associés. Vous pouvez également ajouter des affectations manuellement.
        </Text>
      </div>

      {/* Toolbar */}
      <Space style={{ marginBottom: 14 }} wrap>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Rechercher enseignant ou code savoir…"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
        />
        <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>
          Actualiser
        </Button>
        <Button icon={<DownloadOutlined />} onClick={exportAffectationsCsv} disabled={loading || filtered.length === 0}>
          Export CSV
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAssignModal(true)}>
          Nouvelle Affectation
        </Button>
      </Space>

      {/* Table */}
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="enseignantId"
        expandable={{ expandedRowRender, expandRowByClick: false }}
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          showTotal: (total) => `${total} enseignant(s)`,
        }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  Aucune affectation.{" "}
                  <a onClick={() => navigate("/home/rice")}>
                    <RobotOutlined /> Analyser une fiche RICE
                  </a>
                </span>
              }
            />
          ),
        }}
      />

      {/* Assign modal */}
      <Modal
        title="Nouvelle affectation"
        open={assignModal}
        onOk={handleAssign}
        onCancel={() => setAssignModal(false)}
        afterClose={() => assignForm.resetFields()}
        okText="Ajouter"
        cancelText="Annuler"
        forceRender
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="enseignantId"
            label="Enseignant"
            rules={[{ required: true, message: "Enseignant obligatoire" }]}
          >
            <Select
              placeholder="Sélectionner un enseignant"
              showSearch
              optionFilterProp="children"
            >
              {enseignants.map((e) => (
                <Option key={e.id} value={e.id}>
                  {e.prenom} {e.nom}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="savoirId"
            label="Savoir"
            rules={[{ required: true, message: "Savoir obligatoire" }]}
          >
            <Select
              placeholder="Sélectionner un savoir"
              showSearch
              optionFilterProp="children"
            >
              {savoirs.map((s) => (
                <Option key={s.id} value={s.id}>
                  [{s.code}] {s.nom}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="niveau"
            label="Niveau de maîtrise"
            rules={[{ required: true, message: "Niveau obligatoire" }]}
          >
            <Select placeholder="Sélectionner un niveau">
              {NIVEAU_OPTIONS.map((n) => (
                <Option key={n.value} value={n.value}>{n.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="dateAcquisition" label="Date d'acquisition (optionnel)">
            <input type="date" style={{ width: "100%", padding: "4px 11px", border: "1px solid #d9d9d9", borderRadius: 6, height: "32px" }} />
          </Form.Item>

          <Form.Item name="commentaire" label="Commentaire (optionnel)">
            <Input style={{ padding: "4px 11px", borderRadius: 6 }} placeholder="Commentaire libre" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit niveau modal */}
      <Modal
        title="Modifier le niveau de maîtrise"
        open={niveauModal}
        onOk={handleUpdateNiveau}
        onCancel={() => setNiveauModal(false)}
        afterClose={() => niveauForm.resetFields()}
        okText="Mettre à jour"
        cancelText="Annuler"
        forceRender
      >
        <Form form={niveauForm} layout="vertical">
          <Form.Item
            name="niveau"
            label="Niveau"
            rules={[{ required: true, message: "Niveau obligatoire" }]}
          >
            <Select>
              {NIVEAU_OPTIONS.map((n) => (
                <Option key={n.value} value={n.value}>{n.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
