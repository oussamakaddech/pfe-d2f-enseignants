// src/components/FormationTableAntd.jsx

import { useState, useEffect } from "react";
import {
  Table,
  Input,
  Button,
  Space,
  Drawer,
  DatePicker,
  Tag,
  Popconfirm,
  message,
  Typography,
  Select,
  Modal,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  MailOutlined,
} from "@ant-design/icons";
import moment from "moment";
import axios from "axios";

import FormationWorkflowService from "../services/FormationWorkflowService";
import FormationWorkflowForm from "./FormationWorkflowForm";
import FormationWorkflowEditForm from "./FormationWorkflowEditForm";
import MailForm from "./MailForm";

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export default function FormationTableAntd() {
  const [formations, setFormations] = useState([]);
  const [filtered, setFiltered] = useState([]);

  // filtres
  const [filterText, setFilterText] = useState("");
  const [needFilter, setNeedFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState();
  const [etatFilter, setEtatFilter] = useState();
  const [upFilter, setUpFilter] = useState();
  const [deptFilter, setDeptFilter] = useState();
  const [periodRange, setPeriodRange] = useState([]);

  // options UP / département
  const [upsOptions, setUpsOptions] = useState([]);
  const [deptsOptions, setDeptsOptions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [msgApi, msgCtx] = message.useMessage();

  // modals / drawers
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const [openMail, setOpenMail] = useState(false);

  // sélection d'une formation
  const [selectedFormation, setSelectedFormation] = useState(null);

  useEffect(() => {
    loadFormations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [
    formations,
    filterText,
    needFilter,
    typeFilter,
    etatFilter,
    upFilter,
    deptFilter,
    periodRange,
  ]);

  async function loadFormations() {
    setLoading(true);
    try {
      const data = await FormationWorkflowService.getAllFormationWorkflows();
      const arr = Array.isArray(data) ? data : data ? [data] : [];
      setFormations(arr);

      // UP & Département options
      const ups = Array.from(new Set(arr.map((f) => f.up1?.id))).map((id) => ({
        id,
        libelle: arr.find((f) => f.up1?.id === id)?.up1?.libelle || "_",
      }));
      const depts = Array.from(
        new Set(arr.map((f) => f.departement1?.id))
      ).map((id) => ({
        id,
        libelle:
          arr.find((f) => f.departement1?.id === id)?.departement1?.libelle ||
          "_",
      }));
      setUpsOptions(ups);
      setDeptsOptions(depts);

      msgApi.success("Formations chargées !");
    } catch (err) {
      console.error(err);
      msgApi.error("Erreur chargement");
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let res = [...formations];
    if (filterText) {
      res = res.filter((f) =>
        (f.titreFormation || "")
          .toLowerCase()
          .includes(filterText.toLowerCase())
      );
    }
    if (needFilter === "withNeed") {
      res = res.filter((f) => f.idBesoinFormation != null);
    } else if (needFilter === "withoutNeed") {
      res = res.filter((f) => f.idBesoinFormation == null);
    }
    if (typeFilter) res = res.filter((f) => f.typeBesoin === typeFilter);
    if (etatFilter) res = res.filter((f) => f.etatFormation === etatFilter);
    if (upFilter) res = res.filter((f) => f.up1?.id === upFilter);
    if (deptFilter) res = res.filter((f) => f.departement1?.id === deptFilter);
    if (periodRange.length === 2) {
      const [start, end] = periodRange;
      res = res.filter((f) => {
        const debut = moment(f.dateDebut),
          fin = moment(f.dateFin);
        return (
          debut.isSameOrAfter(start, "day") &&
          fin.isSameOrBefore(end, "day")
        );
      });
    }
    setFiltered(res);
  }

  async function handleDelete(id) {
    try {
      await FormationWorkflowService.deleteFormationWorkflow(id);
      msgApi.success("Formation supprimée");
      loadFormations();
    } catch {
      msgApi.error("Erreur suppression");
    }
  }

 async function handleExport() {
  if (periodRange.length !== 2) {
    msgApi.error("Veuillez spécifier début et fin.");
    return;
  }
  
  const [start, end] = periodRange.map((d) => d.format("YYYY-MM-DD"));
  
  try {
    const response = await FormationWorkflowService.exportFormations(start, end);
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formations_${start}_${end}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    msgApi.success("✔️ Export réussi !");
    setOpenExport(false);
  } catch (error) {
    console.error("Erreur export Excel :", error);
    const apiMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;
    msgApi.error(`❌ Erreur export : ${apiMsg}`);
  }
}
  // configuration de la sélection de ligne
  const rowSelection = {
    type: "radio",
    selectedRowKeys: selectedFormation ? [selectedFormation.idFormation] : [],
    onChange: (_, selectedRows) => {
      setSelectedFormation(selectedRows[0] || null);
    },
  };

  const statusColors = {
    VISIBLE: "cyan",
    ACHEVE: "green",
    NOUVEAU: "orange",
    ENREGISTRE: "blue",
    ANNULE: "red",
  };

  const columns = [
    {
      title: "Titre",
      dataIndex: "titreFormation",
      key: "titreFormation",
      render: (t) => t || "_",
      sorter: (a, b) =>
        (a.titreFormation || "").localeCompare(b.titreFormation || ""),
    },
    {
      title: "Type Formation",
      dataIndex: "typeFormation",
      key: "typeFormation",
      render: (t) => t || "_",
      sorter: (a, b) =>
        (a.typeFormation || "").localeCompare(b.typeFormation || ""),
    },
    {
      title: "Origine",
      key: "origine",
      render: (_, r) => (r.idBesoinFormation != null ? r.typeBesoin : "_"),
      filters: [
        { text: "Tous", value: "all" },
        { text: "Avec besoin", value: "withNeed" },
        { text: "Sans besoin", value: "withoutNeed" },
      ],
      onFilter: (val, rec) =>
        val === "withNeed"
          ? rec.idBesoinFormation != null
          : val === "withoutNeed"
          ? rec.idBesoinFormation == null
          : true,
    },
    {
      title: "UP",
      dataIndex: ["up1", "libelle"],
      key: "up1",
      render: (u) => u || "_",
      sorter: (a, b) =>
        (a.up1?.libelle || "").localeCompare(b.up1?.libelle || ""),
    },
    {
      title: "Département",
      dataIndex: ["departement1", "libelle"],
      key: "departement1",
      render: (d) => d || "_",
      sorter: (a, b) =>
        (a.departement1?.libelle || "").localeCompare(
          b.departement1?.libelle || ""
        ),
    },
    {
      title: "Début",
      dataIndex: "dateDebut",
      key: "dateDebut",
      render: (d) => (d ? moment(d).format("L") : "_"),
      sorter: (a, b) => moment(a.dateDebut) - moment(b.dateDebut),
    },
    {
      title: "Fin",
      dataIndex: "dateFin",
      key: "dateFin",
      render: (d) => (d ? moment(d).format("L") : "_"),
      sorter: (a, b) => moment(a.dateFin) - moment(b.dateFin),
    },
    {
      title: "État",
      dataIndex: "etatFormation",
      key: "etatFormation",
      render: (e) => <Tag color={statusColors[e] || "default"}>{e || "_"}</Tag>,
      sorter: (a, b) =>
        (a.etatFormation || "").localeCompare(b.etatFormation || ""),
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      render: (_, r) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedFormation(r);
              setOpenEdit(true);
            }}
          />
          <Popconfirm
            title="Supprimer ?"
            onConfirm={() => handleDelete(r.idFormation)}
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {msgCtx}
      <div style={{ padding: 16 }}>
        <Title level={4}>Liste des Formations</Title>

        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Filtrer par titre"
            allowClear
            onSearch={setFilterText}
            style={{ width: 240 }}
          />
          <Select value={needFilter} onChange={setNeedFilter} style={{ width: 160 }}>
            <Option value="all">Tous</Option>
            <Option value="withNeed">Avec besoin</Option>
            <Option value="withoutNeed">Sans besoin</Option>
          </Select>
          <Select
            placeholder="Type Besoin"
            allowClear
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 160 }}
          >
            <Option value="INDIVIDUEL">Individuel</Option>
            <Option value="COLLECTIF">Collectif</Option>
          </Select>
          <Select
            placeholder="État"
            allowClear
            value={etatFilter}
            onChange={setEtatFilter}
            style={{ width: 160 }}
          >
            <Option value="ACHEVE">ACHEVE</Option>
            <Option value="ENREGISTRE">ENREGISTRÉ</Option>
            <Option value="ANNULE">ANNULÉ</Option>
          </Select>
          <Select
            placeholder="UP"
            allowClear
            value={upFilter}
            onChange={setUpFilter}
            style={{ width: 200 }}
          >
            {upsOptions.map((u) => (
              <Option key={u.id} value={u.id}>
                {u.libelle}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="Département"
            allowClear
            value={deptFilter}
            onChange={setDeptFilter}
            style={{ width: 200 }}
          >
            {deptsOptions.map((d) => (
              <Option key={d.id} value={d.id}>
                {d.libelle}
              </Option>
            ))}
          </Select>
          <RangePicker onChange={setPeriodRange} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpenAdd(true)}>
            Ajouter
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => setOpenExport(true)}>
            Exporter
          </Button>
          <Button
            icon={<MailOutlined />}
            disabled={!selectedFormation}
            onClick={() => setOpenMail(true)}
          >
            Envoyer Email
          </Button>
        </Space>

        <Table
          rowSelection={rowSelection}
          dataSource={filtered}
          columns={columns}
          rowKey="idFormation"
          loading={loading}
          pagination={{ pageSize: 8 }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: 16 }}>
                <Title level={5}>Séances</Title>
                {(record.seances || []).map((s) => (
                  <Tag key={s.idSeance}>
                    {moment(s.dateSeance).format("L")} {s.heureDebut}–{s.heureFin}
                  </Tag>
                ))}
                <Button style={{ marginLeft: 16 }}>+ Séance</Button>
              </div>
            ),
            rowExpandable: (record) => record.seances != null,
          }}
        />

        {/* Drawer E-mail */}
        <Drawer
          title="Envoyer un e-mail"
          placement="right"
          width={720}
          onClose={() => setOpenMail(false)}
          open={openMail}
        >
          {selectedFormation && (
            <MailForm
              formation={selectedFormation}
              onSendSuccess={() => {
                msgApi.success("E-mail envoyé !");
                setOpenMail(false);
              }}
            />
          )}
        </Drawer>

        {/* Drawer Ajouter */}
        <Drawer
          title="Ajouter Formation"
          placement="right"
          width={720}
          onClose={() => setOpenAdd(false)}
          open={openAdd}
        >
          <FormationWorkflowForm
            onFormationCreated={() => {
              setOpenAdd(false);
              loadFormations();
            }}
          />
        </Drawer>

        {/* Drawer Modifier */}
        <Drawer
          title="Modifier Formation"
          placement="right"
          width={720}
          onClose={() => setOpenEdit(false)}
          open={openEdit}
        >
          {selectedFormation && (
            <FormationWorkflowEditForm
              formation={selectedFormation}
              onFormationUpdated={() => {
                setOpenEdit(false);
                loadFormations();
              }}
            />
          )}
        </Drawer>

        {/* Modal Export */}
        <Modal
          title="Exporter en Excel"
          open={openExport}
          onOk={handleExport}
          onCancel={() => setOpenExport(false)}
          okText="Exporter"
          cancelText="Annuler"
        >
          <RangePicker
            style={{ width: "100%", marginTop: 8 }}
            onChange={(dates) => setPeriodRange(dates || [])}
          />
        </Modal>
      </div>
    </>
  );
}
