import { useMemo, useState } from "react";
import {
  Checkbox, Pagination, Select, Space, Switch, Table, Tag, Tooltip, Typography,
} from "antd";
import PropTypes from "prop-types";
import { cloneDeep, matchSuggestedEnseignants } from "./constants.jsx";

const { Text } = Typography;

const flatten = (tree) => {
  const rows = [];
  (tree ?? []).forEach((d, di) => {
    (d.competences ?? []).forEach((c, ci) => {
      (c.savoirs ?? []).forEach((s, si) => {
        rows.push({ di, ci, sci: -1, si, domaineNom: d.nom, ...s });
      });
      (c.sousCompetences ?? []).forEach((sc, sci) => {
        (sc.savoirs ?? []).forEach((s, si) => {
          rows.push({ di, ci, sci, si, domaineNom: d.nom, ...s });
        });
      });
    });
  });
  return rows;
};

export default function EnseignantMatrixView({ tree, setTree, allEnseignants }) {
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
    const s = row.sci === -1
      ? next?.[row.di]?.competences?.[row.ci]?.savoirs?.[row.si]
      : next?.[row.di]?.competences?.[row.ci]?.sousCompetences?.[row.sci]?.savoirs?.[row.si];
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
    ...teachers.map((t) => {
      const tid = String(t.id ?? t.enseignantId);
      const fullName = t.prenom ? `${t.prenom} ${t.nom}` : t.nom;
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
          let sourceClass = "";
          if (checked) {
            const { suggested } = matchSuggestedEnseignants(row, allEnseignants);
            const source = suggested.find((s) => String(s.id ?? s.enseignantId) === tid)?.source ?? "manual";
            if (source === "ai") sourceClass = "source-ai";
            else if (source === "module_match") sourceClass = "source-module";
            else sourceClass = "source-manual";
          }
          return (
            <div className={`ens-matrix-check ${sourceClass}`}>
              <Checkbox checked={checked} onChange={() => toggleCell(row, tid)} />
            </div>
          );
        },
      };
    }),
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
        rowClassName={(row) => {
          const n = (row.enseignantsSuggeres ?? []).length;
          if (n === 0) return "ens-matrix-row-uncovered";
          if (n > 3) return "ens-matrix-row-over";
          return "";
        }}
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

EnseignantMatrixView.propTypes = {
  tree: PropTypes.array.isRequired,
  setTree: PropTypes.func.isRequired,
  allEnseignants: PropTypes.array.isRequired,
};
