import { useEffect } from "react";
import {
  Card, Table, Tag, Space, Typography, Button, Select, Input,
  Row, Col, Badge, Popconfirm, Tooltip, Spin, Alert, Empty,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BellOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ArrowUpOutlined, ReloadOutlined,
} from "@ant-design/icons";
import { useAlerts } from "../../hooks/useAlerts";
import type { AlertEvent, StatutAlerte } from "../../models/analytics";

const { Text, Title } = Typography;
const { Option } = Select;

const glass = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(8px)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  borderRadius: 12,
};

const SEVERITE_COLOR: Record<string, string> = {
  CRITICAL: "red", WARNING: "orange", INFO: "blue",
};

const STATUT_BADGE: Record<StatutAlerte, "processing" | "default" | "success" | "warning" | "error"> = {
  NOUVELLE: "processing",
  LUE: "default",
  TRAITEE: "success",
  IGNOREE: "warning",
  ESCALADEE: "error",
};

export default function AlertsPage() {
  const { loading, data, error, filters, fetchAlerts, updateFilter, resolveAlert } = useAlerts({
    statut: "NOUVELLE",
    size: 20,
  });

  useEffect(() => { fetchAlerts(); }, []);

  function handleFilterChange(key: string, value: string | undefined) {
    const newFilters = updateFilter({ [key]: value ?? undefined, page: 0 });
    fetchAlerts(newFilters);
  }

  const columns: ColumnsType<AlertEvent> = [
    {
      title: "Alerte",
      key: "titre",
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 13 }}>{r.titre}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.message}</Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "type_alerte",
      width: 180,
      render: v => <Tag color="purple" style={{ fontSize: 11 }}>{v.replace(/_/g, " ")}</Tag>,
    },
    {
      title: "Sévérité",
      dataIndex: "severite",
      width: 100,
      render: v => <Tag color={SEVERITE_COLOR[v] ?? "default"}>{v}</Tag>,
    },
    {
      title: "Statut",
      dataIndex: "statut",
      width: 120,
      render: v => <Badge status={STATUT_BADGE[v as StatutAlerte] ?? "default"} text={v} />,
    },
    {
      title: "Cible",
      key: "cible",
      width: 130,
      render: (_, r) => (
        r.cible_type === "INDIVIDUEL" && r.enseignant_id
          ? <Tag color="cyan">{r.enseignant_id}</Tag>
          : r.departement_id
            ? <Tag color="geekblue">Dept {r.departement_id}</Tag>
            : <Tag color="geekblue">Collectif</Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "created_at",
      width: 140,
      render: v => (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {new Date(v).toLocaleString("fr-FR")}
        </Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 110,
      fixed: "right" as const,
      render: (_, r) => {
        const done = r.statut === "TRAITEE" || r.statut === "IGNOREE";
        return (
          <Space size={4}>
            <Tooltip title="Marquer comme traitée">
              <Popconfirm
                title="Confirmer le traitement de cette alerte ?"
                onConfirm={() => resolveAlert(r.id, "TRAITEE")}
                okText="Oui"
                cancelText="Non"
              >
                <Button
                  size="small" icon={<CheckCircleOutlined />} type="text"
                  disabled={done} style={{ color: done ? "#d1d5db" : "#10b981" }}
                />
              </Popconfirm>
            </Tooltip>
            <Tooltip title="Ignorer">
              <Popconfirm
                title="Ignorer définitivement cette alerte ?"
                onConfirm={() => resolveAlert(r.id, "IGNOREE")}
                okText="Oui"
                cancelText="Non"
              >
                <Button
                  size="small" icon={<CloseCircleOutlined />} type="text"
                  disabled={done} style={{ color: done ? "#d1d5db" : "#94a3b8" }}
                />
              </Popconfirm>
            </Tooltip>
            <Tooltip title="Escalader">
              <Popconfirm
                title="Escalader cette alerte ?"
                onConfirm={() => resolveAlert(r.id, "ESCALADEE")}
                okText="Oui"
                cancelText="Non"
              >
                <Button
                  size="small" icon={<ArrowUpOutlined />} type="text"
                  disabled={done || r.statut === "ESCALADEE"}
                  style={{ color: done || r.statut === "ESCALADEE" ? "#d1d5db" : "#B51200" }}
                />
              </Popconfirm>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #B51200, #8b0000)",
        borderRadius: 12, padding: "20px 24px", color: "#fff", marginBottom: 24,
      }}>
        <Row justify="space-between" align="middle" wrap>
          <Col>
            <Space>
              <BellOutlined style={{ fontSize: 28 }} />
              <div>
                <Title level={3} style={{ margin: 0, color: "#fff" }}>Gestion des Alertes</Title>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
                  Surveillance et traitement des alertes prédictives
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchAlerts()}
              loading={loading}
              style={{ borderColor: "rgba(255,255,255,0.6)", color: "#fff", background: "transparent" }}
            >
              Rafraîchir
            </Button>
          </Col>
        </Row>
      </div>

      {/* Filters */}
      <Card style={{ ...glass, marginBottom: 20 }} size="small">
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={6}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>Statut</Text>
            <Select
              value={filters.statut ?? undefined}
              onChange={v => handleFilterChange("statut", v)}
              placeholder="Tous les statuts"
              allowClear
              style={{ width: "100%" }}
            >
              <Option value="NOUVELLE">Nouvelle</Option>
              <Option value="LUE">Lue</Option>
              <Option value="TRAITEE">Traitée</Option>
              <Option value="IGNOREE">Ignorée</Option>
              <Option value="ESCALADEE">Escaladée</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>Sévérité</Text>
            <Select
              value={filters.severite ?? undefined}
              onChange={v => handleFilterChange("severite", v)}
              placeholder="Toutes"
              allowClear
              style={{ width: "100%" }}
            >
              <Option value="CRITICAL">Critique</Option>
              <Option value="WARNING">Avertissement</Option>
              <Option value="INFO">Info</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>Type</Text>
            <Select
              value={filters.type_alerte ?? undefined}
              onChange={v => handleFilterChange("type_alerte", v)}
              placeholder="Tous les types"
              allowClear
              style={{ width: "100%" }}
            >
              <Option value="GAP_CRITIQUE">Gap Critique</Option>
              <Option value="STAGNATION">Stagnation</Option>
              <Option value="REGRESSION">Régression</Option>
              <Option value="TENDANCE_DEPARTEMENT">Tendance Département</Option>
              <Option value="COMPLETION_FAIBLE">Complétion Faible</Option>
              <Option value="BESOIN_NON_COUVERT">Besoin Non Couvert</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>Enseignant</Text>
            <Input
              placeholder="ID enseignant"
              value={filters.enseignant_id ?? ""}
              onChange={e => handleFilterChange("enseignant_id", e.target.value || undefined)}
              allowClear
              style={{ borderRadius: 6 }}
            />
          </Col>
        </Row>
      </Card>

      {error && (
        <Alert message={error} type="error" showIcon closable style={{ marginBottom: 16, borderRadius: 8 }} />
      )}

      <Card style={glass} size="small">
        <Spin spinning={loading}>
          {data?.alerts?.length ? (
            <Table
              dataSource={data.alerts}
              columns={columns}
              rowKey="id"
              size="middle"
              scroll={{ x: 900 }}
              pagination={{
                current: (filters.page ?? 0) + 1,
                pageSize: filters.size ?? 20,
                total: data.total,
                onChange: page => {
                  const newFilters = updateFilter({ page: page - 1 });
                  fetchAlerts(newFilters);
                },
                showSizeChanger: false,
                showTotal: (total, range) => `${range[0]}-${range[1]} sur ${total} alertes`,
              }}
            />
          ) : (
            <Empty
              description="Aucune alerte correspondant aux filtres"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}
