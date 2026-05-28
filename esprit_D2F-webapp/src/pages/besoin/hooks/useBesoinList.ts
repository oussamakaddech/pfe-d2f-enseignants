/* ─────────────────────────────────────────────────────────────────────────
 * useBesoinList — Extracted state + logic from BesoinList page.
 * ─────────────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from "react";
import { Form } from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import { writeExcel, exportDateLabel, isoDate } from "@/utils/helpers/excelExport";
import { useSendEmail } from "@/hooks/formation";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { ROLES } from "@/utils/constants/roles";
import { useBesoins, useModifyBesoin, useRemoveBesoin, useApproveBesoin } from "@/hooks/besoin/useBesoins";
import { useDepartements, useUps, useAllAccounts } from "@/hooks/formation/useFormations";

const PERIOD_OPTIONS = [
  { value: "P1",     label: "Période 1" },
  { value: "P2",     label: "Période 2" },
  { value: "P3",     label: "Période 3" },
  { value: "P4",     label: "Période 4" },
  { value: "SUMMER", label: "Session d'Été" },
  { value: "WINTER", label: "Session d'Hiver" },
  { value: "OTHER",  label: "Autre" },
];

export const INITIAL_FILTERS = {
  deptId:    null as string | null,
  upId:      null as string | null,
  type:      null as string | null,
  statut:    null as string | null,
  priorite:  null as string | null,
  dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
};

type Filters = typeof INITIAL_FILTERS;

export function useBesoinList() {
  const navigate = useNavigate();
  const { message: msgApi } = useAppNotification();

  const { data: besoinsData = [], isLoading: loading, refetch: refetchBesoins } = useBesoins();
  const { data: departements = [] } = useDepartements();
  const { data: ups           = [] } = useUps();
  const { data: accountsData  = [] } = useAllAccounts();

  const modifyMut   = useModifyBesoin();
  const removeMut   = useRemoveBesoin();
  const approveMut  = useApproveBesoin();
  const sendEmailMut = useSendEmail();

  const besoins = besoinsData;

  const types = useMemo(
    () => [...new Set(besoins.map((b) => b.typeBesoin).filter(Boolean))],
    [besoins],
  );

  const cupAccounts = useMemo(
    () => accountsData.filter((a) => String(a.role || "").toUpperCase() === ROLES.CUP.toUpperCase() && (a.email || a.emailAddress)),
    [accountsData],
  );

  // ── ui state ──
  const [searchText,  setSearchText]  = useState("");
  const [filters,     setFilters]     = useState<Filters>(INITIAL_FILTERS);
  const [viewMode,    setViewMode]    = useState("cards");
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(12);

  // ── modals ──
  const [editingRecord,  setEditingRecord]  = useState<Record<string, unknown> | null>(null);
  const [editModalOpen,  setEditModalOpen]  = useState(false);
  const [editForm] = Form.useForm();
  const [saving,         setSaving]         = useState(false);
  const [approvingId,    setApprovingId]    = useState<number | string | null>(null);

  const [mailModalOpen,  setMailModalOpen]  = useState(false);
  const [mailRecord,     setMailRecord]     = useState<Record<string, unknown> | null>(null);
  const [mailForm] = Form.useForm();
  const [mailSending,    setMailSending]    = useState(false);

  // ── helpers ──
  const getBesoinId = (r: Record<string, unknown>) =>
    r?.idBesoinFormation ?? r?.idBesionFormation ?? r?.id;

  const findById = <T extends { id?: string | number }>(items: T[], id: unknown): T | undefined =>
    items.find((item) => String(item.id) === String(id));

  const getLabel = (item: { libelle?: string; name?: string; label?: string; nom?: string } | undefined, fallback = "—") =>
    item?.libelle || item?.name || item?.label || item?.nom || fallback;

  const periodLabelOf = (r: Record<string, unknown>): string | null => {
    if (r.periodCode === "OTHER") return String(r.customPeriodLabel || "Autre");
    const opt = PERIOD_OPTIONS.find((o) => o.value === r.periodCode);
    return opt ? opt.label : String(r.periodeFormation || "") || null;
  };

  // ── filtering ──
  const filtered = useMemo(() => {
    let res = Array.isArray(besoins) ? [...besoins] : [];
    if (filters.deptId)  res = res.filter((b) => String(b.departement) === String(filters.deptId));
    if (filters.upId)    res = res.filter((b) => String(b.up) === String(filters.upId));
    if (filters.type)    res = res.filter((b) => b.typeBesoin === filters.type);
    if (filters.priorite)res = res.filter((b) => b.priorite === filters.priorite);
    if (filters.statut === "approuve")   res = res.filter((b) => b.approuveAdmin);
    if (filters.statut === "en_attente") res = res.filter((b) => !b.approuveAdmin);
    if (searchText) {
      const s = searchText.toLowerCase();
      res = res.filter(
        (b) => (b.titre || "").toLowerCase().includes(s) || (b.objectifFormation || "").toLowerCase().includes(s) || (b.username || "").toLowerCase().includes(s),
      );
    }
    if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
      const start = filters.dateRange[0].startOf("day");
      const end   = filters.dateRange[1].endOf("day");
      res = res.filter((b) => {
        const date = dayjs(b.dateCreation || b.horaireSouhaite);
        return date.isValid() && !date.isBefore(start) && !date.isAfter(end);
      });
    }
    return res;
  }, [besoins, filters, searchText]);

  useEffect(() => { setPage(1); }, [filters, searchText, viewMode]);

  const pagedCards = useMemo(() => {
    if (viewMode !== "cards") return filtered;
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize, viewMode]);

  const stats = useMemo(() => {
    const total    = besoins.length;
    const approved = besoins.filter((b) => b.approuveAdmin).length;
    return { total, approved, pending: total - approved };
  }, [besoins]);

  // ── actions ──
  const handleDelete = async (id: unknown) => {
    if (id == null) { msgApi.error("Identifiant du besoin introuvable"); return; }
    try {
      await removeMut.mutateAsync(id as any);
      msgApi.success("Besoin supprimé avec succès");
    } catch { msgApi.error("Erreur lors de la suppression"); }
  };

  const handleApprove = async (record: Record<string, unknown>) => {
    const id = getBesoinId(record);
    if (id == null) { msgApi.error("Identifiant du besoin introuvable"); return; }
    setApprovingId(id as string | number);
    try {
      await approveMut.mutateAsync(id as any);
      msgApi.success("Besoin approuvé — redirection vers la création de formation...");
      setTimeout(() => navigate("/home/Formation/Creer", { state: { besoinInfo: record } }), 800);
    } catch { msgApi.error("Erreur lors de l'approbation"); }
    finally { setApprovingId(null); }
  };

  const openEdit = (record: Record<string, unknown>) => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      idBesoinFormation:    getBesoinId(record),
      titre:                record.titre || "",
      objectifFormation:    record.objectifFormation || "",
      propositionAnimateur: record.propositionAnimateur || "",
      typeBesoin:           record.typeBesoin || undefined,
      priorite:             record.priorite || undefined,
      impactStrategique:    record.impactStrategique || "",
      up:                   record.up || undefined,
      departement:          record.departement || undefined,
      estOuverte:           record.estOuverte ?? false,
      autresInformations:   record.autresInformations || "",
      publicCible:          record.publicCible || "",
      theme:                record.theme || "",
      dureeFormation:       record.dureeFormation || undefined,
      objectifsPedagogiques: record.objectifsPedagogiques || "",
      methodesEvaluationAcquis: record.methodesEvaluationAcquis || "",
      periodeFormation:     record.periodeFormation || "",
      periodCode:           record.periodCode || "OTHER",
      customPeriodLabel:    record.customPeriodLabel || record.periodeFormation || "",
      horaireSouhaite:      record.horaireSouhaite ? dayjs(String(record.horaireSouhaite)) : null,
    });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields();
      setSaving(true);
      const payload = {
        idBesoinFormation: getBesoinId(editingRecord as Record<string, unknown>),
        ...values,
        horaireSouhaite: values.horaireSouhaite ? values.horaireSouhaite.format("YYYY-MM-DD HH:mm") : undefined,
      };
      await modifyMut.mutateAsync({ besoin: payload, commentaire: "Modification depuis l'interface" });
      msgApi.success("Besoin modifié avec succès");
      setEditModalOpen(false);
    } catch { msgApi.error("Erreur lors de la modification"); }
    finally { setSaving(false); }
  };

  const openMailModal = (record: Record<string, unknown>) => {
    setMailRecord(record);
    const upLabel   = getLabel(findById(ups as any, record.up as any) as any);
    const deptLabel = getLabel(findById(departements as any, record.departement as any) as any);
    const periodLabel = periodLabelOf(record) || "—";
    const subject = `Demande d'informations complémentaires — Besoin de formation "${record.titre || record.objectifFormation || "sans titre"}"`;
    const defaultTo = cupAccounts[0]?.email || cupAccounts[0]?.emailAddress || "";
    mailForm.setFieldsValue({ to: defaultTo, subject, upLabel, deptLabel, periodLabel, record });
    setMailModalOpen(true);
  };

  const handleSendMail = async (to: string, subject: string, content: string) => {
    try {
      setMailSending(true);
      const result = await sendEmailMut.mutateAsync({ to, subject, content });
      msgApi.success(result?.message || "E-mail envoyé au CUP avec succès");
      setMailModalOpen(false);
      mailForm.resetFields();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; response?: { data?: { error?: string; message?: string } }; message?: string };
      if (e?.errorFields) return;
      msgApi.error(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Échec de l'envoi de l'e-mail");
    } finally { setMailSending(false); }
  };

  const exportToExcel = () => {
    try {
      const rows = filtered.map((b) => ({
        "Titre / Objectif":  b.titre || b.objectifFormation || "—",
        "Demandeur":         b.username || "—",
        "Type":              b.typeBesoin || "—",
        "Thème":             b.theme || "—",
        "Priorité":          b.priorite || "—",
        "UP":                getLabel(findById(ups as any, b.up as any) as any),
        "Département":       getLabel(findById(departements as any, b.departement as any) as any),
        "Statut":            b.approuveAdmin ? "Approuvé" : "En attente",
        "Date Création":     b.dateCreation ? dayjs(b.dateCreation).format("DD/MM/YYYY") : "—",
        "Période":           periodLabelOf(b as any) || "—",
        "Horaire Souhaité":  b.horaireSouhaite ? dayjs(String(b.horaireSouhaite)).format("DD/MM/YYYY HH:mm") : "—",
      }));
      writeExcel(
        [{ name: "Besoins de Formation", rows, title: "Liste des Besoins de Formation — Esprit", subtitle: exportDateLabel() }],
        `Liste_Besoins_Formation_${isoDate()}.xlsx`,
      );
      msgApi.success("Export Excel réussi");
    } catch { msgApi.error("Erreur lors de l'exportation Excel"); }
  };

  return {
    besoins, filtered, pagedCards, loading, stats,
    departements, ups, cupAccounts, types,
    searchText, setSearchText,
    filters, setFilters,
    viewMode, setViewMode,
    page, setPage,
    pageSize, setPageSize,
    editingRecord, editModalOpen, setEditModalOpen, editForm, saving,
    approvingId,
    mailModalOpen, setMailModalOpen, mailRecord, mailForm, mailSending,
    getBesoinId, findById, getLabel, periodLabelOf,
    handleDelete, handleApprove,
    openEdit, handleEditSave,
    openMailModal, handleSendMail,
    exportToExcel,
    refetchBesoins,
    PERIOD_OPTIONS,
  };
}
