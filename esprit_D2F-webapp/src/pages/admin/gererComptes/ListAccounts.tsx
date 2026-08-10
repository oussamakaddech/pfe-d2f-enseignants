import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Table,
  Input,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Select,
  Popconfirm,
  Tooltip,
  Card,
  Row,
  Col,
  Divider,
} from 'antd';
import type { TableColumnsType, InputRef } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  StopOutlined,
  SolutionOutlined,
  ReloadOutlined,
  LockOutlined,
  UnlockOutlined,
  SortAscendingOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useAllAccounts } from '@/hooks/formation/useFormations';
import { useEnseignants, type Enseignant } from '@/hooks/enseignant/useEnseignants';
import { useAllDepts } from '@/hooks/formation/useDeptCrud';
import { useAllUps } from '@/hooks/formation/useUpCrud';
import EnseignantService from '@/services/formation/EnseignantService';
import {
  useBanAccount,
  useEnableAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '@/hooks/auth/useAuthService';
import useAppNotification from '@/hooks/ui/useAppNotification';
import CreateAccountDrawer, { ACCOUNT_ROLES } from '@/pages/admin/gererComptes/CreateAccountDrawer';
import { StatCard, RoleBadge, EmptyState } from '@/components/common';
import { brand, neutral } from '@/styles/themes/tokens';
import '@/styles/pages/list-accounts.css';
import type { Id } from '@/models/common';

const { Text } = Typography;
const { Option } = Select;

/** Rôles « enseignants » affichant la section profil métier (cf. CreateAccountDrawer). */
const TEACHER_ROLES = new Set(['ENSEIGNANT', 'ANIMATEUR']);
/** Responsables de structure : CUP dirige une UP, chef de département un département. */
const STRUCTURE_ROLES = new Set(['CUP', 'CHEF_DEPARTEMENT']);
const GRADE_OPTIONS = ['Assistant', 'Maître Assistant', 'Maître de Conférences', 'Professeur'];

type AccountStatus = 'ACTIF' | 'BLOQUÉ' | 'INCONNU';

interface Account {
  id?: Id;
  userId?: Id;
  userName?: string;
  firsName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  status?: AccountStatus;
}

function getAccountId(record: Account): string {
  return String(record.userId ?? record.id ?? '');
}

const handleSearchFilter = (selectedKeys: React.Key[], confirm: FilterDropdownProps['confirm']) => {
  confirm();
};
const handleReset = (clearFilters: (() => void) | undefined) => {
  clearFilters?.();
};
const renderFilterIcon = (filtered: boolean) => (
  <SearchOutlined style={{ color: filtered ? brand[500] : undefined }} />
);

function makeFilterDropdown(dataIndex: string, searchInputRef: React.RefObject<InputRef | null>) {
  return ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
    <div style={{ padding: 12 }}>
      <Input
        ref={searchInputRef}
        placeholder={`Rechercher ${dataIndex}`}
        value={selectedKeys[0]}
        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={() => handleSearchFilter(selectedKeys, confirm)}
        style={{ marginBottom: 8, display: 'block' }}
        allowClear
      />
      <Space>
        <Button
          type="primary"
          onClick={() => handleSearchFilter(selectedKeys, confirm)}
          icon={<SearchOutlined />}
          size="small"
        >
          OK
        </Button>
        <Button onClick={() => handleReset(clearFilters)} size="small">
          Réinitialiser
        </Button>
      </Space>
    </div>
  );
}

const STATUS_DOT_COLORS: Record<AccountStatus, string> = {
  ACTIF: '#10b981',
  BLOQUÉ: '#ef4444',
  INCONNU: '#9ca3af',
};

function AccountStatusBadge({ status }: Readonly<{ status: AccountStatus }>) {
  const isActive = status === 'ACTIF';
  return (
    <span className={isActive ? 'accounts-status-active' : 'accounts-status-blocked'}>
      <span
        aria-hidden="true"
        className={`accounts-status-dot ${isActive ? 'accounts-status-dot--active' : 'accounts-status-dot--blocked'}`}
      />
      {status}
    </span>
  );
}

