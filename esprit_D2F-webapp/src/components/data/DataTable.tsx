import { memo, useEffect, useMemo, useState, type Key, type ReactNode } from "react";
import { Button, Dropdown, Input, Table } from "antd";
import type { TableProps } from "antd";
import {
  DownloadOutlined, InboxOutlined, MoreOutlined, SearchOutlined,
} from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import EmptyState from "@/components/common/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/hooks/useToast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import FilterPanel from "./FilterPanel";
import Pagination from "./Pagination";
import type {
  BulkAction, DataTableColumn, FilterConfig, FilterValues,
  PagedResponse, PaginationParams, RowAction,
} from "./types";
import styles from "./DataTable.module.css";

interface DataTableProps<T extends object> {
  /** Clé React Query (unique par table/écran). */
  readonly queryKey: string | readonly unknown[];
  readonly columns: DataTableColumn<T>[];
  /** Source de données paginée (serveur, ou `makeClientFetchFn` en attendant). */
  readonly fetchFn: (params: PaginationParams) => Promise<PagedResponse<T>>;
  readonly rowKey: keyof T | ((row: T) => Key);
  readonly searchable?: boolean;
  readonly searchPlaceholder?: string;
  /** Bouton d'export Excel (toutes les lignes du résultat courant). */
  readonly exportable?: boolean;
  readonly exportFileName?: string;
  /** Sélection multiple + barre d'actions groupées. */
  readonly selectable?: boolean;
  readonly bulkActions?: BulkAction<T>[];
  readonly filters?: FilterConfig[];
  readonly onRowClick?: (row: T) => void;
  readonly emptyMessage?: string;
  readonly emptyDescription?: string;
  readonly emptyAction?: { label: string; onClick: () => void };
  /** Menu kebab ⋮ par ligne (Edit / View / Delete avec confirmation). */
  readonly rowActions?: RowAction<T>[];
  readonly defaultPageSize?: number;
  /** Hauteur de viewport pour la virtualisation (listes > 500 lignes). */
  readonly virtualHeight?: number;
  /** Contenu additionnel dans la barre d'outils (boutons « Créer »…). */
  readonly toolbarExtra?: ReactNode;
}

/**
 * Table de données universelle D2F — UNE seule table pour tous les modules.
 *
 * Pagination côté serveur, tri par colonne, recherche globale débouncée
 * (300 ms), filtres déclaratifs, sélection multiple + actions groupées,
 * skeleton par lignes au premier chargement, en-tête sticky, export Excel,
 * actions de ligne avec confirmation pour les suppressions, virtualisation
 * optionnelle pour les très grandes listes.
 */
