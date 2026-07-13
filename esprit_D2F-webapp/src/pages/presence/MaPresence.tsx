import { useMemo, useState } from "react";
import {
  Layout, Card, Table, Tag, Progress, Typography, Row, Col, Input, Select, Empty, Skeleton,
} from "antd";
import {
  CheckCircleOutlined, CloseCircleOutlined, CalendarOutlined, SearchOutlined,
  ReadOutlined, ApartmentOutlined,
} from "@ant-design/icons";
import { useMesPresences } from "@/hooks/presence";
import { useAuth } from "@/hooks/auth/useAuth";
import { AppPageHeader } from "@/components/common";
import "@/styles/pages/ma-presence.css";
import type { ColumnsType } from "antd/es/table";
import type { MesPresence } from "@/services/formation/FormationWorkflowService";

const { Content } = Layout;
const { Text } = Typography;
const { Option } = Select;

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  ENREGISTRE: { label: "Enregistrée", color: "#6b7280", bg: "#f3f4f6" },
  PLANIFIE:   { label: "Planifiée",   color: "#2563eb", bg: "#eff6ff" },
  EN_COURS:   { label: "En cours",    color: "#d97706", bg: "#fffbeb" },
  ACHEVE:     { label: "Achevée",     color: "#059669", bg: "#ecfdf5" },
  ANNULE:     { label: "Annulée",     color: "#dc2626", bg: "#fef2f2" },
};

interface FormationGroupe {
  formationId: number;
  titreFormation: string;
  etatFormation: string;
  presences: MesPresence[];
}

