import { Input, Select } from "antd";

interface Props {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
}

export function TeacherSelector({ value, onChange, options }: Props) {
  if (options && options.length > 0) {
    return (
      <Select
        showSearch
        allowClear
        placeholder="Sélectionner un enseignant (ENS001…)"
        style={{ width: 260 }}
        value={value || undefined}
        onChange={onChange}
        options={options.map((id) => ({ value: id, label: id }))}
      />
    );
  }
  return (
    <Input
      allowClear
      placeholder="Identifiant enseignant — ex. ENS001"
      style={{ width: 260 }}
      value={value}
      onChange={(event) => onChange(event.target.value.trim().toUpperCase())}
    />
  );
}