function DataTableInner<T extends object>({
  queryKey,
  columns,
  fetchFn,
  rowKey,
  searchable = true,
  searchPlaceholder = "Rechercher…",
  exportable = false,
  exportFileName = "export-d2f",
  selectable = false,
  bulkActions = [],
  filters,
  onRowClick,
  emptyMessage = "Aucun résultat",
  emptyDescription,
  emptyAction,
  rowActions,
  defaultPageSize = 25,
  virtualHeight,
  toolbarExtra,
}: DataTableProps<T>) {
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<{ by?: string; dir?: "asc" | "desc" }>({});
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<T[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<{ action: RowAction<T>; row: T } | null>(null);
  const [exporting, setExporting] = useState(false);

  const search = useDebouncedValue(searchInput.trim(), 300);

  // Retour page 1 quand la recherche ou les filtres changent.
  useEffect(() => {
    setPage(1);
  }, [search, filterValues]);

  const params: PaginationParams = useMemo(
    () => ({
      page,
      size: pageSize,
      search: search || undefined,
      sortBy: sort.by,
      sortDir: sort.dir,
      filters: Object.keys(filterValues).length ? filterValues : undefined,
    }),
    [page, pageSize, search, sort, filterValues],
  );

  const baseKey = useMemo(
    () => (Array.isArray(queryKey) ? queryKey : [queryKey]),
    [queryKey],
  );

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: [...baseKey, "table", params],
    queryFn: () => fetchFn(params),
    placeholderData: keepPreviousData,
  });

  const rows = data?.content ?? [];
  const total = data?.totalElements ?? 0;

  const handleTableChange: TableProps<T>["onChange"] = (_pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const column = s?.column as DataTableColumn<T> | undefined;
    if (!s?.order || !column?.sortKey) {
      setSort({});
      return;
    }
    setSort({ by: column.sortKey, dir: s.order === "descend" ? "desc" : "asc" });
  };

  const effectiveColumns = useMemo<DataTableColumn<T>[]>(() => {
    const base = columns.map((col) => (col.sortKey ? { ...col, sorter: true } : col));
    if (!rowActions?.length) return base;

    return [
      ...base,
      {
        key: "__actions",
        title: "",
        width: 56,
        fixed: "right",
        render: (_: unknown, row: T) => {
          const visible = rowActions.filter((a) => !a.hidden?.(row));
          if (!visible.length) return null;
          return (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: visible.map((a) => ({
                  key: a.key,
                  label: a.label,
                  icon: a.icon,
                  danger: a.danger,
                })),
                onClick: ({ key, domEvent }) => {
                  domEvent.stopPropagation();
                  const action = visible.find((a) => a.key === key);
                  if (!action) return;
                  if (action.confirm) {
                    setPendingConfirm({ action, row });
                  } else {
                    void action.onClick(row);
                  }
                },
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined />}
                aria-label="Actions"
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          );
        },
      },
    ];
  }, [columns, rowActions]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const all = await fetchFn({ ...params, page: 1, size: 100_000 });
      const XLSX = await import("xlsx");
      const exportableCols = columns.filter((c) => c.dataIndex !== undefined);
      const sheetRows = all.content.map((row) => {
        const out: Record<string, unknown> = {};
        for (const col of exportableCols) {
          const path = Array.isArray(col.dataIndex) ? col.dataIndex.join(".") : String(col.dataIndex);
          const value = path
            .split(".")
            .reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), row);
          out[typeof col.title === "string" ? col.title : path] = value ?? "";
        }
        return out;
      });
      const ws = XLSX.utils.json_to_sheet(sheetRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Données");
      XLSX.writeFile(wb, `${exportFileName}.xlsx`);
      toast.success("Export Excel généré", { description: `${sheetRows.length} ligne(s) exportée(s).` });
    } catch {
      toast.error("Échec de l'export", { description: "Réessayez ou contactez l'administrateur." });
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.wrapper}>
        <Skeleton variant="table" rows={Math.min(pageSize, 10)} columns={Math.min(columns.length, 6)} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.wrapper}>
        <EmptyState
          icon={<InboxOutlined />}
          title="Impossible de charger les données"
          description="Une erreur réseau ou serveur est survenue."
          action={{ label: "Réessayer", onClick: () => void refetch() }}
        />
      </div>
    );
  }

  const showToolbar = searchable || exportable || toolbarExtra;

  return (
    <div className={styles.wrapper}>
      {showToolbar && (
        <div className={styles.toolbar}>
          {searchable && (
            <Input
              className={styles.search}
              prefix={<SearchOutlined style={{ color: "var(--color-text-muted)" }} />}
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              allowClear
            />
          )}
          <span className={styles.toolbarSpacer} />
          {toolbarExtra}
          {exportable && (
            <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting}>
              Exporter
            </Button>
          )}
        </div>
      )}

      {filters && filters.length > 0 && (
        <FilterPanel filters={filters} values={filterValues} onChange={setFilterValues} />
      )}

      {selectable && selectedKeys.length > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>{selectedKeys.length} sélectionné(s)</span>
          {bulkActions.map((a) => (
            <Button
              key={a.key}
              size="small"
              danger={a.danger}
              icon={a.icon}
              onClick={() => void a.onClick(selectedRows)}
            >
              {a.label}
            </Button>
          ))}
          <Button size="small" type="text" onClick={() => { setSelectedKeys([]); setSelectedRows([]); }}>
            Tout désélectionner
          </Button>
        </div>
      )}

      <Table<T>
        className={`${styles.table} ${onRowClick ? styles.clickableRows : ""} ${isFetching ? styles.refetching : ""}`}
        columns={effectiveColumns}
        dataSource={rows}
        rowKey={rowKey as TableProps<T>["rowKey"]}
        pagination={false}
        onChange={handleTableChange}
        sticky
        size="middle"
        virtual={Boolean(virtualHeight)}
        scroll={virtualHeight ? { x: 1100, y: virtualHeight } : { x: "max-content" }}
        rowSelection={
          selectable
            ? {
                selectedRowKeys: selectedKeys,
                preserveSelectedRowKeys: true,
                onChange: (keys, rowsSel) => { setSelectedKeys(keys); setSelectedRows(rowsSel); },
              }
            : undefined
        }
        onRow={onRowClick ? (record) => ({ onClick: () => onRowClick(record) }) : undefined}
        locale={{
          emptyText: (
            <EmptyState
              compact
              icon={<InboxOutlined />}
              title={emptyMessage}
              description={emptyDescription}
              action={emptyAction}
            />
          ),
        }}
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        loading={isFetching}
        onChange={(p, s) => { setPage(p); setPageSize(s); }}
      />

      <ConfirmModal
        open={pendingConfirm !== null}
        title={pendingConfirm?.action.confirm?.title}
        entityName={pendingConfirm ? pendingConfirm.action.confirm?.getEntityName?.(pendingConfirm.row) : undefined}
        onConfirm={async () => {
          if (!pendingConfirm) return;
          await pendingConfirm.action.onClick(pendingConfirm.row);
          setPendingConfirm(null);
        }}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}

/** memo() sur composant générique : on préserve la signature générique via cast. */
const DataTable = memo(DataTableInner) as typeof DataTableInner;

export default DataTable;
