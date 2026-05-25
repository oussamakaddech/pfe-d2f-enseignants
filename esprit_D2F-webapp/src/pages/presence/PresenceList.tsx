import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Table,
  Button,
  Typography,
  Row,
  Col,
  Input,
  Switch,
  Tag,
  Tooltip,
  Avatar,
  Space,
  Progress,
  Popconfirm,
  Empty,
  Skeleton,
} from "antd";
import {
  DownloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  SaveOutlined,
  ReloadOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import { useSeancePresences, useBatchUpdatePresences, useMarkAllPresences } from "@/hooks/presence";
import useAppNotification from "@/hooks/ui/useAppNotification";
import "@/styles/pages/presence-list.css";

const { Text } = Typography;

const initialsOf = (nom, prenom) => {
  const a = (prenom || "").trim().charAt(0).toUpperCase();
  const b = (nom || "").trim().charAt(0).toUpperCase();
  return (a + b) || "?";
};

const colorOfName = (str) => {
  const palette = ["#B51200", "#0891b2", "#7c3aed", "#059669", "#d97706", "#2563eb", "#db2777"];
  let h = 0;
  for (let i = 0; i < (str || "").length; i += 1) h = (h * 31 + (str.codePointAt(i) ?? 0)) >>> 0;
  return palette[h % palette.length];
};

const PresenceList = ({ seanceId }) => {
  const { message: msgApi } = useAppNotification();
  const [presences, setPresences] = useState([]);
  const [originalById, setOriginalById] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const { data: rawPresences = [], isLoading: loading } = useSeancePresences(seanceId);
  const batchUpdateMut = useBatchUpdatePresences();
  const markAllMut = useMarkAllPresences();

  useEffect(() => {
    const list = Array.isArray(rawPresences) ? rawPresences : [];
    const normalized = list.map((p) => ({
      ...p,
      presence: typeof p.present === "boolean" ? p.present : !!p.presence,
    }));
    setPresences(normalized);
    const map = {};
    normalized.forEach((p) => {
      map[p.idParticipation] = { presence: p.presence, commentaire: p.commentaire || "" };
    });
    setOriginalById(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPresences]);

  const loadPresences = () => { /* data reloaded via React Query invalidation */ };

  const togglePresence = (idParticipation, nextPresence) => {
    setPresences((prev) =>
      prev.map((p) =>
        p.idParticipation === idParticipation ? { ...p, presence: nextPresence } : p
      )
    );
  };

  const setCommentaire = (idParticipation, value) => {
    setPresences((prev) =>
      prev.map((p) =>
        p.idParticipation === idParticipation ? { ...p, commentaire: value } : p
      )
    );
  };

  const dirtyIds = useMemo(() => {
    const ids = [];
    presences.forEach((p) => {
      const o = originalById[p.idParticipation];
      if (!o) return;
      const presenceChanged = !!o.presence !== !!p.presence;
      const commentaireChanged = (o.commentaire || "") !== (p.commentaire || "");
      if (presenceChanged || commentaireChanged) ids.push(p.idParticipation);
    });
    return ids;
  }, [presences, originalById]);

  const handleSave = async () => {
    if (dirtyIds.length === 0) {
      msgApi.info("Aucune modification à enregistrer");
      return;
    }
    setSaving(true);
    try {
      const updates = presences
        .filter((p) => dirtyIds.includes(p.idParticipation))
        .map((p) => ({
          idParticipation: p.idParticipation,
          present: !!p.presence,
          commentaire: p.commentaire || "",
        }));
      await batchUpdateMut.mutateAsync({ seanceId, updates });
      msgApi.success(`${dirtyIds.length} présence(s) enregistrée(s)`);
    } catch (err) {
      msgApi.error(err?.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAll = async (present) => {
    setSaving(true);
    try {
      await markAllMut.mutateAsync({ seanceId, present });
      msgApi.success(
        present
          ? "Tous les enseignants marqués présents"
          : "Tous les enseignants marqués absents"
      );
    } catch (err) {
      msgApi.error(err?.response?.data?.error || "Erreur lors de l'opération groupée");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return presences;
    const s = search.toLowerCase();
    return presences.filter((p) => {
      const nom = (p.enseignant?.nom || "").toLowerCase();
      const prenom = (p.enseignant?.prenom || "").toLowerCase();
      const mail = (p.enseignant?.mail || "").toLowerCase();
      return nom.includes(s) || prenom.includes(s) || mail.includes(s);
    });
  }, [presences, search]);

  const total = presences.length;
  const presents = useMemo(() => presences.filter((p) => p.presence).length, [presences]);
  const absents = total - presents;
  const taux = total === 0 ? 0 : Math.round((presents * 100) / total);

  const exportExcel = () => {
    const rows = presences.map((p) => ({
      Nom:    p.enseignant?.nom    || "",
      Prénom: p.enseignant?.prenom || "",
      Email:  p.enseignant?.mail   || "",
      Type: (() => {
        if (p.enseignant?.type === "P") return "Permanent";
        if (p.enseignant?.type === "V") return "Vacataire";
        return p.enseignant?.type || "";
      })(),
      Statut: p.presence ? "Présent" : "Absent",
      Commentaire: p.commentaire || "",
    }));
    writeExcel(
      [{ name: "Présences", rows, title: "Feuille de Présence — Esprit", subtitle: exportDateLabel() }],
      `presences_seance_${seanceId}_${isoDate()}.xlsx`
    );
    msgApi.success("Export Excel réussi");
  };

  const columns = [
    {
      title: "Enseignant",
      key: "enseignant",
      render: (_, r) => {
        const fullName = `${r.enseignant?.prenom || ""} ${r.enseignant?.nom || ""}`.trim();
        const isDirty = dirtyIds.includes(r.idParticipation);
        return (
          <div className="presence-enseignant-cell">
            <Avatar
              size={36}
              style={{
                background: colorOfName(fullName),
                fontWeight: 600,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {initialsOf(r.enseignant?.nom, r.enseignant?.prenom)}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="presence-enseignant-name">
                {fullName || "—"}
                {isDirty && <span className="presence-dirty-dot" title="Modification non enregistrée" />}
              </div>
              <div className="presence-enseignant-mail">{r.enseignant?.mail || "—"}</div>
            </div>
          </div>
        );
      },
      sorter: (a, b) =>
        `${a.enseignant?.nom || ""} ${a.enseignant?.prenom || ""}`.localeCompare(
          `${b.enseignant?.nom || ""} ${b.enseignant?.prenom || ""}`
        ),
    },
    {
      title: "Type",
      dataIndex: ["enseignant", "type"],
      key: "type",
      width: 110,
      render: (t) => {
        if (!t) return <Text type="secondary">—</Text>;
        let label = t;
        if (t === "P") label = "Permanent";
        else if (t === "V") label = "Vacataire";
        const cls = t === "P" ? "presence-type-tag p" : "presence-type-tag v";
        return <span className={cls}>{label}</span>;
      },
      filters: [
        { text: "Permanent", value: "P" },
        { text: "Vacataire", value: "V" },
      ],
      onFilter: (value, record) => record.enseignant?.type === value,
    },
    {
      title: "Statut",
      key: "statut",
      width: 140,
      align: "center",
      render: (_, r) => (
        <Switch
          checked={!!r.presence}
          onChange={(checked) => togglePresence(r.idParticipation, checked)}
          checkedChildren={<><CheckCircleOutlined /> Présent</>}
          unCheckedChildren={<><CloseCircleOutlined /> Absent</>}
          className={r.presence ? "presence-switch-on" : "presence-switch-off"}
        />
      ),
      filters: [
        { text: "Présent", value: true },
        { text: "Absent", value: false },
      ],
      onFilter: (value, record) => !!record.presence === value,
    },
    {
      title: (
        <span>
          <EditOutlined style={{ marginRight: 6, color: "var(--neutral-400)" }} />
          Commentaire
        </span>
      ),
      key: "commentaire",
      render: (_, r) => (
        <Input
          size="small"
          placeholder="Justification, remarque..."
          value={r.commentaire || ""}
          onChange={(e) => setCommentaire(r.idParticipation, e.target.value)}
          maxLength={255}
          className="presence-comment-input"
          allowClear
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="presence-container">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="presence-container">
        <Empty description="Aucun participant affecté à cette séance" />
      </div>
    );
  }

  return (
    <div className="presence-container">
      {/* Stats banner */}
      <div className="presence-stats-banner">
        <div className="presence-stats-left">
          <div className="presence-stat-card presence-stat-total">
            <span className="presence-stat-icon"><TeamOutlined /></span>
            <div>
              <div className="presence-stat-value">{total}</div>
              <div className="presence-stat-label">Inscrits</div>
            </div>
          </div>
          <div className="presence-stat-card presence-stat-present">
            <span className="presence-stat-icon"><CheckCircleOutlined /></span>
            <div>
              <div className="presence-stat-value">{presents}</div>
              <div className="presence-stat-label">Présents</div>
            </div>
          </div>
          <div className="presence-stat-card presence-stat-absent">
            <span className="presence-stat-icon"><CloseCircleOutlined /></span>
            <div>
              <div className="presence-stat-value">{absents}</div>
              <div className="presence-stat-label">Absents</div>
            </div>
          </div>
        </div>
        <div className="presence-stats-right">
          <div className="presence-taux-label">Taux de présence</div>
          <Progress
            type="circle"
            percent={taux}
            size={72}
            strokeColor={{ "0%": "#10b981", "100%": "#059669" }}
            format={(p) => <span style={{ fontWeight: 700, fontSize: 14 }}>{p}%</span>}
          />
        </div>
      </div>

      {/* Toolbar */}
      <Row gutter={[12, 12]} align="middle" className="presence-toolbar">
        <Col flex="auto">
          <Input
            allowClear
            size="middle"
            placeholder="Rechercher un enseignant (nom, prénom, email)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<SearchOutlined style={{ color: "var(--neutral-400)" }} />}
            className="presence-search"
          />
        </Col>
        <Col>
          <Space wrap>
            <Popconfirm
              title="Marquer tous les enseignants présents ?"
              onConfirm={() => handleMarkAll(true)}
              okText="Oui"
              cancelText="Non"
            >
              <Tooltip title="Marque tous les enseignants présents">
                <Button
                  icon={<CheckCircleOutlined />}
                  className="presence-btn presence-btn-all-present"
                  disabled={saving}
                >
                  Tous présents
                </Button>
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title="Marquer tous les enseignants absents ?"
              onConfirm={() => handleMarkAll(false)}
              okText="Oui"
              cancelText="Non"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Marque tous les enseignants absents">
                <Button
                  icon={<CloseCircleOutlined />}
                  danger
                  className="presence-btn"
                  disabled={saving}
                >
                  Tous absents
                </Button>
              </Tooltip>
            </Popconfirm>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadPresences}
              disabled={loading || saving}
              className="presence-btn"
            >
              Actualiser
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={exportExcel}
              className="presence-btn"
            >
              Excel
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Table */}
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="idParticipation"
        pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
        size="middle"
        className="presence-table"
        locale={{
          emptyText: search ? "Aucun résultat pour votre recherche" : "Aucune présence",
        }}
      />

      {/* Sticky footer save bar */}
      {dirtyIds.length > 0 && (
        <div className="presence-save-bar">
          <Tag color="orange" className="presence-dirty-tag">
            {dirtyIds.length} modification{dirtyIds.length > 1 ? "s" : ""} en attente
          </Tag>
          <Space>
            <Button
              onClick={loadPresences}
              disabled={saving}
              icon={<ReloadOutlined />}
            >
              Annuler
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              className="presence-btn-save"
            >
              Enregistrer
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

PresenceList.propTypes = {
  seanceId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

export default PresenceList;








