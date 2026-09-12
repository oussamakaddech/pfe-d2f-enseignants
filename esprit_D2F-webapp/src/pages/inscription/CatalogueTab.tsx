import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Space,
  Select,
  DatePicker,
  Input,
  Badge,
  Typography,
  Tag,
  Button,
} from 'antd';
import {
  EyeOutlined,
  UnlockOutlined,
  LockOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  CalendarOutlined,
  ApartmentOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useFormationsVisibles,
  useAllFormations,
  useFormationsParUp,
  useUpdateInscriptionsOuvertes,
} from '@/hooks/formation/useFormations';
import {
  useProfile,
  useDemanderInscription,
  useFormationsAccessibles,
  useInscriptionsByEnseignant,
} from '@/hooks/formation/useFormationExtras';
import { useEnseignantById } from '@/hooks/enseignant/useEnseignants';
import { normalizeRole } from '@/utils/constants/roles';
import { PageLoader, EmptyStateStandard } from '@/components/common';
import useAppNotification from '@/hooks/ui/useAppNotification';
import type { Id } from '@/models/common';
import type { Dayjs } from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface FormationItem {
  idFormation?: Id;
  titreFormation?: string;
  typeFormation?: string;
  dateDebut?: string;
  dateFin?: string;
  ouverte?: boolean;
  inscriptionsOuvertes?: boolean;
  etatFormation?: string;
  up?: { libelle?: string };
  departement?: { libelle?: string };
}

interface EnseignantData {
  up?: { id?: Id };
  [key: string]: unknown;
}

function getTypeClass(type?: string) {
  if (!type) return 'type-default';
  return `type-${String(type).toUpperCase().replaceAll(/\s/g, '_')}`;
}

function daysUntilStart(dateDebut?: string): number | null {
  if (!dateDebut) return null;
  const start = dayjs(dateDebut);
  return start.isValid() ? start.startOf('day').diff(dayjs().startOf('day'), 'day') : null;
}

function filterFormations(
  list: FormationItem[],
  search: string,
  type?: string,
  up?: string,
  dept?: string,
  ouverte?: boolean,
  dateRange: Dayjs[] = [],
): FormationItem[] {
  return list.filter((f) => {
    if (search && !f.titreFormation?.toLowerCase().includes(search.toLowerCase())) return false;
    if (type && f.typeFormation !== type) return false;
    if (up && f.up?.libelle !== up) return false;
    if (dept && f.departement?.libelle !== dept) return false;
    if (ouverte !== undefined && f.ouverte !== ouverte) return false;
    if (dateRange.length === 2) {
      const d = dayjs(f.dateDebut);
      if (d.isBefore(dateRange[0], 'day') || d.isAfter(dateRange[1], 'day')) return false;
    }
    return true;
  });
}

