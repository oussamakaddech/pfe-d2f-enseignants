import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Layout,
  Row,
  Col,
  Button,
  Input,
  Select,
  Segmented,
  Table,
  Tag,
  Tooltip,
  Drawer,
  Modal,
  Space,
  Empty,
  Popconfirm,
  Checkbox,
  Avatar,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SafetyCertificateOutlined,
  FileProtectOutlined,
  FileDoneOutlined,
  TeamOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  SendOutlined,
  ThunderboltOutlined,
  TableOutlined,
  AppstoreOutlined,
  StopOutlined,
  ClockCircleOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';
import { D2FPageHeader, StatCard } from '@/components/common';
import { brand, neutral, semantic } from '@/styles/themes/tokens';
import useAppNotification from '@/hooks/ui/useAppNotification';
import {
  useAllCertificates,
  useCertificatesByFormation,
  useDeliverCertificate,
  useRevokeCertificate,
  useCertificateIndicators,
  useGenerateCertificates,
} from '@/hooks/certificat/useCertificats';
import { useFormationsAchevees } from '@/hooks/formation/useFormations';
import type { DocumentType } from '@/services/formation/FormationCustomService';
import type { Certificate } from '@/models/certificat';
import type { Formation } from '@/models/formation';
import type { Id } from '@/models/common';
import CertificatePdfViewer from './CertificatePdfViewer';
import CertificateEditorViewerItem from './CertificateEditorViewerItem';
import '@/styles/pages/gestion-certifications.css';

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#0891b2', '#db2777'];
const colorFor = (s: string) =>
  AVATAR_COLORS[[...s].reduce((a, c) => a + (c.codePointAt(0) ?? 0), 0) % AVATAR_COLORS.length];
const initials = (c: Certificate) =>
  `${(c.prenomEnseignant || ' ')[0]}${(c.nomEnseignant || ' ')[0]}`.toUpperCase().trim();
const emailOf = (c: Certificate) => (c as unknown as Record<string, string>).mailEnseignant || '';
const isAnimateur = (c: Certificate) =>
  (c.roleEnFormation || '').toLowerCase().includes('animateur');
const isCertif = (c: Certificate) => (c.typeCertif || '').toUpperCase() === 'CERTIF';
const isRevoked = (c: Certificate) => (c.certificateStatus || '').toUpperCase() === 'REVOKED';

