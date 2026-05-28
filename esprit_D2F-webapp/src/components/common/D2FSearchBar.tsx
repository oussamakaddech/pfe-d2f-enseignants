import { memo, useState } from "react";
import { Input, AutoComplete, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { brand, neutral, radius } from "@/styles/themes/tokens";
import s from "./D2FSearchBar.module.css";

const { Text } = Typography;

interface SearchOption {
  readonly value: string;
  readonly label: React.ReactNode;
  readonly path: string;
  readonly category: string;
}

interface D2FSearchBarProps {
  readonly options?: SearchOption[];
  readonly placeholder?: string;
  readonly width?: number | string;
  readonly onSearch?: (value: string) => void;
}

const D2FSearchBar = memo(function D2FSearchBar({
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

  const renderOption = (option: SearchOption) => {
    let catIcon = "📋";
    if (option.category === "formation") catIcon = "📚";
    else if (option.category === "enseignant") catIcon = "👤";
    else if (option.category === "competence") catIcon = "🎯";
    return (
    <div className={s.optionRow}>
      <span
        className={s.optionIcon}
        style={{ background: `${brand[500]}12`, color: brand[500] }}
      >
        {catIcon}
      </span>
      <div>
        <Text strong style={{ fontSize: 13 }}>{option.value}</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 11 }}>{option.category}</Text>
      </div>
    </div>
    );
  };

  return (
    <AutoComplete
      options={filteredOptions.map((opt) => ({ ...opt, label: renderOption(opt) }))}
      onSelect={handleSelect}
      onSearch={handleSearch}
      value={searchValue}
      open={open}
      onOpenChange={setOpen}
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
});

export default D2FSearchBar;




