import { useMemo, useState } from "react";
import { Alert, Button, Input, Popconfirm, Space, Table, Tooltip } from "antd";
import type { TableColumnsType, TableProps } from "antd";
import type { Id } from "@/models/common";
import {
  CheckSquareOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type React from "react";

interface CrudTabProps<T extends object = Record<string, unknown>> {
  columns: TableColumnsType<T>;
  data: T[];
  loading?: boolean;
  onAdd: () => void;
  onEdit: (record: T) => void;
  onDelete: (id: Id) => void | Promise<void>;
  onBulkDelete?: ((keys: React.Key[]) => void | Promise<void>) | null;
  addLabel: string;
  tableProps?: Partial<TableProps<T>>;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export default function CrudTab<T extends object = Record<string, unknown>>({
  columns,
  data,
  loading = false,
  onAdd,
  onEdit,
  onDelete,
  onBulkDelete = null,
  addLabel,
  tableProps = undefined,
  searchable = true,
  searchPlaceholder = "Rechercher...",
}: CrudTabProps<T>) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [searchText, setSearchText] = useState("");

  /* ── Filtrage local instantané ───────────────────────────────────────── */
  const filteredData = useMemo(() => {
    if (!searchable || !searchText.trim()) return data;
    const kw = searchText.trim().toLowerCase();
    return data.filter((row) =>
      Object.values(row as Record<string, unknown>).some(
        (val) => typeof val === "string" && val.toLowerCase().includes(kw),
      ),
    );
  }, [data, searchText, searchable]);

  const selectedRows = filteredData.filter((r) =>
    selectedRowKeys.includes((r as Record<string, unknown>).id as React.Key),
  );
  const hasSelection = selectedRowKeys.length > 0;

  const toggleSelectionMode = () => {
    if (selectionMode) setSelectedRowKeys([]);
    setSelectionMode((prev) => !prev);
  };

  const handleBulkDelete = async () => {
    if (onBulkDelete) await onBulkDelete(selectedRowKeys);
    else await Promise.all(selectedRowKeys.map((id) => onDelete(id as Id)));
    setSelectedRowKeys([]);
    setSelectionMode(false);
  };

  const handleBulkEdit = () => {
    if (selectedRows.length === 1) {
      onEdit(selectedRows[0]);
      setSelectedRowKeys([]);
      setSelectionMode(false);
    }
  };

  const rowSelection = selectionMode
    ? {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
        selections: [
          Table.SELECTION_ALL,
          Table.SELECTION_INVERT,
          Table.SELECTION_NONE,
        ],
      }
    : undefined;

  return (
    <div>
      {/* ── Barre d'outils ─────────────────────────────────────────────── */}
      <Space style={{ marginBottom: 16, width: "100%" }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          {addLabel}
        </Button>

        <Button
          icon={selectionMode ? <CloseOutlined /> : <CheckSquareOutlined />}
          onClick={toggleSelectionMode}
          type={selectionMode ? "default" : "dashed"}
        >
          {selectionMode ? "Annuler la sélection" : "Sélectionner"}
        </Button>

        {selectionMode && hasSelection && (
          <>
            {selectedRowKeys.length === 1 && (
              <Button icon={<EditOutlined />} onClick={handleBulkEdit}>
                Modifier
              </Button>
            )}
            <Popconfirm
              title={`Supprimer ${selectedRowKeys.length} élément(s) ?`}
              description="Cette action est irréversible."
              okText="Oui, supprimer"
              cancelText="Non"
              okButtonProps={{ danger: true }}
              onConfirm={handleBulkDelete}
            >
              <Button danger icon={<DeleteOutlined />}>
                Supprimer ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          </>
        )}

        {/* ── Recherche inline ─────────────────────────────────────────── */}
        {searchable && (
          <Input
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            placeholder={searchPlaceholder}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280 }}
          />
        )}
      </Space>

      {/* ── Résumé sélection ──────────────────────────────────────────── */}
      {selectionMode && hasSelection && (
        <Alert
          message={`${selectedRowKeys.length} élément(s) sélectionné(s)`}
          type="info"
          showIcon
          closable
          onClose={() => setSelectedRowKeys([])}
          style={{ marginBottom: 12 }}
        />
      )}

      {/* ── Compteur de résultats quand filtre actif ─────────────────── */}
      {searchable && searchText.trim() && (
        <Alert
          message={
            filteredData.length === 0
              ? `Aucun résultat pour « ${searchText} »`
              : `${filteredData.length} résultat(s) pour « ${searchText} »`
          }
          type={filteredData.length === 0 ? "warning" : "info"}
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}

      {/* ── Tableau ──────────────────────────────────────────────────── */}
      <Table<T>
        dataSource={filteredData}
        columns={[
          ...columns,
          {
            title: "Actions",
            key: "actions",
            width: 120,
            render: (_: unknown, record: T) => (
              <Space>
                <Tooltip title="Modifier">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEdit(record)}
                  />
                </Tooltip>
                <Tooltip title="Supprimer">
                  <Popconfirm
                    title="Confirmer la suppression ?"
                    okText="Oui"
                    cancelText="Non"
                    onConfirm={() => { const id = (record as { id?: Id }).id; if (id != null) onDelete(id); }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Tooltip>
              </Space>
            ),
          },
        ]}
        rowKey="id"
        rowSelection={rowSelection}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `${total} élément(s)`,
        }}
        size="small"
        {...(tableProps || {})}
      />
    </div>
  );
}

