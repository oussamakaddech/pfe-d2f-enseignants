import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Table, Input, Button, Space, Typography, Modal, Form, Select, Popconfirm,
  Tooltip, Card, Row, Col, Tag, Switch,
} from 'antd';
import type { TableColumnsType, InputRef } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined,
  MailOutlined, PhoneOutlined, TeamOutlined, CheckCircleOutlined,
  StopOutlined, SolutionOutlined, ReloadOutlined, LockOutlined,
  UnlockOutlined, SortAscendingOutlined, IdcardOutlined, BankOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAllAccounts } from "@/hooks/formation/useFormations";
import { useBanAccount, useEnableAccount, useDeleteAccount, usePermanentDeleteAccount, useUpdateAccount } from "@/hooks/auth/useAuthService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import EnseignantService from "@/services/formation/EnseignantService";
import useAppNotification from "@/hooks/ui/useAppNotification";
import CreateAccountDrawer, { ACCOUNT_ROLES } from "@/pages/admin/gererComptes/CreateAccountDrawer";
import TeacherEditModal from "@/components/enseignant/TeacherEditModal";
import { StatCard, RoleBadge } from "@/components/common";
import { brand, neutral } from "@/styles/themes/tokens";
import "@/styles/pages/list-accounts.css";
import "@/styles/pages/teachers-data-grid.css";
import type { Id } from "@/models/common";

const { Text } = Typography;
const { Option } = Select;

type AccountStatus = 'ACTIF' | 'BLOQUÉ' | 'INCONNU';

interface UnifiedRow {
  // 'merged' = compte + fiche enseignant liés (même userId) affichés sur une
  // seule ligne. Porte alors À LA FOIS les champs compte et les champs fiche :
  // userId = id du compte auth (actions compte), id = id de la fiche E00xxx (actions fiche).
  _type: 'account' | 'teacher' | 'merged';
  _key: string;
  /* account fields */
  userId?: Id;
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  status?: AccountStatus;
  /** Compte archivé (soft-deleted) — affiché seulement si le toggle est actif. */
  deleted?: boolean;
  /* teacher fields */
  id?: Id;
  nom?: string;
  prenom?: string;
  mail?: string;
  telephone?: string;
  type?: string;
  upLibelle?: string;
  deptLibelle?: string;
  cup?: string;
  chefDepartement?: string;
  grade?: string;
  upId?: Id;
  deptId?: Id;
  up?: { id: Id };
  dept?: { id: Id };
  etat?: string;
  [key: string]: unknown;
}

type UnifiedSort = "name_asc" | "name_desc" | "email_asc" | "role_asc" | "status" | "type" | "up" | "dept" | "source";

const SORT_OPTIONS: { value: UnifiedSort; label: string }[] = [
  { value: "name_asc",   label: "Nom (A → Z)" },
  { value: "name_desc",  label: "Nom (Z → A)" },
  { value: "email_asc",  label: "Email (A → Z)" },
  { value: "role_asc",   label: "Rôle/Type (A → Z)" },
  { value: "source",     label: "Source (Compte/Enseignant)" },
  { value: "status",     label: "Statut (actifs d'abord)" },
  { value: "type",       label: "Type enseignant" },
];

const TYPE_LABELS: Record<string, string> = { P: "Permanent", V: "Vacataire", C: "Contractuel" };
const isTruthyFlag = (v: unknown) => v === "O" || v === "Y" || v === "1";

