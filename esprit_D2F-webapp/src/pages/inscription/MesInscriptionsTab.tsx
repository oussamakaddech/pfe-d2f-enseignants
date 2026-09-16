import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Button, Space, Alert, Popconfirm, Tooltip, Timeline } from "antd";
import {
  BookOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  CalendarOutlined, FieldTimeOutlined, SendOutlined, StopOutlined,
  FileExcelOutlined, ReloadOutlined, BellOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { AppPageHeader, InscriptionStatGrid, PageLoader, EmptyStateStandard } from "@/components/common";
import { useProfile, useMyInscriptions, useAnnulerInscription } from "@/hooks/formation/useFormationExtras";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import useAppNotification from "@/hooks/ui/useAppNotification";
import type { Id } from "@/models/common";
import type { SegmentedValue } from "antd/es/segmented";
import Segmented from "antd/es/segmented";

type Etat = "APPROVED" | "PENDING" | "REJECTED";

interface Row {
  id?: Id;
  formationId?: string;
  titreFormation?: string;
  dateDebut?: string;
  dateFin?: string;
  chargeHoraire?: string;
  competencesCiblees?: string[];
  etat?: string;
  dateDemande?: string;
  dateTraitement?: string;
  motif?: string;
}

const ETAT_META: Record<Etat, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  APPROVED: { color: "#15803d", bg: "#dcfce7", label: "Approuvée", icon: <CheckCircleOutlined /> },
  PENDING: { color: "#b45309", bg: "#fef3c7", label: "En attente", icon: <ClockCircleOutlined /> },
  REJECTED: { color: "#b51200", bg: "#fee2e2", label: "Rejetée", icon: <CloseCircleOutlined /> },
};

const fmt = (d?: string) => { if (!d) { return "—"; } const date = dayjs(d); return date.isValid() ? date.format("DD/MM/YYYY") : "—"; };
const fmtDT = (d?: string) => { if (!d) { return "—"; } const date = dayjs(d); return date.isValid() ? date.format("DD/MM/YYYY HH:mm") : "—"; };
const MAX_COMP = 4;
const LAST_VISIT_KEY = "mesInscriptions.lastVisit";

