import { useMemo, useState } from "react";
import {
  Table, Input, Select, Button, Tooltip, Tag, Modal, Space,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  TeamOutlined, MailOutlined, ApartmentOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, ReloadOutlined, FileExcelOutlined,
  BookOutlined, SearchOutlined, LockOutlined, UnlockOutlined,
  ExclamationCircleOutlined, UserOutlined,
} from "@ant-design/icons";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import { useAllInscriptions, useInscriptionsByFormation, useTraiterDemande, useTraiterDemandeBulk, useSendEmail } from "@/hooks/formation/useFormationExtras";
import { useAllFormations, useFormationsVisibles, useUpdateInscriptionsOuvertes, useFormationById } from "@/hooks/formation/useFormations";
import { InscriptionStatGrid } from "@/components/common";
import useAppNotification from "@/hooks/ui/useAppNotification";
import type { Id } from "@/models/common";

type Etat = "APPROVED" | "REJECTED" | "PENDING";

interface InscriptionRow {
  id: Id; etat: Etat; dateDemande: string;
  enseignant: { id?: Id; nom?: string; prenom?: string; mail?: string; deptLibelle?: string; upLibelle?: string };
  formation: { idFormation?: Id; titreFormation?: string; dateDebut?: string; dateFin?: string; inscriptionsOuvertes?: boolean };
}

interface FormationRow { idFormation?: Id; titreFormation?: string; inscriptionsOuvertes?: boolean }
interface Demande { id: Id; etat: Etat; dateDemande: string; enseignant: { nom?: string; prenom?: string; mail?: string; deptLibelle?: string; upLibelle?: string } }

const fmt = (d?: string) => { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("fr-FR"); };

