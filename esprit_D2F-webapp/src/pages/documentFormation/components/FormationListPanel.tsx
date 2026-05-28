import { List, Spin, Button, Space, Tag, Typography } from "antd";
import { CalendarOutlined, EditOutlined, FileTextOutlined, InboxOutlined } from "@ant-design/icons";
import type { Formation } from "./docUtils";
import { formatDate } from "./docUtils";
import { DocEmpty } from "./DocEmpty";

const { Text } = Typography;

interface FormationListPanelProps {
  readonly formations: Formation[];
  readonly loading: boolean;
  readonly selectedFormation: Formation | null;
  readonly onSelect: (formation: Formation) => void;
  readonly onEditClick: (formation: Formation) => void;
}

export function FormationListPanel({
  formations,
  loading,
  selectedFormation,
  onSelect,
  onEditClick,
}: FormationListPanelProps) {
  return (
    <Spin spinning={loading}>
      {formations.length > 0 ? (
        <List
          size="small"
          dataSource={formations}
          renderItem={(formation) => {
            const isSelected =
              selectedFormation?.idFormation === formation.idFormation;
            const docCount = formation.documents?.length ?? 0;

            return (
              <List.Item
                key={String(formation.idFormation)}
                onClick={() => onSelect(formation)}
                className={`doc-formation-item${isSelected ? " doc-formation-item--selected" : ""}`}
              >
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Space
                    align="start"
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <div>
                      <Text strong className="doc-formation-title">
                        {formation.titreFormation || "Formation sans titre"}
                      </Text>
                      <br />
                      <Text className="doc-formation-date">
                        <CalendarOutlined style={{ marginInlineEnd: 6 }} />
                        {formatDate(formation.dateDebut)}
                      </Text>
                    </div>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditClick(formation);
                      }}
                    />
                  </Space>

                  <Space wrap size={8}>
                    <Tag color="blue" bordered={false}>
                      {formation.up1?.libelle || "UP inconnue"}
                    </Tag>
                    <Tag color="green" bordered={false}>
                      {formation.departement1?.libelle || "Département inconnu"}
                    </Tag>
                    <Tag
                      color={docCount > 0 ? "geekblue" : "default"}
                      bordered={false}
                    >
                      <FileTextOutlined style={{ marginInlineEnd: 4 }} />
                      {docCount} document(s)
                    </Tag>
                  </Space>
                </Space>
              </List.Item>
            );
          }}
        />
      ) : (
        <DocEmpty
          icon={<InboxOutlined />}
          title="Aucune formation"
          text="Aucune formation ne correspond à votre recherche"
        />
      )}
    </Spin>
  );
}