export default function MesInscriptionsTab() {
  const navigate = useNavigate();
  const { message: msgApi } = useAppNotification();
  const { data: profile } = useProfile();
  const identifier = profile?.emailAddress || profile?.email || profile?.id;
  const { data: raw, isLoading, error, refetch } = useMyInscriptions();
  const annulerMut = useAnnulerInscription();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const notifiedRef = useRef<Set<string>>(new Set());

  const rows = useMemo(() => (Array.isArray(raw) ? (raw as Row[]) : []), [raw]);

  useEffect(() => {
    if (isLoading || !rows.length) return;
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    if (!lastVisit) { localStorage.setItem(LAST_VISIT_KEY, dayjs().toISOString()); return; }
    const last = dayjs(lastVisit);
    const fresh = rows.filter((r) => {
      if (!r.dateTraitement || notifiedRef.current.has(String(r.id ?? r.formationId))) return false;
      return dayjs(r.dateTraitement).isAfter(last);
    });
    if (fresh.length) {
      msgApi.open({
        type: "info", icon: <BellOutlined style={{ color: "#b51200" }} />,
        content: `${fresh.length} demande${fresh.length > 1 ? "s" : ""} mise${fresh.length > 1 ? "s" : ""} à jour.`,
        duration: 5,
      });
      fresh.forEach((r) => notifiedRef.current.add(String(r.id ?? r.formationId)));
    }
    localStorage.setItem(LAST_VISIT_KEY, dayjs().toISOString());
  }, [rows, isLoading, msgApi]);

  const stats = useMemo(() => ({
    total: rows.length,
    approved: rows.filter((r) => r.etat === "APPROVED").length,
    pending: rows.filter((r) => r.etat === "PENDING").length,
    rejected: rows.filter((r) => r.etat === "REJECTED").length,
  }), [rows]);

  const displayed = useMemo(() => statusFilter === "ALL" ? rows : rows.filter((r) => r.etat === statusFilter), [rows, statusFilter]);

  const handleAnnuler = async (r: Row) => {
    const target = r.id ?? r.formationId;
    if (target == null || !identifier) return;
    try {
      await annulerMut.mutateAsync({ id: target, enseignantId: identifier });
      msgApi.success("Demande annulée.");
      void refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      msgApi.error(e?.response?.data?.message || "Échec de l'annulation.");
    }
  };

  const exportExcel = () => {
    writeExcel([{
      name: "Mes inscriptions",
      rows: displayed.map((r) => ({
        Formation: r.titreFormation || `#${r.formationId}`,
        "Date début": fmt(r.dateDebut), "Date fin": fmt(r.dateFin),
        État: ETAT_META[(r.etat as Etat)]?.label ?? r.etat ?? "—",
        "Date demande": fmtDT(r.dateDemande), "Motif": r.motif || "—",
      })),
      title: "Mes inscriptions", subtitle: exportDateLabel(),
    }], `mes_inscriptions_${isoDate()}.xlsx`);
  };

  if (isLoading) return <PageLoader tip="Chargement de vos inscriptions..." minHeight={240} />;

  if (!rows.length) {
    return (
      <EmptyStateStandard
        title="Aucune demande"
        description="Vous n'avez pas encore soumis de demande d'inscription."
        actionLabel="Consulter le catalogue"
        actionIcon={<SendOutlined />}
        onAction={() => navigate("/home/Inscriptions?tab=catalogue")}
      />
    );
  }

  return (
    <div className="mis-page">
      <AppPageHeader
        icon={<BookOutlined />}
        title="Mes Inscriptions"
        subtitle="Suivez le statut de vos demandes."
        actions={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()} className="ins-btn">Actualiser</Button>
            <Button icon={<FileExcelOutlined />} onClick={exportExcel} disabled={!displayed.length} className="ins-btn ins-btn--green">Exporter</Button>
            <Button type="primary" icon={<SendOutlined />} onClick={() => navigate("/home/Inscriptions?tab=catalogue")} className="ins-btn">S'inscrire</Button>
          </Space>
        }
      />

      {error && <Alert type="error" showIcon className="ins-alert" message="Erreur de chargement" description={(error as { message?: string })?.message || "Impossible de récupérer vos inscriptions."} />}

      <InscriptionStatGrid stats={[
        { icon: <BookOutlined />, label: "Total", value: stats.total, tone: "brand" },
        { icon: <CheckCircleOutlined />, label: "Approuvées", value: stats.approved, tone: "success" },
        { icon: <ClockCircleOutlined />, label: "En attente", value: stats.pending, tone: "warning" },
        { icon: <CloseCircleOutlined />, label: "Rejetées", value: stats.rejected, tone: "danger" },
      ]} />

      <div className="ins-card">
        <div className="ins-card-toolbar">
          <Segmented
            value={statusFilter}
            onChange={(v: SegmentedValue) => setStatusFilter(String(v))}
            options={[
              { label: `Toutes (${stats.total})`, value: "ALL" },
              { label: `En attente (${stats.pending})`, value: "PENDING" },
              { label: `Approuvées (${stats.approved})`, value: "APPROVED" },
              { label: `Rejetées (${stats.rejected})`, value: "REJECTED" },
            ]}
          />
        </div>

        <div className="mis-list">
          {displayed.map((r) => {
            const meta = ETAT_META[(r.etat as Etat)] ?? ETAT_META.PENDING;
            const comps = Array.isArray(r.competencesCiblees) ? r.competencesCiblees : [];
            const vis = comps.slice(0, MAX_COMP);
            const hidden = comps.length - MAX_COMP;

            return (
              <div key={String(r.formationId)} className="mis-row" style={{ borderLeftColor: meta.color }}>
                <div className="mis-row-body">
                  <button
                    type="button"
                    className="mis-row-title"
                    onClick={() => navigate(`/home/ListeFormation/${r.formationId}`)}
                  >
                    {r.titreFormation || `Formation #${r.formationId}`}
                  </button>
                  <div className="mis-row-meta">
                    <span><CalendarOutlined /> {fmt(r.dateDebut)} → {fmt(r.dateFin)}</span>
                    {r.chargeHoraire && r.chargeHoraire !== "null" && <span><FieldTimeOutlined /> {r.chargeHoraire} h</span>}
                    {r.dateDemande && <span>Demandée le {fmt(r.dateDemande)}</span>}
                  </div>
                  {vis.length > 0 && (
                    <div className="mis-row-tags">
                      {vis.map((c) => <Tag key={c} color="processing" className="mis-tag">{c}</Tag>)}
                      {hidden > 0 && <Tag className="mis-tag mis-tag--more">+{hidden}</Tag>}
                    </div>
                  )}
                  {r.etat === "REJECTED" && r.motif && (
                    <Alert type="error" showIcon className="mis-reject-alert" message="Motif du rejet" description={r.motif} />
                  )}
                  {r.dateTraitement && r.etat !== "PENDING" && (
                    <div className="mis-timeline">
                      <Timeline items={[
                        { dot: <CalendarOutlined style={{ fontSize: 12, color: "#9ca3af" }} />, children: <span className="mis-timeline-text">Créée le <strong>{fmtDT(r.dateDemande)}</strong></span> },
                        { dot: r.etat === "APPROVED" ? <CheckCircleOutlined style={{ fontSize: 12, color: "#15803d" }} /> : <CloseCircleOutlined style={{ fontSize: 12, color: "#b51200" }} />,
                          children: <span className="mis-timeline-text">{r.etat === "APPROVED" ? "Approuvée" : "Rejetée"} le <strong>{fmtDT(r.dateTraitement)}</strong></span> },
                      ]} />
                    </div>
                  )}
                </div>
                <div className="mis-row-right">
                  <Tag icon={meta.icon} className="ins-badge-pop" style={{ color: meta.color, background: meta.bg, border: "none", borderRadius: 16, fontWeight: 600, padding: "4px 12px" }}>
                    {meta.label}
                  </Tag>
                  {r.etat === "PENDING" && (
                    <Popconfirm title="Annuler cette demande ?" okText="Oui" cancelText="Non" okButtonProps={{ danger: true, loading: annulerMut.isPending }} onConfirm={() => void handleAnnuler(r)}>
                      <Tooltip title="Annuler"><Button danger size="small" icon={<StopOutlined />} loading={annulerMut.isPending}>Annuler</Button></Tooltip>
                    </Popconfirm>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="ins-card-footer">{displayed.length} demande{displayed.length > 1 ? "s" : ""}</div>
      </div>
    </div>
  );
}
