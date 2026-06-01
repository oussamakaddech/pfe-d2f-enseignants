import { useMemo, useState } from "react";
import {
  Checkbox, Pagination, Select, Space, Switch, Table, Tag, Tooltip, Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { cloneDeep, matchSuggestedEnseignants } from "./constants";

const { Text } = Typography;

interface FlatSavoirRow {
  di: number;
  ci: number;
  sci: number;
  si: number;
  domaineNom: string;
  code?: string;
  nom?: string;
  type?: string;
  niveau?: string;
  enseignantsSuggeres?: (string | number)[];
  aiSuggestedIds?: string[];
  refCodes?: string[];
  [key: string]: unknown;
}

interface EnseignantRef extends Record<string, unknown> {
  id?: string | number;
  enseignantId?: string | number;
  nom?: string;
  prenom?: string;
  modules?: string[];
}

interface TreeSavoir extends Record<string, unknown> {
  enseignantsSuggeres?: (string | number)[];
}

interface TreeSousComp extends Record<string, unknown> {
  savoirs?: TreeSavoir[];
}

interface TreeComp extends Record<string, unknown> {
  nom?: string;
  savoirs?: TreeSavoir[];
  sousCompetences?: TreeSousComp[];
}

interface TreeDomaine extends Record<string, unknown> {
  nom?: string;
  competences?: TreeComp[];
}

const addSousCompRows = (rows: FlatSavoirRow[], di: number, ci: number, sc: TreeSousComp, sci: number, domaineNom: string) => {
  (sc.savoirs ?? []).forEach((s, si) => {
    rows.push({ di, ci, sci, si, domaineNom, ...s });
  });
};

const flatten = (tree: TreeDomaine[]): FlatSavoirRow[] => {
  const rows: FlatSavoirRow[] = [];
  (tree ?? []).forEach((d, di) => {
    (d.competences ?? []).forEach((c, ci) => {
      (c.savoirs ?? []).forEach((s, si) => {
        rows.push({ di, ci, sci: -1, si, domaineNom: d.nom ?? "", ...s });
      });
      (c.sousCompetences ?? []).forEach((sc, sci) => {
        addSousCompRows(rows, di, ci, sc, sci, d.nom ?? "");
      });
    });
  });
  return rows;
};

const getSavoirByRow = (next: TreeDomaine[], row: FlatSavoirRow): TreeSavoir | undefined => (
  row.sci === -1
    ? next?.[row.di]?.competences?.[row.ci]?.savoirs?.[row.si]
    : next?.[row.di]?.competences?.[row.ci]?.sousCompetences?.[row.sci]?.savoirs?.[row.si]
);

const rowClassName = (row: FlatSavoirRow) => {
  const n = (row.enseignantsSuggeres ?? []).length;
  if (n === 0) return "ens-matrix-row-uncovered";
  if (n > 3) return "ens-matrix-row-over";
  return "";
};

const getSourceClass = (row: FlatSavoirRow, tid: string, allEnseignants: EnseignantRef[]) => {
  const checked = (row.enseignantsSuggeres ?? []).includes(tid);
  if (!checked) return "";
  const { suggested } = matchSuggestedEnseignants(row, allEnseignants);
  const source = suggested.find((s) => String(s.id ?? s.enseignantId) === tid)?.source ?? "manual";
  if (source === "ai") return "source-ai";
  if (source === "module_match") return "source-module";
  return "source-manual";
};

const buildTeacherColumn = (
  teacher: EnseignantRef,
  allSavoirs: FlatSavoirRow[],
  allEnseignants: EnseignantRef[],
  toggleCell: (row: FlatSavoirRow, teacherId: string) => void,
) => {
  const tid = String(teacher.id ?? teacher.enseignantId);
  const fullName = teacher.prenom ? `${teacher.prenom} ${teacher.nom}` : teacher.nom;
  const load = allSavoirs.filter((s) => (s.enseignantsSuggeres ?? []).includes(tid)).length;

  return {
    title: (
      <Tooltip title={`${fullName} (${load} savoirs)`}>
        <span>{String(fullName || "?").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}</span>
      </Tooltip>
    ),
    key: `t-${tid}`,
    width: 58,
    className: "ens-matrix-cell",
    render: (_: unknown, row: FlatSavoirRow) => {
      const checked = (row.enseignantsSuggeres ?? []).includes(tid);
      const sourceClass = getSourceClass(row, tid, allEnseignants);
      return (
        <div className={`ens-matrix-check ${sourceClass}`}>
          <Checkbox checked={checked} onChange={() => toggleCell(row, tid)} />
        </div>
      );
    },
  };
};

interface EnseignantMatrixViewProps {
  tree: TreeDomaine[];
  setTree: (tree: TreeDomaine[]) => void;
  allEnseignants: EnseignantRef[];
}

export default function EnseignantMatrixView({ tree, setTree, allEnseignants }: Readonly<EnseignantMatrixViewProps>) {
  const allSavoirs = useMemo(() => flatten(tree), [tree]);
  const [domainFilter, setDomainFilter] = useState<string[]>([]);
  const [onlyUncovered, setOnlyUncovered] = useState(false);
  const [onlyActiveTeachers, setOnlyActiveTeachers] = useState(false);
  const [page, setPage] = useState(1);

  const domaines = useMemo(() => [...new Set(allSavoirs.map((s) => s.domaineNom))], [allSavoirs]);

  const activeTeacherIds = useMemo(() => {
    const ids = new Set<string>();
    allSavoirs.forEach((s) => (s.enseignantsSuggeres ?? []).forEach((id) => ids.add(String(id))));
    return ids;
  }, [allSavoirs]);

  const teachers = useMemo(() => {
    const list = (allEnseignants ?? []).filter((e) => {
      const id = String(e.id ?? e.enseignantId);
      return !onlyActiveTeachers || activeTeacherIds.has(id);
    });
    return list.slice(0, 12);
  }, [allEnseignants, onlyActiveTeachers, activeTeacherIds]);

  const filteredRows = useMemo(() => {
    let rows = allSavoirs;
    if (domainFilter.length > 0) rows = rows.filter((r) => domainFilter.includes(r.domaineNom));
    if (onlyUncovered) rows = rows.filter((r) => (r.enseignantsSuggeres ?? []).length === 0);

    return [...rows].sort((a, b) => {
      const aUn = (a.enseignantsSuggeres ?? []).length === 0 ? 0 : 1;
      const bUn = (b.enseignantsSuggeres ?? []).length === 0 ? 0 : 1;
      if (aUn !== bUn) return aUn - bUn;
      return (a.domaineNom || "").localeCompare(b.domaineNom || "") || ((a.nom as string) || "").localeCompare((b.nom as string) || "");
    });
  }, [allSavoirs, domainFilter, onlyUncovered]);

  const pageSize = filteredRows.length > 50 ? 20 : filteredRows.length || 20;
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const toggleCell = (row: FlatSavoirRow, teacherId: string) => {
    const next = cloneDeep(tree) as TreeDomaine[];
    const s = getSavoirByRow(next, row);
    if (!s) return;
    const ids = new Set((s.enseignantsSuggeres ?? []).map(String));
    const key = String(teacherId);
    if (ids.has(key)) ids.delete(key);
    else ids.add(key);
    s.enseignantsSuggeres = Array.from(ids);
    setTree(next);
  };

  const columns: TableColumnsType<FlatSavoirRow> = [
    {
      title: "Savoir",
      dataIndex: "nom",
      key: "nom",
      width: 380,
      render: (_: unknown, row) => (
        <Space>
          <Tooltip title={row.nom as string}>
            <Text
              style={{
                display: "inline-block",
                maxWidth: 260,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.nom as string}
            </Text>
          </Tooltip>
          <Tag color={row.type === "PRATIQUE" ? "volcano" : "purple"}>{row.type as string}</Tag>
          <Tag>{row.niveau as string}</Tag>
        </Space>
      ),
    },
    ...teachers.map((t) => buildTeacherColumn(t, allSavoirs, allEnseignants, toggleCell)),
  ];

  return (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          mode="multiple"
          allowClear
          placeholder="Filtre domaine"
          style={{ minWidth: 220 }}
          value={domainFilter}
          onChange={setDomainFilter}
          options={domaines.map((d) => ({ value: d, label: d }))}
        />
        <span>Sans enseignant</span>
        <Switch checked={onlyUncovered} onChange={setOnlyUncovered} />
        <span>Enseignants actifs</span>
        <Switch checked={onlyActiveTeachers} onChange={setOnlyActiveTeachers} />
      </Space>

      <Table<FlatSavoirRow>
        className="ens-matrix-table"
        rowKey={(r) => `${r.di}-${r.ci}-${r.sci}-${r.si}`}
        columns={columns}
        dataSource={pageRows}
        size="small"
        pagination={false}
        rowClassName={rowClassName}
        scroll={{ x: "max-content" }}
      />

      {filteredRows.length > pageSize && (
        <div style={{ marginTop: 12, textAlign: "right" }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={filteredRows.length}
            onChange={setPage}
            size="small"
          />
        </div>
      )}
    </>
  );
}
