import React from "react";
import { Table, Button, Select, Space, Card, Row, Col, Statistic, Typography } from "antd";
import {
  EyeOutlined,
  FilePdfOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  FileProtectOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { brand } from "@/components/common";
import type { Id } from "@/models/common";
import type { FormationRecord } from "../CompletedFormations";

const { Option } = Select;
const { Text } = Typography;

interface CompletedFormationsTableProps {
  formations: FormationRecord[];
  loadingTable: boolean;
  typeCertif: string;
  onTypeCertifChange: (value: string) => void;
  loadingButtons: Record<string, boolean>;
  onGenerateCertificate: (record: FormationRecord) => void;
  onOpenPdfDrawer: () => void;
  onViewCertificate: (id: Id) => void;
  onOpenNewCertDrawer: (formationId: Id) => void;
  certifCount: number;
  pendingCount: number;
}

export function CompletedFormationsTable({
  formations,
  loadingTable,
  typeCertif,
  onTypeCertifChange,
  loadingButtons,
  onGenerateCertificate,
  onOpenPdfDrawer,
  onViewCertificate,
  onOpenNewCertDrawer,
  certifCount,
  pendingCount,
}: Readonly<CompletedFormationsTableProps>) {
  const columns = [
    { title: "Titre Formation", dataIndex: "titreFormation", key: "titreFormation" },
    { title: "État", dataIndex: "etatFormation", key: "etatFormation" },
    { title: "UP", dataIndex: ["up1", "libelle"], key: "up" },
    { title: "Département", dataIndex: ["departement1", "libelle"], key: "departement" },
    { title: "Date Début", dataIndex: "dateDebut", key: "dateDebut" },
    { title: "Date Fin", dataIndex: "dateFin", key: "dateFin" },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, rec: FormationRecord) => (
        <Space size={4}>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            loading={loadingButtons[String(rec.idFormation)]}
            disabled={rec.certifGenerated}
            onClick={() => onGenerateCertificate(rec)}
            className="completed-btn-generate"
          >
            Générer
          </Button>
          {rec.certifGenerated && (
            <Button
              icon={<EyeOutlined />}
              onClick={() => onViewCertificate(rec.idFormation!)}
              className="completed-btn-view"
            >
              Voir
            </Button>
          )}
          <Button
            icon={<PlusOutlined />}
            onClick={() => rec.idFormation != null && onOpenNewCertDrawer(rec.idFormation)}
            className="completed-btn-add"
          >
            Ajouter
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card size="small" className="completed-stat-card">
            <Statistic
              title="Total Achevées"
              value={formations.length}
              prefix={<CheckCircleOutlined style={{ color: brand[500] }} />}
              valueStyle={{ color: brand[500], fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" className="completed-stat-card">
            <Statistic
              title="Certificats Générés"
              value={certifCount}
              prefix={<FileProtectOutlined style={{ color: "#059669" }} />}
              valueStyle={{ color: "#059669", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" className="completed-stat-card">
            <Statistic
              title="En Attente"
              value={pendingCount}
              prefix={<TeamOutlined style={{ color: "#f59e0b" }} />}
              valueStyle={{ color: "#f59e0b", fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <div className="completed-toolbar">
        <Text className="completed-toolbar-label">Type de certificat :</Text>
        <Select value={typeCertif} onChange={onTypeCertifChange} style={{ width: 180 }}>
          <Option value="CERTIF">Certificat</Option>
          <Option value="BADGE">Badge</Option>
          <Option value="ATTESTATION">Attestation</Option>
        </Select>
        <Button icon={<FilePdfOutlined />} onClick={onOpenPdfDrawer} className="completed-btn-pdf">
          Générer tableau
        </Button>
      </div>

      <Card className="completed-table-card">
        <Table
          dataSource={formations}
          columns={columns}
          rowKey="idFormation"
          loading={loadingTable}
          pagination={{ pageSize: 8, showSizeChanger: true, showTotal: (total) => `${total} formation${total === 1 ? "" : "s"}` }}
          locale={{ emptyText: "Aucune formation achevée" }}
        />
      </Card>
    </>
  );
}
