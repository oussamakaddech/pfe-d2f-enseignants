// src/pages/competence/AffectationEnseignantPage.jsx
// Tableau des affectations enseignants ↔ savoirs (résultat de l'analyse RICE)

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table, Tag, Space, Typography, Tooltip, Input, Button,
  message, Empty, Popconfirm, Badge,
} from "antd";
import {
  SearchOutlined, ReloadOutlined, RobotOutlined, DeleteOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import CompetenceService from "../../services/CompetenceService";
import EnseignantService from "../../services/EnseignantService";

const { Text } = Typography;

const NIVEAU_COLOR = {
  N1_DEBUTANT:      "default",
  N2_ELEMENTAIRE:   "blue",
  N3_INTERMEDIAIRE: "cyan",
  N4_AVANCE:        "green",
  N5_EXPERT:        "gold",
};

const NIVEAU_LABEL = {
  N1_DEBUTANT:      "N1",
  N2_ELEMENTAIRE:   "N2",
  N3_INTERMEDIAIRE: "N3",
  N4_AVANCE:        "N4",
  N5_EXPERT:        "N5",
};

export default function AffectationEnseignantPage() {
  const [msgApi, msgCtx] = message.useMessage();
  const navigate = useNavigate();

  const [affectations, setAffectations] = useState([]);
  const [enseignants,  setEnseignants]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState("");

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [affResult, ensResult] = await Promise.allSettled([
        CompetenceService.enseignantCompetence.getAll(),
        EnseignantService.getAllEnseignants(),
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
        // non-critical: table rows will fall back to showing the raw enseignantId
        setEnseignants([]);
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
        niveau:  a.niveau      ?? null,
      });
    });
    return Array.from(grouped.values());
  }, [affectations, ensMap]);

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
      title: "Nb savoirs",
      dataIndex: "savoirs",
      key: "nb",
      width: 100,
      align: "center",
      sorter: (a, b) => a.savoirs.length - b.savoirs.length,
      render: (savs) => (
        <Badge
          count={savs.length}
          showZero
          color="#1677ff"
          style={{ boxShadow: "none" }}
        />
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
          Résultat de l&apos;analyse RICE : enseignants et leurs savoirs associés.
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
        
      </Space>

      {/* Table */}
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="enseignantId"
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
    </>
  );
}
