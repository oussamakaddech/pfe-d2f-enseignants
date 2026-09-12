import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Input,
  Button,
  Space,
  Drawer,
  DatePicker,
  Popconfirm,
  Typography,
  Select,
  Modal,
  Tag,
  Tooltip,
} from 'antd';
import type { TableColumnsType } from 'antd';
import type { Dayjs } from 'dayjs';
import {
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  MailOutlined,
  PlusCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  FolderOpenOutlined,
  ArrowRightOutlined,
  TeamOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { AppPageHeader, StatusBadge, EmptyState, StatCard } from '@/components/common';
import '@/styles/pages/formation-consultation-page.css';
import dayjs from 'dayjs';

import { useAuth } from '@/hooks/auth/useAuth';
import {
  useAllFormations,
  useMesFormationsPilote,
  useFormationsWithDocuments,
  useDeleteFormation,
  useExportFormations,
  useUps,
  useDepartements,
} from '@/hooks/formation';
import type { Formation } from '@/models/formation';
import type { FormationDocument } from '@/models/document';
import type { Id } from '@/models/common';
import FormationWorkflowEditForm from './FormationWorkflowEditForm';
import MailForm from '@/pages/besoin/MailForm';
import useAppNotification from '@/hooks/ui/useAppNotification';

const normalizeRole = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .replace(/^role_?/, '')
    .replaceAll(/[\s_-]+/g, '');

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const PERIOD_OPTIONS = [
  { value: 'WINTER', label: 'Winter' },
  { value: 'SUMMER', label: 'Summer' },
  { value: 'SPRINT', label: 'Sprint' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'OTHER', label: 'Autre' },
];

const TYPE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  INTERNE: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  EXTERNE: { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
};

interface RefItem {
  id?: Id;
  libelle?: string;
  nom?: string;
}

function FormationExpandRow({ record }: Readonly<{ record: Formation }>) {
  return (
    <div className="formation-expand-content">
      <span className="formation-expand-title">Séances</span>
      <div className="formation-seance-list">
        {(record.seances || []).map((s) => (
          <span key={String(s.idSeance)} className="formation-seance-tag">
            <span className="formation-seance-date">
              {dayjs(s.dateSeance).format('DD/MM/YYYY')}
            </span>
            <span className="formation-seance-time">
              {s.heureDebut}–{s.heureFin}
            </span>
            {s.salle && <span className="formation-seance-salle">· {s.salle}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function renderExpandRow(record: Formation) {
  return <FormationExpandRow record={record} />;
}

export default function FormationConsultationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageFormations = normalizeRole(user?.role) === 'admin';
  const isChefDept = normalizeRole(user?.role) === 'chefdepartement';
  const isCup = normalizeRole(user?.role) === 'cup';
  // Scoping serveur (§8) : CUP → son UP, chef → son département.
  const isScopedPilote = (isCup || isChefDept) && !canManageFormations;
  const { message: msgApi } = useAppNotification();

  const {
    data: formationsAll = [],
    isLoading: loadingAll,
    refetch: refetchAll,
  } = useAllFormations(!isScopedPilote);
  const {
    data: formationsScoped = [],
    isLoading: loadingScoped,
    refetch: refetchScoped,
    error: scopedError,
  } = useMesFormationsPilote(isScopedPilote);
  useEffect(() => {
    if (scopedError) {
      const e = scopedError as { response?: { data?: { message?: string } }; message?: string };
      msgApi.error(
        e.response?.data?.message || e.message || 'Impossible de charger vos formations.',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedError]);
  const loading = loadingAll || loadingScoped;
  const refetchFormations = isScopedPilote ? refetchScoped : refetchAll;
  const formations = useMemo(
    () => (isScopedPilote ? formationsScoped : formationsAll),
    [isScopedPilote, formationsScoped, formationsAll],
  );

  const { data: formationsWithDocs = [] } = useFormationsWithDocuments();
  const documentsByFormation = useMemo(() => {
    const map = new Map<Id, FormationDocument[]>();
    for (const f of formationsWithDocs) {
      if (f.idFormation != null) map.set(f.idFormation, f.documents ?? []);
    }
    return map;
  }, [formationsWithDocs]);

  const deleteMut = useDeleteFormation();
  const exportMut = useExportFormations();

  const { data: upsData = [] } = useUps();
  const { data: deptsData = [] } = useDepartements();
  const upsOptions = useMemo(
    () =>
      upsData.map((u) => {
        const up = u as RefItem; // S4325: cast needed for compatibility
        return { id: up.id, libelle: up.libelle || up.nom || '_' };
      }),
    [upsData],
  );
  const deptsOptions = useMemo(
    () =>
      deptsData.map((d) => {
        const dept = d as RefItem; // S4325: cast needed for compatibility
        return { id: dept.id, libelle: dept.libelle || dept.nom || '_' };
      }),
    [deptsData],
  );

  const [filterText, setFilterText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [etatFilter, setEtatFilter] = useState<string | undefined>();
  const [upFilter, setUpFilter] = useState<Id | undefined>();
  const [deptFilter, setDeptFilter] = useState<Id | undefined>();
  const [periodFilter, setPeriodFilter] = useState<string | undefined>();
  const [periodRange, setPeriodRange] = useState<[Dayjs, Dayjs] | null>(null);

  const [openEdit, setOpenEdit] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const [openMail, setOpenMail] = useState(false);

  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);

  const filtered = useMemo(() => {
    let res = [...formations];
    if (filterText) {
      res = res.filter((f) =>
        (f.titreFormation || '').toLowerCase().includes(filterText.toLowerCase()),
      );
    }
    if (typeFilter) res = res.filter((f) => f.typeFormation === typeFilter);
    if (etatFilter) res = res.filter((f) => f.etatFormation === etatFilter);
    if (upFilter) res = res.filter((f) => f.up1?.id === upFilter);
    if (deptFilter) res = res.filter((f) => f.departement1?.id === deptFilter);
    if (periodFilter) res = res.filter((f) => f.periodCode === periodFilter);
    if (periodRange) {
      const [start, end] = periodRange;
      res = res.filter((f) => {
        const debut = dayjs(f.dateDebut);
        const fin = dayjs(f.dateFin);
        return !debut.isBefore(start, 'day') && !fin.isAfter(end, 'day');
      });
    }
    return res;
  }, [
    formations,
    filterText,
    typeFilter,
    etatFilter,
    upFilter,
    deptFilter,
    periodFilter,
    periodRange,
  ]);

  const stats = useMemo(() => {
    const list = filtered;
    return {
      total: list.length,
      interne: list.filter((f) => f.typeFormation === 'INTERNE').length,
      externe: list.filter((f) => f.typeFormation === 'EXTERNE').length,
      planifie: list.filter((f) => f.etatFormation === 'PLANIFIE').length,
      enCours: list.filter((f) => f.etatFormation === 'EN_COURS').length,
      acheve: list.filter((f) => f.etatFormation === 'ACHEVE').length,
      annule: list.filter((f) => f.etatFormation === 'ANNULE').length,
    };
  }, [filtered]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filterText)
      chips.push({
        key: 'text',
        label: `Texte : "${filterText}"`,
        onClear: () => setFilterText(''),
      });
    if (typeFilter)
      chips.push({
        key: 'type',
        label: `Type : ${typeFilter}`,
        onClear: () => setTypeFilter(undefined),
      });
    if (etatFilter)
      chips.push({
        key: 'etat',
        label: `État : ${etatFilter}`,
        onClear: () => setEtatFilter(undefined),
      });
    if (upFilter) {
      const up = upsOptions.find((u) => u.id === upFilter);
      chips.push({
        key: 'up',
        label: `UP : ${up?.libelle || upFilter}`,
        onClear: () => setUpFilter(undefined),
      });
    }
    if (deptFilter) {
      const dept = deptsOptions.find((d) => d.id === deptFilter);
      chips.push({
        key: 'dept',
        label: `Département : ${dept?.libelle || deptFilter}`,
        onClear: () => setDeptFilter(undefined),
      });
    }
    if (periodFilter) {
      const opt = PERIOD_OPTIONS.find((o) => o.value === periodFilter);
      chips.push({
        key: 'period',
        label: `Période : ${opt?.label || periodFilter}`,
        onClear: () => setPeriodFilter(undefined),
      });
    }
    if (periodRange) {
      const [s, e] = periodRange;
      chips.push({
        key: 'range',
        label: `Dates : ${s.format('DD/MM')} → ${e.format('DD/MM/YYYY')}`,
        onClear: () => setPeriodRange(null),
      });
    }
    return chips;
  }, [
    filterText,
    typeFilter,
    etatFilter,
    upFilter,
    deptFilter,
    periodFilter,
    periodRange,
    upsOptions,
    deptsOptions,
  ]);

  async function handleDelete(id: Id) {
    if (!canManageFormations) return;
    try {
      await deleteMut.mutateAsync(id);
      msgApi.success('Formation supprimée');
    } catch {
      msgApi.error('Erreur suppression');
    }
  }

  async function handleExport() {
    if (!periodRange) {
      msgApi.error('Veuillez spécifier début et fin.');
      return;
    }
    const [start, end] = periodRange.map((d) => d.format('YYYY-MM-DD'));
    try {
      const response = await exportMut.mutateAsync({ start, end });
      const blob = new Blob([response.data as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formations_${start}_${end}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(url);
      msgApi.success('✔️ Export réussi !');
      setOpenExport(false);
    } catch (error: unknown) {
      const e = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const apiMsg = e?.response?.data?.message || e?.response?.data?.error || e?.message;
      msgApi.error(`❌ Erreur export : ${apiMsg}`);
    }
  }

  const rowSelection = {
    type: 'radio' as const,
    selectedRowKeys: selectedFormation ? [selectedFormation.idFormation as Id] : [],
    onChange: (_: React.Key[], selectedRows: Formation[]) => {
      setSelectedFormation(selectedRows[0] || null);
    },
  };

  const columns: TableColumnsType<Formation> = [
    {
      title: 'Formation',
      key: 'formation',
      width: 260,
      render: (_, r) => (
        <div>
          <div className="formation-col-title">{r.titreFormation || '—'}</div>
          <div className="formation-col-subtitle">
            {r.up1?.libelle || ''}
            {r.departement1?.libelle ? ` · ${r.departement1.libelle}` : ''}
          </div>
        </div>
      ),
      sorter: (a, b) => (a.titreFormation || '').localeCompare(b.titreFormation || ''),
    },
    {
      title: 'Type',
      dataIndex: 'typeFormation',
      key: 'typeFormation',
      width: 110,
      render: (t: string) => {
        const c = TYPE_COLORS[t] ?? { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' };
        return (
          <Tag
            style={{
              color: c.color,
              background: c.bg,
              borderColor: c.border,
              borderRadius: 6,
              fontWeight: 500,
            }}
          >
            {t || '—'}
          </Tag>
        );
      },
      sorter: (a, b) => (a.typeFormation || '').localeCompare(b.typeFormation || ''),
    },
    {
      title: 'Période',
      key: 'periode',
      width: 130,
      render: (_, r) => {
        if (r.periodCode === 'OTHER') return <Tag>{r.customPeriodLabel || 'Autre'}</Tag>;
        const opt = PERIOD_OPTIONS.find((o) => o.value === r.periodCode);
        return opt ? <Tag>{opt.label}</Tag> : '—';
      },
      sorter: (a, b) => (a.periodCode || '').localeCompare(b.periodCode || ''),
    },
    {
      title: 'Dates',
      key: 'dates',
      width: 150,
      render: (_, r) => (
        <div className="formation-date-cell">
          <span className="formation-date-start">
            {r.dateDebut ? dayjs(r.dateDebut).format('DD/MM/YYYY') : '—'}
          </span>
          <span className="formation-date-end">
            {r.dateFin ? dayjs(r.dateFin).format('DD/MM/YYYY') : '—'}
          </span>
        </div>
      ),
      sorter: (a, b) => dayjs(a.dateDebut).valueOf() - dayjs(b.dateDebut).valueOf(),
    },
    {
      title: 'État',
      dataIndex: 'etatFormation',
      key: 'etatFormation',
      width: 120,
      render: (e: string) => (e ? <StatusBadge status={e} /> : <Tag>—</Tag>),
      sorter: (a, b) => (a.etatFormation || '').localeCompare(b.etatFormation || ''),
    },
    {
      title: 'Documents',
      key: 'documents',
      width: 170,
      align: 'center' as const,
      render: (_, r) => {
        const docs = documentsByFormation.get(r.idFormation as Id) ?? [];
        const count = docs.length;
        const obligCount = docs.filter((d) => d.obligation).length;
        const hasDocs = count > 0;
        return (
          <button
            type="button"
            className={`formation-doc-pill${hasDocs ? '' : ' formation-doc-pill-empty'}`}
            onClick={() => navigate(`/home/Formation/Consulter/${r.idFormation}/documents`)}
            disabled={!hasDocs}
            title={hasDocs ? 'Ouvrir la page des documents' : 'Aucun document'}
            aria-label="Ouvrir la page des documents"
          >
            <span className="formation-doc-pill-icon">
              <FolderOpenOutlined />
            </span>
            <span className="formation-doc-pill-body">
              <span className="formation-doc-pill-count">
                {count} doc{count === 1 ? '' : 's'}
              </span>
              {hasDocs && (
                <span className="formation-doc-pill-sub">
                  {obligCount} obligatoire{obligCount === 1 ? '' : 's'}
                </span>
              )}
            </span>
            {hasDocs && (
              <span className="formation-doc-pill-arrow">
                <ArrowRightOutlined />
              </span>
            )}
          </button>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (_, r) => {
        const role = normalizeRole(user?.role);
        const isResponsableDossier = role === 'responsabledossier';
        return canManageFormations || isResponsableDossier ? (
          <Space size={4}>
            {(canManageFormations || isResponsableDossier) && (
              <Button
                type="text"
                shape="circle"
                icon={<EditOutlined />}
                onClick={() => {
                  setSelectedFormation(r);
                  setOpenEdit(true);
                }}
                title={isResponsableDossier ? 'Gérer Dossier' : 'Modifier'}
                className="formation-btn-edit"
              />
            )}
            {canManageFormations && (
              <Popconfirm
                title="Supprimer cette formation ?"
                onConfirm={() => void handleDelete(r.idFormation!)}
              >
                <Button
                  type="text"
                  shape="circle"
                  icon={<DeleteOutlined />}
                  danger
                  className="formation-btn-delete"
                />
              </Popconfirm>
            )}
          </Space>
        ) : (
          <Tag color="blue" className="formation-tag-consultation">
            Consultation
          </Tag>
        );
      },
    },
  ];

  const resetFilters = () => {
    setFilterText('');
    setTypeFilter(undefined);
    setEtatFilter(undefined);
    setUpFilter(undefined);
    setDeptFilter(undefined);
    setPeriodFilter(undefined);
    setPeriodRange(null);
  };

  const hasActiveFilters =
    filterText || typeFilter || etatFilter || upFilter || deptFilter || periodFilter || periodRange;

  return (
    <div className="formation-consultation-page">
      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <AppPageHeader
        icon={<AppstoreOutlined />}
        title="Catalogue des Formations"
        subtitle={`${filtered.length} formation${filtered.length === 1 ? '' : 's'}${hasActiveFilters ? ' (filtrées)' : ''}`}
        actions={
          <Space size={8}>
            {canManageFormations && (
              <Button
                icon={<MailOutlined />}
                disabled={!selectedFormation}
                onClick={() => setOpenMail(true)}
                className="formation-btn-email"
              >
                Envoyer Email
              </Button>
            )}
            <Button
              icon={<DownloadOutlined />}
              onClick={() => setOpenExport(true)}
              className="formation-btn-export"
            >
              Exporter
            </Button>
            {canManageFormations && (
              <Button
                type="primary"
                icon={<PlusCircleOutlined />}
                onClick={() => navigate('/home/Formation/Creer')}
                className="formation-btn-create"
              >
                Nouvelle formation
              </Button>
            )}
          </Space>
        }
      />

      {/* ── Cartes de statistiques ───────────────────────────────────────── */}
      <div className="formation-stats-row">
        <StatCard
          icon={<BookOutlined />}
          iconColor="#b51200"
          accentColor="#b51200"
          label="Total formations"
          value={stats.total}
          subtext={hasActiveFilters ? 'résultats filtrés' : 'toutes périodes'}
        />
        <StatCard
          icon={<TeamOutlined />}
          iconColor="#2563eb"
          accentColor="#2563eb"
          label="Internes"
          value={stats.interne}
          subtext={`${stats.total > 0 ? Math.round((stats.interne / stats.total) * 100) : 0}% du total`}
        />
        <StatCard
          icon={<AppstoreOutlined />}
          iconColor="#7c3aed"
          accentColor="#7c3aed"
          label="Externes"
          value={stats.externe}
          subtext={`${stats.total > 0 ? Math.round((stats.externe / stats.total) * 100) : 0}% du total`}
        />
        <StatCard
          icon={<CheckCircleOutlined />}
          iconColor="#10b981"
          accentColor="#10b981"
          label="Planifiées / En cours"
          value={stats.planifie + stats.enCours}
          subtext={`${stats.planifie} planifiées, ${stats.enCours} en cours`}
        />
      </div>

      {/* ── Barre de filtres ─────────────────────────────────────────────── */}
      <div className="formation-filter-bar">
        <div className="formation-filter-header">
          <div className="formation-filter-title">
            <FilterOutlined />
            Filtres
            {hasActiveFilters && <span className="formation-filter-active-dot" />}
          </div>
          {hasActiveFilters && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={resetFilters}
              style={{ fontSize: 12, padding: '0 4px' }}
            >
              Réinitialiser
            </Button>
          )}
        </div>

        <div className="formation-filter-row">
          <Input.Search
            placeholder="Rechercher par titre..."
            allowClear
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            onSearch={setFilterText}
            style={{ width: 220 }}
          />
          <Select
            placeholder="Type"
            allowClear
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 130 }}
          >
            <Option value="INTERNE">Interne</Option>
            <Option value="EXTERNE">Externe</Option>
          </Select>
          <Select
            placeholder="État"
            allowClear
            value={etatFilter}
            onChange={setEtatFilter}
            style={{ width: 140 }}
          >
            <Option value="ENREGISTRE">Enregistré</Option>
            <Option value="PLANIFIE">Planifié</Option>
            <Option value="EN_COURS">En cours</Option>
            <Option value="ACHEVE">Achevé</Option>
            <Option value="ANNULE">Annulé</Option>
          </Select>
          <Select
            placeholder="Période"
            allowClear
            value={periodFilter}
            onChange={setPeriodFilter}
            style={{ width: 150 }}
          >
            {PERIOD_OPTIONS.map((o) => (
              <Option key={o.value} value={o.value}>
                {o.label}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="UP"
            allowClear
            value={upFilter as string}
            onChange={(v) => setUpFilter(v as Id)}
            style={{ width: 170 }}
            showSearch
            optionFilterProp="children"
          >
            {upsOptions.map((u) => (
              <Option key={String(u.id)} value={u.id as string}>
                {u.libelle}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="Département"
            allowClear
            value={deptFilter as string}
            onChange={(v) => setDeptFilter(v as Id)}
            style={{ width: 170 }}
            showSearch
            optionFilterProp="children"
          >
            {deptsOptions.map((d) => (
              <Option key={String(d.id)} value={d.id as string}>
                {d.libelle}
              </Option>
            ))}
          </Select>
          <RangePicker
            onChange={(dates) => setPeriodRange(dates as [Dayjs, Dayjs] | null)}
            placeholder={['Début', 'Fin']}
            style={{ width: 220 }}
          />
        </div>

        {/* ── Active filter chips ─────────────────────────────────────── */}
        {activeFilterChips.length > 0 && (
          <div className="formation-filter-chips">
            <span className="formation-filter-chips-label">
              <FilterOutlined /> Filtres actifs :
            </span>
            {activeFilterChips.map((chip) => (
              <span key={chip.key} className="formation-filter-chip">
                {chip.label}
                <button
                  type="button"
                  className="formation-filter-chip-close"
                  onClick={chip.onClear}
                  aria-label={`Retirer le filtre ${chip.label}`}
                >
                  <CloseOutlined />
                </button>
              </span>
            ))}
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={resetFilters}
              style={{ fontSize: 12, padding: '0 4px', marginLeft: 4 }}
            >
              Tout effacer
            </Button>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="formation-table-wrapper">
        <div className="formation-table-toolbar">
          <div className="formation-table-toolbar-left">
            <BookOutlined style={{ color: '#b51200' }} />
            <span className="formation-table-toolbar-title">
              {filtered.length} formation{filtered.length === 1 ? '' : 's'}
              {hasActiveFilters && (
                <span className="formation-table-toolbar-sub">
                  {' '}
                  (résultat filtré sur {formations.length})
                </span>
              )}
            </span>
          </div>
          <div className="formation-table-toolbar-right">
            {selectedFormation && (
              <Tag color="red" className="formation-table-toolbar-selected">
                1 sélectionnée : {selectedFormation.titreFormation}
              </Tag>
            )}
            <Tooltip title="Recharger la liste des formations">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => {
                  void refetchFormations();
                }}
                loading={loading}
              />
            </Tooltip>
          </div>
        </div>
        <Table<Formation>
          rowSelection={canManageFormations ? rowSelection : undefined}
          dataSource={filtered}
          columns={columns}
          rowKey="idFormation"
          loading={loading}
          size="middle"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} formation${total === 1 ? '' : 's'}`,
          }}
          locale={{
            emptyText: (
              <EmptyState
                icon={<AppstoreOutlined />}
                title="Aucune formation trouvée"
                description={
                  hasActiveFilters
                    ? 'Aucun résultat ne correspond aux filtres appliqués.'
                    : 'Aucune formation enregistrée pour le moment.'
                }
                action={
                  hasActiveFilters
                    ? { label: 'Effacer les filtres', onClick: resetFilters }
                    : undefined
                }
                compact
              />
            ),
          }}
          expandable={{
            expandedRowRender: renderExpandRow,
            rowExpandable: (record) => record.seances != null,
          }}
        />
      </div>

      {/* Drawer E-mail */}
      {canManageFormations && (
        <Drawer
          title="Envoyer un e-mail"
          placement="right"
          width={720}
          onClose={() => setOpenMail(false)}
          open={openMail}
          className="formation-drawer"
        >
          {selectedFormation && (
            <MailForm
              formation={
                selectedFormation as unknown as Parameters<typeof MailForm>[0]['formation']
              }
              onSendSuccess={() => {
                msgApi.success('E-mail envoyé !');
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
          width={960}
          onClose={() => setOpenEdit(false)}
          open={openEdit}
          className="formation-drawer formation-drawer--edit"
        >
          {selectedFormation && (
            <FormationWorkflowEditForm
              formation={
                selectedFormation as unknown as Parameters<
                  typeof FormationWorkflowEditForm
                >[0]['formation']
              }
              onFormationUpdated={() => {
                setOpenEdit(false);
                void refetchFormations();
              }}
            />
          )}
        </Drawer>
      )}

      {/* Modal Export */}
      <Modal
        title="Exporter en Excel"
        open={openExport}
        onOk={() => void handleExport()}
        onCancel={() => setOpenExport(false)}
        okText="Exporter"
        cancelText="Annuler"
      >
        <RangePicker
          style={{ width: '100%', marginTop: 8 }}
          onChange={(dates) => setPeriodRange(dates as [Dayjs, Dayjs] | null)}
        />
      </Modal>
    </div>
  );
}
