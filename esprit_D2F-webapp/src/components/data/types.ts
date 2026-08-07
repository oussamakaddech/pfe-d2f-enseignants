import type { ReactNode } from 'react';
import type { ColumnType } from 'antd/es/table';

/** Paramètres de requête serveur (page 1-based). */
export interface PaginationParams {
  page: number;
  size: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

/** Réponse paginée — alignée sur le format Spring (`content`/`totalElements`). */
export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
}

/** Colonne DataTable : colonne AntD + opt-in tri serveur via `sortKey`. */
export interface DataTableColumn<T> extends ColumnType<T> {
  /** Champ envoyé au backend pour le tri (active le tri sur la colonne). */
  sortKey?: string;
}

/** Action de ligne (menu kebab ⋮). `confirm` impose la modale de confirmation. */
export interface RowAction<T> {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  /** Si présent : ConfirmModal obligatoire avant exécution (suppression…). */
  confirm?: {
    title?: string;
    getEntityName?: (row: T) => string;
  };
  onClick: (row: T) => void | Promise<void>;
  hidden?: (row: T) => boolean;
}

/** Action groupée sur la sélection multiple. */
export interface BulkAction<T> {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick: (rows: T[]) => void | Promise<void>;
}

export interface FilterOption {
  label: string;
  value: string | number;
}

/** Configuration déclarative des filtres du FilterPanel. */
export type FilterConfig =
  | { type: 'select'; key: string; label: string; options: FilterOption[]; placeholder?: string }
  | {
      type: 'multiSelect';
      key: string;
      label: string;
      options: FilterOption[];
      placeholder?: string;
    }
  | { type: 'dateRange'; key: string; label: string }
  | { type: 'rangeSlider'; key: string; label: string; min: number; max: number; unit?: string }
  | { type: 'search'; key: string; label: string; placeholder?: string };

export type FilterValues = Record<string, unknown>;

/* ────────────────────────────────────────────────────────────────────────────
   Adaptateur client-side : la plupart des endpoints D2F renvoient encore des
   tableaux complets (pagination backend en cours — blocker DSI #6). Ce
   helper donne à DataTable un contrat serveur uniforme en attendant :
   recherche, tri et découpage sont faits côté client sur la liste chargée
   (et mise en cache par React Query).
   ──────────────────────────────────────────────────────────────────────── */

function valueAtPath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
      obj,
    );
}

function normalize(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '');
}

export function makeClientFetchFn<T>(
  loadAll: () => Promise<T[]>,
  options: {
    /** Champs (chemins `a.b`) parcourus par la recherche globale. */
    searchFields?: string[];
    /** Prédicats de filtre par clé de FilterConfig. */
    filterPredicates?: Record<string, (row: T, value: unknown) => boolean>;
  } = {},
): (params: PaginationParams) => Promise<PagedResponse<T>> {
  return async (params) => {
    let rows = await loadAll();

    const search = normalize(params.search);
    if (search && options.searchFields?.length) {
      rows = rows.filter((row) =>
        options.searchFields!.some((field) => normalize(valueAtPath(row, field)).includes(search)),
      );
    }

    if (params.filters) {
      for (const [key, value] of Object.entries(params.filters)) {
        if (value === undefined || value === null || (Array.isArray(value) && value.length === 0))
          continue;
        const predicate = options.filterPredicates?.[key];
        rows = predicate
          ? rows.filter((row) => predicate(row, value))
          : rows.filter((row) => {
              const v = valueAtPath(row, key);
              return Array.isArray(value)
                ? (value as unknown[]).some((x) => normalize(x) === normalize(v))
                : normalize(value) === normalize(v);
            });
      }
    }

    if (params.sortBy) {
      const dir = params.sortDir === 'desc' ? -1 : 1;
      const sortBy = params.sortBy;
      rows = [...rows].sort((a, b) => {
        const va = valueAtPath(a, sortBy);
        const vb = valueAtPath(b, sortBy);
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return normalize(va).localeCompare(normalize(vb), 'fr') * dir;
      });
    }

    const start = (params.page - 1) * params.size;
    return { content: rows.slice(start, start + params.size), totalElements: rows.length };
  };
}