function accountFullName(a: UnifiedRow): string {
  return `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
}

function teacherFullName(a: UnifiedRow): string {
  return `${a.nom || ""} ${a.prenom || ""}`.trim().toLowerCase();
}

function rowFullName(r: UnifiedRow): string {
  // merged & account : le nom du compte est renseigné ; sinon nom de la fiche.
  return r._type === 'teacher' ? teacherFullName(r) : accountFullName(r);
}

export default function UnifiedAdministrationPage() {
  const navigate = useNavigate();
  const { message: msgApi, modal } = useAppNotification();
  const queryClient = useQueryClient();

  /* ── Accounts state ── */
  const [accounts, setAccounts] = useState<UnifiedRow[]>([]);
  // Inclure les comptes archivés (soft-deleted) — visibilité/audit.
  const [showDeleted, setShowDeleted] = useState(false);
  const { data: allAccounts, isLoading: accountsLoading, refetch: refetchAccounts } = useAllAccounts(showDeleted);
  const { mutateAsync: banAccountApi } = useBanAccount();
  const { mutateAsync: enableAccountApi } = useEnableAccount();
  const { mutateAsync: deleteAccountApi } = useDeleteAccount();
  const { mutateAsync: permanentDeleteAccountApi } = usePermanentDeleteAccount();
  const { mutateAsync: updateAccountApi } = useUpdateAccount();

  /* ── Teachers state ── */
  const { data: teachers = [], isLoading: teachersLoading } = useQuery<UnifiedRow[]>({
    queryKey: ["enseignants"],
    queryFn: async () => {
      const raw = await EnseignantService.getAllEnseignants();
      const list = Array.isArray(raw) ? raw : Array.isArray((raw as { content?: unknown[] })?.content) ? (raw as { content: unknown[] }).content : [];
      return list as UnifiedRow[];
    },
  });

  /* ── Unified state ── */
  const [searchText, setSearchText] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "account" | "teacher">("ALL");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AccountStatus>("ALL");
  const [sortBy, setSortBy] = useState<UnifiedSort>("name_asc");
  const [drawerVisible, setDrawerVisible] = useState(false);

  /* Edit account */
  const [editAccountModalVisible, setEditAccountModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UnifiedRow | null>(null);
  const [editAccountForm] = Form.useForm();
  const [editAccountLoading, setEditAccountLoading] = useState(false);

  /* Edit teacher */
  const [editTeacherModalOpen, setEditTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<UnifiedRow | null>(null);
  const [editTeacherLoading, setEditTeacherLoading] = useState(false);
  const [editTeacherForm] = Form.useForm();

  const ups = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach(t => { if (t.upLibelle) set.add(t.upLibelle); });
    return Array.from(set).sort();
  }, [teachers]);

  const depts = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach(t => { if (t.deptLibelle) set.add(t.deptLibelle); });
    return Array.from(set).sort();
  }, [teachers]);

  /* ── Normalize accounts ── */
  useEffect(() => {
    if (allAccounts) {
      const normalized = (allAccounts as unknown as UnifiedRow[]).map((acc) => {
        let statusValue: AccountStatus;
        if (typeof acc.status === 'boolean') {
          statusValue = (acc.status as unknown as boolean) ? 'BLOQUÉ' : 'ACTIF';
        } else if (typeof acc.status === 'string') {
          statusValue = acc.status as AccountStatus;
        } else {
          statusValue = 'INCONNU';
        }
        const isDeleted = (acc as { deleted?: boolean }).deleted === true;
        return { ...acc, _type: 'account' as const, _key: `acc_${acc.userId ?? acc.id ?? Math.random()}`, status: statusValue, deleted: isDeleted };
      });
      setAccounts(normalized);
    }
  }, [allAccounts]);

  /* ── Build unified data ──
   * Une personne ayant à la fois un compte et une fiche enseignant liés (même
   * userId, ou à défaut même email) est affichée sur UNE seule ligne fusionnée
   * (_type 'merged') portant les champs des deux. Les comptes sans fiche et les
   * fiches sans compte restent des lignes simples. */
  const unifiedData = useMemo(() => {
    const accountAuthId = (a: UnifiedRow) => String(a.userId ?? a.id ?? "");
    const accountById = new Map<string, UnifiedRow>();
    const accountByEmail = new Map<string, UnifiedRow>();
    accounts.forEach(a => {
      // Un compte archivé ne se fusionne pas avec une fiche active : il reste
      // une ligne autonome marquée « Archivé ».
      if (a.deleted) return;
      const id = accountAuthId(a);
      if (id) accountById.set(id, a);
      const email = String(a.email ?? "").toLowerCase();
      if (email) accountByEmail.set(email, a);
    });

    const linkedAccountIds = new Set<string>();
    const rows: UnifiedRow[] = teachers.map(t => {
      const tUserId = String(t.userId ?? "");
      const tEmail = String(t.mail ?? "").toLowerCase();
      const acc = (tUserId ? accountById.get(tUserId) : undefined)
        ?? (tEmail ? accountByEmail.get(tEmail) : undefined);
      if (acc) {
        const accId = accountAuthId(acc);
        linkedAccountIds.add(accId);
        return {
          ...t,                       // champs fiche : id (E00xxx), nom, prenom, type, upLibelle…
          userId: accId,              // id du compte auth → actions compte (userId ?? id)
          userName: acc.userName,
          role: acc.role,
          status: acc.status,
          firstName: acc.firstName,
          lastName: acc.lastName,
          email: acc.email ?? t.mail,
          phoneNumber: acc.phoneNumber ?? t.telephone,
          _type: 'merged' as const,
          _key: `merged_${accId}_${t.id ?? ""}`,
        } as UnifiedRow;
      }
      return { ...t, _type: 'teacher' as const, _key: `tch_${t.id ?? Math.random()}` };
    });

    // Comptes sans fiche liée
    const accountRows = accounts.filter(a => !linkedAccountIds.has(accountAuthId(a)));
    return [...accountRows, ...rows];
  }, [accounts, teachers]);

  const isLoading = accountsLoading || teachersLoading;

  const stats = useMemo(() => ({
    totalAccounts: accounts.length,
    totalTeachers: teachers.length,
    activeAccounts: accounts.filter(a => a.status === 'ACTIF').length,
    blockedAccounts: accounts.filter(a => a.status === 'BLOQUÉ').length,
    admins: accounts.filter(a => (a.role ?? '').toUpperCase() === 'ADMIN').length,
    permTeachers: teachers.filter(t => t.type === 'P').length,
    vacTeachers: teachers.filter(t => t.type === 'V').length,
  }), [accounts, teachers]);

  /* ── Filtered & sorted data ── */
  const displayedData = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    const roleSet = roleFilter.map(r => r.toUpperCase());

    const filtered = unifiedData.filter(row => {
      // Une ligne fusionnée a les deux natures : elle passe le filtre Source
      // qu'on demande "account" ou "teacher".
      const hasAccount = row._type === 'account' || row._type === 'merged';
      const hasTeacher = row._type === 'teacher' || row._type === 'merged';
      if (sourceFilter === 'account' && !hasAccount) return false;
      if (sourceFilter === 'teacher' && !hasTeacher) return false;
      if (hasAccount) {
        if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
        if (roleSet.length && !roleSet.includes((row.role ?? "").toUpperCase())) return false;
      }
      if (hasTeacher) {
        if (typeFilter !== "ALL" && row.type !== typeFilter) return false;
      }
      if (!term) return true;
      const name = rowFullName(row).toLowerCase();
      const email = ((row.email || row.mail || "") as string).toLowerCase();
      const phone = ((row.phoneNumber || row.telephone || "") as string).toLowerCase();
      const username = (row.userName || "").toLowerCase();
      const role = (row.role || row.type || "").toLowerCase();
      return name.includes(term) || email.includes(term) || phone.includes(term) || username.includes(term) || role.includes(term);
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case "name_asc":
        sorted.sort((a, b) => rowFullName(a).localeCompare(rowFullName(b))); break;
      case "name_desc":
        sorted.sort((a, b) => rowFullName(b).localeCompare(rowFullName(a))); break;
      case "email_asc":
        sorted.sort((a, b) => ((a.email || a.mail || "") as string).localeCompare((b.email || b.mail || "") as string)); break;
      case "role_asc":
        sorted.sort((a, b) => ((a.role || a.type || "") as string).localeCompare((b.role || b.type || "") as string)); break;
      case "source":
        sorted.sort((a, b) => a._type.localeCompare(b._type)); break;
      case "status":
        sorted.sort((a, b) => {
          const aBlocked = a.status === 'BLOQUÉ' ? 1 : 0;
          const bBlocked = b.status === 'BLOQUÉ' ? 1 : 0;
          return aBlocked - bBlocked;
        }); break;
    }
    return sorted;
  }, [unifiedData, searchText, sourceFilter, roleFilter, typeFilter, statusFilter, sortBy]);

  const hasActiveFilters = !!searchText || sourceFilter !== "ALL" || roleFilter.length > 0 || typeFilter !== "ALL" || statusFilter !== "ALL";

  const fetchAll = () => { refetchAccounts(); queryClient.invalidateQueries({ queryKey: ["enseignants"] }); };

  /* ── Account actions ── */
  const handleCreateSuccess = () => { setDrawerVisible(false); fetchAll(); };

  const handleEditAccount = (record: UnifiedRow) => {
    setEditingAccount(record);
    editAccountForm.setFieldsValue({
      firstName: record.firstName,
      lastName: record.lastName,
      email: record.email,
      phoneNumber: record.phoneNumber,
      role: (record.role ?? "").toUpperCase(),
    });
    setEditAccountModalVisible(true);
  };

  const handleEditAccountSubmit = async () => {
    try {
      const values = await editAccountForm.validateFields();
      setEditAccountLoading(true);
      await updateAccountApi({
        userId: editingAccount ? String(editingAccount.userId ?? editingAccount.id ?? "") : "",
        data: {
          firstName: values.firstName as string,
          lastName: values.lastName as string,
          email: values.email as string,
          phoneNumber: values.phoneNumber as string,
        },
        role: values.role as string,
      });
      msgApi.success('Compte modifié avec succès !');
      setEditAccountModalVisible(false);
      editAccountForm.resetFields();
      setEditingAccount(null);
      fetchAll();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      msgApi.error(e?.response?.data?.message || 'Erreur de modification');
    } finally {
      setEditAccountLoading(false);
    }
  };

  const handleDeleteAccount = (record: UnifiedRow) => {
    const fullName = `${record.firstName || ""} ${record.lastName || ""}`.trim() || record.userName || "cet utilisateur";
    modal.confirm({
      title: "Supprimer définitivement ce compte ?",
      content: <p>Le compte de <strong>{fullName}</strong> sera supprimé. Cette action est irréversible.</p>,
      okText: "Supprimer", cancelText: "Annuler",
      okButtonProps: { danger: true }, centered: true,
      onOk: async () => {
        try {
          await deleteAccountApi(String(record.userId ?? record.id ?? ""));
          msgApi.success('Compte supprimé');
          fetchAll();
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string } } };
          msgApi.error(e?.response?.data?.message || 'Erreur de suppression');
        }
      },
    });
  };

  const handleToggleStatus = (record: UnifiedRow) => {
    const willBlock = record.status === 'ACTIF';
    const fullName = `${record.firstName || ""} ${record.lastName || ""}`.trim() || record.userName || "";
    modal.confirm({
      title: willBlock ? "Bloquer ce compte ?" : "Débloquer ce compte ?",
      content: willBlock
        ? <p>Le compte de <strong>{fullName}</strong> ne pourra plus se connecter.</p>
        : <p>Le compte de <strong>{fullName}</strong> pourra de nouveau se connecter.</p>,
      okText: willBlock ? "Bloquer" : "Débloquer",
      cancelText: "Annuler",
      okButtonProps: willBlock ? { danger: true } : { type: "primary" },
      centered: true,
      icon: willBlock ? <StopOutlined style={{ color: "#f59e0b" }} /> : <CheckCircleOutlined style={{ color: "#10b981" }} />,
      onOk: async () => {
        try {
          if (willBlock) {
            await banAccountApi(record.userName!);
            msgApi.success(`Compte de ${fullName} bloqué`);
          } else {
            await enableAccountApi(record.userName!);
            msgApi.success(`Compte de ${fullName} débloqué`);
          }
          fetchAll();
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string } } };
          msgApi.error(e?.response?.data?.message || 'Erreur');
        }
      },
    });
  };

  /* ── Teacher actions ── */
  const openEditTeacher = (record: UnifiedRow) => {
    setEditingTeacher(record);
    editTeacherForm.setFieldsValue({
      ...record,
      upId: record.upId ?? (record.up as { id: Id })?.id,
      deptId: record.deptId ?? (record.dept as { id: Id })?.id,
    });
    setEditTeacherModalOpen(true);
  };

  const handleEditTeacherSave = async () => {
    if (!editingTeacher?.id) return;
    setEditTeacherLoading(true);
    try {
      const values = await editTeacherForm.validateFields();
      await EnseignantService.updateEnseignant(String(editingTeacher.id), {
        id: values.id, nom: values.nom, prenom: values.prenom, mail: values.mail,
        type: values.type, etat: values.etat, cup: values.cup, chefDepartement: values.chefDepartement,
        grade: values.grade, telephone: values.telephone, photoUrl: values.photoUrl,
        upId: values.upId, deptId: values.deptId,
        up: values.upId ? { id: values.upId } : null,
        dept: values.deptId ? { id: values.deptId } : null,
      });
      await queryClient.invalidateQueries({ queryKey: ["enseignants"] });
      setEditTeacherModalOpen(false);
      setEditingTeacher(null);
    } finally {
      setEditTeacherLoading(false);
    }
  };

  const handleDeleteTeacher = async (record: UnifiedRow) => {
    if (!record.id) return;
    await EnseignantService.deleteEnseignant(String(record.id));
    await queryClient.invalidateQueries({ queryKey: ["enseignants"] });
    msgApi.success('Enseignant supprimé');
  };

  /* Suppression définitive d'un compte archivé (déjà soft-deleted). */
  const handlePermanentDeleteAccount = (record: UnifiedRow) => {
    const fullName = `${record.firstName || ""} ${record.lastName || ""}`.trim() || record.userName || "cet utilisateur";
    modal.confirm({
      title: "Supprimer définitivement ce compte archivé ?",
      content: <p>Le compte archivé de <strong>{fullName}</strong> sera définitivement effacé de la base de données. Cette action est irréversible.</p>,
      okText: "Supprimer", cancelText: "Annuler",
      okButtonProps: { danger: true }, centered: true,
      onOk: async () => {
        try {
          await permanentDeleteAccountApi(String(record.userId ?? record.id ?? ""));
          msgApi.success('Compte archivé définitivement supprimé');
          fetchAll();
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string } } };
          msgApi.error(e?.response?.data?.message || 'Erreur de suppression');
        }
      },
    });
  };

  /* Ligne fusionnée : suppression de la personne = compte + fiche. */
  const handleDeleteMerged = (record: UnifiedRow) => {
    const fullName = `${record.firstName || ""} ${record.lastName || ""}`.trim() || record.userName || "cette personne";
    modal.confirm({
      title: "Supprimer compte et fiche ?",
      content: <p>Le compte <strong>et</strong> la fiche enseignant de <strong>{fullName}</strong> seront supprimés. Cette action est irréversible.</p>,
      okText: "Supprimer", cancelText: "Annuler",
      okButtonProps: { danger: true }, centered: true,
      onOk: async () => {
        try {
          // Fiche d'abord (libère le lien), puis compte.
          if (record.id) await EnseignantService.deleteEnseignant(String(record.id));
          await deleteAccountApi(String(record.userId ?? ""));
          await queryClient.invalidateQueries({ queryKey: ["enseignants"] });
          msgApi.success(`Compte et fiche de ${fullName} supprimés`);
          fetchAll();
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string } } };
          msgApi.error(e?.response?.data?.message || 'Erreur de suppression');
        }
      },
    });
  };

  /* ── Columns ── */
  const columns: TableColumnsType<UnifiedRow> = [
    {
      title: 'Utilisateur',
      key: 'user',
      width: 300,
      render: (_, record) => {
        const isTeacherOnly = record._type === 'teacher';
        const isMerged = record._type === 'merged';
        const accountLike = !isTeacherOnly; // compte ou fusionné
        const name = accountLike
          ? (`${record.firstName || ""} ${record.lastName || ""}`.trim()
              || `${record.nom || ""} ${record.prenom || ""}`.trim() || "—")
          : (`${record.nom || ""} ${record.prenom || ""}`.trim() || "—");
        const initial = accountLike
          ? (record.firstName || record.userName || record.nom || "?").charAt(0).toUpperCase()
          : ((record.prenom || record.nom || "?").charAt(0).toUpperCase());
        const tagLabel = isMerged ? 'Compte + Fiche' : (accountLike ? 'Compte' : 'Enseignant');
        const tagColor = isMerged ? 'purple' : (accountLike ? 'volcano' : 'blue');
        const showCupChef = (isTeacherOnly || isMerged) && (isTruthyFlag(record.cup) || isTruthyFlag(record.chefDepartement));
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: accountLike ? brand[50] : '#eff6ff',
              color: accountLike ? brand[500] : '#2563eb',
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, flexShrink: 0,
              border: `1px solid ${accountLike ? 'rgba(181, 18, 0,0.18)' : 'rgba(37,99,235,0.18)'}`,
            }}>{initial}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: neutral[800], lineHeight: 1.3 }}>{name}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 2, alignItems: "center", flexWrap: "wrap" }}>
                <Tag color={tagColor} style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>
                  {tagLabel}
                </Tag>
                {record.deleted && (
                  <Tag color="default" style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>
                    Archivé
                  </Tag>
                )}
                {accountLike && record.userName && (
                  <span style={{ fontSize: 12, color: neutral[500] }}>@{record.userName}</span>
                )}
                {showCupChef && (
                  <>
                    {isTruthyFlag(record.cup) && <span className="teachers-badge teachers-badge--cup">CUP</span>}
                    {isTruthyFlag(record.chefDepartement) && <span className="teachers-badge teachers-badge--chef">Chef</span>}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 280,
      render: (_, record) => {
        const email = (record.email || record.mail || "") as string;
        const phone = (record.phoneNumber || record.telephone || "") as string;
        return (
          <div>
            {email ? (
              <div style={{ color: neutral[700], fontSize: 13, marginBottom: 2 }}>
                <MailOutlined style={{ marginRight: 6, color: brand[500], fontSize: 12 }} />
                {email}
              </div>
            ) : <div style={{ color: neutral[300], fontSize: 13 }}>—</div>}
            {phone ? (
              <div style={{ color: neutral[500], fontSize: 12 }}>
                <PhoneOutlined style={{ marginRight: 6, color: neutral[400], fontSize: 11 }} />
                {phone}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: 'Profil',
      key: 'profil',
      width: 180,
      render: (_, record) => {
        if (record._type === 'merged') {
          // Rôle du compte + type de la fiche
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
              <RoleBadge role={record.role ?? ""} />
              {getTypeTagComponent(record.type)}
            </div>
          );
        }
        if (record._type === 'account') {
          return <RoleBadge role={record.role ?? ""} />;
        }
        return getTypeTagComponent(record.type);
      },
    },
    {
      title: 'Statut',
      key: 'statut',
      width: 130,
      render: (_, record) => {
        // Pour une ligne fusionnée, le statut pertinent est celui du COMPTE
        // (capacité à se connecter). L'état de la fiche est secondaire.
        if (record._type === 'account' || record._type === 'merged') {
          return <AccountStatusBadgeComponent status={record.status ?? 'INCONNU'} />;
        }
        return record.etat === 'I'
          ? <Tag color="error">Inactif</Tag>
          : <Tag color="success">Actif</Tag>;
      },
    },
    {
      title: 'UP / Dépt',
      key: 'affectation',
      width: 200,
      responsive: ['md'] as ('md' | 'sm' | 'lg' | 'xl' | 'xxl')[],
      render: (_, record) => {
        if (record._type === 'teacher' || record._type === 'merged') {
          return (
            <div>
              {record.upLibelle && <div style={{ fontSize: 13, color: neutral[700] }}><BankOutlined style={{ marginRight: 6, fontSize: 11 }} />{record.upLibelle}</div>}
              {record.deptLibelle && <div style={{ fontSize: 12, color: neutral[500] }}>{record.deptLibelle}</div>}
              {!record.upLibelle && !record.deptLibelle && <span style={{ color: neutral[300] }}>—</span>}
            </div>
          );
        }
        return null;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 210,
      render: (_, record) => {
        // Compte archivé (soft-deleted) : uniquement suppression définitive.
        if (record.deleted) {
          return (
            <Space size={4}>
              <Tooltip title="Supprimer définitivement">
                <Button shape="circle" danger icon={<DeleteOutlined />} className="accounts-action-btn accounts-action-btn--delete"
                  onClick={() => handlePermanentDeleteAccount(record)} />
              </Tooltip>
            </Space>
          );
        }
        if (record._type === 'merged') {
          return (
            <Space size={2}>
              <Tooltip title="Modifier le compte (rôle, identité)">
                <Button shape="circle" icon={<EditOutlined />} onClick={() => handleEditAccount(record)} className="accounts-action-btn" />
              </Tooltip>
              <Tooltip title="Modifier la fiche (type, UP, dépt)">
                <Button shape="circle" icon={<SolutionOutlined />} onClick={() => openEditTeacher(record)} className="accounts-action-btn" />
              </Tooltip>
              <Tooltip title="Voir le calendrier">
                <Button shape="circle" icon={<CalendarOutlined />} onClick={() => navigate(`/home/calendar/${record.id}`)} className="accounts-action-btn" />
              </Tooltip>
              <Tooltip title={record.status === 'ACTIF' ? 'Bloquer le compte' : 'Débloquer le compte'}>
                <Button shape="circle" icon={record.status === 'ACTIF' ? <LockOutlined /> : <UnlockOutlined />}
                  onClick={() => handleToggleStatus(record)}
                  className={record.status === 'ACTIF' ? 'accounts-action-btn accounts-action-btn--block' : 'accounts-action-btn accounts-action-btn--activate'} />
              </Tooltip>
              <Tooltip title="Supprimer (compte + fiche)">
                <Button shape="circle" danger icon={<DeleteOutlined />} className="accounts-action-btn accounts-action-btn--delete"
                  onClick={() => handleDeleteMerged(record)} />
              </Tooltip>
            </Space>
          );
        }
        if (record._type === 'account') {
          const fullName = `${record.firstName || ""} ${record.lastName || ""}`.trim() || record.userName || "cet utilisateur";
          return (
            <Space size={4}>
              <Tooltip title="Modifier">
                <Button shape="circle" icon={<EditOutlined />} onClick={() => handleEditAccount(record)} className="accounts-action-btn" />
              </Tooltip>
              <Tooltip title={record.status === 'ACTIF' ? 'Bloquer' : 'Débloquer'}>
                <Button shape="circle" icon={record.status === 'ACTIF' ? <LockOutlined /> : <UnlockOutlined />}
                  onClick={() => handleToggleStatus(record)}
                  className={record.status === 'ACTIF' ? 'accounts-action-btn accounts-action-btn--block' : 'accounts-action-btn accounts-action-btn--activate'} />
              </Tooltip>
              <Popconfirm title="Supprimer ?" description={`${fullName} sera supprimé.`}
                onConfirm={() => handleDeleteAccount(record)} okText="Supprimer" cancelText="Annuler" okButtonProps={{ danger: true }}>
                <Tooltip title="Supprimer">
                  <Button shape="circle" danger icon={<DeleteOutlined />} className="accounts-action-btn accounts-action-btn--delete" />
                </Tooltip>
              </Popconfirm>
            </Space>
          );
        }
        return (
          <Space size={4}>
            <Tooltip title="Modifier">
              <Button type="text" icon={<EditOutlined />} className="teachers-btn-edit" onClick={() => openEditTeacher(record)} />
            </Tooltip>
            <Tooltip title="Voir calendrier">
              <Button type="text" icon={<CalendarOutlined />} className="teachers-btn-edit"
                onClick={() => navigate(`/home/calendar/${record.id}`)} />
            </Tooltip>
            <Popconfirm title="Supprimer ?" description={`${record.nom || ""} ${record.prenom || ""} sera supprimé.`}
              onConfirm={() => handleDeleteTeacher(record)} okText="Supprimer" cancelText="Annuler" okButtonProps={{ danger: true }}>
              <Tooltip title="Supprimer">
                <Button type="text" icon={<DeleteOutlined />} className="teachers-btn-delete" />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="accounts-page">
      {/* ── Hero header ── */}
      <div className="accounts-hero">
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h2 className="accounts-hero-title">Administration</h2>
              <span className="accounts-hero-badge">
                {stats.totalAccounts + stats.totalTeachers}
                <span className="accounts-hero-badge-total">entrées</span>
              </span>
            </div>
            <div className="accounts-hero-subtitle">Gérer les comptes utilisateurs et les fiches enseignants</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Tooltip title="Rafraîchir">
              <Button icon={<ReloadOutlined />} onClick={fetchAll} className="accounts-btn-refresh" />
            </Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerVisible(true)} className="accounts-btn-create">
              Nouveau compte
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="accounts-stats">
        <StatCard icon={<IdcardOutlined />} label="Total comptes" value={stats.totalAccounts} iconColor={brand[500]} accentColor={brand[500]} />
        <StatCard icon={<CheckCircleOutlined />} label="Comptes actifs" value={stats.activeAccounts} iconColor="#10b981" accentColor="#10b981" />
        <StatCard icon={<StopOutlined />} label="Comptes bloqués" value={stats.blockedAccounts} iconColor="#ef4444" accentColor="#ef4444" />
        <StatCard icon={<SolutionOutlined />} label="Administrateurs" value={stats.admins} iconColor="#7c3aed" accentColor="#7c3aed" />
        <StatCard icon={<TeamOutlined />} label="Enseignants" value={stats.totalTeachers} iconColor="#2563eb" accentColor="#2563eb" />
        <StatCard icon={<UserOutlined />} label="Permanents" value={stats.permTeachers} iconColor="#2563eb" accentColor="#2563eb" />
        <StatCard icon={<UserOutlined />} label="Vacataires" value={stats.vacTeachers} iconColor="#d97706" accentColor="#d97706" />
      </div>

      {/* ── Toolbar ── */}
      <div className="accounts-toolbar">
        <Input allowClear prefix={<SearchOutlined style={{ color: neutral[400] }} />}
          placeholder="Rechercher (nom, email, téléphone...)"
          value={searchText} onChange={e => setSearchText(e.target.value)} style={{ maxWidth: 300 }} />
        <Select value={sourceFilter} onChange={setSourceFilter} style={{ minWidth: 150 }}
          options={[
            { value: "ALL", label: "Tous" },
            { value: "account", label: "Comptes uniquement" },
            { value: "teacher", label: "Enseignants uniquement" },
          ]} />
        <Select mode="multiple" allowClear maxTagCount="responsive" value={roleFilter} onChange={setRoleFilter}
          placeholder="Rôle" style={{ minWidth: 160 }}
          options={ACCOUNT_ROLES.map(r => ({ value: r.value, label: r.label }))} />
        <Select value={typeFilter} onChange={setTypeFilter} style={{ minWidth: 150 }}
          options={[
            { value: "ALL", label: "Type enseignant" },
            { value: "P", label: "Permanent" },
            { value: "V", label: "Vacataire" },
            { value: "C", label: "Contractuel" },
          ]} />
        <Select value={sortBy} onChange={setSortBy} style={{ minWidth: 190 }}
          suffixIcon={<SortAscendingOutlined />} options={SORT_OPTIONS} />
        <Tooltip title="Afficher aussi les comptes supprimés (archivés)">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: neutral[600], fontSize: 13 }}>
            <Switch size="small" checked={showDeleted} onChange={setShowDeleted} />
            Comptes archivés
          </span>
        </Tooltip>
        <span style={{ color: neutral[500], fontSize: 13, marginLeft: 'auto' }}>
          {displayedData.length} résultat{displayedData.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* ── Table ── */}
      <Card className="accounts-table-card">
        <Table<UnifiedRow>
          rowKey="_key"
          columns={columns}
          dataSource={displayedData}
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} entrée${total === 1 ? "" : "s"}`,
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: hasActiveFilters
              ? "Aucun résultat ne correspond aux filtres."
              : "Aucune donnée. Commencez par créer un compte ou importer des enseignants.",
          }}
        />
      </Card>

      {/* ── Create Account Drawer ── */}
      <CreateAccountDrawer open={drawerVisible} onClose={() => setDrawerVisible(false)} onSuccess={handleCreateSuccess} />

      {/* ── Edit Account Modal ── */}
      <Modal title={<Space><div style={{ width: 32, height: 32, borderRadius: 8, background: brand[50], color: brand[500], display: "flex", alignItems: "center", justifyContent: "center" }}><UserOutlined /></div><span>Modifier le compte</span></Space>}
        open={editAccountModalVisible}
        onOk={() => void handleEditAccountSubmit()} onCancel={() => { setEditAccountModalVisible(false); editAccountForm.resetFields(); }}
        confirmLoading={editAccountLoading} okText="Enregistrer" cancelText="Annuler" centered width={520} destroyOnHidden>
        <Form form={editAccountForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="firstName" label="Prénom" rules={[{ required: true, message: "Le prénom est requis" }]}><Input placeholder="Prénom" /></Form.Item></Col>
            <Col span={12}><Form.Item name="lastName" label="Nom" rules={[{ required: true, message: "Le nom est requis" }]}><Input placeholder="Nom" /></Form.Item></Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: "Email valide requis" }]}><Input placeholder="prenom.nom@esprit.tn" /></Form.Item>
          <Form.Item name="phoneNumber" label="Téléphone" rules={[{ required: true, message: "Le téléphone est requis" }]}><Input placeholder="0612345678" /></Form.Item>
          <Form.Item name="role" label="Rôle" rules={[{ required: true, message: "Le rôle est requis" }]}>
            <Select placeholder="Sélectionner un rôle">{ACCOUNT_ROLES.map(r => <Option key={r.value} value={r.value}>{r.label}</Option>)}</Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Edit Teacher Modal ── */}
      <TeacherEditModal
        open={editTeacherModalOpen}
        record={editingTeacher as unknown as Record<string, unknown>}
        confirmLoading={editTeacherLoading}
        form={editTeacherForm}
        ups={ups.map(u => ({ id: u, libelle: u }))}
        depts={depts.map(d => ({ id: d, libelle: d }))}
        onOk={handleEditTeacherSave}
        onCancel={() => { setEditTeacherModalOpen(false); setEditingTeacher(null); }}
      />
    </div>
  );
}

/* ── Helper components ── */

function AccountStatusBadgeComponent({ status }: { status: AccountStatus }) {
  const colors: Record<AccountStatus, string> = { ACTIF: "#10b981", BLOQUÉ: "#ef4444", INCONNU: "#9ca3af" };
  const isActive = status === "ACTIF";
  return (
    <span className={isActive ? "accounts-status-active" : "accounts-status-blocked"}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors[status], display: "inline-block" }} />
      {status}
    </span>
  );
}

function getTypeTagComponent(type?: string) {
  if (type === "P") return <span className="teachers-type-tag teachers-type-tag--perm"><span className="teachers-type-dot teachers-type-dot--perm" /> Permanent</span>;
  if (type === "V") return <span className="teachers-type-tag teachers-type-tag--vac"><span className="teachers-type-dot teachers-type-dot--vac" /> Vacataire</span>;
  if (type === "C") return <span className="teachers-type-tag teachers-type-tag--cont"><span className="teachers-type-dot teachers-type-dot--cont" /> Contractuel</span>;
  return type || <span style={{ color: neutral[300] }}>—</span>;
}
