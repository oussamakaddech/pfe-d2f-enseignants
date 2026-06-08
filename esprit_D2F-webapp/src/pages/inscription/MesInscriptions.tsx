import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Tag, Segmented, Button, Space, Typography, Alert, Popconfirm, Tooltip, Timeline } from "antd";
import {
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  FieldTimeOutlined,
  SendOutlined,
  StopOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  BellOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { AppPageHeader, InscriptionStatGrid, PageLoader, EmptyStateStandard, neutral } from "@/components/common";
import { useProfile, useMyInscriptions, useAnnulerInscription } from "@/hooks/formation/useFormationExtras";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import useAppNotification from "@/hooks/ui/useAppNotification";
import "@/styles/pages/inscription.css";
import type { Id } from "@/models/common";

const { Text } = Typography;

type Etat = "APPROVED" | "PENDING" | "REJECTED";

interface MesInscriptionRow {
  id?: Id;
  formationId?: string;
  titreFormation?: string;
  dateDebut?: string;
  dateFin?: string;
  chargeHoraire?: string;
  competencesCiblees?: string[];
  etat?: Etat | string;
  dateDemande?: string;
  dateTraitement?: string;
  motif?: string;
}

const LAST_VISIT_KEY = "mesInscriptions.lastVisit";

const ETAT_META: Record<Etat, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  APPROVED: { color: "#15803d", bg: "#dcfce7", label: "Approuvée",  icon: <CheckCircleOutlined /> },
  PENDING:  { color: "#b45309", bg: "#fef3c7", label: "En attente", icon: <ClockCircleOutlined /> },
  REJECTED: { color: "#b91c1c", bg: "#fee2e2", label: "Rejetée",    icon: <CloseCircleOutlined /> },
};

function fmt(d?: string): string {
  if (!d) return "—";
  const date = dayjs(d);
  return date.isValid() ? date.format("DD/MM/YYYY") : "—";
}

function fmtDateTime(d?: string): string {
  if (!d) return "—";
  const date = dayjs(d);
  return date.isValid() ? date.format("DD/MM/YYYY HH:mm") : "—";
}

