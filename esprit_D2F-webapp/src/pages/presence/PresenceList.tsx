
import {
  Table, Button, Row, Col, Input, Space, Popconfirm,
  Empty, Skeleton, Tag,
} from "antd";
import {
  DownloadOutlined, SearchOutlined, CheckCircleOutlined,
  CloseCircleOutlined, SaveOutlined, ReloadOutlined,
} from "@ant-design/icons";
import { usePresenceList } from "./hooks/usePresenceList";
import { buildPresenceColumns } from "./components/PresenceTableColumns";
import { PresenceStatsBanner } from "./components/PresenceStatsBanner";
import "@/styles/pages/presence-list.css";

interface PresenceListProps {
  seanceId: number | string;
}

const PresenceList = ({ seanceId }: PresenceListProps) => {
  const {
    filtered, loading, saving, search, setSearch,
    dirtyIds, total, presents, absents, taux,
    togglePresence, setCommentaire, handleSave, handleMarkAll, exportExcel,
  } = usePresenceList(seanceId);

  const columns = buildPresenceColumns({ dirtyIds, togglePresence, setCommentaire });

  if (loading) return <div className="presence-container"><Skeleton active paragraph={{ rows: 6 }} /></div>;
  if (total === 0) return <div className="presence-container"><Empty description="Aucun participant affecté à cette séance" /></div>;

  return (
    <div className="presence-container">
      <PresenceStatsBanner total={total} presents={presents} absents={absents} taux={taux} />

      <Row gutter={[12, 12]} align="middle" className="presence-toolbar">
        <Col flex="auto">
          <Input allowClear size="middle" placeholder="Rechercher un enseignant (nom, prénom, email)"
            value={search} onChange={(e) => setSearch(e.target.value)}
            prefix={<SearchOutlined style={{ color: "var(--neutral-400)" }} />} className="presence-search" />
        </Col>
        <Col>
          <Space wrap>
            <Popconfirm title="Marquer tous les enseignants présents ?" onConfirm={() => handleMarkAll(true)} okText="Oui" cancelText="Non">
              <Button icon={<CheckCircleOutlined />} className="presence-btn presence-btn-all-present" disabled={saving}>Tous présents</Button>
            </Popconfirm>
            <Popconfirm title="Marquer tous les enseignants absents ?" onConfirm={() => handleMarkAll(false)} okText="Oui" cancelText="Non" okButtonProps={{ danger: true }}>
              <Button icon={<CloseCircleOutlined />} danger className="presence-btn" disabled={saving}>Tous absents</Button>
            </Popconfirm>
            <Button icon={<ReloadOutlined />} disabled={loading || saving} className="presence-btn">Actualiser</Button>
            <Button icon={<DownloadOutlined />} onClick={exportExcel} className="presence-btn">Excel</Button>
          </Space>
        </Col>
      </Row>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="idParticipation"
        pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
        size="middle"
        className="presence-table"
        locale={{ emptyText: search ? "Aucun résultat pour votre recherche" : "Aucune présence" }}
      />

      {dirtyIds.length > 0 && (
        <div className="presence-save-bar">
          <Tag color="orange" className="presence-dirty-tag">
            {dirtyIds.length} modification{dirtyIds.length > 1 ? "s" : ""} en attente
          </Tag>
          <Space>
            <Button disabled={saving} icon={<ReloadOutlined />}>Annuler</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} className="presence-btn-save">Enregistrer</Button>
          </Space>
        </div>
      )}
    </div>
  );
};



export default PresenceList;
