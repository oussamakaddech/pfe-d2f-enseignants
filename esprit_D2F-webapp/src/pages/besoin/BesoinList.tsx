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
  Pagination,
  Skeleton,
  Button,
  Tooltip,
  Popconfirm,
  Space,
  Typography,
} from "antd";
import moment from "moment";
import {
  FileTextOutlined,
  UserOutlined,
  MailOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  PlusOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { writeExcel, exportDateLabel, isoDate } from "../../utils/helpers/excelExport";
import { useSendEmail } from "@/hooks/formation";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { ROLES } from "@/utils/constants/roles";
import { useBesoins, useModifyBesoin, useRemoveBesoin, useApproveBesoin } from "@/hooks/besoin/useBesoins";
import { useDepartements, useUps, useAllAccounts } from "@/hooks/formation/useFormations";

import BesoinHeader from "./components/BesoinHeader";
import BesoinStatsRow from "./components/BesoinStatsRow";
import BesoinFiltersPanel from "./components/BesoinFiltersPanel";
import ViewModeToggle from "./components/ViewModeToggle";
import BesoinCard from "./components/BesoinCard";
import BesoinPriorityBadge from "./components/BesoinPriorityBadge";
import BesoinStatusBadge from "./components/BesoinStatusBadge";
import BesoinEditModal from "@/components/besoin/BesoinEditModal";
import BesoinMailModal from "@/components/besoin/BesoinMailModal";

import "@/styles/pages/besoin-tokens.css";
import "@/styles/pages/besoin-list.css";

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

  // ───── data via hooks ─────
  const { data: besoinsData = [], isLoading: loading, refetch: refetchBesoins } = useBesoins();
  const { data: departements = [] } = useDepartements();
  const { data: ups = [] } = useUps();
  const { data: accountsData = [] } = useAllAccounts();
  const modifyMut  = useModifyBesoin();
  const removeMut  = useRemoveBesoin();
  const approveMut = useApproveBesoin();
  const sendEmailMut = useSendEmail();

  const besoins = besoinsData;
  const types = useMemo(() => [...new Set(besoins.map((b) => b.typeBesoin).filter(Boolean))], [besoins]);
  const cupAccounts = useMemo(
    () => accountsData.filter((a) => String(a.role || "").toUpperCase() === ROLES.CUP.toUpperCase() && (a.email || a.emailAddress)),
    [accountsData]
  );

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
      await removeMut.mutateAsync(id);
      msgApi.success("Besoin supprimé avec succès");
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
      await approveMut.mutateAsync(id);
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
      await modifyMut.mutateAsync({ besoin: payload, commentaire: "Modification depuis l'interface" });
      msgApi.success("Besoin modifié avec succès");
      setEditModalOpen(false);
    } catch {
      msgApi.error("Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  const buildFormationNeedHtmlEmail = (record, upLabel, deptLabel, periodLabel) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1a202c;
      background: #f7fafc;
      padding: 20px;
    }
    .container {
      max-width: 720px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06);
    }
    .header {
      background: linear-gradient(135deg, #B51200 0%, #9a0f00 100%);
      color: white;
      padding: 35px 30px;
      text-align: center;
    }
    .header h1 { 
      font-size: 26px; 
      margin: 0; 
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    .header-icon { 
      font-size: 44px; 
      margin-bottom: 12px;
      display: block;
    }
    .content { 
      padding: 35px 30px; 
    }
    .intro {
      background: #fff0ee;
      border-left: 4px solid #B51200;
      padding: 15px 18px;
      margin-bottom: 28px;
      border-radius: 4px;
      color: #7a0000;
      line-height: 1.6;
      font-weight: 500;
      font-size: 14px;
    }
    .section-title {
      font-size: 13px;
      color: #1a202c;
      font-weight: 700;
      margin-top: 28px;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 18px;
      background: #B51200;
      margin-right: 10px;
      border-radius: 1px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }
    .info-item {
      background: #f7fafc;
      padding: 12px 14px;
      border-radius: 4px;
      border-left: 3px solid #B51200;
    }
    .info-label {
      font-weight: 700;
      color: #1a202c;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      color: #2d3748;
      margin-top: 4px;
      font-size: 14px;
      font-weight: 500;
    }
    .questions-section {
      background: #fff0ee;
      border-left: 3px solid #B51200;
      padding: 18px 16px;
      border-radius: 4px;
      margin-top: 18px;
    }
    .question-item {
      margin-bottom: 12px;
      padding: 8px 0;
      display: flex;
      align-items: flex-start;
    }
    .question-item:last-child {
      margin-bottom: 0;
    }
    .question-number {
      display: inline-flex;
      background: #B51200;
      color: white;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      margin-right: 12px;
      font-size: 12px;
      flex-shrink: 0;
    }
    .question-text {
      color: #1a202c;
      line-height: 1.5;
      font-size: 14px;
      font-weight: 500;
    }
    .cta-box {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 14px 16px;
      margin-top: 24px;
      border-radius: 4px;
      color: #065f46;
      font-weight: 500;
      font-size: 13px;
      line-height: 1.6;
    }
    .footer {
      background: #f7fafc;
      border-top: 1px solid #e2e8f0;
      padding: 18px 30px;
      text-align: center;
      font-size: 11px;
      color: #718096;
      line-height: 1.6;
    }
    .footer p { margin: 3px 0; }
    .logo { 
      color: #B51200; 
      font-weight: 700;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="header-icon">📋</span>
      <h1>Demande d'Informations Complémentaires</h1>
    </div>
    <div class="content">
      <div class="intro">
        Dans le cadre de l'instruction du besoin de formation ci-dessous, nous sollicitons votre éclairage en tant que CUP afin de compléter les informations manquantes avant approbation.
      </div>
      
      <div class="section-title">Récapitulatif du Besoin</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Titre</div>
          <div class="info-value">${record.titre || record.objectifFormation || "—"}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Demandeur</div>
          <div class="info-value">${record.username || "—"}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Type</div>
          <div class="info-value">${record.typeBesoin || "—"}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Priorité</div>
          <div class="info-value">${record.priorite || "—"}</div>
        </div>
        <div class="info-item">
          <div class="info-label">UP</div>
          <div class="info-value">${upLabel}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Département</div>
          <div class="info-value">${deptLabel}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Période</div>
          <div class="info-value">${periodLabel}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Objectif</div>
          <div class="info-value">${record.objectifFormation || "—"}</div>
        </div>
      </div>

      <div class="section-title">Vos Précisions Requises</div>
      <div class="questions-section">
        <div class="question-item">
          <span class="question-number">1</span>
          <span class="question-text">La pertinence stratégique de ce besoin pour votre UP</span>
        </div>
        <div class="question-item">
          <span class="question-number">2</span>
          <span class="question-text">Le profil et le nombre exact de participants attendus</span>
        </div>
        <div class="question-item">
          <span class="question-number">3</span>
          <span class="question-text">Toute contrainte de planning ou pré-requis spécifique</span>
        </div>
      </div>

      <div class="cta-box">
        ✅ Merci de nous transmettre ces informations complémentaires dès que possible pour accélérer le traitement de cette demande.
      </div>
    </div>
    <div class="footer">
      <p>Ceci est un e-mail automatique généré par le système D2F.</p>
      <p><span class="logo">ESPRIT</span> • Direction du Développement et de la Formation</p>
      <p>© 2026 • Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;
  };

  const openMailModal = (record) => {
    setMailRecord(record);
    const upLabel = getLabel(findById(ups, record.up));
    const deptLabel = getLabel(findById(departements, record.departement));
    const periodLabel = periodLabelOf(record) || "—";
    const subject = `Demande d'informations complémentaires — Besoin de formation "${record.titre || record.objectifFormation || "sans titre"}"`;
    const content = buildFormationNeedHtmlEmail(record, upLabel, deptLabel, periodLabel);
    const defaultTo = cupAccounts[0]?.email || cupAccounts[0]?.emailAddress || "";
    mailForm.setFieldsValue({ to: defaultTo, subject, content });
    setMailModalOpen(true);
  };

  const handleSendMail = async () => {
    try {
      const values = await mailForm.validateFields();
      setMailSending(true);
      const result = await sendEmailMut.mutateAsync({ to: values.to, subject: values.subject, content: values.content });
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
    } catch {
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
        <div className="bf-skeleton-grid" aria-hidden="true">
          {["sk0","sk1","sk2","sk3","sk4","sk5"].map((key) => (
            <div key={key} className="bf-skeleton-card">
              <div className="bf-sk-row">
                <div className="bf-sk-line bf-sk-line--w-30" />
                <div className="bf-sk-line bf-sk-line--w-30" style={{ marginLeft: "auto" }} />
              </div>
              <div className="bf-sk-line bf-sk-line--h-lg bf-sk-line--w-90" />
              <div className="bf-sk-line bf-sk-line--h-md bf-sk-line--w-70" />
              <div className="bf-sk-row">
                <div className="bf-sk-circle" />
                <div style={{ flex: 1 }}>
                  <div className="bf-sk-line bf-sk-line--w-50" />
                  <div className="bf-sk-line bf-sk-line--w-30" style={{ marginTop: 6 }} />
                </div>
              </div>
              <div className="bf-sk-row">
                <div className="bf-sk-line bf-sk-line--w-30" />
                <div className="bf-sk-line bf-sk-line--w-30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasActiveFilters =
    !!searchText ||
    !!filters.deptId ||
    !!filters.upId ||
    !!filters.type ||
    !!filters.statut ||
    !!filters.priorite ||
    !!(filters.dateRange?.[0] && filters.dateRange?.[1]);

  return (
    <div className="bf-scope bf-page">
      <div className="bf-hero">
        <BesoinHeader
          total={stats.total}
          filteredCount={filtered.length}
          loading={loading}
          exportDisabled={filtered.length === 0}
          onRefresh={() => refetchBesoins()}
          onExport={exportToExcel}
          onAdd={() => navigate("/home/besoins/ajouter")}
        />
      </div>

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
        <output className="bf-empty">
          <div className="bf-empty__illustration" aria-hidden="true">
            <InboxOutlined />
          </div>
          <h3 className="bf-empty__title">
            {hasActiveFilters ? "Aucun besoin ne correspond à vos critères" : "Aucun besoin enregistré"}
          </h3>
          <p className="bf-empty__subtitle">
            {hasActiveFilters
              ? "Essayez d'élargir vos filtres ou de réinitialiser la recherche pour voir l'ensemble des demandes."
              : "Commencez par enregistrer une première demande de formation pour la rendre visible aux unités pédagogiques."}
          </p>
          <div className="bf-empty__actions">
            {hasActiveFilters ? (
              <Button
                icon={<ClearOutlined />}
                onClick={() => {
                  setFilters(INITIAL_FILTERS);
                  setSearchText("");
                }}
                className="bf-btn bf-btn--ghost"
              >
                Réinitialiser les filtres
              </Button>
            ) : null}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/home/besoins/ajouter")}
              className="bf-btn bf-btn--primary"
            >
              Ajouter un besoin
            </Button>
          </div>
        </output>
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
              <Form.Item label="Domaine / Thème" name="@/components/common">
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
            {" "}Demander des informations au CUP
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




