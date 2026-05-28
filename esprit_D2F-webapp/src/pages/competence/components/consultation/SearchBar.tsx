import { SearchOutlined } from "@ant-design/icons";
import { Input, Select, Tag } from "antd";
import type { Id } from "@/models/common";
import type { TreeNode } from "@/models/competence";

const { Option } = Select;
const { Search } = Input;

interface StructureState {
  structureLoading: boolean;
  searchLoading: boolean;
  selectedDomaine: Id | null;
  setSelectedDomaine: (val: Id | null) => void;
  searchKeyword: string;
  setSearchKeyword: (val: string) => void;
  handleSearch: (val: string) => void;
  handleClearSearch: () => void;
  structure?: TreeNode[];
}

interface SearchBarProps {
  structure: StructureState;
}

export default function SearchBar({ structure }: Readonly<SearchBarProps>) {
  return (
    <div className="ctp-search-card ctp-section">
      <div className="ctp-filter-row">
        <div className="ctp-filter-row__domain">
          <Select
            loading={structure.structureLoading}
            placeholder={structure.structureLoading ? "Chargement..." : "Filtrer par domaine"}
            allowClear
            style={{ width: "100%" }}
            value={structure.selectedDomaine}
            onChange={(val) => structure.setSelectedDomaine(val)}
          >
            {structure.structure?.map((d) => (
              <Option key={String(d.id)} value={d.id}>
                {d.nom} ({d.code})
              </Option>
            ))}
          </Select>
        </div>

        <div className="ctp-filter-row__search">
          <Search
            placeholder="Rechercher par mot-cle, code, description..."
            enterButton={structure.searchLoading ? "Recherche..." : "Rechercher"}
            loading={structure.searchLoading}
            value={structure.searchKeyword}
            onChange={(e) => structure.setSearchKeyword(e.target.value)}
            onSearch={structure.handleSearch}
            allowClear
            onClear={structure.handleClearSearch}
          />
        </div>
      </div>

      {structure.searchKeyword?.trim().length > 0 && structure.searchKeyword?.trim().length < 2 && (
        <span className="ctp-search-hint">Saisissez au moins 2 caracteres pour lancer la recherche</span>
      )}

      {structure.selectedDomaine && (
        <div className="ctp-filter-tag-row">
          <SearchOutlined style={{ color: "#2563eb", fontSize: 13 }} />
          <span className="ctp-filter-tag-label">Filtrage :</span>
          <Tag closable onClose={() => structure.setSelectedDomaine(null)} color="blue">
            {structure.structure?.find((d) => String(d.id) === String(structure.selectedDomaine))?.nom}
          </Tag>
        </div>
      )}
    </div>
  );
}






