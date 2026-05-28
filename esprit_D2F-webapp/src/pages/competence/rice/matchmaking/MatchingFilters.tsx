import { Select, Input } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import { DEPARTMENT_OPTIONS } from "../constants";
import type { MatchState, MatchAction } from "../../hooks/useMatchmaking";

const { Option } = Select;

interface MatchingFiltersProps {
  filters: MatchState["filters"];
  domaineOptions: string[];
  dispatch: React.Dispatch<MatchAction>;
  onPageReset: () => void;
}

export function MatchingFilters({ filters, domaineOptions, dispatch, onPageReset }: MatchingFiltersProps) {
  return (
    <>
      <div className="mm-toolbar__left">
        <FilterOutlined className="mm-toolbar__icon" />
        <Select
          value={filters.departement}
          onChange={(v) => dispatch({ type: "SET_FILTER", filters: { departement: v ?? null } })}
          style={{ width: 170 }}
          allowClear
          placeholder="Département"
          options={DEPARTMENT_OPTIONS}
          optionFilterProp="labelText"
          showSearch
        />
        <Select
          value={filters.domaine}
          onChange={(v) => { dispatch({ type: "SET_FILTER", filters: { domaine: v } }); onPageReset(); }}
          style={{ width: 160 }}
        >
          <Option value="all">Tous domaines</Option>
          {domaineOptions.map((d) => <Option key={d} value={d}>{d}</Option>)}
        </Select>
        <Select
          value={filters.type}
          onChange={(v) => { dispatch({ type: "SET_FILTER", filters: { type: v } }); onPageReset(); }}
          style={{ width: 140 }}
        >
          <Option value="all">Tous types</Option>
          <Option value="THEORIQUE">Théorique</Option>
          <Option value="PRATIQUE">Pratique</Option>
        </Select>
        <Select
          value={filters.statut}
          onChange={(v) => { dispatch({ type: "SET_FILTER", filters: { statut: v } }); onPageReset(); }}
          style={{ width: 150 }}
        >
          <Option value="all">Tous statuts</Option>
          <Option value="assigned">✅ Affecté</Option>
          <Option value="unassigned">⚠️ Non affecté</Option>
        </Select>
      </div>
      <Input.Search
        placeholder="Code / nom du savoir..."
        onSearch={(q) => { dispatch({ type: "SET_FILTER", filters: { search: q } }); onPageReset(); }}
        onChange={(e) => !e.target.value && dispatch({ type: "SET_FILTER", filters: { search: "" } })}
        style={{ width: 280 }}
        allowClear
      />
    </>
  );
}
