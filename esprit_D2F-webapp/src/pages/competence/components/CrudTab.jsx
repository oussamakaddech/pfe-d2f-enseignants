// src/pages/competence/components/CrudTab.jsx
import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Alert, Button, Input, Popconfirm, Space, Table, Tooltip } from "antd";
import {
  CheckSquareOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";

export default function CrudTab({
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
}) {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [searchText, setSearchText] = useState("");

  /* ── Filtrage local instantané ───────────────────────────────────────── */
  const filteredData = useMemo(() => {
    if (!searchable || !searchText.trim()) return data;
    const kw = searchText.trim().toLowerCase();
    return data.filter((row) =>
      Object.values(row).some(
        (val) => typeof val === "string" && val.toLowerCase().includes(kw),
      ),
    );
  }, [data, searchText, searchable]);

  const selectedRows = filteredData.filter((r) =>
    selectedRowKeys.includes(r.id),
  );
  const hasSelection = selectedRowKeys.length > 0;

  const toggleSelectionMode = () => {
    if (selectionMode) setSelectedRowKeys([]);
    setSelectionMode((prev) => !prev);
  };

  const handleBulkDelete = async () => {
    if (onBulkDelete) await onBulkDelete(selectedRowKeys);
    else await Promise.all(selectedRowKeys.map((id) => onDelete(id)));
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
        onChange: (keys) => setSelectedRowKeys(keys),
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
      <Table
        dataSource={filteredData}
        columns={[
          ...columns,
          {
            title: "Actions",
            key: "actions",
            width: 120,
            render: (_, record) => (
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
                    onConfirm={() => onDelete(record.id)}
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
        {...tableProps}
      />
    </div>
  );
}

CrudTab.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool,
  onAdd: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onBulkDelete: PropTypes.func,
  addLabel: PropTypes.string.isRequired,
  tableProps: PropTypes.object,
  searchable: PropTypes.bool,
  searchPlaceholder: PropTypes.string,
};
