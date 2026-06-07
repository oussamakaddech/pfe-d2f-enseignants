import { useMemo, useState } from "react";
import {
  Card,
  Table,
  Input,
  Select,
  Space,
  Button,
  Tag,
  Badge,
  Avatar,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  TeamOutlined,
  UserOutlined,
  MailOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  BookOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import { useAllInscriptions } from "@/hooks/formation/useFormationExtras";
import { AppPageHeader, InscriptionStatGrid, PageLoader } from "@/components/common";
import type { Id } from "@/models/common";

const { Text } = Typography;

type EtatInscription = "APPROVED" | "REJECTED" | "PENDING";

interface InscriptionRow {
  id: Id;
  etat: EtatInscription;
  dateDemande: string;
  enseignant: {
    id?: Id;
    nom?: string;
    prenom?: string;
    mail?: string;
    deptLibelle?: string;
    upLibelle?: string;
  };
  formation: {
    idFormation?: Id;
    titreFormation?: string;
    dateDebut?: string;
    dateFin?: string;
  };
}

const ETAT_CONFIG: Record<EtatInscription, { color: "success" | "error" | "warning"; icon: React.ReactNode; text: string }> = {
  APPROVED: { color: "success", icon: <CheckCircleOutlined />, text: "Approuvé" },
  REJECTED: { color: "error", icon: <CloseCircleOutlined />, text: "Rejeté" },
  PENDING: { color: "warning", icon: <ClockCircleOutlined />, text: "En attente" },
};

function fmtDate(d?: string): string {
  if (!d) return "—";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("fr-FR");
}

export default function InscriptionsOverview() {
  const { data: raw = [], isLoading, refetch, isFetching } = useAllInscriptions();
  const rows = useMemo(() => (raw as InscriptionRow[]).filter(Boolean), [raw]);

  const [search, setSearch] = useState("");
  const [upFilter, setUpFilter] = useState<string | undefined>();
  const [deptFilter, setDeptFilter] = useState<string | undefined>();
  const [etatFilter, setEtatFilter] = useState<EtatInscription | undefined>();

  const upOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.enseignant?.upLibelle).filter(Boolean))).map((u) => ({ label: u as string, value: u as string })),
    [rows],
  );
  const deptOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.enseignant?.deptLibelle).filter(Boolean))).map((d) => ({ label: d as string, value: d as string })),
    [rows],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (upFilter && r.enseignant?.upLibelle !== upFilter) return false;
      if (deptFilter && r.enseignant?.deptLibelle !== deptFilter) return false;
      if (etatFilter && r.etat !== etatFilter) return false;
      if (!term) return true;
      const hay = [
        r.enseignant?.nom,
        r.enseignant?.prenom,
        r.enseignant?.mail,
        r.formation?.titreFormation,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [rows, search, upFilter, deptFilter, etatFilter]);

  const stats = useMemo(() => {
    const distinctTeachers = new Set(
      rows.map((r) => String(r.enseignant?.id ?? r.enseignant?.mail ?? "")).filter(Boolean),
    ).size;
    return {
      total: rows.length,
      teachers: distinctTeachers,
      approved: rows.filter((r) => r.etat === "APPROVED").length,
      pending: rows.filter((r) => r.etat === "PENDING").length,
    };
  }, [rows]);

  const exportToExcel = () => {
    const exportRows = filtered.map((r) => ({
      Nom: r.enseignant?.nom ?? "",
      Prénom: r.enseignant?.prenom ?? "",
      Email: r.enseignant?.mail ?? "",
      Département: r.enseignant?.deptLibelle || "—",
      UP: r.enseignant?.upLibelle || "—",
      Formation: r.formation?.titreFormation ?? "",
      "Début": fmtDate(r.formation?.dateDebut),
      "Fin": fmtDate(r.formation?.dateFin),
      "État": ETAT_CONFIG[r.etat]?.text ?? r.etat,
      "Date demande": fmtDate(r.dateDemande),
    }));
    writeExcel(
      [{ name: "Inscriptions", rows: exportRows, title: "Suivi des inscriptions", subtitle: exportDateLabel() }],
      `inscriptions_global_${isoDate()}.xlsx`,
    );
  };

  const columns: TableColumnsType<InscriptionRow> = [
    {
      title: "Enseignant",
      key: "enseignant",
      render: (_, r) => (
        <Space>
          <Avatar style={{ backgroundColor: brand[500] }} icon={<UserOutlined />}>
            {r.enseignant?.prenom?.[0]}
            {r.enseignant?.nom?.[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>
              {r.enseignant?.prenom} {r.enseignant?.nom}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <MailOutlined style={{ marginRight: 4 }} />
              {r.enseignant?.mail}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Département",
      key: "dept",
      width: 170,
      render: (_, r) => <Tag icon={<ApartmentOutlined />} color="processing">{r.enseignant?.deptLibelle || "—"}</Tag>,
      sorter: (a, b) => (a.enseignant?.deptLibelle || "").localeCompare(b.enseignant?.deptLibelle || ""),
    },
    {
      title: "UP",
      key: "up",
      width: 150,
      render: (_, r) => <Tag icon={<TeamOutlined />}>{r.enseignant?.upLibelle || "—"}</Tag>,
      sorter: (a, b) => (a.enseignant?.upLibelle || "").localeCompare(b.enseignant?.upLibelle || ""),
    },
    {
      title: "Formation",
      key: "formation",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.formation?.titreFormation || "—"}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {fmtDate(r.formation?.dateDebut)} → {fmtDate(r.formation?.dateFin)}
          </Text>
        </div>
      ),
    },
    {
      title: "État",
      dataIndex: "etat",
      key: "etat",
      width: 140,
      // Le filtre état est exposé via le Select dans la toolbar (F11) :
      // on supprime le filtre de colonne pour éviter un double filtre contradictoire.
      render: (etat: EtatInscription) => {
        const c = ETAT_CONFIG[etat] ?? ETAT_CONFIG.PENDING;
        return <Badge status={c.color} text={<Tag color={c.color} icon={c.icon}>{c.text}</Tag>} />;
      },
    },
    {
      title: "Date demande",
      dataIndex: "dateDemande",
      key: "dateDemande",
      width: 150,
      render: (d: string) => <Text type="secondary">{fmtDate(d)}</Text>,
      sorter: (a, b) => new Date(a.dateDemande).getTime() - new Date(b.dateDemande).getTime(),
    },
  ];

  if (isLoading) return <PageLoader tip="Chargement du suivi des inscriptions..." />;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <AppPageHeader
        icon={<TeamOutlined />}
        title="Suivi des inscriptions"
        subtitle="Vue d'ensemble des enseignants inscrits aux formations"
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
              Actualiser
            </Button>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={exportToExcel}
              disabled={filtered.length === 0}
              style={{ backgroundColor: "#1D6F42", borderColor: "#1D6F42" }}
            >
              Exporter
            </Button>
          </Space>
        }
      />

      <InscriptionStatGrid
        stats={[
          { icon: <TeamOutlined />,        label: "Enseignants inscrits", value: stats.teachers, tone: "brand",   loading: isLoading },
          { icon: <BookOutlined />,        label: "Total inscriptions",   value: stats.total,    tone: "info",    loading: isLoading },
          { icon: <CheckCircleOutlined />, label: "Approuvées",           value: stats.approved, tone: "success", loading: isLoading },
          { icon: <ClockCircleOutlined />, label: "En attente",           value: stats.pending,  tone: "warning", loading: isLoading },
        ]}
      />

      <Card style={{ borderRadius: 12 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Rechercher (nom, email, formation…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
          <Select placeholder="UP" allowClear options={upOptions} value={upFilter} onChange={setUpFilter} style={{ width: 170 }} />
          <Select placeholder="Département" allowClear options={deptOptions} value={deptFilter} onChange={setDeptFilter} style={{ width: 180 }} />
          <Select
            placeholder="État"
            allowClear
            value={etatFilter}
            onChange={setEtatFilter}
            style={{ width: 150 }}
            options={[
              { label: "En attente", value: "PENDING" },
              { label: "Approuvé", value: "APPROVED" },
              { label: "Rejeté", value: "REJECTED" },
            ]}
          />
          <Text type="secondary">{filtered.length} résultat{filtered.length === 1 ? "" : "s"}</Text>
        </Space>

        <Table<InscriptionRow>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} inscription${t === 1 ? "" : "s"}` }}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>
    </div>
  );
}
