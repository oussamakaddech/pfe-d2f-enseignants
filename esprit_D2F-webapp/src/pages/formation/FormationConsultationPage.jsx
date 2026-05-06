import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
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
  Breadcrumb,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  MailOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import moment from "moment";

import { AuthContext } from "../../context/AuthContext";
import { getProfile } from "../../services/accountService";
import FormationWorkflowService from "../../services/FormationWorkflowService";
import FormationWorkflowEditForm from "../FormationWorkflowEditForm";
import MailForm from "../MailForm";

const normalizeRole = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const PERIOD_OPTIONS = [
  { value: "P1", label: "Période 1" },
  { value: "P2", label: "Période 2" },
  { value: "P3", label: "Période 3" },
  { value: "P4", label: "Période 4" },
  { value: "SUMMER", label: "Session d'Été" },
  { value: "WINTER", label: "Session d'Hiver" },
  { value: "OTHER", label: "Autre" },
];

export default function FormationConsultationPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const canManageFormations = normalizeRole(user?.role) === "admin";
  const [formations, setFormations] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [filterText, setFilterText] = useState("");
  const [needFilter, setNeedFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState();
  const [etatFilter, setEtatFilter] = useState();
  const [upFilter, setUpFilter] = useState();
  const [deptFilter, setDeptFilter] = useState();
  const [periodRange, setPeriodRange] = useState([]);

  const [upsOptions, setUpsOptions] = useState([]);
  const [deptsOptions, setDeptsOptions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [msgApi, msgCtx] = message.useMessage();

  const [openEdit, setOpenEdit] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const [openMail, setOpenMail] = useState(false);

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
      let data;
      const role = normalizeRole(user?.role);
      
      if (role === "chefdepartement") {
        // We need the deptId. If not in user object, we might need to fetch profile
        // For now, let's assume we can get it from the user object or we fetch it
        let deptId = user?.deptId;
        if (!deptId) {
          const profile = await getProfile();
          deptId = profile.deptId || profile.departementId;
        }
        
        if (deptId) {
          data = await FormationWorkflowService.getFormationsParDepartement(deptId);
        } else {
          data = await FormationWorkflowService.getAllFormationWorkflows();
        }
      } else {
        data = await FormationWorkflowService.getAllFormationWorkflows();
      }
      
      const arr = Array.isArray(data) ? data : data ? [data] : [];
      setFormations(arr);

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
    if (!canManageFormations) return;

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
      title: "Période",
      key: "periode",
      render: (_, r) => {
        if (r.periodCode === "OTHER") return r.customPeriodLabel || "Autre";
        const opt = PERIOD_OPTIONS.find(o => o.value === r.periodCode);
        return opt ? opt.label : (r.periodeFormation || "_");
      },
      sorter: (a, b) =>
        (a.periodCode || "").localeCompare(b.periodCode || ""),
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
      render: (_, r) => {
        const role = normalizeRole(user?.role);
        const isResponsableDossier = role === "responsabledossier";
        
        return canManageFormations || isResponsableDossier ? (
          <Space>
            {(canManageFormations || isResponsableDossier) && (
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  setSelectedFormation(r);
                  setOpenEdit(true);
                }}
                title={isResponsableDossier ? "Gérer Dossier" : "Modifier"}
              />
            )}
            {canManageFormations && (
              <Popconfirm
                title="Supprimer ?"
                onConfirm={() => handleDelete(r.idFormation)}
              >
                <Button icon={<DeleteOutlined />} danger />
              </Popconfirm>
            )}
          </Space>
        ) : (
          <Tag color="blue">Consultation</Tag>
        );
      },
    },
  ];

  return (
    <>
      {msgCtx}
      <div style={{ padding: "16px 24px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <Breadcrumb
              items={[
                {
                  title: (
                    <>
                      <HomeOutlined /> Accueil
                    </>
                  ),
                  onClick: () => navigate("/home"),
                  style: { cursor: "pointer" },
                },
                {
                  title: "Formations",
                  onClick: () => navigate("/home/Formation"),
                  style: { cursor: "pointer" },
                },
                { title: "Consulter" },
              ]}
            />
            <Title level={4} style={{ marginTop: 8, marginBottom: 0 }}>
              📋 Consulter les Formations
            </Title>
          </div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/home/Formation")}
          >
            Retour
          </Button>
        </div>

        {/* Filters */}
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
          <Button icon={<DownloadOutlined />} onClick={() => setOpenExport(true)}>
            Exporter
          </Button>
          {canManageFormations && (
            <Button
              icon={<MailOutlined />}
              disabled={!selectedFormation}
              onClick={() => setOpenMail(true)}
            >
              Envoyer Email
            </Button>
          )}
        </Space>

        {/* Table */}
        <Table
          rowSelection={canManageFormations ? rowSelection : undefined}
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
              </div>
            ),
            rowExpandable: (record) => record.seances != null,
          }}
        />

        {/* Drawer E-mail */}
        {canManageFormations && (
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
        )}

        {canManageFormations && (
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
        )}

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