export default function MesInscriptions() {
  const navigate = useNavigate();
  const { message: msgApi } = useAppNotification();
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  // Email prioritaire : c'est ce que le backend utilise pour résoudre l'enseignant.
  const identifier = profile?.emailAddress || profile?.email || profile?.id;
  const { data: raw, isLoading, error: inscriptionsError, refetch } = useMyInscriptions();
  const annulerMut = useAnnulerInscription();

  const [statusFilter, setStatusFilter] = useState<"ALL" | Etat>("ALL");
  // P3 - F10 : track last visit to detect state changes since last load
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  const rows = useMemo(() => (Array.isArray(raw) ? (raw as MesInscriptionRow[]) : []), [raw]);

  useEffect(() => {
    if (isLoading || rows.length === 0) return;
    const lastVisitRaw = localStorage.getItem(LAST_VISIT_KEY);
    const lastVisit = lastVisitRaw ? dayjs(lastVisitRaw) : null;
    const fresh = rows.filter((r) => {
      if (!r.dateTraitement) return false;
      if (notifiedIdsRef.current.has(String(r.id ?? r.formationId))) return false;
      if (!lastVisit) return false;
      return dayjs(r.dateTraitement).isAfter(lastVisit);
    });
    if (fresh.length > 0) {
      const wording = fresh.length === 1 ? "demande a été mise à jour" : "demandes ont été mises à jour";
      msgApi.open({
        type: "info",
        icon: <BellOutlined style={{ color: "#B51200" }} />,
        content: `${fresh.length} ${wording} depuis votre dernière visite.`,
        duration: 5,
      });
      fresh.forEach((r) => notifiedIdsRef.current.add(String(r.id ?? r.formationId)));
    }
    // met à jour le lastVisit à chaque chargement réussi
    localStorage.setItem(LAST_VISIT_KEY, dayjs().toISOString());
  }, [rows, isLoading, msgApi]);

  const stats = useMemo(() => ({
    total:    rows.length,
    approved: rows.filter((r) => r.etat === "APPROVED").length,
    pending:  rows.filter((r) => r.etat === "PENDING").length,
    rejected: rows.filter((r) => r.etat === "REJECTED").length,
  }), [rows]);

  const displayed = useMemo(
    () => (statusFilter === "ALL" ? rows : rows.filter((r) => r.etat === statusFilter)),
    [rows, statusFilter],
  );

  const loading = profileLoading || isLoading;
  const hasProfileIssue = !!profileError || (!profileLoading && !identifier);

  const handleAnnuler = async (r: MesInscriptionRow) => {
    // Le backend attend l'id d'inscription. À défaut, on retombe sur formationId
    // (au cas où la réponse backend ne porterait pas d'id explicite).
    const target = r.id ?? r.formationId;
    if (target == null) {
      msgApi.error("Impossible d'identifier la demande à annuler.");
      return;
    }
    if (!identifier) {
      msgApi.error("Identifiant enseignant introuvable.");
      return;
    }
    try {
      await annulerMut.mutateAsync({ id: target as Id, enseignantId: identifier as Id });
      msgApi.success("Demande annulée avec succès.");
      void refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      msgApi.error(e?.response?.data?.message || "Échec de l'annulation de la demande.");
    }
  };

  const exportToExcel = () => {
    const exportRows = displayed.map((r) => ({
      Formation: r.titreFormation || `Formation #${r.formationId}`,
      "Date début": fmt(r.dateDebut),
      "Date fin": fmt(r.dateFin),
      "Charge horaire": r.chargeHoraire && r.chargeHoraire !== "null" ? `${r.chargeHoraire} h` : "—",
      "État": ETAT_META[(r.etat as Etat)]?.label ?? r.etat ?? "—",
      "Date demande": r.dateDemande ? fmtDateTime(r.dateDemande) : "—",
      "Date traitement": r.dateTraitement ? fmtDateTime(r.dateTraitement) : "—",
      "Motif": r.motif || "—",
    }));
    writeExcel(
      [{
        name: "Mes inscriptions",
        rows: exportRows,
        title: "Mes inscriptions",
        subtitle: exportDateLabel(),
      }],
      `mes_inscriptions_${isoDate()}.xlsx`,
    );
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <AppPageHeader
        icon={<BookOutlined />}
        title="Mes Inscriptions"
        subtitle="Suivez le statut de vos demandes d'inscription aux formations."
        actions={
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void refetch()}
              loading={isLoading}
            >
              Actualiser
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={exportToExcel}
              disabled={displayed.length === 0}
              style={{ backgroundColor: "#1D6F42", borderColor: "#1D6F42", color: "#fff" }}
            >
              Exporter
            </Button>
            <Button type="primary" icon={<SendOutlined />} onClick={() => navigate("/home/Inscription/Nouvelle")}>
              S'inscrire à une formation
            </Button>
          </Space>
        }
      />

      {hasProfileIssue && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Profil introuvable"
          description="Impossible de récupérer votre profil enseignant. Reconnectez-vous pour consulter vos inscriptions."
          action={
            <Button size="small" type="primary" onClick={() => navigate("/login")}>
              Se reconnecter
            </Button>
          }
        />
      )}

      {inscriptionsError && !hasProfileIssue && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Erreur de chargement"
          description={(inscriptionsError as { message?: string })?.message || "Impossible de récupérer vos inscriptions pour le moment."}
        />
      )}

      {/* KPIs */}
      <InscriptionStatGrid
        stats={[
          { icon: <BookOutlined />,           label: "Total demandes", value: stats.total,    tone: "brand",   loading: loading },
          { icon: <CheckCircleOutlined />,    label: "Approuvées",     value: stats.approved, tone: "success", loading: loading },
          { icon: <ClockCircleOutlined />,    label: "En attente",     value: stats.pending,  tone: "warning", loading: loading },
          { icon: <CloseCircleOutlined />,    label: "Rejetées",       value: stats.rejected, tone: "danger",  loading: loading },
        ]}
      />

      <Card style={{ borderRadius: 12 }}>
        <Segmented
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as "ALL" | Etat)}
          style={{ marginBottom: 16 }}
          options={[
            { label: `Toutes (${stats.total})`, value: "ALL" },
            { label: `En attente (${stats.pending})`, value: "PENDING" },
            { label: `Approuvées (${stats.approved})`, value: "APPROVED" },
            { label: `Rejetées (${stats.rejected})`, value: "REJECTED" },
          ]}
        />

        {loading ? (
          <PageLoader tip="Chargement de vos inscriptions..." minHeight={240} />
        ) : displayed.length === 0 ? (
          rows.length === 0 ? (
            <EmptyStateStandard
              title="Aucune demande pour le moment"
              description="Vous n'avez pas encore soumis de demande d'inscription. Parcourez le catalogue pour trouver une formation."
              actionLabel="S'inscrire à une formation"
              actionIcon={<SendOutlined />}
              onAction={() => navigate("/home/Inscription/Nouvelle")}
            />
          ) : (
            <EmptyStateStandard
              title="Aucune demande pour ce filtre"
              description="Changez de statut pour voir les autres demandes."
            />
          )
        ) : (
          <div className="ins-stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {displayed.map((r) => {
              const meta = ETAT_META[(r.etat as Etat)] ?? ETAT_META.PENDING;
              return (
                <div
                  key={String(r.formationId)}
                  className="ins-row"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    padding: "16px 18px",
                    borderRadius: 12,
                    border: "1px solid var(--border-color, #eef0f3)",
                    borderLeft: `4px solid ${meta.color}`,
                    background: "var(--bg-card, #fff)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: neutral[800], marginBottom: 6 }}>
                      {r.titreFormation || `Formation #${r.formationId}`}
                    </div>
                    <Space size={16} wrap style={{ fontSize: 13, color: neutral[500] }}>
                      <span><CalendarOutlined style={{ marginRight: 5 }} />{fmt(r.dateDebut)} → {fmt(r.dateFin)}</span>
                      {r.chargeHoraire && r.chargeHoraire !== "null" && (
                        <span><FieldTimeOutlined style={{ marginRight: 5 }} />{r.chargeHoraire} h</span>
                      )}
                      {r.dateDemande && <span>Demandée le {fmt(r.dateDemande)}</span>}
                    </Space>
                    {Array.isArray(r.competencesCiblees) && r.competencesCiblees.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {r.competencesCiblees.slice(0, 6).map((c) => (
                          <Tag key={c} color="processing" style={{ borderRadius: 12, margin: 0 }}>{c}</Tag>
                        ))}
                      </div>
                    )}
                    {r.etat === "REJECTED" && r.motif && (
                      <Alert
                        type="error"
                        showIcon
                        style={{ marginTop: 10 }}
                        message="Motif du rejet"
                        description={r.motif}
                      />
                    )}

                    {/* P3 - F7 : timeline d'historique (création → traitement) */}
                    {r.dateTraitement && r.etat !== "PENDING" && (
                      <div
                        className="ins-timeline"
                        style={{
                          marginTop: 12,
                          padding: "10px 12px",
                          background: "var(--bg-soft, #fafbfc)",
                          borderRadius: 8,
                          border: "1px dashed var(--border-color, #eef0f3)",
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                          Historique
                        </Text>
                        <Timeline
                          style={{ marginTop: 0, padding: "0 0 0 4px" }}
                          items={[
                            {
                              dot: <CalendarOutlined style={{ fontSize: 12, color: neutral[500] }} />,
                              children: (
                                <Text style={{ fontSize: 12 }}>
                                  Demande créée le <strong>{fmtDateTime(r.dateDemande)}</strong>
                                </Text>
                              ),
                            },
                            {
                              dot: r.etat === "APPROVED"
                                ? <CheckCircleOutlined style={{ fontSize: 12, color: "#15803d" }} />
                                : <CloseCircleOutlined style={{ fontSize: 12, color: "#b91c1c" }} />,
                              children: (
                                <Text style={{ fontSize: 12 }}>
                                  {r.etat === "APPROVED" ? "Demande approuvée" : "Demande rejetée"} le{" "}
                                  <strong>{fmtDateTime(r.dateTraitement)}</strong>
                                </Text>
                              ),
                            },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                  <Tag
                    icon={meta.icon}
                    className="ins-badge-pop"
                    style={{ color: meta.color, background: meta.bg, border: "none", borderRadius: 16, fontWeight: 600, padding: "4px 12px", flexShrink: 0 }}
                  >
                    {meta.label}
                  </Tag>
                  {r.etat === "PENDING" && (
                    <Popconfirm
                      title="Annuler cette demande ?"
                      description="Cette action est irréversible. Vous pourrez refaire une demande plus tard si les inscriptions restent ouvertes."
                      okText="Oui, annuler"
                      okButtonProps={{ danger: true, loading: annulerMut.isPending }}
                      cancelText="Non"
                      onConfirm={() => void handleAnnuler(r)}
                    >
                      <Tooltip title="Annuler ma demande">
                        <Button
                          danger
                          size="small"
                          icon={<StopOutlined />}
                          loading={annulerMut.isPending}
                        >
                          Annuler
                        </Button>
                      </Tooltip>
                    </Popconfirm>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && rows.length > 0 && (
          <Text type="secondary" style={{ display: "block", marginTop: 12, fontSize: 12 }}>
            {displayed.length} demande{displayed.length === 1 ? "" : "s"} affichée{displayed.length === 1 ? "" : "s"}
          </Text>
        )}
      </Card>
    </div>
  );
}