interface CertRow extends Certificate {
  key: string;
}

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
  const revoke = useRevokeCertificate();
  const generate = useGenerateCertificates();
  const indicatorsQuery = useCertificateIndicators(formationId as Id | undefined);
  const indicators = indicatorsQuery.data;

  const [view, setView] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterFormation, setFilterFormation] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [preview, setPreview] = useState<Certificate | null>(null);
  const [editing, setEditing] = useState<Certificate | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Certificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const rows = useMemo<CertRow[]>(() => {
    const q = search.trim().toLowerCase();
    return certificates
      .map((c, i) => ({ ...c, key: String(c.idCertificate ?? i) }))
      .filter((c) => {
        if (filterType !== 'all' && (c.typeCertif || '').toUpperCase() !== filterType) return false;
        if (filterRole === 'animateur' && !isAnimateur(c)) return false;
        if (filterRole === 'participant' && isAnimateur(c)) return false;
        if (filterFormation !== 'all' && (c.titreFormation || '') !== filterFormation) return false;
        if (q) {
          const hay =
            `${c.nomEnseignant} ${c.prenomEnseignant} ${emailOf(c)} ${c.roleEnFormation} ${c.titreFormation}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [certificates, search, filterType, filterRole, filterFormation]);

  useEffect(() => {
    const validKeys = new Set(rows.map((r) => r.key));
    setSelectedKeys((keys) => keys.filter((k) => validKeys.has(String(k))));
  }, [rows]);

  const stats = useMemo(
    () => ({
      // Indicateurs serveur (étape 7) en priorité ; repli sur le décompte local.
      total: indicators?.eligibleCount ?? certificates.length,
      certif: certificates.filter(isCertif).length,
      attestation: certificates.filter((c) => !isCertif(c)).length,
      animateurs: certificates.filter(isAnimateur).length,
      delivered: indicators?.deliveredCount ?? certificates.filter((c) => c.delivered).length,
      pending:
        indicators?.pendingCount ??
        certificates.filter((c) => !c.delivered && !isRevoked(c)).length,
      revoked: indicators?.revokedCount ?? certificates.filter(isRevoked).length,
    }),
    [certificates, indicators],
  );

  const formationOptions = useMemo(() => {
    const set = new Set(certificates.map((c) => c.titreFormation).filter(Boolean) as string[]);
    return [...set].map((t) => ({ value: t, label: t }));
  }, [certificates]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedKeys.includes(r.key)),
    [rows, selectedKeys],
  );

  const handleDeliver = useCallback(
    (c: Certificate) => {
      if (!c.idCertificate) return;
      deliver.mutate(c.idCertificate, {
        onSuccess: () => {
          message.success('Certificat délivré.');
          void refetch();
        },
        onError: () => {
          message.error('Échec de la délivrance.');
        },
      });
    },
    [deliver, message, refetch],
  );

  const handleBulkDeliver = useCallback(async () => {
    const targets = selectedRows.filter((r) => r.idCertificate && !isRevoked(r));
    try {
      await Promise.all(targets.map((r) => deliver.mutateAsync(r.idCertificate as Id)));
      message.success(`${targets.length} certificat(s) délivré(s).`);
      setSelectedKeys([]);
      void refetch();
    } catch {
      message.error('Certaines délivrances ont échoué.');
      void refetch();
    }
  }, [selectedRows, deliver, message, refetch]);

  const handleRevoke = useCallback(
    async (c: Certificate) => {
      if (!c.idCertificate) return;
      const reason = revokeReason.trim();
      if (reason.length < 5) {
        message.error('Le motif de révocation doit comporter au moins 5 caractères.');
        return;
      }
      try {
        await revoke.mutateAsync({ id: c.idCertificate, reason });
        message.success(`Certificat ${c.certificateNumber ?? ''} révoqué.`);
        setRevokeTarget(null);
        setRevokeReason('');
        void refetch();
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        message.error(e.response?.data?.message || e.message || 'Échec de la révocation.');
      }
    },
    [revoke, revokeReason, message, refetch],
  );

  const runGenerate = useCallback(
    (fid: Id, typeCertif: DocumentType) => {
      generate.mutate(
        { formationId: fid, typeCertif },
        {
          onSuccess: (paths) => {
            const labels: Record<DocumentType, string> = {
              CERTIF: 'certificat(s)',
              ATTESTATION: 'attestation(s)',
              BADGE: 'badge(s)',
            };
            message.success(
              `${Array.isArray(paths) ? paths.length : 0} ${labels[typeCertif]} généré(s).`,
            );
            setGenOpen(false);
            void refetch();
          },
          onError: (err) => {
            const e = err as {
              response?: { status?: number; data?: { message?: string } };
              message?: string;
            };
            const rawData = (e as { response?: { data?: unknown } })?.response?.data;
            const detail =
              (rawData && typeof rawData === 'object'
                ? (rawData as { message?: string }).message
                : typeof rawData === 'string'
                  ? rawData
                  : null) || e.message;
            message.error(
              `Échec de la génération — ${detail ?? 'vérifiez les critères (présence ≥ 80%, post-test, évaluation)'}`,
            );
          },
        },
      );
    },
    [generate, message, refetch],
  );

  const typeTag = (c: Certificate) =>
    isCertif(c) ? (
      <Tag color={brand[500]}>Certification</Tag>
    ) : (
      <Tag color="#2563eb">Attestation</Tag>
    );
  const statusTag = (c: Certificate) =>
    isRevoked(c) ? (
      <Tag color="#dc2626">Révoqué</Tag>
    ) : c.delivered ? (
      <Tag color="#059669">Délivré</Tag>
    ) : (
      <Tag color="#d97706">En attente</Tag>
    );
  const roleTag = (c: Certificate) => (
    <Tag color={isAnimateur(c) ? '#059669' : '#2563eb'}>{c.roleEnFormation || '—'}</Tag>
  );

  const rowActions = (c: Certificate) => (
    <Space size={4}>
      <Tooltip title="Aperçu PDF">
        <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setPreview(c)} />
      </Tooltip>
      <Tooltip title="Modifier">
        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditing(c)} />
      </Tooltip>
      {!isRevoked(c) && (
        <Popconfirm
          title="Délivrer ce certificat au bénéficiaire ?"
          okText="Délivrer"
          cancelText="Annuler"
          onConfirm={() => handleDeliver(c)}
        >
          <Tooltip title="Délivrer">
            <Button
              type="text"
              size="small"
              icon={<SendOutlined />}
              style={{ color: semantic.success }}
            />
          </Tooltip>
        </Popconfirm>
      )}
      {!isRevoked(c) && (
        <Tooltip title="Révoquer (motif obligatoire)">
          <Button
            type="text"
            size="small"
            danger
            icon={<StopOutlined />}
            onClick={() => {
              setRevokeReason('');
              setRevokeTarget(c);
            }}
          />
        </Tooltip>
      )}
    </Space>
  );

  const columns: ColumnsType<CertRow> = [
    {
      title: 'Bénéficiaire',
      key: 'beneficiaire',
      sorter: (a, b) => (a.nomEnseignant || '').localeCompare(b.nomEnseignant || ''),
      render: (_, c) => (
        <Space>
          <Avatar style={{ background: colorFor(c.nomEnseignant || '?') }}>{initials(c)}</Avatar>
          <div>
            <div style={{ fontWeight: 600, color: neutral[900] }}>
              {c.prenomEnseignant} {c.nomEnseignant}
            </div>
            {emailOf(c) && <div style={{ fontSize: 12, color: neutral[500] }}>{emailOf(c)}</div>}
            {c.certificateNumber && (
              <div style={{ fontSize: 11, color: neutral[400] }}>№ {c.certificateNumber}</div>
            )}
          </div>
        </Space>
      ),
    },
    ...(isScoped
      ? []
      : [
          {
            title: 'Formation',
            dataIndex: 'titreFormation',
            key: 'titreFormation',
            sorter: (a: CertRow, b: CertRow) =>
              (a.titreFormation || '').localeCompare(b.titreFormation || ''),
            render: (v: string) => <span style={{ color: neutral[700] }}>{v || '—'}</span>,
          } as ColumnsType<CertRow>[number],
        ]),
    {
      title: 'Type',
      key: 'type',
      width: 150,
      filters: [
        { text: 'Certification', value: 'CERTIF' },
        { text: 'Attestation', value: 'ATTESTATION' },
      ],
      onFilter: (val, c) => (c.typeCertif || '').toUpperCase() === val,
      render: (_, c) => typeTag(c),
    },
    {
      title: 'Statut',
      key: 'statut',
      width: 130,
      filters: [
        { text: 'Délivré', value: 'delivered' },
        { text: 'En attente', value: 'pending' },
        { text: 'Révoqué', value: 'revoked' },
      ],
      onFilter: (val, c) => {
        if (val === 'revoked') return isRevoked(c);
        if (val === 'delivered') return !isRevoked(c) && !!c.delivered;
        return !isRevoked(c) && !c.delivered;
      },
      render: (_, c) => statusTag(c),
    },
    {
      title: 'Rôle',
      key: 'role',
      width: 150,
      filters: [
        { text: 'Animateur', value: 'animateur' },
        { text: 'Participant', value: 'participant' },
      ],
      onFilter: (val, c) => isAnimateur(c) === (val === 'animateur'),
      render: (_, c) => roleTag(c),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      align: 'right',
      render: (_, c) => rowActions(c),
    },
  ];

  let content: React.ReactNode;
  if (view === 'table') {
    content = (
      <Table<CertRow>
        rowKey="key"
        dataSource={rows}
        columns={columns}
        loading={loading}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
        pagination={{ pageSize: 12, showSizeChanger: true, showTotal: (t) => `${t} certificat(s)` }}
        locale={{
          emptyText: (
            <Empty className="gcert-empty" description="Aucun certificat pour ces critères." />
          ),
        }}
        scroll={{ x: 'max-content' }}
      />
    );
  } else if (rows.length === 0) {
    content = <Empty className="gcert-empty" description="Aucun certificat pour ces critères." />;
  } else {
    content = (
      <div className="gcert-grid">
        {rows.map((c) => (
          <CertCard
            key={c.key}
            cert={c}
            selectedKeys={selectedKeys}
            setSelectedKeys={setSelectedKeys}
            typeTag={typeTag}
            roleTag={roleTag}
            statusTag={statusTag}
            isRevokedCert={isRevoked(c)}
            handleDeliver={handleDeliver}
            onRevoke={(cert) => {
              setRevokeReason('');
              setRevokeTarget(cert);
            }}
            setPreview={setPreview}
            setEditing={setEditing}
          />
        ))}
      </div>
    );
  }

  return (
    <Layout className="gcert-page" style={{ background: 'transparent' }}>
      <D2FPageHeader
        icon={<SafetyCertificateOutlined />}
        title={
          isScoped ? `Certifications — Formation #${formationId}` : 'Gestion des certifications'
        }
        subtitle={
          isScoped
            ? 'Générez, prévisualisez et délivrez les certificats de cette formation'
            : "Pilotez l'ensemble des certificats et attestations des formations"
        }
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
              Rafraîchir
            </Button>
            {isScoped ? (
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={generate.isPending}
                onClick={() => runGenerate(formationId as Id, 'CERTIF')}
              >
                Générer pour cette formation
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={() => setGenOpen(true)}
              >
                Générer des certificats
              </Button>
            )}
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={12} md={4}>
          <StatCard
            icon={<FileProtectOutlined />}
            iconColor={brand[500]}
            accentColor={brand[500]}
            label="Éligibles"
            value={stats.total}
            loading={loading || indicatorsQuery.isLoading}
          />
        </Col>
        <Col xs={12} md={4}>
          <StatCard
            icon={<SendOutlined />}
            iconColor="#059669"
            accentColor="#059669"
            label="Délivrés"
            value={stats.delivered}
            loading={loading || indicatorsQuery.isLoading}
          />
        </Col>
        <Col xs={12} md={4}>
          <StatCard
            icon={<ClockCircleOutlined />}
            iconColor="#d97706"
            accentColor="#d97706"
            label="En attente"
            value={stats.pending}
            loading={loading || indicatorsQuery.isLoading}
          />
        </Col>
        <Col xs={12} md={4}>
          <StatCard
            icon={<StopOutlined />}
            iconColor="#dc2626"
            accentColor="#dc2626"
            label="Révoqués"
            value={stats.revoked}
            loading={loading || indicatorsQuery.isLoading}
          />
        </Col>
        <Col xs={12} md={4}>
          <StatCard
            icon={<SafetyCertificateOutlined />}
            iconColor={brand[500]}
            accentColor={brand[500]}
            label="Certifications"
            value={stats.certif}
            loading={loading}
          />
        </Col>
        <Col xs={12} md={4}>
          <StatCard
            icon={<TeamOutlined />}
            iconColor="#059669"
            accentColor="#059669"
            label="Animateurs"
            value={stats.animateurs}
            loading={loading}
          />
        </Col>
      </Row>

      <div className="gcert-toolbar">
        <div className="gcert-toolbar-row">
          <div className="gcert-filters">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Rechercher (nom, email, rôle, formation…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 320, maxWidth: '100%' }}
            />
            <Select
              value={filterType}
              onChange={setFilterType}
              style={{ width: 160 }}
              options={[
                { value: 'all', label: 'Tous les types' },
                { value: 'CERTIF', label: 'Certification' },
                { value: 'ATTESTATION', label: 'Attestation' },
              ]}
            />
            <Select
              value={filterRole}
              onChange={setFilterRole}
              style={{ width: 160 }}
              options={[
                { value: 'all', label: 'Tous les rôles' },
                { value: 'animateur', label: 'Animateur' },
                { value: 'participant', label: 'Participant' },
              ]}
            />
            {!isScoped && (
              <Select
                value={filterFormation}
                onChange={setFilterFormation}
                style={{ width: 220 }}
                showSearch
                optionFilterProp="label"
                options={[{ value: 'all', label: 'Toutes les formations' }, ...formationOptions]}
              />
            )}
          </div>
          <Segmented
            value={view}
            onChange={(v) => setView(v as 'table' | 'grid')}
            options={[
              { label: 'Table', value: 'table', icon: <TableOutlined /> },
              { label: 'Grille', value: 'grid', icon: <AppstoreOutlined /> },
            ]}
          />
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="gcert-bulkbar">
          <span className="gcert-bulkbar-count">
            {selectedRows.length} certificat(s) sélectionné(s)
          </span>
          <Space>
            <Popconfirm
              title={`Délivrer ${selectedRows.length} certificat(s) ?`}
              okText="Délivrer"
              cancelText="Annuler"
              onConfirm={handleBulkDeliver}
            >
              <Button type="primary" icon={<SendOutlined />} loading={deliver.isPending}>
                Délivrer la sélection
              </Button>
            </Popconfirm>
            <Button type="text" onClick={() => setSelectedKeys([])}>
              Annuler
            </Button>
          </Space>
        </div>
      )}

      {content}

      {/* Aperçu PDF */}
      <Drawer
        title="Aperçu du certificat"
        open={!!preview}
        onClose={() => setPreview(null)}
        width={Math.min(
          960,
          globalThis.window === undefined ? 960 : globalThis.window.innerWidth - 40,
        )}
      >
        {preview && (
          <div style={{ height: '72vh' }}>
            <CertificatePdfViewer
              certificate={preview as Parameters<typeof CertificatePdfViewer>[0]['certificate']}
            />
          </div>
        )}
      </Drawer>

      {/* Édition */}
      <Drawer
        title="Modifier le certificat"
        open={!!editing}
        onClose={() => setEditing(null)}
        width={Math.min(
          1100,
          globalThis.window === undefined ? 1100 : globalThis.window.innerWidth - 40,
        )}
        destroyOnHidden
      >
        {editing && (
          <CertificateEditorViewerItem
            certificate={editing}
            onUpdate={() => {
              void refetch();
            }}
          />
        )}
      </Drawer>

      {/* Génération globale : choix d'une formation achevée */}
      <GenerateModal
        open={genOpen}
        pending={generate.isPending}
        onClose={() => setGenOpen(false)}
        onGenerate={runGenerate}
      />

      {/* Révocation : motif obligatoire (traçabilité du cycle de vie) */}
      <Modal
        title={`Révoquer le certificat ${revokeTarget?.certificateNumber ?? ''}`}
        open={!!revokeTarget}
        onCancel={() => {
          setRevokeTarget(null);
          setRevokeReason('');
        }}
        okText="Révoquer"
        okButtonProps={{
          danger: true,
          loading: revoke.isPending,
          disabled: revokeReason.trim().length < 5,
        }}
        onOk={() => revokeTarget && void handleRevoke(revokeTarget)}
        destroyOnHidden
      >
        <p style={{ color: neutral[600] }}>
          {revokeTarget?.prenomEnseignant} {revokeTarget?.nomEnseignant} —{' '}
          {revokeTarget?.titreFormation}
        </p>
        <Input.TextArea
          rows={3}
          maxLength={500}
          showCount
          value={revokeReason}
          onChange={(e) => setRevokeReason(e.target.value)}
          placeholder="Motif de la révocation (min. 5 caractères) — ex. fraude détectée, erreur d'éligibilité"
        />
        <p style={{ marginTop: 8, fontSize: 12, color: neutral[500] }}>
          La révocation est définitive : le certificat ne pourra plus être délivré et la
          vérification publique affichera « révoqué ».
        </p>
      </Modal>
    </Layout>
  );
}

