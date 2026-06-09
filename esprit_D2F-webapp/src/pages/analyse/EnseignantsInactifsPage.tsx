import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, Table, Tag, Input, InputNumber, Button, Space, Typography, Tooltip,
} from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useEnseignantsInactifs, useAnalyticsExport } from "@/hooks/analyse/useReporting";
import type { EnseignantInactif, NiveauRisque } from "@/models/analyse";

const { Title, Text } = Typography;

// Code couleur aligné sur la spec (mois sans formation).
const RISK_TAG: Record<NiveauRisque, { color: string; label: string }> = {
  CRITIQUE: { color: "red",    label: "🔴 > 12 mois" },
  ELEVE:    { color: "orange", label: "🟠 6-12 mois" },
  MODERE:   { color: "gold",   label: "🟡 3-6 mois" },
  FAIBLE:   { color: "green",  label: "🟢 < 3 mois" },
};

export default function EnseignantsInactifsPage() {
  const navigate = useNavigate();
  const [mois, setMois] = useState(6);
  const [departement, setDepartement] = useState("");
  const [up, setUp] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const params = useMemo(
    () => ({ mois, departement: departement || undefined, up: up || undefined, page, size }),
    [mois, departement, up, page, size],
  );
  const { data, isLoading, isFetching, refetch } = useEnseignantsInactifs(params);
  const { exporting, exportExcel } = useAnalyticsExport();

  const columns: ColumnsType<EnseignantInactif> = [
    {
      title: "Enseignant",
      key: "nom",
      render: (_, r) => (
        <a onClick={() => navigate(`/home/analytics/teacher/${r.enseignantId}`)}>
          {r.nom} {r.prenom}
        </a>
      ),
    },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Département", dataIndex: "departement", key: "departement", render: (v: string | null) => v ?? "—" },
    { title: "UP", dataIndex: "up", key: "up", render: (v: string | null) => v ?? "—" },
    {
      title: "Dernière formation",
      dataIndex: "derniereFormationDate",
      key: "derniere",
      render: (v: string | null) => v ? new Date(v).toLocaleDateString("fr-FR") : <Tag>Jamais</Tag>,
    },
    {
      title: "Mois sans formation",
      dataIndex: "nombreMoisDepuisDerniereFormation",
      key: "mois",
      sorter: (a, b) =>
        (a.nombreMoisDepuisDerniereFormation ?? 9999) - (b.nombreMoisDepuisDerniereFormation ?? 9999),
      defaultSortOrder: "descend",
      render: (v: number | null) => v ?? "∞",
    },
    {
      title: "Risque décrochage",
      key: "risque",
      render: (_, r) => {
        const tag = RISK_TAG[r.niveauRisque];
        return (
          <Tooltip title={`Score: ${r.scoreRisqueDecrochage}/100`}>
            <Tag color={tag.color}>{tag.label} · {r.scoreRisqueDecrochage}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Compétences en déclin",
      dataIndex: "competencesEnDeclin",
      key: "declin",
      render: (comps: string[]) =>
        comps.length ? comps.map((c) => <Tag key={c} color="volcano">{c}</Tag>) : <Text type="secondary">—</Text>,
    },
  ];

  return (
    <Card>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }} wrap>
        <Title level={3} style={{ margin: 0 }}>Enseignants inactifs (formations)</Title>
        <Button
          icon={<DownloadOutlined />}
          loading={exporting}
          onClick={() => exportExcel("INACTIFS", { mois, departement: departement || undefined, up: up || undefined })}
        >
          Export Excel
        </Button>
      </Space>

      <Space wrap style={{ marginBottom: 16 }}>
        <span>
          Seuil (mois) :{" "}
          <InputNumber min={1} max={120} value={mois} onChange={(v) => { setMois(v ?? 6); setPage(0); }} />
        </span>
        <Input
          placeholder="Département (id)" allowClear value={departement}
          onChange={(e) => { setDepartement(e.target.value); setPage(0); }} style={{ width: 180 }}
        />
        <Input
          placeholder="UP (id)" allowClear value={up}
          onChange={(e) => { setUp(e.target.value); setPage(0); }} style={{ width: 180 }}
        />
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Rafraîchir</Button>
      </Space>

      <Table<EnseignantInactif>
        rowKey="enseignantId"
        loading={isLoading || isFetching}
        columns={columns}
        dataSource={data?.items ?? []}
        pagination={{
          current: page + 1,
          pageSize: size,
          total: data?.total ?? 0,
          showSizeChanger: true,
          onChange: (p, ps) => { setPage(p - 1); setSize(ps); },
        }}
      />
    </Card>
  );
}
