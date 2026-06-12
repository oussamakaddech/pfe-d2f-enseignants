import { Button, Space, Tooltip, InputRef } from "antd";
import {
  PlusOutlined, CheckSquareOutlined, UndoOutlined,
  UploadOutlined, DownloadOutlined, FileExcelOutlined,
} from "@ant-design/icons";
import { forwardRef } from "react";

export type ActorToolbarVariant = "primary" | "edit";

export interface ActorToolbarProps {
  variant: ActorToolbarVariant;
  count: number;
  total: number;
  fileInputId: string;
  onAdd: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportExcel?: () => void;
  addLabel: string;
  selectAllLabel: string;
  clearLabel: string;
  importLabel: string;
  importDisabled?: boolean;
  selectAllDisabled?: boolean;
  addDisabled?: boolean;
}

const ActorToolbar = forwardRef<InputRef, ActorToolbarProps>(function ActorToolbar(props, _ref) {
  const {
    variant, count, total, fileInputId,
    onAdd, onSelectAll, onClear,
    onImportExcel, onExportExcel,
    addLabel, selectAllLabel, clearLabel, importLabel,
    importDisabled, selectAllDisabled, addDisabled,
  } = props;

  const isCreate = variant === "primary";
  const size = isCreate ? "small" : "middle";
  const importIcon = isCreate ? <UploadOutlined /> : <FileExcelOutlined />;
  const exportIcon = isCreate ? <DownloadOutlined /> : <FileExcelOutlined />;

  return (
    <Space wrap size={4} className={`actor-toolbar actor-toolbar--${variant}`}>
      <Tooltip title={addLabel}>
        <Button
          type={isCreate ? "primary" : "default"}
          size={size}
          icon={<PlusOutlined />}
          onClick={onAdd}
          disabled={addDisabled}
          className="actor-toolbar__btn actor-toolbar__btn--add"
        >
          {addLabel}
        </Button>
      </Tooltip>

      <Tooltip title={selectAllLabel}>
        <Button
          size={size}
          icon={<CheckSquareOutlined />}
          onClick={onSelectAll}
          disabled={selectAllDisabled}
          className="actor-toolbar__btn"
        >
          {selectAllLabel} ({total})
        </Button>
      </Tooltip>

      {onExportExcel && (
        <Tooltip title="Exporter la sélection au format Excel">
          <Button
            size={size}
            icon={exportIcon}
            onClick={onExportExcel}
            disabled={total === 0}
            className="actor-toolbar__btn"
          >
            {count > 0 ? `Export (${count})` : "Export"}
          </Button>
        </Tooltip>
      )}

      <label htmlFor={fileInputId}>
        <Tooltip title={importLabel}>
          <Button
            size={size}
            icon={importIcon}
            disabled={importDisabled}
            onClick={(e) => {
              const t = e.currentTarget;
              const hidden = document.getElementById(fileInputId) as HTMLInputElement | null;
              if (hidden) hidden.value = "";
              t?.blur();
            }}
            className="actor-toolbar__btn"
          >
            {importLabel}
          </Button>
        </Tooltip>
      </label>
      <input id={fileInputId} hidden accept=".xlsx,.xls,.csv" type="file" onChange={onImportExcel} />

      {count > 0 && (
        <Tooltip title={clearLabel}>
          <Button
            size={size}
            type="text"
            danger
            icon={<UndoOutlined />}
            onClick={onClear}
            className="actor-toolbar__btn"
          >
            {clearLabel}
          </Button>
        </Tooltip>
      )}
    </Space>
  );
});

export default ActorToolbar;