export default function CatalogueTab() {
  const navigate = useNavigate();
  const { message: msgApi } = useAppNotification();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const role = normalizeRole(profile?.role);
  const identifier = profile?.emailAddress || profile?.email || profile?.id;

  // Spécification entreprise : TOUS les rôles peuvent s'inscrire et participer
  // à une formation SAUF l'ADMIN et le RESPONSABLE_DOSSIER (gestionnaires).
  // Le backend revalide l'appartenance au périmètre (UP OU département).
  const isInscribableRole =
    role === 'enseignant' ||
    role === 'animateur' ||
    role === 'cup' ||
    role === 'chefdepartement' ||
    role === 'formateur';
  const isAdminLike = role === 'admin' || role === 'cup';

  const { data: enseignant } = useEnseignantById(role === 'cup' ? identifier : undefined);
  const { data: parUp } = useFormationsParUp((enseignant as EnseignantData | undefined)?.up?.id);
  // Catalogue scopé serveur pour tous les rôles inscriptibles : le backend ne
  // renvoie que les formations inscriptibles de leur périmètre (UP OU
  // département), évitant l'erreur « pas autorisé » sur des formations hors
  // périmètre.
  const { data: accessibles } = useFormationsAccessibles(
    isInscribableRole ? identifier : undefined,
  );
  const { data: visibles, isLoading: visiblesLoading } = useFormationsVisibles();
  const { data: all } = useAllFormations();
  const { mutateAsync: updateOuvertes } = useUpdateInscriptionsOuvertes();
  const { mutateAsync: demanderMutation } = useDemanderInscription();

  const { data: enseignantSelf } = useEnseignantById(isInscribableRole ? identifier : undefined);
  const { data: myInscriptions = [] } = useInscriptionsByEnseignant(
    (enseignantSelf as { id?: Id } | undefined)?.id,
  );
  const [requested, setRequested] = useState<Id[]>([]);

  const requestedServer = useMemo(() => {
    const s = new Set<string>();
    (myInscriptions as Array<{ formationId?: string; etat?: string }>).forEach((i) => {
      if (i.formationId && i.etat !== 'REJECTED') s.add(String(i.formationId));
    });
    return s;
  }, [myInscriptions]);

  const formationsList = useMemo(() => {
    let data: FormationItem[];
    // Tous les rôles inscriptibles sauf CUP : catalogue serveur filtré par
    // périmètre UP OU département.
    if (isInscribableRole && role !== 'cup') {
      data = (accessibles as FormationItem[]) ?? [];
    } else if (role === 'cup') {
      // CUP : vue gestion de son UP (il peut aussi s'inscrire — bouton dédié).
      data = (parUp as FormationItem[]) ?? [];
    } else {
      data = (visibles as FormationItem[]) ?? [];
      if (role === 'admin' && data.length === 0) data = (all as FormationItem[]) ?? [];
    }
    const list = Array.isArray(data) ? data : [];
    // Les formations achevées (ou annulées) ne sont plus proposées à
    // l'inscription — page « Gestion Inscriptions » réservée au actif.
    const notFinished = list.filter(
      (f) => f.etatFormation !== 'ACHEVE' && f.etatFormation !== 'ANNULE',
    );
    // Rôles inscriptibles : seules les formations avec inscriptions ouvertes
    // sont proposées (parité backend demanderInscription).
    return isInscribableRole
      ? notFinished.filter((f) => f.inscriptionsOuvertes === true)
      : notFinished;
  }, [role, isInscribableRole, parUp, accessibles, visibles, all]);

  const loading = profileLoading || visiblesLoading;

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>();
  const [upFilter, setUpFilter] = useState<string>();
  const [deptFilter, setDeptFilter] = useState<string>();
  const [ouverteFilter, setOuverteFilter] = useState<boolean>();
  const [dateRange, setDateRange] = useState<Dayjs[]>([]);

  const filtered = filterFormations(
    formationsList,
    search,
    typeFilter,
    upFilter,
    deptFilter,
    ouverteFilter,
    dateRange,
  );

  const types = useMemo(
    () =>
      [...new Set(formationsList.map((f) => f.typeFormation).filter(Boolean))].map((t) => ({
        label: t as string,
        value: t as string,
      })),
    [formationsList],
  );
  const ups = useMemo(
    () =>
      [...new Set(formationsList.map((f) => f.up?.libelle).filter(Boolean))].map((u) => ({
        label: u as string,
        value: u as string,
      })),
    [formationsList],
  );
  const depts = useMemo(
    () =>
      [...new Set(formationsList.map((f) => f.departement?.libelle).filter(Boolean))].map((d) => ({
        label: d as string,
        value: d as string,
      })),
    [formationsList],
  );

  const handleToggle = async (id: Id) => {
    try {
      const cur = formationsList.find((f) => f.idFormation === id);
      if (!cur) return;
      await updateOuvertes({ id, ouvert: !cur.inscriptionsOuvertes });
      msgApi.success(cur.inscriptionsOuvertes ? 'Inscriptions fermées' : 'Inscriptions ouvertes');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      msgApi.error(e?.response?.data?.message || 'Échec de la mise à jour');
    }
  };

  const handleDemande = async (id: Id) => {
    try {
      await demanderMutation({ formationId: id, enseignantId: identifier as Id });
      setRequested((prev) => [...prev, id]);
      msgApi.success("Demande d'inscription envoyée !");
    } catch (err: unknown) {
      setRequested((prev) => prev.filter((r) => r !== id));
      const e = err as { response?: { data?: { message?: string } } };
      msgApi.error(e?.response?.data?.message || 'Échec de la demande');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setTypeFilter(undefined);
    setUpFilter(undefined);
    setDeptFilter(undefined);
    setOuverteFilter(undefined);
    setDateRange([]);
  };

  if (loading) return <PageLoader tip="Chargement des formations..." />;
  if (!formationsList.length) {
    return (
      <EmptyStateStandard
        title={isInscribableRole ? 'Aucune formation ouverte' : 'Aucune formation disponible'}
        description={
          isInscribableRole
            ? 'Aucune formation inscriptible dans votre périmètre (UP ou département).'
            : 'Créez une formation pour commencer.'
        }
      />
    );
  }

  return (
    <div className="cat-page">
      <div className="cat-filters">
        <SearchOutlined className="cat-filters-icon" />
        <Input.Search
          placeholder="Rechercher une formation…"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={setSearch}
          style={{ width: 240 }}
        />
        <Select
          placeholder="Type"
          options={types}
          allowClear
          value={typeFilter}
          onChange={setTypeFilter}
          style={{ width: 140 }}
        />
        <Select
          placeholder="UP"
          options={ups}
          allowClear
          value={upFilter}
          onChange={setUpFilter}
          style={{ width: 160 }}
        />
        <Select
          placeholder="Département"
          options={depts}
          allowClear
          value={deptFilter}
          onChange={setDeptFilter}
          style={{ width: 160 }}
        />
        <Select
          placeholder="Inscriptions"
          allowClear
          value={ouverteFilter}
          onChange={setOuverteFilter}
          style={{ width: 150 }}
          options={[
            { label: 'Ouvertes', value: true },
            { label: 'Fermées', value: false },
          ]}
        />
        <RangePicker
          value={dateRange.length === 2 ? [dateRange[0], dateRange[1]] : null}
          onChange={(d) => setDateRange(d?.filter((v): v is Dayjs => v !== null) ?? [])}
        />
        <div className="cat-filters-divider" />
        <Button icon={<ReloadOutlined />} onClick={resetFilters} className="ins-btn">
          Réinitialiser
        </Button>
      </div>

      <Row gutter={[20, 20]}>
        {filtered.map((f) => {
          const isOpen = f.inscriptionsOuvertes;
          return (
            <Col key={String(f.idFormation)} xs={24} sm={12} md={8} lg={6}>
              <Card className="cat-card" styles={{ body: { padding: 0 } }}>
                <div className={`cat-card-header ${getTypeClass(f.typeFormation)}`}>
                  <Tag className="cat-card-type">{f.typeFormation || '—'}</Tag>
                  <Badge status={isOpen ? 'success' : 'error'} text={isOpen ? 'Ouvert' : 'Fermé'} />
                </div>
                <div className="cat-card-body">
                  <div className="cat-card-title">{f.titreFormation}</div>
                  <div className="cat-card-meta">
                    <span>
                      <CalendarOutlined />{' '}
                      {f.dateDebut ? dayjs(f.dateDebut).format('DD/MM/YYYY') : '—'} →{' '}
                      {f.dateFin ? dayjs(f.dateFin).format('DD/MM/YYYY') : '—'}
                    </span>
                    <span>
                      <ApartmentOutlined /> {f.departement?.libelle || '—'}
                    </span>
                    <span>
                      <TeamOutlined /> {f.up?.libelle || '—'}
                    </span>
                  </div>
                  <div className="cat-card-tags">
                    <Badge
                      status={isOpen ? 'success' : 'error'}
                      text={isOpen ? 'Inscriptions ouvertes' : 'Fermées'}
                    />
                    {isOpen && (
                      <Tag color="success" className="blink">
                        Actif
                      </Tag>
                    )}
                    {(() => {
                      const d = daysUntilStart(f.dateDebut);
                      if (d === null || !isOpen || d > 7) return null;
                      return (
                        <Tag icon={<ThunderboltOutlined />} color="warning" className="blink">
                          {(() => {
                            if (d === 0) return "Démarre aujourd'hui";
                            if (d < 0) return `Démarré il y a ${-d} j`;
                            return `Démarre dans ${d} j`;
                          })()}
                        </Tag>
                      );
                    })()}
                  </div>
                </div>
                <div className="cat-card-actions">
                  <Space size={8} wrap>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/home/ListeFormation/${f.idFormation}`)}
                    >
                      Détails
                    </Button>
                    {isInscribableRole &&
                      isOpen &&
                      (requested.includes(f.idFormation!) ||
                      requestedServer.has(String(f.idFormation)) ? (
                        <Button size="small" disabled icon={<CheckCircleOutlined />}>
                          Envoyée
                        </Button>
                      ) : (
                        <Button
                          type="primary"
                          size="small"
                          icon={<UserAddOutlined />}
                          onClick={() => f.idFormation != null && handleDemande(f.idFormation)}
                        >
                          S'inscrire
                        </Button>
                      ))}
                    {isAdminLike && (
                      <Button
                        size="small"
                        danger={!!isOpen}
                        icon={isOpen ? <LockOutlined /> : <UnlockOutlined />}
                        onClick={() => f.idFormation != null && handleToggle(f.idFormation)}
                      >
                        {isOpen ? 'Fermer' : 'Ouvrir'}
                      </Button>
                    )}
                    {isAdminLike && (
                      <Button
                        size="small"
                        icon={<TeamOutlined />}
                        onClick={() => navigate(`/home/ListeFormation/${f.idFormation}/demandes`)}
                      >
                        Demandes
                      </Button>
                    )}
                  </Space>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {filtered.length === 0 && (
        <EmptyStateStandard
          title="Aucun résultat"
          description="Aucune formation ne correspond aux filtres."
        />
      )}
    </div>
  );
}
