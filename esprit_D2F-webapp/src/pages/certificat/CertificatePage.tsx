import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Layout, Row, Col, Button, Input, Select, Segmented, Table, Tag, Tooltip,
  Drawer, Modal, Space, Empty, Popconfirm, Checkbox, Avatar,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  SafetyCertificateOutlined, FileProtectOutlined, FileDoneOutlined, TeamOutlined,
  UserOutlined, SearchOutlined, ReloadOutlined, EyeOutlined, EditOutlined,
  SendOutlined, ThunderboltOutlined, TableOutlined, AppstoreOutlined,
} from "@ant-design/icons";
import { D2FPageHeader, StatCard } from "@/components/common";
import { brand, neutral, semantic } from "@/styles/themes/tokens";
import useAppNotification from "@/hooks/ui/useAppNotification";
import {
  useAllCertificates, useCertificatesByFormation, useDeliverCertificate, useGenerateCertificates,
} from "@/hooks/certificat/useCertificats";
import { useFormationsAchevees } from "@/hooks/formation/useFormations";
import type { Certificate } from "@/models/certificat";
import type { Formation } from "@/models/formation";
import type { Id } from "@/models/common";
import CertificatePdfViewer from "./CertificatePdfViewer";
import CertificateEditorViewerItem from "./CertificateEditorViewerItem";
import "@/styles/pages/gestion-certifications.css";

const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#0891b2", "#db2777"];
const colorFor = (s: string) => AVATAR_COLORS[[...s].reduce((a, c) => a + (c.codePointAt(0) ?? 0), 0) % AVATAR_COLORS.length];
const initials = (c: Certificate) => `${(c.prenomEnseignant || " ")[0]}${(c.nomEnseignant || " ")[0]}`.toUpperCase().trim();
const emailOf = (c: Certificate) => (c as unknown as Record<string, string>).mailEnseignant || "";
const isAnimateur = (c: Certificate) => (c.roleEnFormation || "").toLowerCase().includes("animateur");
const isCertif = (c: Certificate) => (c.typeCertif || "").toUpperCase() === "CERTIF";

interface CertRow extends Certificate { key: string; }