type AccountSort = 'name_asc' | 'name_desc' | 'email_asc' | 'role_asc' | 'status';

const SORT_OPTIONS: { value: AccountSort; label: string }[] = [
  { value: 'name_asc', label: 'Nom (A → Z)' },
  { value: 'name_desc', label: 'Nom (Z → A)' },
  { value: 'email_asc', label: 'Email (A → Z)' },
  { value: 'role_asc', label: 'Rôle (A → Z)' },
  { value: 'status', label: "Statut (actifs d'abord)" },
];

function accountFullName(a: Account): string {
  return `${a.firsName || a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
}

function resolveFlag(
  isStructure: boolean,
  role: string,
  flagRole: string,
  fallback: unknown,
): unknown {
  if (isStructure) return role === flagRole ? 'O' : 'N';
  return fallback;
}

async function syncEnseignantProfile(
  fiche: { id?: unknown } | undefined,
  ficheData: Record<string, unknown>,
  msgApi: { success: (s: string) => void; warning: (s: string) => void },
): Promise<void> {
  try {
    if (fiche?.id == null) {
      await EnseignantService.createEnseignant(ficheData);
    } else {
      await EnseignantService.updateEnseignant(fiche.id as string, ficheData);
    }
    msgApi.success('Compte et profil mis à jour !');
  } catch (error_: unknown) {
    const pe = error_ as { response?: { data?: { message?: string } } };
    msgApi.warning(
      "Compte mis à jour, mais le profil n'a pas pu être enregistré" +
        (pe?.response?.data?.message ? ` (${pe.response.data.message})` : '') +
        '.',
    );
  }
}

export default function ListAccounts({ embedded = false }: { embedded?: boolean } = {}) {
  const { message: msgApi, modal } = useAppNotification();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AccountStatus>('ALL');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<AccountSort>('name_asc');
  const searchInput = useRef<InputRef>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Account | null>(null);
  const [editForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { data: allAccounts, isLoading, refetch: refetchAllAccounts } = useAllAccounts();
  const { data: enseignants = [] } = useEnseignants();

  const { data: depts = [] } = useAllDepts();
  const { data: ups = [] } = useAllUps();

  // Carte userId → fiche Enseignant complète (service formation). Sert à afficher
  // le département en liste ET à pré-remplir / mettre à jour le profil en édition.
  const enseignantByUserId = useMemo(() => {
    const map = new Map<string, Enseignant>();
    for (const e of enseignants) {
      const uid = (e as Record<string, unknown>).userId;
      if (uid != null) map.set(String(uid), e);
    }
    return map;
  }, [enseignants]);
  const deptByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const [uid, e] of enseignantByUserId) {
      if (e.deptLibelle) map.set(uid, e.deptLibelle);
    }
    return map;
  }, [enseignantByUserId]);
  const editRoleValue = Form.useWatch('role', editForm);
  const isEditTeacherRole = TEACHER_ROLES.has(String(editRoleValue ?? ''));
  const isEditStructureRole = STRUCTURE_ROLES.has(String(editRoleValue ?? ''));
  const { mutateAsync: banAccountApi } = useBanAccount();
  const { mutateAsync: enableAccountApi } = useEnableAccount();
  const { mutateAsync: deleteAccountApi } = useDeleteAccount();
  const { mutateAsync: updateAccountApi } = useUpdateAccount();

  useEffect(() => {
    if (allAccounts) {
      const normalized = (allAccounts as Account[]).map((acc) => {
        let statusValue: AccountStatus;
        if (typeof acc.status === 'boolean') {
          statusValue = (acc.status as unknown as boolean) ? 'BLOQUÉ' : 'ACTIF';
        } else if (typeof acc.status === 'string') {
          statusValue = acc.status;
        } else {
          statusValue = 'INCONNU';
        }
        return { ...acc, status: statusValue };
      });
      setAccounts(normalized);
    }
  }, [allAccounts]);

  const fetchAccounts = () => {
    void refetchAllAccounts();
  };

  const stats = useMemo(
    () => ({
      total: accounts.length,
      active: accounts.filter((a) => a.status === 'ACTIF').length,
      blocked: accounts.filter((a) => a.status === 'BLOQUÉ').length,
      admins: accounts.filter((a) => (a.role ?? '').toUpperCase() === 'ADMIN').length,
    }),
    [accounts],
  );

  const displayedAccounts = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    const roleSet = roleFilter.map((r) => r.toUpperCase());
    const filtered = accounts.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (roleSet.length && !roleSet.includes((a.role ?? '').toUpperCase())) return false;
      if (!term) return true;
      return (
        (a.userName ?? '').toLowerCase().includes(term) ||
        (a.firstName ?? '').toLowerCase().includes(term) ||
        (a.firsName ?? '').toLowerCase().includes(term) ||
        (a.lastName ?? '').toLowerCase().includes(term) ||
        (a.email ?? '').toLowerCase().includes(term) ||
        (a.role ?? '').toLowerCase().includes(term)
      );
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'name_asc':
        sorted.sort((a, b) => accountFullName(a).localeCompare(accountFullName(b)));
        break;
      case 'name_desc':
        sorted.sort((a, b) => accountFullName(b).localeCompare(accountFullName(a)));
        break;
      case 'email_asc':
        sorted.sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''));
        break;
      case 'role_asc':
        sorted.sort((a, b) => (a.role ?? '').localeCompare(b.role ?? ''));
        break;
      case 'status':
        sorted.sort((a, b) => Number(a.status === 'BLOQUÉ') - Number(b.status === 'BLOQUÉ'));
        break;
    }
    return sorted;
  }, [accounts, searchText, statusFilter, roleFilter, sortBy]);

  const hasActiveFilters = !!searchText || statusFilter !== 'ALL' || roleFilter.length > 0;

  const handleCreateSuccess = () => {
    setDrawerVisible(false);
    fetchAccounts();
  };

  const handleEdit = (record: Account) => {
    setEditingRecord(record);
    const fiche = enseignantByUserId.get(getAccountId(record)) as
      | Record<string, unknown>
      | undefined;
    editForm.setFieldsValue({
      firstName: record.firsName || record.firstName,
      lastName: record.lastName,
      email: record.email,
      phoneNumber: record.phoneNumber,
      role: (record.role ?? '').toUpperCase(),
      // Profil enseignant (pré-rempli depuis la fiche si elle existe)
      type: (fiche?.type as string) ?? 'P',
      etat: (fiche?.etat as string) ?? 'A',
      grade: fiche?.grade as string | undefined,
      specialite: fiche?.specialite as string | undefined,
      cup: (fiche?.cup as string) ?? 'N',
      chefDepartement: (fiche?.chefDepartement as string) ?? 'N',
      upId: fiche?.upId as string | undefined,
      deptId: fiche?.deptId as string | undefined,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      setLoading(true);
      const userId = editingRecord ? getAccountId(editingRecord) : '';
      await updateAccountApi({
        userId,
        data: {
          firstName: values.firstName as string,
          lastName: values.lastName as string,
          email: values.email as string,
          phoneNumber: values.phoneNumber as string,
        },
        role: values.role as string,
      });

      // Profil métier : pour un rôle enseignant/animateur OU responsable de
      // structure (CUP / chef de département), on met à jour la fiche liée (ou on
      // la crée si absente). Pour les responsables, l'indicateur cup/chefDepartement
      // est déduit du rôle. Un échec ici ne masque pas la réussite du compte.
      const roleStr = String(values.role ?? '');
      const isTeacher = TEACHER_ROLES.has(roleStr);
      const isStructure = STRUCTURE_ROLES.has(roleStr);
      if ((isTeacher || isStructure) && userId) {
        const fiche = enseignantByUserId.get(userId);
        const cupFlag = resolveFlag(isStructure, roleStr, 'CUP', values.cup);
        const chefFlag = resolveFlag(
          isStructure,
          roleStr,
          'CHEF_DEPARTEMENT',
          values.chefDepartement,
        );
        const ficheData: Record<string, unknown> = {
          nom: values.lastName as string,
          prenom: values.firstName as string,
          mail: values.email as string,
          telephone: values.phoneNumber as string,
          type: values.type,
          etat: values.etat,
          grade: values.grade,
          specialite: values.specialite,
          cup: cupFlag,
          chefDepartement: chefFlag,
          upId: values.upId,
          deptId: values.deptId,
          userId,
        };
        await syncEnseignantProfile(fiche, ficheData, msgApi);
      } else {
        msgApi.success('Compte modifié avec succès !');
      }

      setEditModalVisible(false);
      editForm.resetFields();
      setEditingRecord(null);
      fetchAccounts();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      msgApi.error(e?.response?.data?.message || 'Erreur de modification');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (userId: Id, fullName: string) => {
    modal.confirm({
      title: 'Supprimer définitivement ce compte ?',
      content: (
        <div>
          <p style={{ marginBottom: 6 }}>
            Le compte de <strong>{fullName}</strong> sera supprimé. Cette action est irréversible.
          </p>
          <p style={{ marginBottom: 0, color: neutral[600], fontSize: 13 }}>
            Pour le réutiliser plus tard, il faudra le recréer.
          </p>
        </div>
      ),
      okText: 'Supprimer',
      cancelText: 'Annuler',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          await deleteAccountApi(String(userId));
          msgApi.success('Compte supprimé avec succès !');
          fetchAccounts();
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string } } };
          msgApi.error(e?.response?.data?.message || 'Erreur de suppression');
        }
      },
    });
  };

  const handleToggleStatus = (record: Account) => {
    const willBlock = record.status === 'ACTIF';
    const fullName =
      `${record.firsName || record.firstName || ''} ${record.lastName || ''}`.trim() ||
      record.userName;
    modal.confirm({
      title: willBlock ? 'Bloquer ce compte ?' : 'Débloquer ce compte ?',
      content: (
        <div>
          <p style={{ marginBottom: 4 }}>
            {willBlock ? (
              <>
                Le compte de <strong>{fullName}</strong> ne pourra plus se connecter à
                l'application.
              </>
            ) : (
              <>
                Le compte de <strong>{fullName}</strong> pourra de nouveau se connecter à
                l'application.
              </>
            )}
          </p>
          <p style={{ marginBottom: 0, color: neutral[600], fontSize: 13 }}>
            {willBlock
              ? 'Vous pourrez le débloquer à tout moment.'
              : 'Ses accès et permissions seront restaurés.'}
          </p>
        </div>
      ),
      okText: willBlock ? 'Bloquer' : 'Débloquer',
      cancelText: 'Annuler',
      okButtonProps: willBlock ? { danger: true } : { type: 'primary' },
      centered: true,
      icon: willBlock ? (
        <StopOutlined style={{ color: '#f59e0b' }} />
      ) : (
        <CheckCircleOutlined style={{ color: '#10b981' }} />
      ),
      onOk: async () => {
        try {
          if (willBlock) {
            await banAccountApi(record.userName!);
            msgApi.success(`Compte de ${fullName} bloqué`);
          } else {
            await enableAccountApi(record.userName!);
            msgApi.success(`Compte de ${fullName} débloqué`);
          }
          fetchAccounts();
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string } } };
          msgApi.error(e?.response?.data?.message || 'Erreur de mise à jour');
        }
      },
    });
  };

  const getColumnSearchProps = (dataIndex: keyof Account) => ({
    filterDropdown: makeFilterDropdown(dataIndex as string, searchInput),
    filterIcon: renderFilterIcon,
    onFilter: (value: boolean | React.Key, record: Account) =>
      record[dataIndex]?.toString().toLowerCase().includes(String(value).toLowerCase()) ?? false,
  });

  const columns: TableColumnsType<Account> = [
    {
      title: 'Utilisateur',
      key: 'user',
      width: 280,
      render: (_: unknown, record: Account) => {
        const fullName =
          `${record.firsName || record.firstName || ''} ${record.lastName || ''}`.trim() || '—';
        const isActive = record.status === 'ACTIF';
        return (
          <div className="accounts-user-info">
            <div
              className={`accounts-user-avatar ${isActive ? 'accounts-user-avatar--active' : 'accounts-user-avatar--inactive'}`}
              aria-hidden="true"
            >
              {(record.firsName || record.firstName || record.userName || '?')
                .charAt(0)
                .toUpperCase()}
            </div>
            <div className="accounts-user-details">
              <div className="accounts-user-name">{fullName}</div>
              <div className="accounts-user-username">@{record.userName}</div>
            </div>
          </div>
        );
      },
      ...getColumnSearchProps('userName'),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      render: (text: string) =>
        text ? (
          <span className="accounts-email">
            <MailOutlined className="accounts-email-icon" />
            {text}
          </span>
        ) : (
          <span className="accounts-placeholder">—</span>
        ),
      ...getColumnSearchProps('email'),
    },
    {
      title: 'Téléphone',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 160,
      responsive: ['md'],
      render: (text: string) =>
        text ? (
          <span className="accounts-phone">
            <PhoneOutlined className="accounts-phone-icon" />
            {text}
          </span>
        ) : (
          <span className="accounts-placeholder">—</span>
        ),
    },
    {
      title: 'Rôle',
      dataIndex: 'role',
      key: 'role',
      width: 180,
      render: (role: string) => <RoleBadge role={role} />,
    },
    {
      title: 'Département',
      key: 'departement',
      width: 180,
      responsive: ['lg'],
      render: (_: unknown, record: Account) => {
        const role = (record.role ?? '').toUpperCase();
        if (role !== 'ENSEIGNANT' && role !== 'ANIMATEUR') {
          return <span className="accounts-placeholder">—</span>;
        }
        const dept = deptByUserId.get(getAccountId(record));
        return dept ? (
          <span className="accounts-dept">
            <BankOutlined className="accounts-dept-icon" />
            {dept}
          </span>
        ) : (
          <span className="accounts-dept-empty">Profil à configurer</span>
        );
      },
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: AccountStatus) => <AccountStatusBadge status={status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 130,
      render: (_: unknown, record: Account) => {
        const fullName =
          `${record.firsName || record.firstName || ''} ${record.lastName || ''}`.trim() ||
          record.userName ||
          'cet utilisateur';
        return (
          <Space size={6}>
            <Tooltip title="Modifier">
              <Button
                shape="circle"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                aria-label="Modifier"
                className="accounts-action-btn"
              />
            </Tooltip>
            <Tooltip title={record.status === 'ACTIF' ? 'Bloquer' : 'Débloquer'}>
              <Button
                shape="circle"
                icon={record.status === 'ACTIF' ? <LockOutlined /> : <UnlockOutlined />}
                onClick={() => handleToggleStatus(record)}
                aria-label={record.status === 'ACTIF' ? 'Bloquer' : 'Débloquer'}
                className={
                  record.status === 'ACTIF'
                    ? 'accounts-action-btn accounts-action-btn--block'
                    : 'accounts-action-btn accounts-action-btn--activate'
                }
              />
            </Tooltip>
            <Popconfirm
              title="Supprimer ?"
              description={`${fullName} sera définitivement supprimé.`}
              onConfirm={() => handleDelete(getAccountId(record), fullName)}
              okText="Supprimer"
              cancelText="Annuler"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Supprimer">
                <Button
                  shape="circle"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label="Supprimer"
                  className="accounts-action-btn accounts-action-btn--delete"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="accounts-page">
      {/* ── Hero header (masqué quand intégré dans la page unifiée) ── */}
      {!embedded && (
        <div className="accounts-hero">
          <div className="accounts-hero::before" aria-hidden="true" />
          <div className="accounts-hero::after" aria-hidden="true" />
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h2 className="accounts-hero-title">Gestion des utilisateurs</h2>
                <span className="accounts-hero-badge">
                  {stats.total}
                  <span className="accounts-hero-badge-total">
                    compte{stats.total === 1 ? '' : 's'}
                  </span>
                </span>
              </div>
              <div className="accounts-hero-subtitle">
                Administrer les comptes, rôles et accès à l'application
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Tooltip title="Rafraîchir la liste">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchAccounts}
                  className="accounts-btn-refresh"
                  aria-label="Rafraîchir"
                />
              </Tooltip>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setDrawerVisible(true)}
                className="accounts-btn-create"
              >
                Nouveau compte
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI stats ───────────────────────────────────────────────── */}
      <div className="accounts-stats">
        <StatCard
          icon={<TeamOutlined />}
          label="Total des comptes"
          value={stats.total}
          iconColor={brand[500]}
          accentColor={brand[500]}
        />
        <StatCard
          icon={<CheckCircleOutlined />}
          label="Comptes actifs"
          value={stats.active}
          iconColor="#10b981"
          accentColor="#10b981"
        />
        <StatCard
          icon={<StopOutlined />}
          label="Comptes bloqués"
          value={stats.blocked}
          iconColor="#ef4444"
          accentColor="#ef4444"
        />
        <StatCard
          icon={<SolutionOutlined />}
          label="Administrateurs"
          value={stats.admins}
          iconColor="#7c3aed"
          accentColor="#7c3aed"
        />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="accounts-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: neutral[400] }} />}
          placeholder="Rechercher (nom, email, rôle...)"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <Select
          mode="multiple"
          allowClear
          maxTagCount="responsive"
          value={roleFilter}
          onChange={setRoleFilter}
          placeholder="Tous les rôles"
          style={{ minWidth: 200 }}
          options={ACCOUNT_ROLES.map((r) => ({ value: r.value, label: r.label }))}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ minWidth: 160 }}
          options={[
            { value: 'ALL', label: 'Tous les statuts' },
            { value: 'ACTIF', label: 'Actifs uniquement' },
            { value: 'BLOQUÉ', label: 'Bloqués uniquement' },
          ]}
        />
        <Select
          value={sortBy}
          onChange={setSortBy}
          style={{ minWidth: 190 }}
          suffixIcon={<SortAscendingOutlined />}
          options={SORT_OPTIONS}
        />
        <span style={{ color: neutral[500], fontSize: 13 }}>
          {displayedAccounts.length} résultat{displayedAccounts.length === 1 ? '' : 's'}
        </span>
        {embedded && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Tooltip title="Rafraîchir la liste">
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchAccounts}
                className="accounts-btn-refresh"
                aria-label="Rafraîchir"
              />
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setDrawerVisible(true)}
              className="accounts-btn-create"
            >
              Nouveau compte
            </Button>
          </div>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <Card className="accounts-table-card">
        <Table<Account>
          rowKey="id"
          columns={columns}
          dataSource={displayedAccounts}
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} compte${total === 1 ? '' : 's'}`,
          }}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: (
              <EmptyState
                icon={<TeamOutlined />}
                title={hasActiveFilters ? 'Aucun résultat' : 'Aucun compte utilisateur'}
                description={
                  hasActiveFilters
                    ? 'Aucun compte ne correspond à vos critères de recherche.'
                    : "Commencez par créer un compte pour donner accès à l'application."
                }
                action={
                  hasActiveFilters
                    ? undefined
                    : {
                        label: 'Créer un compte',
                        icon: <PlusOutlined />,
                        onClick: () => setDrawerVisible(true),
                      }
                }
                compact
              />
            ),
          }}
        />
      </Card>

      {/* ── Create drawer ───────────────────────────────────────────── */}
      <CreateAccountDrawer
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* ── Edit modal ──────────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: brand[50],
                color: brand[500],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserOutlined />
            </div>
            <span>Modifier le compte</span>
          </Space>
        }
        open={editModalVisible}
        onOk={() => void handleEditSubmit()}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        confirmLoading={loading}
        okText="Enregistrer"
        cancelText="Annuler"
        centered
        width={520}
        destroyOnHidden
        okButtonProps={{
          style: { background: 'var(--btn-primary-gradient)', border: 'none', fontWeight: 600 },
        }}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="Prénom"
                rules={[{ required: true, message: 'Le prénom est requis' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Prénom" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Nom"
                rules={[{ required: true, message: 'Le nom est requis' }]}
              >
                <Input placeholder="Nom" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'Email valide requis' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="prenom.nom@esprit.tn" />
          </Form.Item>
          <Form.Item
            name="phoneNumber"
            label="Téléphone"
            rules={[{ required: true, message: 'Le téléphone est requis' }]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="0612345678" />
          </Form.Item>
          <Form.Item
            name="role"
            label="Rôle"
            rules={[{ required: true, message: 'Le rôle est requis' }]}
          >
            <Select placeholder="Sélectionner un rôle">
              {ACCOUNT_ROLES.map((r) => (
                <Option key={r.value} value={r.value}>
                  {r.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {isEditTeacherRole && (
            <>
              <Divider style={{ margin: '8px 0 16px' }}>Profil enseignant</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="type" label="Type">
                    <Select>
                      <Option value="P">Permanent (P)</Option>
                      <Option value="V">Vacataire (V)</Option>
                      <Option value="C">Contractuel (C)</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="etat" label="État">
                    <Select>
                      <Option value="A">Actif (A)</Option>
                      <Option value="I">Inactif (I)</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="grade" label="Grade académique">
                    <Select allowClear placeholder="Sélectionner un grade">
                      {GRADE_OPTIONS.map((g) => (
                        <Option key={g} value={g}>
                          {g}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="specialite" label="Spécialité">
                    <Input placeholder="Ex : Génie logiciel" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="cup" label="CUP (Chef d'UP)">
                    <Select>
                      <Option value="O">Oui</Option>
                      <Option value="N">Non</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="chefDepartement" label="Chef de département">
                    <Select>
                      <Option value="O">Oui</Option>
                      <Option value="N">Non</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="upId" label="Unité pédagogique">
                    <Select
                      allowClear
                      placeholder="Sélectionner une UP"
                      showSearch
                      optionFilterProp="children"
                    >
                      {ups.map((u) => (
                        <Option key={u.id} value={u.id}>
                          {u.libelle ?? u.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="deptId" label="Département">
                    <Select
                      allowClear
                      placeholder="Sélectionner un département"
                      showSearch
                      optionFilterProp="children"
                    >
                      {depts.map((d) => (
                        <Option key={d.id} value={d.id}>
                          {d.libelle ?? d.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {isEditStructureRole && (
            <>
              <Divider style={{ margin: '8px 0 16px' }}>Rattachement structurel</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="upId"
                    label="Unité pédagogique"
                    extra={editRoleValue === 'CUP' ? 'UP dirigée par ce CUP' : undefined}
                    rules={
                      editRoleValue === 'CUP'
                        ? [{ required: true, message: "Sélectionnez l'UP dirigée" }]
                        : undefined
                    }
                  >
                    <Select
                      allowClear
                      placeholder="Sélectionner une UP"
                      showSearch
                      optionFilterProp="children"
                    >
                      {ups.map((u) => (
                        <Option key={u.id} value={u.id}>
                          {u.libelle ?? u.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="deptId"
                    label="Département"
                    extra={
                      editRoleValue === 'CHEF_DEPARTEMENT'
                        ? 'Département dirigé par ce chef'
                        : undefined
                    }
                    rules={
                      editRoleValue === 'CHEF_DEPARTEMENT'
                        ? [{ required: true, message: 'Sélectionnez le département dirigé' }]
                        : undefined
                    }
                  >
                    <Select
                      allowClear
                      placeholder="Sélectionner un département"
                      showSearch
                      optionFilterProp="children"
                    >
                      {depts.map((d) => (
                        <Option key={d.id} value={d.id}>
                          {d.libelle ?? d.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
