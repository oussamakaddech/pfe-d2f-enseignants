import { Row, Col, Space, Tag, Typography, Input, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

interface Domaine {
  id: number | string;
  nom: string;
  code: string;
}

interface TreeFiltersProps {
  domaines: Domaine[];
  searchKeyword: string;
  selectedDomaine: number | string | null;
  searchLoading: boolean;
  onSearchChange: (value: string) => void;
  onSearch: (value: string) => void;
  onClearSearch: () => void;
  onDomaineChange: (value: number | string | null) => void;
}

export default function TreeFilters({
  domaines,
  searchKeyword,
  selectedDomaine,
  searchLoading,
  onSearchChange,
  onSearch,
  onClearSearch,
  onDomaineChange,
}: TreeFiltersProps) {
  return (
    <Space style={{ marginBottom: 16, width: "100%" }} direction="vertical">
      <Row gutter={16}>
        <Col span={6}>
          <Select
            allowClear
            placeholder="Filtrer par domaine"
            style={{ width: "100%" }}
            value={selectedDomaine}
            onChange={onDomaineChange}
          >
            {domaines.map((d) => (
              <Option key={d.id} value={d.id}>
                {d.nom} ({d.code})
              </Option>
            ))}
          </Select>
        </Col>
        <Col span={18}>
          <Search
            placeholder="Rechercher par mot-clé, code, description..."
            enterButton={searchLoading ? "Recherche..." : "Rechercher"}
            loading={searchLoading}
            value={searchKeyword}
            onChange={(e) => onSearchChange(e.target.value)}
            onSearch={onSearch}
            allowClear
            onClear={onClearSearch}
          />
        </Col>
      </Row>

      {searchKeyword.trim().length > 0 && searchKeyword.trim().length < 2 && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Saisissez au moins 2 caractères
        </Text>
      )}

      {selectedDomaine && (
        <Space size={4}>
          <SearchOutlined style={{ color: "#1890ff" }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Filtrage dans le domaine :
          </Text>
          <Tag
            color="blue"
            closable
            onClose={() => onDomaineChange(null)}
          >
            {domaines.find((d) => d.id === selectedDomaine)?.nom}
          </Tag>
        </Space>
      )}
    </Space>
  );
}
