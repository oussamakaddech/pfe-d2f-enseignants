import { useMemo, useState } from "react";
import {
  Checkbox, Pagination, Select, Space, Switch, Table, Tag, Tooltip, Typography,
} from "antd";
import { cloneDeep, matchSuggestedEnseignants } from "./constants";


const { Text } = Typography;

const addSousCompRows = (rows, di, ci, sc, sci, domaineNom) => {
  (sc.savoirs ?? []).forEach((s, si) => {
    rows.push({ di, ci, sci, si, domaineNom, ...s });
  });
};

const flatten = (tree) => {
  const rows = [];
  (tree ?? []).forEach((d, di) => {
    (d.competences ?? []).forEach((c, ci) => {
      (c.savoirs ?? []).forEach((s, si) => {
        rows.push({ di, ci, sci: -1, si, domaineNom: d.nom, ...s });
      });
      (c.sousCompetences ?? []).forEach((sc, sci) => {
        addSousCompRows(rows, di, ci, sc, sci, d.nom);
      });
    });
  });
  return rows;
};

const getSavoirByRow = (next, row) => (
  row.sci === -1
    ? next?.[row.di]?.competences?.[row.ci]?.savoirs?.[row.si]
    : next?.[row.di]?.competences?.[row.ci]?.sousCompetences?.[row.sci]?.savoirs?.[row.si]
);

const rowClassName = (row) => {
  const n = (row.enseignantsSuggeres ?? []).length;
  if (n === 0) return "ens-matrix-row-uncovered";
  if (n > 3) return "ens-matrix-row-over";
  return "";
};

const getSourceClass = (row, tid, allEnseignants) => {
  const checked = (row.enseignantsSuggeres ?? []).includes(tid);
  if (!checked) return "";
  const { suggested } = matchSuggestedEnseignants(row, allEnseignants);
  const source = suggested.find((s) => String(s.id ?? s.enseignantId) === tid)?.source ?? "manual";
  if (source === "ai") return "source-ai";
  if (source === "module_match") return "source-module";
  return "source-manual";
};

const buildTeacherColumn = (teacher, allSavoirs, allEnseignants, toggleCell) => {
  const tid = String(teacher.id ?? teacher.enseignantId);
  const fullName = teacher.prenom ? `${teacher.prenom} ${teacher.nom}` : teacher.nom;
  const load = allSavoirs.filter((s) => (s.enseignantsSuggeres ?? []).includes(tid)).length;

  return {
    title: (
      <Tooltip title={`${fullName} (${load} savoirs)`}>
        <span>{(fullName || "?").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}</span>
      </Tooltip>
    ),
    key: `t-${tid}`,
    width: 58,
    className: "ens-matrix-cell",
    render: (_, row) => {
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
  tree: Record<string, unknown>[];
  setTree: (tree: Record<string, unknown>[]) => void;
  allEnseignants: Record<string, unknown>[];
}

export default function EnseignantMatrixView({ tree, setTree, allEnseignants }: Readonly<EnseignantMatrixViewProps>) {
  const allSavoirs = useMemo(() => flatten(tree), [tree]);
  const [domainFilter, setDomainFilter] = useState([]);
  const [onlyUncovered, setOnlyUncovered] = useState(false);
  const [onlyActiveTeachers, setOnlyActiveTeachers] = useState(false);
  const [page, setPage] = useState(1);

  const domaines = useMemo(() => [...new Set(allSavoirs.map((s) => s.domaineNom))], [allSavoirs]);

  const activeTeacherIds = useMemo(() => {
    const ids = new Set();
    allSavoirs.forEach((s) => (s.enseignantsSuggeres ?? []).forEach((id) => ids.add(String(id))));
    return ids;
  }, [allSavoirs]);

  const teachers = useMemo(() => {
    const list = (allEnseignants ?? []).filter((e) => {
      const id = String(e.id ?? e.enseignantId);
      return !onlyActiveTeachers || activeTeacherIds.has(id);
    });
    return list.slice(0, 12); // matrix readable cap
  }, [allEnseignants, onlyActiveTeachers, activeTeacherIds]);

  const filteredRows = useMemo(() => {
    let rows = allSavoirs;
    if (domainFilter.length > 0) rows = rows.filter((r) => domainFilter.includes(r.domaineNom));
    if (onlyUncovered) rows = rows.filter((r) => (r.enseignantsSuggeres ?? []).length === 0);

    return [...rows].sort((a, b) => {
      const aUn = (a.enseignantsSuggeres ?? []).length === 0 ? 0 : 1;
      const bUn = (b.enseignantsSuggeres ?? []).length === 0 ? 0 : 1;
      if (aUn !== bUn) return aUn - bUn;
      return (a.domaineNom || "").localeCompare(b.domaineNom || "") || (a.nom || "").localeCompare(b.nom || "");
    });
  }, [allSavoirs, domainFilter, onlyUncovered]);

  const pageSize = filteredRows.length > 50 ? 20 : filteredRows.length || 20;
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const toggleCell = (row, teacherId) => {
    const next = cloneDeep(tree);
    const s = getSavoirByRow(next, row);
    if (!s) return;
    const ids = new Set((s.enseignantsSuggeres ?? []).map(String));
    const key = String(teacherId);
    if (ids.has(key)) ids.delete(key);
    else ids.add(key);
    s.enseignantsSuggeres = Array.from(ids);
    setTree(next);
  };

  const columns = [
    {
      title: "Savoir",
      dataIndex: "nom",
      key: "nom",
      width: 380,
      render: (_, row) => (
        <Space>
          <Text style={{ maxWidth: 260 }} ellipsis={{ tooltip: row.nom }}>{row.nom}</Text>
          <Tag color={row.type === "PRATIQUE" ? "volcano" : "purple"}>{row.type}</Tag>
          <Tag>{row.niveau}</Tag>
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

      <Table
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







