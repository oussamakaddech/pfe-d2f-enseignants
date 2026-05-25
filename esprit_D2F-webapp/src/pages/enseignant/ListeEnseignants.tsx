import { useState } from "react";
import { Table, Input, Card, Space, Avatar, Typography } from "antd";
import { TeamOutlined, SearchOutlined, UserOutlined, MailOutlined } from "@ant-design/icons";
import { useEnseignants, type Enseignant } from "@/hooks/enseignant";
import { AppPageHeader, brand } from "@/components/common";

const { Text } = Typography;

export default function ListeEnseignants() {
  const { data: enseignants = [], isLoading: loading } = useEnseignants();
  const [search, setSearch] = useState("");

  const filtered = enseignants.filter((ens) =>
    (ens.nom || "").toLowerCase().includes(search.toLowerCase()) ||
    (ens.prenom || "").toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: "Enseignant",
      key: "enseignant",
      sorter: (a: Enseignant, b: Enseignant) => (a.nom || "").localeCompare(b.nom || ""),
      render: (_: unknown, record: Enseignant) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: brand[500] }} size="small" />
          <Text strong>{record.nom} {record.prenom}</Text>
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "mail",
      key: "mail",
      render: (mail: string) => mail
        ? <Text><MailOutlined style={{ marginRight: 6, color: brand[500] }} />{mail}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (t: string) => t || <Text type="secondary">—</Text>,
    },
  ];

  return (
    <div>
      <AppPageHeader
        icon={<TeamOutlined />}
        title="Liste des Enseignants"
        subtitle="Consulter les enseignants de l'établissement"
      />

      <Card style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.07)" }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Rechercher un enseignant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ marginBottom: 16, maxWidth: 320 }}
        />
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{ emptyText: "Aucun enseignant trouvé." }}
        />
      </Card>
    </div>
  );
}








