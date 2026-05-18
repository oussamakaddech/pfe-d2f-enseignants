/* ─────────────────────────────────────────────────────────────────────────
 * BesoinList — Page principale "Besoins de Formation"
 *
 * Responsabilité unique : orchestration, fetch, state global.
 * Le rendu visuel est délégué aux composants atomiques de ./components/.
 * ─────────────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from "react";
import {
  Row,
  Col,
  Modal,
  Form,
  Input,
  Select,
  Table,
  Tag,
  DatePicker,
  Empty,
  Pagination,
  Skeleton,
  Button,
  Tooltip,
  Popconfirm,
  Space,
  Typography,
  Avatar,
} from "antd";
import moment from "moment";
import {
  FileTextOutlined,
  UserOutlined,
  MailOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { writeExcel, exportDateLabel, isoDate } from "../../utils/excelExport";
import BesoinFormationService from "../../services/BesoinFormationService";
import DeptService from "../../services/DeptService";
import UpService from "../../services/upService";
import MailService from "../../services/MailService";
import { getAllAccounts } from "../../services/accountService";
import useAppNotification from "../../hooks/useAppNotification";

import BesoinHeader from "./components/BesoinHeader";
import BesoinStatsRow from "./components/BesoinStatsRow";
import BesoinFiltersPanel from "./components/BesoinFiltersPanel";
import ViewModeToggle from "./components/ViewModeToggle";
import BesoinCard from "./components/BesoinCard";
import BesoinPriorityBadge from "./components/BesoinPriorityBadge";
import BesoinStatusBadge from "./components/BesoinStatusBadge";

import "./besoin-tokens.css";
import "./BesoinList.css";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const PERIOD_OPTIONS = [
  { value: "P1",     label: "Période 1" },
  { value: "P2",     label: "Période 2" },
  { value: "P3",     label: "Période 3" },
  { value: "P4",     label: "Période 4" },
  { value: "SUMMER", label: "Session d'Été" },
  { value: "WINTER", label: "Session d'Hiver" },
  { value: "OTHER",  label: "Autre" },
];

const INITIAL_FILTERS = {
  deptId: null,
  upId: null,
  type: null,
  statut: null,
  priorite: null,
  dateRange: null,
};

export default function BesoinList() {
  const navigate = useNavigate();
  const { message: msgApi } = useAppNotification();

  // ───── data ─────
  const [besoins, setBesoins] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [ups, setUps] = useState([]);
  const [types, setTypes] = useState([]);
  const [cupAccounts, setCupAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  // ───── ui state ─────
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [viewMode, setViewMode] = useState("cards");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // ───── modals ─────
  const [editingRecord, setEditingRecord] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  const [mailModalOpen, setMailModalOpen] = useState(false);
  const [mailRecord, setMailRecord] = useState(null);
  const [mailForm] = Form.useForm();
  const [mailSending, setMailSending] = useState(false);

  // ═══════════════ helpers ═══════════════
  const getBesoinId = (r) => r?.idBesoinFormation ?? r?.idBesionFormation ?? r?.id;
  const findById = (items, id) => items.find((item) => String(item.id) === String(id));
  const getLabel = (item, fallback = "—") =>
    item?.libelle || item?.name || item?.label || item?.nom || fallback;
  const periodLabelOf = (r) => {
    if (r.periodCode === "OTHER") return r.customPeriodLabel || "Autre";
    const opt = PERIOD_OPTIONS.find((o) => o.value === r.periodCode);
    return opt ? opt.label : r.periodeFormation || null;
  };

  // ═══════════════ fetch ═══════════════
  const fetchData = async () => {
    setLoading(true);
    try {
      const [allBesoins, depts, upsData, accounts] = await Promise.all([
        BesoinFormationService.getAllBesoinFormations(),
        DeptService.getAllDepts(),
        UpService.getAllUps(),
        getAllAccounts().catch(() => []),
      ]);
      const besoinArray = Array.isArray(allBesoins) ? allBesoins : allBesoins?.content || [];
      setBesoins(besoinArray);
      setDepartements(depts);
      setUps(upsData);
      setTypes([...new Set(besoinArray.map((b) => b.typeBesoin).filter(Boolean))]);
      const cups = (Array.isArray(accounts) ? accounts : []).filter(
        (a) => String(a.role || "").toUpperCase() === "CUP" && (a.email || a.emailAddress)
      );
      setCupAccounts(cups);
    } catch {
      msgApi.error("Erreur lors du chargement des besoins");
      setBesoins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══════════════ filtering ═══════════════
  const filtered = useMemo(() => {
    let res = Array.isArray(besoins) ? [...besoins] : [];
    if (filters.deptId) res = res.filter((b) => String(b.departement) === String(filters.deptId));
    if (filters.upId)   res = res.filter((b) => String(b.up) === String(filters.upId));
    if (filters.type)   res = res.filter((b) => b.typeBesoin === filters.type);
    if (filters.priorite) res = res.filter((b) => b.priorite === filters.priorite);
    if (filters.statut === "approuve")   res = res.filter((b) => b.approuveAdmin);
    if (filters.statut === "en_attente") res = res.filter((b) => !b.approuveAdmin);
    if (searchText) {
      const s = searchText.toLowerCase();
      res = res.filter(
        (b) =>
          (b.titre || "").toLowerCase().includes(s) ||
          (b.objectifFormation || "").toLowerCase().includes(s) ||
          (b.username || "").toLowerCase().includes(s)
      );
    }
    if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
      const start = filters.dateRange[0].startOf("day");
      const end = filters.dateRange[1].endOf("day");
      res = res.filter((b) => {
        const date = moment(b.dateCreation || b.horaireSouhaite);
        return date.isValid() && date.isBetween(start, end, null, "[]");
      });
    }
    return res;
  }, [besoins, filters, searchText]);

  useEffect(() => {
    setPage(1);
  }, [filters, searchText, viewMode]);

  const pagedCards = useMemo(() => {
    if (viewMode !== "cards") return filtered;
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize, viewMode]);

  // ═══════════════ stats ═══════════════
  const stats = useMemo(() => {
    const total = besoins.length;
    const approved = besoins.filter((b) => b.approuveAdmin).length;
    return { total, approved, pending: total - approved };
  }, [besoins]);

  // ═══════════════ actions ═══════════════
  const handleDelete = async (id) => {
    if (id == null) {
      msgApi.error("Identifiant du besoin introuvable");
      return;
    }
    try {
      await BesoinFormationService.removeBesoinFormation(id);
      msgApi.success("Besoin supprimé avec succès");
      setBesoins((prev) => prev.filter((b) => getBesoinId(b) !== id));
    } catch {
      msgApi.error("Erreur lors de la suppression");
    }
  };

  const handleApprove = async (record) => {
    const id = getBesoinId(record);
    if (id == null) {
      msgApi.error("Identifiant du besoin introuvable");
      return;
    }
    setApprovingId(id);
    try {
      await BesoinFormationService.approveBesoin(id);
      msgApi.success("Besoin approuvé — redirection vers la création de formation...");
      setTimeout(() => navigate("/home/Formation/Creer", { state: { besoinInfo: record } }), 800);
    } catch {
      msgApi.error("Erreur lors de l'approbation");
    } finally {
      setApprovingId(null);
    }
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      idBesoinFormation: getBesoinId(record),
      titre: record.titre || "",
      objectifFormation: record.objectifFormation || "",
      propositionAnimateur: record.propositionAnimateur || "",
      typeBesoin: record.typeBesoin || undefined,
      priorite: record.priorite || undefined,
      impactStrategique: record.impactStrategique || "",
      up: record.up || undefined,
      departement: record.departement || undefined,
      estOuverte: record.estOuverte ?? false,
      autresInformations: record.autresInformations || "",
      publicCible: record.publicCible || "",
      theme: record.theme || "",
      dureeFormation: record.dureeFormation || undefined,
      objectifsPedagogiques: record.objectifsPedagogiques || "",
      methodesEvaluationAcquis: record.methodesEvaluationAcquis || "",
      periodeFormation: record.periodeFormation || "",
      periodCode: record.periodCode || "OTHER",
      customPeriodLabel: record.customPeriodLabel || record.periodeFormation || "",
      horaireSouhaite: record.horaireSouhaite ? moment(record.horaireSouhaite) : null,
    });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields();
      setSaving(true);
      const payload = {
        idBesoinFormation: getBesoinId(editingRecord),
        ...values,
        horaireSouhaite: values.horaireSouhaite ? values.horaireSouhaite.format("YYYY-MM-DD HH:mm") : undefined,
      };
      await BesoinFormationService.modifyBesoinFormation(payload, "Modification depuis l'interface");
      msgApi.success("Besoin modifié avec succès");
      setEditModalOpen(false);
      await fetchData();
    } catch {
      msgApi.error("Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  const openMailModal = (record) => {
    setMailRecord(record);
    const upLabel = getLabel(findById(ups, record.up));
    const deptLabel = getLabel(findById(departements, record.departement));
    const periodLabel = periodLabelOf(record) || "—";
    const subject = `Demande d'informations complémentaires — Besoin de formation "${record.titre || record.objectifFormation || "sans titre"}"`;
    const content =
      `Bonjour,\n\n` +
      `Dans le cadre de l'instruction du besoin de formation ci-dessous, ` +
      `nous sollicitons votre éclairage en tant que CUP afin de compléter les informations manquantes avant approbation.\n\n` +
      `— Récapitulatif du besoin —\n` +
      `• Titre : ${record.titre || "—"}\n` +
      `• Demandeur : ${record.username || "—"}\n` +
      `• Type : ${record.typeBesoin || "—"}\n` +
      `• Priorité : ${record.priorite || "—"}\n` +
      `• UP : ${upLabel}\n` +
      `• Département : ${deptLabel}\n` +
      `• Période : ${periodLabel}\n` +
      `• Objectif : ${record.objectifFormation || "—"}\n\n` +
      `Pourriez-vous nous préciser :\n` +
      `  1. La pertinence stratégique de ce besoin pour votre UP ;\n` +
      `  2. Le profil et le nombre exact de participants attendus ;\n` +
      `  3. Toute contrainte de planning ou pré-requis spécifique.\n\n` +
      `En vous remerciant par avance,\nL'équipe D2F`;
    const defaultTo = cupAccounts[0]?.email || cupAccounts[0]?.emailAddress || "";
    mailForm.setFieldsValue({ to: defaultTo, subject, content });
    setMailModalOpen(true);
  };

  const handleSendMail = async () => {
    try {
      const values = await mailForm.validateFields();
      setMailSending(true);
      const result = await MailService.sendEmail(values.to, values.subject, values.content);
      msgApi.success(result?.message || "E-mail envoyé au CUP avec succès");
      setMailModalOpen(false);
      mailForm.resetFields();
    } catch (err) {
      if (err?.errorFields) return;
      msgApi.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Échec de l'envoi de l'e-mail"
      );
    } finally {
      setMailSending(false);
    }
  };

  const exportToExcel = () => {
    try {
      const rows = filtered.map((b) => ({
        "Titre / Objectif":   b.titre || b.objectifFormation || "—",
        "Demandeur":          b.username || "—",
        "Type":               b.typeBesoin || "—",
        "Thème":              b.theme || "—",
        "Priorité":           b.priorite || "—",
        "UP":                 getLabel(findById(ups, b.up)),
        "Département":        getLabel(findById(departements, b.departement)),
        "Statut":             b.approuveAdmin ? "Approuvé" : "En attente",
        "Date Création":      b.dateCreation ? moment(b.dateCreation).format("DD/MM/YYYY") : "—",
        "Période":            periodLabelOf(b) || "—",
        "Horaire Souhaité":   b.horaireSouhaite ? moment(b.horaireSouhaite).format("DD/MM/YYYY HH:mm") : "—",
      }));
      writeExcel(
        [{ name: "Besoins de Formation", rows, title: "Liste des Besoins de Formation — Esprit", subtitle: exportDateLabel() }],
        `Liste_Besoins_Formation_${isoDate()}.xlsx`
      );
      msgApi.success("Export Excel réussi");
    } catch (e) {
      console.error("Export error:", e);
      msgApi.error("Erreur lors de l'exportation Excel");
    }
  };

  // ═══════════════ table columns (vue tableau) ═══════════════
  const tableColumns = [
    {
      title: "Formation",
      key: "formation",
      render: (_, r) => (
        <div>
          <div className="bf-table__title">{r.titre || r.objectifFormation || "—"}</div>
          {r.theme && <div className="bf-table__sub">{r.theme}</div>}
        </div>
      ),
      sorter: (a, b) => (a.titre || "").localeCompare(b.titre || ""),
    },
    { title: "Demandeur", dataIndex: "username", width: 140 },
    {
      title: "Type",
      dataIndex: "typeBesoin",
      width: 110,
      render: (t) => (t ? <Tag>{t}</Tag> : "—"),
    },
    {
      title: "Priorité",
      dataIndex: "priorite",
      width: 120,
      render: (p) => <BesoinPriorityBadge value={p} size="sm" />,
      sorter: (a, b) => {
        const order = { CRITIQUE: 4, HAUTE: 3, MOYENNE: 2, BASSE: 1 };
        return (order[a.priorite] || 0) - (order[b.priorite] || 0);
      },
    },
    {
      title: "Date",
      dataIndex: "dateCreation",
      width: 120,
      render: (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—"),
    },
    {
      title: "Statut",
      key: "statut",
      width: 130,
      render: (_, r) => <BesoinStatusBadge approved={!!r.approuveAdmin} />,
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, r) => {
        const id = getBesoinId(r);
        return (
          <Space size={4}>
            {!r.approuveAdmin && (
              <Popconfirm
                title="Approuver ce besoin ?"
                onConfirm={() => handleApprove(r)}
                okText="Oui"
                cancelText="Non"
              >
                <Tooltip title="Approuver">
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    loading={approvingId === id}
                    className="bf-btn bf-btn--success"
                  />
                </Tooltip>
              </Popconfirm>
            )}
            <Tooltip title="Email CUP">
              <Button size="small" icon={<MailOutlined />} onClick={() => openMailModal(r)} className="bf-iconbtn bf-iconbtn--mail" />
            </Tooltip>
            <Tooltip title="Modifier">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} className="bf-iconbtn" />
            </Tooltip>
            <Popconfirm
              title="Supprimer ?"
              onConfirm={() => handleDelete(id)}
              okText="Oui"
              cancelText="Non"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Supprimer">
                <Button danger size="small" icon={<DeleteOutlined />} className="bf-iconbtn bf-iconbtn--danger" />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // ═══════════════ render ═══════════════
  if (loading && besoins.length === 0) {
    return (
      <div className="bf-scope bf-page">
        <Skeleton active paragraph={{ rows: 3 }} className="bf-skeleton" />
        <Skeleton active paragraph={{ rows: 2 }} className="bf-skeleton" />
        <Skeleton active paragraph={{ rows: 8 }} className="bf-skeleton" />
      </div>
    );
  }

  return (
    <div className="bf-scope bf-page">
      <BesoinHeader
        total={stats.total}
        filteredCount={filtered.length}
        loading={loading}
        exportDisabled={filtered.length === 0}
        onRefresh={fetchData}
        onExport={exportToExcel}
        onAdd={() => navigate("/home/besoins/ajouter")}
      />

      <BesoinStatsRow
        total={stats.total}
        approved={stats.approved}
        pending={stats.pending}
      />

      <BesoinFiltersPanel
        searchText={searchText}
        filters={filters}
        types={types}
        ups={ups}
        departements={departements}
        onSearchChange={setSearchText}
        onFiltersChange={setFilters}
        onReset={() => {
          setFilters(INITIAL_FILTERS);
          setSearchText("");
        }}
      />

      <ViewModeToggle
        value={viewMode}
        onChange={setViewMode}
        count={filtered.length}
        total={stats.total}
      />

      {filtered.length === 0 && !loading && (
        <div className="bf-empty">
          <Empty description="Aucun besoin ne correspond à vos critères" />
        </div>
      )}

      {viewMode === "cards" && filtered.length > 0 && (
        <>
          <Row gutter={[16, 16]} className="bf-grid">
            {pagedCards.map((b) => {
              const id = getBesoinId(b);
              return (
                <Col xs={24} sm={12} lg={8} xxl={6} key={id}>
                  <BesoinCard
                    besoin={b}
                    upLabel={getLabel(findById(ups, b.up))}
                    deptLabel={getLabel(findById(departements, b.departement))}
                    periodLabel={periodLabelOf(b)}
                    approvingId={approvingId}
                    onApprove={handleApprove}
                    onOpenMail={openMailModal}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onOpen={() => openEdit(b)}
                  />
                </Col>
              );
            })}
          </Row>
          <div className="bf-pagination">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={filtered.length}
              onChange={(p, s) => { setPage(p); setPageSize(s); }}
              showSizeChanger
              pageSizeOptions={[8, 12, 16, 24, 48]}
              showTotal={(t, [a, b]) => `${a}-${b} sur ${t} besoins`}
            />
          </div>
        </>
      )}

      {viewMode === "table" && filtered.length > 0 && (
        <div className="bf-table-wrap">
          <Table
            dataSource={filtered}
            columns={tableColumns}
            rowKey={(r) => getBesoinId(r)}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 1100 }}
            size="middle"
            className="bf-table"
          />
        </div>
      )}

      {/* ═════════════════ EDIT MODAL ═════════════════ */}
      <Modal
        title="Modifier le besoin"
        open={editModalOpen}
        onOk={handleEditSave}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={saving}
        okText="Enregistrer"
        cancelText="Annuler"
        width={760}
        className="bf-modal"
        okButtonProps={{ className: "bf-btn bf-btn--primary" }}
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Nom de la formation" name="titre" rules={[{ required: true }]}>
                <Input size="large" prefix={<FileTextOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Type" name="typeBesoin" rules={[{ required: true }]}>
                <Select size="large" placeholder="Sélectionner le type">
                  <Option value="INDIVIDUEL">Individuel</Option>
                  <Option value="COLLECTIF">Collectif</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Domaine / Thème" name="theme">
                <Input size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Période" name="periodCode" rules={[{ required: true }]}>
                <Select size="large">
                  {PERIOD_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Form.Item noStyle shouldUpdate={(p, c) => p.periodCode !== c.periodCode}>
              {({ getFieldValue }) => getFieldValue("periodCode") === "OTHER" && (
                <Col xs={24}>
                  <Form.Item label="Précisez la période" name="customPeriodLabel" rules={[{ required: true }]}>
                    <Input size="large" />
                  </Form.Item>
                </Col>
              )}
            </Form.Item>
            <Col xs={24}>
              <Form.Item label="Objectif" name="objectifFormation" rules={[{ required: true }]}>
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Priorité" name="priorite" rules={[{ required: true }]}>
                <Select size="large">
                  <Option value="BASSE">Basse</Option>
                  <Option value="MOYENNE">Moyenne</Option>
                  <Option value="HAUTE">Haute</Option>
                  <Option value="CRITIQUE">Critique</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Impact Stratégique" name="impactStrategique">
                <Input size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="UP" name="up" rules={[{ required: true }]}>
                <Select size="large">
                  {ups.map((u) => <Option key={u.id} value={String(u.id)}>{u.name || u.libelle}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Département" name="departement" rules={[{ required: true }]}>
                <Select size="large">
                  {departements.map((d) => <Option key={d.id} value={String(d.id)}>{d.name || d.libelle}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Formateur proposé" name="propositionAnimateur">
                <Input size="large" prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Horaire souhaité" name="horaireSouhaite">
                <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Autres informations" name="autresInformations">
                <TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ═════════════════ MAIL CUP MODAL ═════════════════ */}
      <Modal
        title={
          <span className="bf-modal__title">
            <span className="bf-modal__title-icon"><MailOutlined /></span>
            Demander des informations au CUP
          </span>
        }
        open={mailModalOpen}
        onOk={handleSendMail}
        onCancel={() => setMailModalOpen(false)}
        confirmLoading={mailSending}
        okText="Envoyer l'e-mail"
        cancelText="Annuler"
        width={680}
        className="bf-modal bf-modal--mail"
        okButtonProps={{ className: "bf-btn bf-btn--primary", icon: <MailOutlined /> }}
      >
        {mailRecord && (
          <div className="bf-mail-context">
            <span className="bf-mail-context__icon"><FileTextOutlined /></span>
            <div>
              <div className="bf-mail-context__label">Besoin concerné</div>
              <div className="bf-mail-context__value">
                {mailRecord.titre || mailRecord.objectifFormation || "—"}
              </div>
            </div>
          </div>
        )}
        <Form form={mailForm} layout="vertical">
          <Form.Item
            label="Destinataire (CUP)"
            name="to"
            rules={[
              { required: true, message: "Veuillez saisir ou choisir un destinataire" },
              { type: "email", message: "Adresse e-mail invalide" },
            ]}
          >
            {cupAccounts.length > 0 ? (
              <Select
                showSearch
                placeholder="Sélectionner un CUP ou saisir une adresse"
                size="large"
                optionFilterProp="label"
                options={cupAccounts.map((c) => {
                  const mail = c.email || c.emailAddress;
                  const name = c.userName || c.username || mail;
                  return { value: mail, label: `${name} <${mail}>` };
                })}
              />
            ) : (
              <Input placeholder="cup@esprit.tn" size="large" prefix={<MailOutlined />} />
            )}
          </Form.Item>
          <Form.Item label="Sujet" name="subject" rules={[{ required: true }]}>
            <Input size="large" />
          </Form.Item>
          <Form.Item label="Contenu" name="content" rules={[{ required: true }]}>
            <TextArea rows={12} className="bf-mail-textarea" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