const MaPresence = () => {
  const { user } = useAuth();
  const { data: presences = [], isLoading } = useMesPresences();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const groupes = useMemo(() => {
    const map = new Map<number, FormationGroupe>();
    presences.forEach((p) => {
      if (!p.formationId) return;
      if (!map.has(p.formationId)) {
        map.set(p.formationId, {
          formationId: p.formationId,
          titreFormation: p.titreFormation || "Formation sans titre",
          etatFormation: p.etatFormation || "NOUVEAU",
          presences: [],
        });
      }
      map.get(p.formationId)!.presences.push(p);
    });
    return Array.from(map.values());
  }, [presences]);

  const filtered = useMemo(() => {
    return groupes.filter((g) => {
      if (search && !g.titreFormation.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && g.etatFormation !== statusFilter) return false;
      return true;
    });
  }, [groupes, search, statusFilter]);

  const globalStats = useMemo(() => {
    const total = presences.length;
    const presents = presences.filter((p) => p.present).length;
    const absents = total - presents;
    const taux = total === 0 ? 0 : Math.round((presents * 100) / total);
    return { total, presents, absents, taux };
  }, [presences]);

  const columns: ColumnsType<FormationGroupe> = [
    {
      title: "Formation",
      dataIndex: "titreFormation",
      key: "titreFormation",
      render: (titre: string) => <Text strong>{titre}</Text>,
    },
    {
      title: "Statut",
      dataIndex: "etatFormation",
      key: "etatFormation",
      width: 130,
      render: (etat: string) => {
        const meta = STATUS_META[etat] || STATUS_META.ENREGISTRE;
        return (
          <Tag style={{ color: meta.color, background: meta.bg, borderColor: meta.color + "33" }}>
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "Séances",
      key: "seancesCount",
      width: 100,
      align: "center",
      render: (_, g) => <Tag>{g.presences.length}</Tag>,
    },
    {
      title: "Présences",
      key: "presents",
      width: 100,
      align: "center",
      render: (_, g) => {
        const p = g.presences.filter((x) => x.present).length;
        return <span className="mp-count-present">{p}</span>;
      },
    },
    {
      title: "Absences",
      key: "absents",
      width: 100,
      align: "center",
      render: (_, g) => {
        const a = g.presences.filter((x) => !x.present).length;
        return <span className="mp-count-absent">{a}</span>;
      },
    },
    {
      title: "Taux de présence",
      key: "taux",
      width: 180,
      render: (_, g) => {
        const total = g.presences.length;
        const presents = g.presences.filter((x) => x.present).length;
        const taux = total === 0 ? 0 : Math.round((presents * 100) / total);
        const color = (() => {
          if (taux >= 80) return "#10b981";
          if (taux >= 50) return "#d97706";
          return "#ef4444";
        })();
        return <Progress percent={taux} strokeColor={color} size="small" />;
      },
    },
  ];

  const expandedRowRender = (record: FormationGroupe) => {
    const detailCols: ColumnsType<MesPresence> = [
      {
        title: "Date",
        dataIndex: "dateSeance",
        key: "dateSeance",
        render: (d: string) => d ? new Date(d).toLocaleDateString("fr-FR") : "—",
      },
      {
        title: "Horaires",
        key: "horaires",
        render: (_, p) => {
          const h = [p.heureDebut, p.heureFin].filter(Boolean).join(" → ");
          return h || "—";
        },
      },
      { title: "Salle", dataIndex: "salle", key: "salle", render: (s: string) => s || "—" },
      {
        title: "Statut",
        dataIndex: "present",
        key: "present",
        width: 120,
        render: (present: boolean) => (
          <Tag
            icon={present ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            color={present ? "success" : "error"}
          >
            {present ? "Présent" : "Absent"}
          </Tag>
        ),
      },
      {
        title: "Commentaire",
        dataIndex: "commentaire",
        key: "commentaire",
        render: (c: string) => <Text type="secondary">{c || "—"}</Text>,
      },
    ];
    return (
      <Table
        columns={detailCols}
        dataSource={record.presences}
        rowKey="idParticipation"
        pagination={false}
        size="small"
        className="mp-detail-table"
      />
    );
  };

  return (
    <Content className="mp-content">
      <AppPageHeader
        icon={<ReadOutlined />}
        title="Mes Présences"
        subtitle={`Suivi de vos présences aux séances — ${user?.prenom || ""} ${user?.nom || ""}`}
      />

      {/* Stats banner */}
      <div className="mp-stats-banner">
        <div className="mp-stat-card mp-stat-total">
          <span className="mp-stat-icon"><CalendarOutlined /></span>
          <div>
            <div className="mp-stat-value">{globalStats.total}</div>
            <div className="mp-stat-label">Séances totales</div>
          </div>
        </div>
        <div className="mp-stat-card mp-stat-present">
          <span className="mp-stat-icon"><CheckCircleOutlined /></span>
          <div>
            <div className="mp-stat-value">{globalStats.presents}</div>
            <div className="mp-stat-label">Présences</div>
          </div>
        </div>
        <div className="mp-stat-card mp-stat-absent">
          <span className="mp-stat-icon"><CloseCircleOutlined /></span>
          <div>
            <div className="mp-stat-value">{globalStats.absents}</div>
            <div className="mp-stat-label">Absences</div>
          </div>
        </div>
        <div className="mp-stat-card mp-stat-taux">
          <span className="mp-stat-icon"><ApartmentOutlined /></span>
          <div>
            <div className="mp-stat-value">{globalStats.taux}%</div>
            <div className="mp-stat-label">Taux global</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mp-filter-card" variant="borderless">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Rechercher par titre de formation"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              prefix={<SearchOutlined style={{ color: "var(--neutral-400)" }} />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Statut formation"
              value={statusFilter || undefined}
              onChange={(v) => setStatusFilter(v || "")}
              allowClear
              style={{ width: "100%" }}
            >
              {Object.entries(STATUS_META).map(([k, v]) => (
                <Option key={k} value={k}>{v.label}</Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      {(() => {
        if (isLoading) {
          return <Skeleton active paragraph={{ rows: 6 }} />;
        }
        if (filtered.length === 0) {
          return <Empty description="Aucune présence enregistrée" />;
        }
        return (
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="formationId"
            expandable={{ expandedRowRender, rowExpandable: (r) => r.presences.length > 0 }}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            className="mp-table"
          />
        );
      })()}
    </Content>
  );
};

export default MaPresence;
