// src/components/BesoinFormationApproval.jsx

import { useEffect, useState } from "react";
import { Table, Select, Button, Space, message, Typography } from "antd";
import BesoinFormationService from "../../services/BesoinFormationService";
import DeptService from "../../services/DeptService";
import UpService from "../../services/upService";

const { Option } = Select;
const { Title }  = Typography;

export default function BesoinFormationApproval() {
  const [msgApi, msgCtx] = message.useMessage();
  const [besoins, setBesoins]         = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [departements, setDepartements] = useState([]);
  const [ups, setUps]                 = useState([]);
  const [types, setTypes]             = useState([]);
  const [filters, setFilters]         = useState({ deptId: null, upId: null, type: null });
  const [loading, setLoading]         = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { applyFilters(); }, [besoins, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [approvedBesoins, depts, upsData] = await Promise.all([
        BesoinFormationService.getApprovedBesoinFormations(),
        DeptService.getAllDepts(),
        UpService.getAllUps(),
      ]);
      setBesoins(approvedBesoins);
      setFiltered(approvedBesoins);
      setDepartements(depts);
      setUps(upsData);
      setTypes([...new Set(approvedBesoins.map((b) => b.typeBesoin))]);
    } catch {
      msgApi.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let res = [...besoins];
    if (filters.deptId) res   = res.filter((b) => Number(b.departement) === filters.deptId);
    if (filters.upId)   res   = res.filter((b) => Number(b.up)         === filters.upId);
    if (filters.type)   res   = res.filter((b) => b.typeBesoin        === filters.type);
    setFiltered(res);
  };

  const handleApprove = async (id) => {
    setApprovingId(id);
    try {
      await BesoinFormationService.approveBesoin(id);
      msgApi.success("Besoin approuvé avec succès");
      setBesoins((prev) =>
        prev.map((b) =>
          b.idBesoinFormation === id ? { ...b, eventPublished: true } : b
        )
      );
      setFiltered((prev) =>
        prev.map((b) =>
          b.idBesoinFormation === id ? { ...b, eventPublished: true } : b
        )
      );
    } catch {
      msgApi.error("Erreur lors de l'approbation");
    } finally {
      setApprovingId(null);
    }
  };

  const columns = [

    {
      title: "Objectif",
      dataIndex: "objectifFormation",
      sorter: (a, b) => a.objectifFormation.localeCompare(b.objectifFormation),
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Type",
      dataIndex: "typeBesoin",
      width: 140,
      sorter: (a, b) => a.typeBesoin.localeCompare(b.typeBesoin),
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "UP",
      width: 160,
      render: (_, r) => {
        const upObj = ups.find((u) => u.id === Number(r.up));
        return upObj ? upObj.name : r.up;
      },
      sorter: (a, b) => {
        const nameA = ups.find((u) => u.id === Number(a.up))?.name || "";
        const nameB = ups.find((u) => u.id === Number(b.up))?.name || "";
        return nameA.localeCompare(nameB);
      },
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Département",
      width: 160,
      render: (_, r) => {
        const depObj = departements.find((d) => d.id === Number(r.departement));
        return depObj ? depObj.name : r.departement;
      },
      sorter: (a, b) => {
        const nameA = departements.find((d) => d.id === Number(a.departement))?.name || "";
        const nameB = departements.find((d) => d.id === Number(b.departement))?.name || "";
        return nameA.localeCompare(nameB);
      },
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Date création",
      dataIndex: "dateCreation",
      width: 160,
      render: (d) => new Date(d).toLocaleDateString(),
      sorter: (a, b) => new Date(a.dateCreation) - new Date(b.dateCreation),
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Action",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Button
          type={record.eventPublished ? "default" : "primary"}
          disabled={record.eventPublished}
          loading={approvingId === record.idBesoinFormation}
          onClick={() => handleApprove(record.idBesoinFormation)}
        >
          {record.eventPublished ? "Déjà créé" : "Créer formation"}
        </Button>
      ),
    },
  ];

  return (
    <>
      {msgCtx}

      <div style={{ padding: 16 }}>
        <Title level={4}>Besoins de Formation Approuvés</Title>

        <Space style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <Select
            allowClear
            placeholder="Filtrer par département"
            style={{ width: 200 }}
            onChange={(v) => setFilters((f) => ({ ...f, deptId: v }))}
          >
            {departements.map((d) => (
              <Option key={d.id} value={d.id}>{d.name}</Option>
            ))}
          </Select>

          <Select
            allowClear
            placeholder="Filtrer par UP"
            style={{ width: 200 }}
            onChange={(v) => setFilters((f) => ({ ...f, upId: v }))}
          >
            {ups.map((u) => (
              <Option key={u.id} value={u.id}>{u.name}</Option>
            ))}
          </Select>

          <Select
            allowClear
            placeholder="Filtrer par type"
            style={{ width: 200 }}
            onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
          >
            {types.map((t) => (
              <Option key={t} value={t}>{t}</Option>
            ))}
          </Select>

          <Button onClick={() => setFilters({ deptId: null, upId: null, type: null })}>
            Réinitialiser
          </Button>
        </Space>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="idBesoinFormation"
          loading={loading}
          pagination={{ pageSize: 10 }}
          style={{ cursor: "pointer" }}
        />
      </div>
    </>
  );
}
