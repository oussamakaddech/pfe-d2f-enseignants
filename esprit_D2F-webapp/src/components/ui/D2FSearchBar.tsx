import { useState } from "react";
import { Input, AutoComplete, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { brand, neutral, radius } from "../../theme/tokens";

const { Text } = Typography;

interface SearchOption {
  value: string;
  label: React.ReactNode;
  path: string;
  category: string;
}

interface D2FSearchBarProps {
  options?: SearchOption[];
  placeholder?: string;
  width?: number | string;
  onSearch?: (value: string) => void;
}

export default function D2FSearchBar({
  options = [],
  placeholder = "Rechercher une formation, un enseignant, une compétence...",
  width = 420,
  onSearch,
}: D2FSearchBarProps) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [open, setOpen] = useState(false);

  const filteredOptions = searchValue
    ? options.filter((opt) =>
        String(opt.value).toLowerCase().includes(searchValue.toLowerCase())
      )
    : options.slice(0, 8);

  const handleSelect = (_value: string, option: SearchOption) => {
    navigate(option.path);
    setSearchValue("");
    setOpen(false);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setOpen(true);
    onSearch?.(value);
  };

  const renderOption = (option: SearchOption) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: radius.sm,
          background: `${brand[500]}12`,
          color: brand[500],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        {option.category === "formation" ? "📚" : option.category === "enseignant" ? "👤" : option.category === "competence" ? "🎯" : "📋"}
      </span>
      <div>
        <Text strong style={{ fontSize: 13 }}>{option.value}</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 11 }}>{option.category}</Text>
      </div>
    </div>
  );

  return (
    <AutoComplete
      options={filteredOptions.map((opt) => ({ ...opt, label: renderOption(opt) }))}
      onSelect={handleSelect}
      onSearch={handleSearch}
      value={searchValue}
      open={open}
      onDropdownVisibleChange={setOpen}
      style={{ width }}
    >
      <Input
        size="middle"
        placeholder={placeholder}
        prefix={<SearchOutlined style={{ color: neutral[400] }} />}
        allowClear
        onFocus={() => setOpen(true)}
        style={{
          borderRadius: radius.md,
          borderColor: "rgba(0,0,0,0.10)",
        }}
      />
    </AutoComplete>
  );
}