/* ── Carte certificat (grille) ────────────────────────────────────────────── */
function CertCard({
  cert,
  selectedKeys,
  setSelectedKeys,
  typeTag,
  roleTag,
  statusTag,
  isRevokedCert,
  handleDeliver,
  onRevoke,
  setPreview,
  setEditing,
}: Readonly<{
  cert: CertRow;
  selectedKeys: React.Key[];
  setSelectedKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  typeTag: (c: Certificate) => React.ReactNode;
  roleTag: (c: Certificate) => React.ReactNode;
  statusTag: (c: Certificate) => React.ReactNode;
  isRevokedCert: boolean;
  handleDeliver: (c: Certificate) => void;
  onRevoke: (c: Certificate) => void;
  setPreview: (c: Certificate | null) => void;
  setEditing: (c: Certificate | null) => void;
}>) {
  const selected = selectedKeys.includes(cert.key);
  return (
    <div key={cert.key} className={`gcert-card${selected ? ' gcert-card--selected' : ''}`}>
      <Checkbox
        className="gcert-card-checkbox"
        checked={selected}
        onChange={(e) =>
          setSelectedKeys((ks) =>
            e.target.checked ? [...ks, cert.key] : ks.filter((k) => k !== cert.key),
          )
        }
      />
      <div className="gcert-card-head">
        <div className="gcert-avatar" style={{ background: colorFor(cert.nomEnseignant || '?') }}>
          {initials(cert)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="gcert-card-name">
            {cert.prenomEnseignant} {cert.nomEnseignant}
          </div>
          <div className="gcert-card-formation">{cert.titreFormation || '—'}</div>
        </div>
      </div>
      <div className="gcert-card-tags">
        {typeTag(cert)}
        {roleTag(cert)}
        {statusTag(cert)}
      </div>
      <div className="gcert-card-actions">
        <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setPreview(cert)}>
          Aperçu
        </Button>
        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => setEditing(cert)} />
        {!isRevokedCert && (
          <>
            <Popconfirm
              title="Délivrer ce certificat ?"
              okText="Délivrer"
              cancelText="Annuler"
              onConfirm={() => handleDeliver(cert)}
            >
              <Button
                size="small"
                type="text"
                icon={<SendOutlined />}
                style={{ color: semantic.success }}
              />
            </Popconfirm>
            <Button
              size="small"
              type="text"
              danger
              icon={<StopOutlined />}
              onClick={() => onRevoke(cert)}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ── Modale de génération (sélection d'une formation achevée + type) ─────── */
function GenerateModal({
  open,
  pending,
  onClose,
  onGenerate,
}: Readonly<{
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onGenerate: (fid: Id, typeCertif: DocumentType) => void;
}>) {
  const { data, isLoading } = useFormationsAchevees();
  const formations = useMemo<Formation[]>(() => {
    const d = data as unknown;
    if (Array.isArray(d)) return d as Formation[];
    if (d && Array.isArray((d as { content?: unknown }).content))
      return (d as { content: Formation[] }).content;
    return [];
  }, [data]);
  const [selected, setSelected] = useState<Id | undefined>(undefined);
  const [docType, setDocType] = useState<DocumentType>('CERTIF');

  useEffect(() => {
    if (!open) {
      setSelected(undefined);
      setDocType('CERTIF');
    }
  }, [open]);

  return (
    <Modal
      title="Générer des documents de formation"
      open={open}
      onCancel={onClose}
      okText="Générer"
      confirmLoading={pending}
      okButtonProps={{ disabled: !selected, icon: <ThunderboltOutlined /> }}
      onOk={() => selected && onGenerate(selected, docType)}
      destroyOnHidden
    >
      <p style={{ color: neutral[600], marginBottom: 12 }}>
        <UserOutlined /> Sélectionnez une formation <strong>achevée</strong> et le type de document
        : les documents sont créés pour les participants <strong>éligibles</strong> puis les PDF
        sont générés.
      </p>
      <Select<Id>
        style={{ width: '100%', marginBottom: 12 }}
        placeholder="Formation achevée"
        loading={isLoading}
        showSearch
        optionFilterProp="label"
        value={selected}
        onChange={setSelected}
        options={formations.map((f) => ({
          value: f.idFormation as Id,
          label: f.titreFormation ?? `#${f.idFormation}`,
        }))}
      />
      <Select<DocumentType>
        style={{ width: '100%' }}
        value={docType}
        onChange={setDocType}
        options={[
          {
            value: 'CERTIF',
            label: 'Certification — présence ≥ 80% + post-test réussi + évaluation soumise',
          },
          {
            value: 'ATTESTATION',
            label: 'Attestation de participation — présence ≥ 80% uniquement',
          },
          {
            value: 'BADGE',
            label: 'Badge de participation — présence ≥ 80% uniquement',
          },
        ]}
      />
      <p style={{ marginTop: 10, fontSize: 12, color: neutral[500] }}>
        {docType === 'CERTIF'
          ? 'La certification atteste de la réussite : présence, post-test et évaluation du formateur sont exigés.'
          : 'Document de participation : seul le taux de présence est exigé.'}
      </p>
    </Modal>
  );
}