export default function CertificatePage() {
  const { formationId } = useParams<string>();
  const { message } = useAppNotification();

  const allQuery = useAllCertificates();
  const formationQuery = useCertificatesByFormation(formationId);
  const isScoped = !!formationId;
  const source = isScoped ? formationQuery : allQuery;
  const certificates = useMemo<Certificate[]>(() => {
    const d = source.data as unknown;
    if (Array.isArray(d)) return d as Certificate[];
    // Tolère une réponse paginée { content: [...] } renvoyée par le backend
    if (d && Array.isArray((d as { content?: unknown }).content)) {
      return (d as { content: Certificate[] }).content;
    }
    return [];
  }, [source.data]);
  const loading = source.isLoading;
  const refetch = source.refetch;

  const deliver = useDeliverCertificate();
  const generate = useGenerateCertificates();

  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterFormation, setFilterFormation] = useState("all");
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [preview, setPreview] = useState<Certificate | null>(null);
  const [editing, setEditing] = useState<Certificate | null>(null);
  const [genOpen, setGenOpen] = useState(false);

  const rows = useMemo<CertRow[]>(() => {
    const q = search.trim().toLowerCase();
    return certificates
      .map((c, i) => ({ ...c, key: String(c.idCertificate ?? i) }))
      .filter((c) => {
        if (filterType !== "all" && (c.typeCertif || "").toUpperCase() !== filterType) return false;
        if (filterRole === "animateur" && !isAnimateur(c)) return false;
        if (filterRole === "participant" && isAnimateur(c)) return false;
        if (filterFormation !== "all" && (c.titreFormation || "") !== filterFormation) return false;
        if (q) {
          const hay = `${c.nomEnseignant} ${c.prenomEnseignant} ${emailOf(c)} ${c.roleEnFormation} ${c.titreFormation}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [certificates, search, filterType, filterRole, filterFormation]);

  useEffect(() => {
    const validKeys = new Set(rows.map((r) => r.key));
    setSelectedKeys((keys) => keys.filter((k) => validKeys.has(k)));
  }, [rows]);

  const stats = useMemo(() => ({
    total: certificates.length,
    certif: certificates.filter(isCertif).length,
    attestation: certificates.filter((c) => !isCertif(c)).length,
    animateurs: certificates.filter(isAnimateur).length,
  }), [certificates]);

  const formationOptions = useMemo(() => {
    const set = new Set(certificates.map((c) => c.titreFormation).filter(Boolean) as string[]);
    return [...set].map((t) => ({ value: t, label: t }));
  }, [certificates]);

  const selectedRows = useMemo(() => rows.filter((r) => selectedKeys.includes(r.key)), [rows, selectedKeys]);

  const handleDeliver = useCallback((c: Certificate) => {
    if (!c.idCertificate) return;
    deliver.mutate(c.idCertificate, {
      onSuccess: () => { message.success("Certificat délivré."); void refetch(); },
      onError: () => { message.error("Échec de la délivrance."); },
    });
  }, [deliver, message, refetch]);

  const handleBulkDeliver = useCallback(async () => {
    const targets = selectedRows.filter((r) => r.idCertificate);
    try {
      await Promise.all(targets.map((r) => deliver.mutateAsync(r.idCertificate as Id)));
      message.success(`${targets.length} certificat(s) délivré(s).`);
      setSelectedKeys([]);
      void refetch();
    } catch {
      message.error("Certaines délivrances ont échoué.");
      void refetch();
    }
  }, [selectedRows, deliver, message, refetch]);

  const runGenerate = useCallback((fid: Id) => {
    generate.mutate(fid, {
      onSuccess: (paths) => {
        message.success(`${Array.isArray(paths) ? paths.length : 0} certificat(s) généré(s).`);
        setGenOpen(false);
        void refetch();
      },
      onError: () => { message.error("Échec de la génération."); },
    });
  }, [generate, message, refetch]);

  const typeTag = (c: Certificate) =>
    isCertif(c) ? <Tag color={brand[500]}>Certification</Tag> : <Tag color="#2563eb">Attestation</Tag>;
  const roleTag = (c: Certificate) =>
    <Tag color={isAnimateur(c) ? "#059669" : "#2563eb"}>{c.roleEnFormation || "—"}</Tag>;

  const rowActions = (c: Certificate) => (
    <Space size={4}>
      <Tooltip title="Aperçu PDF">
        <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setPreview(c)} />
      </Tooltip>
      <Tooltip title="Modifier">
        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditing(c)} />
      </Tooltip>
      <Popconfirm title="Délivrer ce certificat au bénéficiaire ?" okText="Délivrer" cancelText="Annuler"
        onConfirm={() => handleDeliver(c)}>
        <Tooltip title="Délivrer">
          <Button type="text" size="small" icon={<SendOutlined />} style={{ color: semantic.success }} />
        </Tooltip>
      </Popconfirm>
    </Space>
  );

  const columns: ColumnsType<CertRow> = [
    {
      title: "Bénéficiaire", key: "beneficiaire",
      sorter: (a, b) => (a.nomEnseignant || "").localeCompare(b.nomEnseignant || ""),
      render: (_, c) => (
        <Space>
          <Avatar style={{ background: colorFor(c.nomEnseignant || "?") }}>{initials(c)}</Avatar>
          <div>
            <div style={{ fontWeight: 600, color: neutral[900] }}>{c.prenomEnseignant} {c.nomEnseignant}</div>
            {emailOf(c) && <div style={{ fontSize: 12, color: neutral[500] }}>{emailOf(c)}</div>}
          </div>
        </Space>
      ),
    },
    ...(isScoped ? [] : [{
      title: "Formation", dataIndex: "titreFormation", key: "titreFormation",
      sorter: (a: CertRow, b: CertRow) => (a.titreFormation || "").localeCompare(b.titreFormation || ""),
      render: (v: string) => <span style={{ color: neutral[700] }}>{v || "—"}</span>,
    } as ColumnsType<CertRow>[number]]),
    {
      title: "Type", key: "type", width: 150,
      filters: [{ text: "Certification", value: "CERTIF" }, { text: "Attestation", value: "ATTESTATION" }],
      onFilter: (val, c) => (c.typeCertif || "").toUpperCase() === val,
      render: (_, c) => typeTag(c),
    },
    {
      title: "Rôle", key: "role", width: 150,
      filters: [{ text: "Animateur", value: "animateur" }, { text: "Participant", value: "participant" }],
      onFilter: (val, c) => isAnimateur(c) === (val === "animateur"),
      render: (_, c) => roleTag(c),
    },
    { title: "Actions", key: "actions", width: 150, align: "right", render: (_, c) => rowActions(c) },
  ];

  let content: React.ReactNode;
  if (view === "table") {
    content = (
      <Table<CertRow>
        rowKey="key"
        dataSource={rows}
        columns={columns}
        loading={loading}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
        pagination={{ pageSize: 12, showSizeChanger: true, showTotal: (t) => `${t} certificat(s)` }}
        locale={{ emptyText: <Empty className="gcert-empty" description="Aucun certificat pour ces critères." /> }}
        scroll={{ x: "max-content" }}
      />
    );
  } else if (rows.length === 0) {
    content = <Empty className="gcert-empty" description="Aucun certificat pour ces critères." />;
  } else {
    content = (
      <div className="gcert-grid">
        {rows.map((c) => (
          <CertCard key={c.key} cert={c} selectedKeys={selectedKeys} setSelectedKeys={setSelectedKeys}
            typeTag={typeTag} roleTag={roleTag} handleDeliver={handleDeliver}
            setPreview={setPreview} setEditing={setEditing} />
        ))}
      </div>
    );
  }

  return (
    <Layout className="gcert-page" style={{ background: "transparent" }}>
      <D2FPageHeader
        icon={<SafetyCertificateOutlined />}
        title={isScoped ? `Certifications — Formation #${formationId}` : "Gestion des certifications"}
        subtitle={isScoped
          ? "Générez, prévisualisez et délivrez les certificats de cette formation"
          : "Pilotez l'ensemble des certificats et attestations des formations"}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>Rafraîchir</Button>
            {isScoped ? (
              <Button type="primary" icon={<ThunderboltOutlined />} loading={generate.isPending}
                onClick={() => runGenerate(formationId as Id)}>Générer pour cette formation</Button>
            ) : (
              <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => setGenOpen(true)}>
                Générer des certificats
              </Button>
            )}
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <StatCard icon={<FileProtectOutlined />} iconColor={brand[500]} accentColor={brand[500]}
            label="Total certificats" value={stats.total} loading={loading} />
        </Col>
        <Col xs={12} md={6}>
          <StatCard icon={<SafetyCertificateOutlined />} iconColor={brand[500]} accentColor={brand[500]}
            label="Certifications" value={stats.certif} loading={loading} />
        </Col>
        <Col xs={12} md={6}>
          <StatCard icon={<FileDoneOutlined />} iconColor="#2563eb" accentColor="#2563eb"
            label="Attestations" value={stats.attestation} loading={loading} />
        </Col>
        <Col xs={12} md={6}>
          <StatCard icon={<TeamOutlined />} iconColor="#059669" accentColor="#059669"
            label="Animateurs" value={stats.animateurs} loading={loading} />
        </Col>
      </Row>

      <div className="gcert-toolbar">
        <div className="gcert-toolbar-row">
          <div className="gcert-filters">
            <Input allowClear prefix={<SearchOutlined />} placeholder="Rechercher (nom, email, rôle, formation…)"
              value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 320, maxWidth: "100%" }} />
            <Select value={filterType} onChange={setFilterType} style={{ width: 160 }}
              options={[{ value: "all", label: "Tous les types" }, { value: "CERTIF", label: "Certification" }, { value: "ATTESTATION", label: "Attestation" }]} />
            <Select value={filterRole} onChange={setFilterRole} style={{ width: 160 }}
              options={[{ value: "all", label: "Tous les rôles" }, { value: "animateur", label: "Animateur" }, { value: "participant", label: "Participant" }]} />
            {!isScoped && (
              <Select value={filterFormation} onChange={setFilterFormation} style={{ width: 220 }} showSearch optionFilterProp="label"
                options={[{ value: "all", label: "Toutes les formations" }, ...formationOptions]} />
            )}
          </div>
          <Segmented value={view} onChange={(v) => setView(v as "table" | "grid")}
            options={[
              { label: "Table", value: "table", icon: <TableOutlined /> },
              { label: "Grille", value: "grid", icon: <AppstoreOutlined /> },
            ]} />
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="gcert-bulkbar">
          <span className="gcert-bulkbar-count">{selectedRows.length} certificat(s) sélectionné(s)</span>
          <Space>
            <Popconfirm title={`Délivrer ${selectedRows.length} certificat(s) ?`} okText="Délivrer" cancelText="Annuler"
              onConfirm={handleBulkDeliver}>
              <Button type="primary" icon={<SendOutlined />} loading={deliver.isPending}>Délivrer la sélection</Button>
            </Popconfirm>
            <Button type="text" onClick={() => setSelectedKeys([])}>Annuler</Button>
          </Space>
        </div>
      )}

      {content}

      {/* Aperçu PDF */}
      <Drawer title="Aperçu du certificat" open={!!preview} onClose={() => setPreview(null)}
        width={Math.min(960, typeof window !== "undefined" ? window.innerWidth - 40 : 960)}>
        {preview && (
          <div style={{ height: "72vh" }}>
            <CertificatePdfViewer certificate={preview as Parameters<typeof CertificatePdfViewer>[0]["certificate"]} />
          </div>
        )}
      </Drawer>

      {/* Édition */}
      <Drawer title="Modifier le certificat" open={!!editing} onClose={() => setEditing(null)}
        width={Math.min(1100, typeof window !== "undefined" ? window.innerWidth - 40 : 1100)} destroyOnClose>
        {editing && (
          <CertificateEditorViewerItem certificate={editing} onUpdate={() => { void refetch(); }} />
        )}
      </Drawer>

      {/* Génération globale : choix d'une formation achevée */}
      <GenerateModal open={genOpen} pending={generate.isPending} onClose={() => setGenOpen(false)} onGenerate={runGenerate} />
    </Layout>
  );
}