export default function SuiviTab() {
  const { message: msgApi, modal } = useAppNotification();
  const { data: raw = [], isLoading, refetch, isFetching } = useAllInscriptions();
  const { data: allFormations = [] } = useAllFormations();
  const { data: visiblesFormations = [] } = useFormationsVisibles();
  const { mutateAsync: updateOuvertes } = useUpdateInscriptionsOuvertes();
  const { mutateAsync: traiterMut } = useTraiterDemande();
  const { mutateAsync: traiterBulkMut } = useTraiterDemandeBulk();
  const { mutateAsync: sendEmail } = useSendEmail();

  const rows = useMemo(() => (raw as InscriptionRow[]).filter(Boolean), [raw]);
  const formationsList = useMemo(() => {
    const all = (allFormations as FormationRow[]).filter(Boolean);
    return all.length > 0 ? all : (visiblesFormations as FormationRow[]).filter(Boolean);
  }, [allFormations, visiblesFormations]);

  // ── Filters ──
  const [search, setSearch] = useState("");
  const [upFilter, setUpFilter] = useState<string>();
  const [deptFilter, setDeptFilter] = useState<string>();
  const [etatFilter, setEtatFilter] = useState<Etat>();
  const [selectedFormationId, setSelectedFormationId] = useState<Id | null>(null);

  const upOpts = useMemo(() => [...new Set(rows.map((r) => r.enseignant?.upLibelle).filter(Boolean))].map((u) => ({ label: u as string, value: u as string })), [rows]);
  const deptOpts = useMemo(() => [...new Set(rows.map((r) => r.enseignant?.deptLibelle).filter(Boolean))].map((d) => ({ label: d as string, value: d as string })), [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (upFilter && r.enseignant?.upLibelle !== upFilter) return false;
      if (deptFilter && r.enseignant?.deptLibelle !== deptFilter) return false;
      if (etatFilter && r.etat !== etatFilter) return false;
      if (!term) return true;
      return [r.enseignant?.nom, r.enseignant?.prenom, r.enseignant?.mail, r.formation?.titreFormation].filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [rows, search, upFilter, deptFilter, etatFilter]);

  const stats = useMemo(() => {
    const teachers = new Set(rows.map((r) => String(r.enseignant?.id ?? r.enseignant?.mail ?? "")).filter(Boolean)).size;
    return { total: rows.length, teachers, approved: rows.filter((r) => r.etat === "APPROVED").length, pending: rows.filter((r) => r.etat === "PENDING").length, rejected: rows.filter((r) => r.etat === "REJECTED").length };
  }, [rows]);

  const formationStats = useMemo(() => {
    const open = formationsList.filter((f) => f.inscriptionsOuvertes).length;
    return { open, closed: formationsList.length - open, total: formationsList.length };
  }, [formationsList]);

  // ── Toggle inscription ──
  const handleToggle = (f: FormationRow) => {
    const id = f.idFormation;
    if (!id) return;
    const isOpen = f.inscriptionsOuvertes;
    modal.confirm({
      title: isOpen ? "Fermer les inscriptions ?" : "Ouvrir les inscriptions ?",
      icon: <ExclamationCircleOutlined style={{ color: isOpen ? "#f59e0b" : "#059669" }} />,
      content: isOpen ? `Les inscriptions pour "${f.titreFormation}" seront fermées.` : `Les inscriptions pour "${f.titreFormation}" seront ouvertes.`,
      okText: isOpen ? "Fermer" : "Ouvrir", cancelText: "Annuler",
      okButtonProps: isOpen ? { danger: true } : { type: "primary" },
      centered: true,
      onOk: async () => {
        try { await updateOuvertes({ id, ouvert: !isOpen }); msgApi.success(isOpen ? "Fermées" : "Ouvertes"); }
        catch { msgApi.error("Erreur lors de la mise à jour"); }
      },
    });
  };

  // ── Per-formation demandes ──
  const { data: demandesRaw = [], isLoading: demandesLoading } = useInscriptionsByFormation(selectedFormationId ?? undefined);
  const { data: selectedFormation } = useFormationById(selectedFormationId ?? undefined);
  const demandes = useMemo(() => {
    const list = Array.isArray(demandesRaw) ? demandesRaw : (demandesRaw as { content?: Demande[] })?.content ?? [];
    return list as Demande[];
  }, [demandesRaw]);

  const [selectedRowIds, setSelectedRowIds] = useState<React.Key[]>([]);
  const [rejectTarget, setRejectTarget] = useState<Demande | null>(null);
  const [rejectMotif, setRejectMotif] = useState("");
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkMotif, setBulkMotif] = useState("");

  const handleApprove = async (id: Id) => {
    try {
      await traiterMut({ id, approuver: true });
      msgApi.success("Demande approuvée");
      void refetch();
    } catch { msgApi.error("Échec du traitement"); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await traiterMut({ id: rejectTarget.id, approuver: false, motif: rejectMotif || undefined });
      msgApi.success("Demande rejetée");
      setRejectTarget(null); setRejectMotif("");
      void refetch();
    } catch { msgApi.error("Échec du rejet"); }
  };

  const handleBulkApprove = async () => {
    try {
      await traiterBulkMut({ ids: selectedRowIds as Id[], approuver: true });
      msgApi.success(`${selectedRowIds.length} demande(s) approuvée(s)`);
      setSelectedRowIds([]); void refetch();
    } catch { msgApi.error("Échec du traitement groupé"); }
  };

  const handleBulkReject = async () => {
    try {
      await traiterBulkMut({ ids: selectedRowIds as Id[], approuver: false, motif: bulkMotif || undefined });
      msgApi.success(`${selectedRowIds.length} demande(s) rejetée(s)`);
      setBulkRejectOpen(false); setBulkMotif(""); setSelectedRowIds([]); void refetch();
    } catch { msgApi.error("Échec du rejet groupé"); }
  };

  // ── Excel export ──
  const exportExcel = () => {
    writeExcel([{
      name: "Inscriptions",
      rows: filtered.map((r) => ({
        Nom: r.enseignant?.nom ?? "", Prénom: r.enseignant?.prenom ?? "", Email: r.enseignant?.mail ?? "",
        Département: r.enseignant?.deptLibelle || "—", UP: r.enseignant?.upLibelle || "—",
        Formation: r.formation?.titreFormation ?? "", État: r.etat === "APPROVED" ? "Approuvé" : r.etat === "REJECTED" ? "Rejeté" : "En attente",
        "Date demande": fmt(r.dateDemande),
      })),
      title: "Suivi des inscriptions", subtitle: exportDateLabel(),
    }], `inscriptions_${isoDate()}.xlsx`);
  };

  // ── Demandes columns ──
  const demandesColumns: TableColumnsType<Demande> = [
    { title: "Enseignant", key: "ens", render: (_, r) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {(r.enseignant?.prenom?.[0] || r.enseignant?.nom?.[0] || "?").toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.enseignant?.prenom} {r.enseignant?.nom}</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}><MailOutlined style={{ marginRight: 4 }} />{r.enseignant?.mail}</div>
        </div>
      </div>
    )},
    { title: "Département", dataIndex: ["enseignant", "deptLibelle"], sorter: (a, b) => (a.enseignant?.deptLibelle || "").localeCompare(b.enseignant?.deptLibelle || "") },
    { title: "UP", dataIndex: ["enseignant", "upLibelle"], responsive: ["lg"], sorter: (a, b) => (a.enseignant?.upLibelle || "").localeCompare(b.enseignant?.upLibelle || "") },
    { title: "Date", dataIndex: "dateDemande", render: (d: string) => fmt(d), sorter: (a, b) => new Date(a.dateDemande).getTime() - new Date(b.dateDemande).getTime() },
    { title: "État", dataIndex: "etat", width: 120, render: (e: Etat) => {
      const c = { APPROVED: { cls: "ins-badge--approved", text: "Approuvé" }, REJECTED: { cls: "ins-badge--rejected", text: "Rejeté" }, PENDING: { cls: "ins-badge--pending", text: "En attente" } }[e] ?? { cls: "ins-badge--pending", text: "?" };
      return <span className={`ins-badge ${c.cls}`}>{c.text}</span>;
    }},
    { title: "Actions", key: "act", width: 200, render: (_, r) => (
      <Space size={6}>
        <Button size="small" type="primary" icon={<CheckCircleOutlined />} disabled={r.etat === "APPROVED"} onClick={() => void handleApprove(r.id)}>Approuver</Button>
        <Button size="small" danger icon={<CloseCircleOutlined />} disabled={r.etat === "REJECTED"} onClick={() => { setRejectTarget(r); setRejectMotif(""); }}>Rejeter</Button>
      </Space>
    )},
  ];

  // ── Global table columns ──
  const globalColumns: TableColumnsType<InscriptionRow> = [
    { title: "Enseignant", key: "ens", width: 260, render: (_, r) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#059669,#047857)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {(r.enseignant?.prenom?.[0] || r.enseignant?.nom?.[0] || "?").toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.enseignant?.prenom} {r.enseignant?.nom}</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}><MailOutlined style={{ marginRight: 4 }} />{r.enseignant?.mail}</div>
        </div>
      </div>
    )},
    { title: "Département", key: "dept", width: 150, render: (_, r) => <span><ApartmentOutlined style={{ marginRight: 6, color: "#b51200" }} />{r.enseignant?.deptLibelle || "—"}</span>, sorter: (a, b) => (a.enseignant?.deptLibelle || "").localeCompare(b.enseignant?.deptLibelle || "") },
    { title: "UP", key: "up", width: 130, responsive: ["lg"], render: (_, r) => <span><TeamOutlined style={{ marginRight: 6, color: "#7c3aed" }} />{r.enseignant?.upLibelle || "—"}</span>, sorter: (a, b) => (a.enseignant?.upLibelle || "").localeCompare(b.enseignant?.upLibelle || "") },
    { title: "Formation", key: "formation", width: 200, render: (_, r) => (<div><div style={{ fontWeight: 600, fontSize: 13 }}>{r.formation?.titreFormation || "—"}</div><div style={{ fontSize: 12, color: "#9ca3af" }}>{fmt(r.formation?.dateDebut)} → {fmt(r.formation?.dateFin)}</div></div>) },
    { title: "Inscriptions", key: "insc", width: 120, responsive: ["md"], render: (_, r) => { const o = r.formation?.inscriptionsOuvertes; return <span className={`ins-badge ${o ? "ins-badge--open" : "ins-badge--closed"}`}>{o ? <><UnlockOutlined /> Ouvertes</> : <><LockOutlined /> Fermées</>}</span>; } },
    { title: "État", dataIndex: "etat", width: 120, render: (e: Etat) => { const c = { APPROVED: { cls: "ins-badge--approved", text: "Approuvé" }, REJECTED: { cls: "ins-badge--rejected", text: "Rejeté" }, PENDING: { cls: "ins-badge--pending", text: "En attente" } }[e] ?? { cls: "ins-badge--pending", text: "?" }; return <span className={`ins-badge ${c.cls}`}>{c.text}</span>; } },
    { title: "Date demande", dataIndex: "dateDemande", width: 120, render: (d: string) => <span style={{ color: "#64748b", fontSize: 13 }}>{fmt(d)}</span>, sorter: (a, b) => new Date(a.dateDemande).getTime() - new Date(b.dateDemande).getTime() },
  ];

  return (
    <div className="suv-page">
      <InscriptionStatGrid stats={[
        { icon: <TeamOutlined />, label: "Enseignants", value: stats.teachers, tone: "info" },
        { icon: <BookOutlined />, label: "Inscriptions", value: stats.total, tone: "brand" },
        { icon: <CheckCircleOutlined />, label: "Approuvées", value: stats.approved, tone: "success" },
        { icon: <ClockCircleOutlined />, label: "En attente", value: stats.pending, tone: "warning" },
        { icon: <CloseCircleOutlined />, label: "Rejetées", value: stats.rejected, tone: "danger" },
      ]} />

      {/* ── A. Formation toggle grid ── */}
      <div className="suv-section">
        <div className="suv-section-header">
          <LockOutlined style={{ color: "#64748b" }} />
          <span>État des inscriptions par formation</span>
          <Tag>{formationStats.total}</Tag>
          <Tag color="success">{formationStats.open} ouverte{formationStats.open === 1 ? "" : "s"}</Tag>
          <Tag color="error">{formationStats.closed} fermée{formationStats.closed === 1 ? "" : "s"}</Tag>
        </div>
        <div className="suv-formations-grid">
          {formationsList.length === 0 && <span style={{ color: "#9ca3af", fontSize: 13 }}>Aucune formation trouvée.</span>}
          {formationsList.map((f) => {
            const o = f.inscriptionsOuvertes;
            return (
              <Tooltip key={String(f.idFormation)} title={`${o ? "Fermer" : "Ouvrir"} les inscriptions`}>
                <Button size="small" className={`suv-toggle ${o ? "suv-toggle--open" : "suv-toggle--closed"}`}
                  icon={o ? <UnlockOutlined /> : <LockOutlined />}
                  onClick={() => handleToggle(f)}>
                  {f.titreFormation || "—"}
                </Button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* ── B. Per-formation demandes ── */}
      <div className="suv-section">
        <div className="suv-section-header">
          <UserOutlined style={{ color: "#64748b" }} />
          <span>Gestion des demandes par formation</span>
        </div>
        <div style={{ padding: "0 20px 16px" }}>
          <Select
            placeholder="Sélectionner une formation" allowClear style={{ width: 400 }}
            value={selectedFormationId} onChange={(v) => { setSelectedFormationId(v); setSelectedRowIds([]); }}
            options={formationsList.map((f) => ({ label: f.titreFormation || `Formation #${f.idFormation}`, value: f.idFormation! }))}
          />
        </div>

        {selectedFormationId && (
          <div className="ins-card">
            <div className="ins-card-toolbar" style={{ justifyContent: "space-between" }}>
              <Space>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{selectedFormation?.titreFormation || "Formation"}</span>
                <Tag>{demandes.length} demande{demandes.length > 1 ? "s" : ""}</Tag>
              </Space>
              <Space>
                <Button size="small" icon={<ReloadOutlined />} onClick={() => void refetch()} className="ins-btn">Actualiser</Button>
                <Button size="small" icon={<FileExcelOutlined />} onClick={exportExcel} disabled={!demandes.length} className="ins-btn ins-btn--green">Exporter</Button>
              </Space>
            </div>

            {selectedRowIds.length > 0 && (
              <div className="suv-bulk-bar">
                <span>{selectedRowIds.length} sélectionnée{selectedRowIds.length > 1 ? "s" : ""}</span>
                <Space>
                  <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={handleBulkApprove}>Tout approuver</Button>
                  <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => setBulkRejectOpen(true)}>Tout rejeter</Button>
                  <Button size="small" onClick={() => setSelectedRowIds([])}>Effacer</Button>
                </Space>
              </div>
            )}

            <Table<Demande>
              rowKey="id" columns={demandesColumns} dataSource={demandes} loading={demandesLoading}
              rowSelection={{ selectedRowKeys: selectedRowIds, onChange: setSelectedRowIds, getCheckboxProps: (r) => ({ disabled: r.etat !== "PENDING" }) }}
              pagination={{ pageSize: 10, showTotal: (t) => `${t} demande${t > 1 ? "s" : ""}` }}
              scroll={{ x: 900 }}
              locale={{ emptyText: <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Aucune demande pour cette formation.</div> }}
            />
          </div>
        )}
      </div>

      {/* ── C. Global table ── */}
      <div className="ins-card">
        <div className="ins-card-toolbar">
          <Input allowClear prefix={<SearchOutlined style={{ color: "#9ca3af" }} />} placeholder="Rechercher (nom, email, formation…)" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 280 }} />
          <Select placeholder="UP" allowClear options={upOpts} value={upFilter} onChange={setUpFilter} style={{ width: 140 }} />
          <Select placeholder="Département" allowClear options={deptOpts} value={deptFilter} onChange={setDeptFilter} style={{ width: 150 }} />
          <Select placeholder="État" allowClear value={etatFilter} onChange={setEtatFilter} style={{ width: 140 }} options={[{ label: "En attente", value: "PENDING" }, { label: "Approuvé", value: "APPROVED" }, { label: "Rejeté", value: "REJECTED" }]} />
          <span style={{ marginLeft: "auto", color: "#9ca3af", fontSize: 12 }}>{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
          <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching} className="ins-btn" />
          <Button icon={<FileExcelOutlined />} onClick={exportExcel} disabled={!filtered.length} className="ins-btn ins-btn--green">Exporter</Button>
        </div>
        <Table<InscriptionRow> rowKey="id" columns={globalColumns} dataSource={filtered} loading={isLoading} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} inscription${t > 1 ? "s" : ""}` }} scroll={{ x: 1100 }} />
      </div>

      {/* ── Reject modal (single) ── */}
      <Modal title="Rejeter la demande" open={!!rejectTarget} onCancel={() => setRejectTarget(null)} onOk={() => void handleReject()} okText="Confirmer le rejet" cancelText="Annuler" okButtonProps={{ danger: true }} centered>
        {rejectTarget && (
          <div>
            <p style={{ marginBottom: 8 }}>{rejectTarget.enseignant?.prenom} {rejectTarget.enseignant?.nom} — {rejectTarget.enseignant?.mail}</p>
            <Input.TextArea rows={3} maxLength={500} showCount placeholder="Motif du rejet (optionnel)" value={rejectMotif} onChange={(e) => setRejectMotif(e.target.value)} />
          </div>
        )}
      </Modal>

      {/* ── Bulk reject modal ── */}
      <Modal title={`Rejeter ${selectedRowIds.length} demande(s)`} open={bulkRejectOpen} onCancel={() => setBulkRejectOpen(false)} onOk={() => void handleBulkReject()} okText="Confirmer le rejet groupé" cancelText="Annuler" okButtonProps={{ danger: true }} centered>
        <Input.TextArea rows={3} maxLength={500} showCount placeholder="Motif partagé (optionnel)" value={bulkMotif} onChange={(e) => setBulkMotif(e.target.value)} />
      </Modal>
    </div>
  );
}
