import { useState } from "react";
import {
  Card, Row, Col, Tag, Statistic, Table, Button, Space,
  Select, Input, Empty, Spin, Typography, Tooltip, Popconfirm, Badge,
} from "antd";
import {
  BellOutlined, CheckCircleOutlined, EyeOutlined,
  StopOutlined, ExclamationCircleOutlined, AlertOutlined,
  FilterOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { AlertSummary } from "@/models/analyse";

const { Text } = Typography;

interface PriorityAlertsPanelProps {
  readonly data: AlertSummary | undefined;
  readonly loading: boolean;
  readonly onBulkUpdate: (alertIds: number[], statut: string, commentaire?: string) => Promise<void>;
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "#ef4444",
  WARNING: "#f59e0b",
  INFO: "#3b82f6",
};

const STATUT_OPTIONS = [
  { value: "TRAITEE", label: "✅ Traité", icon: <CheckCircleOutlined style={{ color: "#10b981" }} /> },
  { value: "LUE", label: "👁 Lu", icon: <EyeOutlined style={{ color: "#3b82f6" }} /> },
  { value: "IGNOREE", label: "⛔ Ignoré", icon: <StopOutlined style={{ color: "#6b7280" }} /> },
  { value: "ESCALADEE", label: "⬆ Escaladé", icon: <ExclamationCircleOutlined style={{ color: "#f59e0b" }} /> },
];

interface AlertRow {
  key: number;
  id: number;
  type: string;
  severite: string;
  statut: string;
  competence_id?: number;
  departement_id?: string;
  count: number;
}

export default function PriorityAlertsPanel({ data, loading, onBulkUpdate }: PriorityAlertsPanelProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatut, setBulkStatut] = useState<string>("TRAITEE");
  const [bulkComment, setBulkComment] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  // Build flat list of alerts from severity + type + status aggregates
  const alertRows: AlertRow[] = [];
  let keyCounter = 0;

  // Primary rows: by severity (most important)
  const severiteRows = data?.by_severite || [];
  severiteRows.forEach((sev) => {
    // Cross-reference with by_statut to find count of NOUVELLE
    const nouvCount = (data?.by_statut || []).find((s) => s.key === "NOUVELLE")?.count || 0;
    const statutLabel = (data?.by_statut || []).map((s) => `${s.key}: ${s.count}`).join(", ");

    alertRows.push({
      key: keyCounter++,
      id: keyCounter,
      type: sev.key,
      severite: sev.key,
      statut: statutLabel,
      count: sev.count,
    });
  });

  // Supplementary: by type
  (data?.by_type || []).forEach((t) => {
    if (!alertRows.find((r) => r.severite === t.key)) {
      alertRows.push({
        key: keyCounter++,
        id: keyCounter,
        type: t.key,
        severite: "-",
        statut: "-",
        count: t.count,
      });
    }
  });

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) return;
    setUpdating(true);
    try {
      await onBulkUpdate(selectedIds, bulkStatut, bulkComment || undefined);
      setSelectedIds([]);
      setBulkComment("");
    } catch {
      // Error handled by caller
    } finally {
      setUpdating(false);
    }
  };

  const columns: ColumnsType<AlertRow> = [
    {
      title: "Type / Sévérité",
      key: "severite",
      render: (_, record) => (
        <Space size={8}>
          <Badge
            color={SEVERITY_COLOR[record.severite] || "#6b7280"}
            text={record.type || record.severite}
          />
          {record.severite !== "-" && (
            <Tag
              color={(() => {
                if (record.severite === "CRITICAL") return "red";
                if (record.severite === "WARNING") return "orange";
                return "blue";
              })()}
            >
              {record.severite}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Nombre",
      dataIndex: "count",
      align: "center" as const,
      sorter: (a, b) => a.count - b.count,
      render: (v: number) => (
        <Text strong style={{ color: v > 5 ? "#ef4444" : undefined }}>
          {v}
        </Text>
      ),
    },
    {
      title: "Statuts",
      dataIndex: "statut",
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{v || "—"}</Text>
      ),
    },
  ];

  const hasSelection = selectedIds.length > 0;

  return (
    <Card
      variant="borderless"
      title={
        <Space>
          <BellOutlined style={{ color: "#b51200" }} />
          <span>Alertes Prioritaires</span>
          {data?.nouvelles ? (
            <Badge count={data.nouvelles} style={{ backgroundColor: "#ef4444" }} />
          ) : null}
        </Space>
      }
      extra={
        <Space size={8} wrap>
          <Select
            value={bulkStatut}
            onChange={setBulkStatut}
            size="small"
            style={{ width: 150 }}
            options={STATUT_OPTIONS.map((o) => ({
              value: o.value,
              label: (
                <Space size={4}>
                  {o.icon}
                  <span>{o.label}</span>
                </Space>
              ),
            }))}
          />
          <Input
            size="small"
            placeholder="Commentaire..."
            value={bulkComment}
            onChange={(e) => setBulkComment(e.target.value)}
            style={{ width: 180 }}
          />
          <Popconfirm
            title={`Appliquer à ${selectedIds.length} alerte(s) ?`}
            onConfirm={handleBulkAction}
            okText="Appliquer"
            cancelText="Annuler"
            disabled={!hasSelection}
          >
            <Button
              type="primary"
              size="small"
              icon={<ThunderboltOutlined />}
              loading={updating}
              disabled={!hasSelection}
            >
              Trier en masse ({selectedIds.length})
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {/* ── KPI Row ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={8}>
            <Statistic
              title="Total alertes"
              value={data?.total || 0}
              prefix={<AlertOutlined style={{ color: "#b51200" }} />}
            />
          </Col>
          <Col xs={8}>
            <Statistic
              title="Nouvelles"
              value={data?.nouvelles || 0}
              valueStyle={{ color: (data?.nouvelles || 0) > 0 ? "#ef4444" : "#10b981" }}
              prefix={<BellOutlined />}
            />
          </Col>
          <Col xs={8}>
            <Statistic
              title="Critiques ouvertes"
              value={data?.critiques_ouvertes || 0}
              valueStyle={{ color: (data?.critiques_ouvertes || 0) > 0 ? "#ef4444" : "#10b981" }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
        </Row>

        {/* ── Severity breakdown ── */}
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          {(data?.by_severite || []).map((s) => (
            <Col key={s.key}>
              <Tag
                color={(() => {
                  if (s.key === "CRITICAL") return "error";
                  if (s.key === "WARNING") return "warning";
                  return "processing";
                })()}
                style={{ fontSize: 13, padding: "4px 12px" }}
              >
                {s.key}: <Text strong>{s.count}</Text>
              </Tag>
            </Col>
          ))}
        </Row>

        {/* ── Alert table ── */}
        {alertRows.length > 0 ? (
          <Table<AlertRow>
            dataSource={alertRows}
            columns={columns}
            rowKey="key"
            size="small"
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys as number[]),
            }}
          />
        ) : (
          <Empty
            description="Aucune alerte"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}

        {/* ── Top sources ── */}
        {(data?.top_competences?.length || 0) > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary" strong style={{ fontSize: 12 }}>
              <FilterOutlined /> Compétences les plus alertées
            </Text>
            <div style={{ marginTop: 4 }}>
              <Space size={4} wrap>
                {data!.top_competences.slice(0, 5).map((c) => (
                  <Tag key={c.competence_id} color="default">
                    C{c.competence_id} ({c.count})
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        )}

        {(data?.top_departements?.length || 0) > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" strong style={{ fontSize: 12 }}>
              <FilterOutlined /> Départements les plus alertés
            </Text>
            <div style={{ marginTop: 4 }}>
              <Space size={4} wrap>
                {data!.top_departements.slice(0, 5).map((d) => (
                  <Tooltip key={d.departement_id} title={`${d.count} alerte(s)`}>
                    <Badge count={d.count} size="small">
                      <Tag>{d.departement_id}</Tag>
                    </Badge>
                  </Tooltip>
                ))}
              </Space>
            </div>
          </div>
        )}
      </Spin>
    </Card>
  );
}