/* ── Carte certificat (grille) ────────────────────────────────────────────── */
function CertCard({ cert, selectedKeys, setSelectedKeys, typeTag, roleTag, handleDeliver, setPreview, setEditing }: {
  cert: CertRow; selectedKeys: React.Key[]; setSelectedKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  typeTag: (c: Certificate) => React.ReactNode; roleTag: (c: Certificate) => React.ReactNode;
  handleDeliver: (c: Certificate) => void; setPreview: (c: Certificate | null) => void; setEditing: (c: Certificate | null) => void;
}) {
  const selected = selectedKeys.includes(cert.key);
  return (
    <div key={cert.key} className={`gcert-card${selected ? " gcert-card--selected" : ""}`}>
      <Checkbox className="gcert-card-checkbox" checked={selected}
        onChange={(e) => setSelectedKeys((ks) => e.target.checked ? [...ks, cert.key] : ks.filter((k) => k !== cert.key))} />
      <div className="gcert-card-head">
        <div className="gcert-avatar" style={{ background: colorFor(cert.nomEnseignant || "?") }}>{initials(cert)}</div>
        <div style={{ minWidth: 0 }}>
          <div className="gcert-card-name">{cert.prenomEnseignant} {cert.nomEnseignant}</div>
          <div className="gcert-card-formation">{cert.titreFormation || "—"}</div>
        </div>
      </div>
      <div className="gcert-card-tags">{typeTag(cert)}{roleTag(cert)}</div>
      <div className="gcert-card-actions">
        <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setPreview(cert)}>Aperçu</Button>
        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => setEditing(cert)} />
        <Popconfirm title="Délivrer ce certificat ?" okText="Délivrer" cancelText="Annuler" onConfirm={() => handleDeliver(cert)}>
          <Button size="small" type="text" icon={<SendOutlined />} style={{ color: semantic.success }} />
        </Popconfirm>
      </div>
    </div>
  );
}

/* ── Modale de génération (sélection d'une formation achevée) ─────────────── */
function GenerateModal({ open, pending, onClose, onGenerate }: {
  open: boolean; pending: boolean; onClose: () => void; onGenerate: (fid: Id) => void;
}) {
  const { data, isLoading } = useFormationsAchevees();
  const formations = useMemo<Formation[]>(() => {
    const d = data as unknown;
    if (Array.isArray(d)) return d as Formation[];
    if (d && Array.isArray((d as { content?: unknown }).content)) return (d as { content: Formation[] }).content;
    return [];
  }, [data]);
  const [selected, setSelected] = useState<Id | undefined>(undefined);

  useEffect(() => { if (!open) setSelected(undefined); }, [open]);

  return (
    <Modal title="Générer des certificats" open={open} onCancel={onClose}
      okText="Générer" confirmLoading={pending} okButtonProps={{ disabled: !selected, icon: <ThunderboltOutlined /> }}
      onOk={() => selected && onGenerate(selected)} destroyOnHidden>
      <p style={{ color: neutral[600], marginBottom: 12 }}>
        <UserOutlined /> Sélectionnez une formation <strong>achevée</strong> pour générer les certificats de tous ses participants et animateurs.
      </p>
      <Select<Id> style={{ width: "100%" }} placeholder="Formation achevée" loading={isLoading}
        showSearch optionFilterProp="label" value={selected} onChange={setSelected}
        options={formations.map((f) => ({ value: f.idFormation as Id, label: f.titreFormation ?? `#${f.idFormation}` }))} />
    </Modal>
  );
}
