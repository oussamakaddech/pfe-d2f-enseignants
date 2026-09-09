import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Tag,
  Alert,
  Input,
  Statistic,
  Table,
  Segmented,
  Progress,
  Tooltip,
  Avatar,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ReloadOutlined,
  PlusOutlined,
  BellOutlined,
  SearchOutlined,
  BookOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  RiseOutlined,
  ApartmentOutlined,
  ThunderboltOutlined,
  RightOutlined,
  NodeIndexOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useAuth } from '@/hooks/auth/useAuth';
import { useCupDashboard } from '@/hooks/dashboard/useCupDashboard';
import FormationService from '@/services/formation/FormationService';
import InscriptionService from '@/services/formation/InscriptionService';
import { hasAnyRole } from '@/utils/constants/roles';
import type { Formation } from '@/models/formation';
import { brand } from '@/styles/themes/tokens';
import { Card } from '@/redesign/components/Section';
import '@/pages/dashboard/CupDashboardPage.css';

dayjs.locale('fr');

const ACCENT = brand[500];

const pct = (v: number | null) => Math.max(0, Math.min(100, Math.round(v ?? 0)));

type PeriodKey = '30j' | 'trimestre' | 'semestre' | 'annee';

/** Formation à venir (données réelles depuis le backend). */
interface FormationAVenir {
  id: string;
  date: string;
  title: string;
  inscrits: number;
  capacite: number;
  statut: string;
}

export default function CupDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Les appels analytics prédictifs (overview, in-demand) sont réservés au
  // pilotage (ADMIN/CUP/CHEF_DEPARTEMENT) côté gateway : on ne les déclenche
  // pas pour RESPONSABLE_DOSSIER (évite les 403 en console sur /home).
  const isPilotage = hasAnyRole(user?.role, ['admin', 'CUP', 'CHEF_DEPARTEMENT']);

  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>('annee');
  const [besoinSearch, setBesoinSearch] = useState('');

  const {
    kpis,
    topCompetences,
    besoinsPriorises,
    loading,
    formationsByType,
    formationsByTypeLoading,
    timeline,
    timelineLoading,
    formationsByDomaine,
    formationsByDomaineLoading,
    formationsByCompetence,
    formationsByCompetenceLoading,
  } = useCupDashboard(isPilotage);

  // Formations à venir (données réelles, filtrées depuis le référentiel formations).
  const { data: formationsRaw, isLoading: formationsLoading } = useQuery({
    queryKey: ['cup', 'formations'],
    queryFn: () => FormationService.getAllFormations(),
    staleTime: 5 * 60 * 1000,
  });
  const formations = useMemo(() => {
    if (Array.isArray(formationsRaw)) return formationsRaw;
    if (formationsRaw && typeof formationsRaw === 'object') {
      const candidate = formationsRaw as {
        content?: unknown[];
        data?: unknown[];
        items?: unknown[];
      };
      if (Array.isArray(candidate.content)) return candidate.content as Formation[];
      if (Array.isArray(candidate.data)) return candidate.data as Formation[];
      if (Array.isArray(candidate.items)) return candidate.items as Formation[];
    }
    return [];
  }, [formationsRaw]);
  // Compteur inscriptions : GET /inscription/inscriptions exige INSCRIPTION_APPROVE
  // (ADMIN/CUP, cf. AuthorizationMatrix) — on ne déclenche pas la requête pour les
  // autres rôles (RESPONSABLE_DOSSIER etc.) afin d'éviter les 403 sur /home.
  const canReadInscriptions = hasAnyRole(user?.role, ['admin', 'CUP']);
  const { data: inscriptionsRaw } = useQuery({
    queryKey: ['cup', 'inscriptions'],
    queryFn: () => InscriptionService.getAllInscriptions(500),
    staleTime: 5 * 60 * 1000,
    enabled: canReadInscriptions,
  });
  const inscriptions = useMemo(() => {
    if (!inscriptionsRaw) return [];
    if (Array.isArray(inscriptionsRaw)) return inscriptionsRaw;
    const candidate = inscriptionsRaw as { content?: unknown[]; data?: unknown[] };
    if (Array.isArray(candidate.content)) return candidate.content;
    if (Array.isArray(candidate.data)) return candidate.data;
    return [];
  }, [inscriptionsRaw]);

  const formationsAVenir = useMemo(() => {
    const items = Array.isArray(formations) ? formations : [];
    const inscList = Array.isArray(inscriptions) ? inscriptions : [];
    return items
      .filter((f) => f?.etatFormation === 'PLANIFIE' && f.dateDebut)
      .map<FormationAVenir>((f) => {
        const formationId = f.idFormation;
        // L'API InscriptionDTO renvoie `formation.idFormation` (objet imbriqué) :
        // on gère aussi les variantes plates (formationId) par compatibilité.
        const formationInscriptionId = (i: unknown): unknown => {
          const item = i as { formation?: { idFormation?: unknown }; formationId?: unknown };
          return item?.formation?.idFormation ?? item?.formationId;
        };
        const countInscrits = inscList.filter(
          (i) => Number(formationInscriptionId(i)) === Number(formationId),
        ).length;
        // inscriptionCount (DTO) prioritaire s'il est renseigné, sinon comptage local.
        const inscrits =
          (f as unknown as { inscriptionCount?: number | null })?.inscriptionCount ?? countInscrits;
        return {
          id: String(formationId ?? ''),
          date: dayjs(f.dateDebut).format('DD MMM'),
          title: f.titreFormation ?? 'Sans titre',
          inscrits,
          capacite: ((f as unknown as Record<string, unknown>).capaciteMax as number) ?? 20,
          statut: ((f as unknown as Record<string, unknown>).etatFormation as string) ?? 'PLANIFIE',
        };
      })
      .sort((a, b) => dayjs(a.date, 'DD MMM').valueOf() - dayjs(b.date, 'DD MMM').valueOf())
      .slice(0, 8);
  }, [formations, inscriptions]);

  const nbInscriptionsAttente = useMemo(() => {
    return (inscriptions as Array<{ etat?: string }>).filter((i) => i.etat === 'PENDING').length;
  }, [inscriptions]);

  const displayName = user?.username ?? user?.email ?? 'Utilisateur';
  const initials = displayName
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const updateLabel = dayjs().format('DD MMM YYYY à HH:mm');
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const queryClient = useQueryClient();

  async function handleRefresh() {
    setRefreshing(true);
    try {
      // Invalide toutes les requêtes du dashboard CUP pour forcer un refetch réel
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['kpi'] }),
        queryClient.invalidateQueries({ queryKey: ['cup'] }),
        queryClient.invalidateQueries({ queryKey: ['besoins'] }),
        queryClient.invalidateQueries({ queryKey: ['analyse'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const actionCount = (kpis.pendingBesoins ?? 0) + nbInscriptionsAttente + (kpis.critiques ?? 0);

  const typeItems = useMemo(
    () => [
      { label: 'Interne', value: formationsByType?.interne ?? 0, color: '#c1121f' },
      { label: 'Externe', value: formationsByType?.externe ?? 0, color: '#2563eb' },
      { label: 'En ligne', value: formationsByType?.enLigne ?? 0, color: '#0e7490' },
    ],
    [formationsByType],
  );

  const domaineColors = [
    '#2563eb',
    '#c1121f',
    '#16a34a',
    '#ea580c',
    '#7c3aed',
    '#0e7490',
    '#ca8a04',
    '#be185d',
  ];
  const domaineItems = useMemo(
    () =>
      formationsByDomaine.slice(0, 8).map((d, i) => ({
        label: d.label,
        value: d.count,
        color: domaineColors[i % domaineColors.length],
      })),
    [formationsByDomaine],
  );

  const competenceItems = useMemo(
    () =>
      formationsByCompetence.slice(0, 8).map((c, i) => ({
        label: c.label,
        value: c.count,
        color: domaineColors[(i + 2) % domaineColors.length],
      })),
    [formationsByCompetence],
  );

  const periodMonths: Record<PeriodKey, number> = {
    '30j': 2,
    trimestre: 3,
    semestre: 6,
    annee: 12,
  };
  const periodLabel: Record<PeriodKey, string> = {
    '30j': '30 derniers jours',
    trimestre: 'ce trimestre',
    semestre: 'ce semestre',
    annee: '12 derniers mois',
  };
  const chartData = useMemo(() => {
    const all = (timeline?.periodes ?? []).map((p) => ({
      label: p.label,
      value: p.nombreFormations,
    }));
    return all.slice(-periodMonths[period]);
  }, [timeline, period]);

  const chartTotal = useMemo(() => chartData.reduce((s, d) => s + d.value, 0), [chartData]);

  const besoinsTri = useMemo(() => {
    const q = besoinSearch.trim().toLowerCase();
    return [...besoinsPriorises]
      .filter(
        (b) =>
          !q ||
          (b.label ?? '').toLowerCase().includes(q) ||
          (b.departement ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => b.urgency + b.impact - (a.urgency + a.impact))
      .slice(0, 6);
  }, [besoinsPriorises, besoinSearch]);

  const top5 = useMemo(() => topCompetences.slice(0, 5), [topCompetences]);
  const maxTopCount = Math.max(1, ...top5.map((c) => c.count));
  // Pas de taux de couverture par compétence dans l'API actuelle : on affiche
  // une mesure réelle (nb besoins) plutôt qu'une barre factice.
  const densityFor = (count: number) => Math.round((count / maxTopCount) * 100);

  // Priorité réelle (max des besoins contribuant) — CRITIQUE > HAUTE > MOYENNE > BASSE.
  const topPrioriteTag = (c: (typeof top5)[number]) => {
    if (c.priorite === 'CRITIQUE') return { color: 'red', label: 'CRITIQUE' } as const;
    if (c.priorite === 'HAUTE') return { color: 'orange', label: 'HAUTE' } as const;
    if (c.priorite === 'MOYENNE') return { color: 'gold', label: 'MOYENNE' } as const;
    if (c.priorite === 'BASSE') return { color: 'blue', label: 'BASSE' } as const;
    return { color: 'default', label: 'Non définie' } as const;
  };

  // Deltas : uniquement une vraie comparaison quand le backend la fournit
  // (couverture vs snapshot précédent) ; sinon simple note descriptive.
  const couvertureDelta = kpis.couvertureDelta;
  let deltaLabel: string | undefined;
  let deltaUp: boolean | undefined;
  if (couvertureDelta != null) {
    deltaLabel = `${couvertureDelta >= 0 ? '+' : ''}${couvertureDelta} pts`;
    deltaUp = couvertureDelta >= 0;
  }
  const kpiList = [
    {
      id: 'actives',
      label: 'Formations actives',
      value: kpis.enCours ?? 0,
      suffix: '',
      caption: `${kpis.enCours ?? 0} en cours`,
      tone: 'navy' as const,
      icon: <BookOutlined />,
      detail: { label: 'Voir les formations', onClick: () => navigate('/home/Formation') },
      spark: [kpis.enCours ?? 0],
    },
    // KPI « Inscriptions en attente » : nécessite l'accès à la liste des
    // inscriptions (INSCRIPTION_APPROVE = ADMIN/CUP) — masqué pour les autres rôles.
    ...(canReadInscriptions
      ? [
          {
            id: 'insc',
            label: 'Inscriptions en attente',
            value: nbInscriptionsAttente,
            suffix: '',
            caption: `${nbInscriptionsAttente} à valider`,
            tone: 'orange' as const,
            icon: <TeamOutlined />,
            detail: { label: 'Gérer les inscriptions', onClick: () => scrollTo('cd-suivi') },
            spark: [nbInscriptionsAttente],
          },
        ]
      : []),
    {
      id: 'completion',
      label: 'Taux de complétion moyen',
      value: pct(kpis.tauxReussiteGlobal),
      suffix: '%',
      caption: `${kpis.tauxReussiteGlobal ?? 0}% de formations achevées`,
      tone: 'green' as const,
      icon: <CheckCircleOutlined />,
      detail: { label: 'Détail complétion', onClick: () => scrollTo('cd-couverture') },
      spark: [pct(kpis.tauxReussiteGlobal)],
    },
    // Couverture (analytics prédictif) : réservé au pilotage.
    ...(isPilotage
      ? [
          {
            id: 'couv',
            label: 'Taux de couverture des compétences',
            value: pct(kpis.couverture),
            suffix: '%',
            delta: deltaLabel,
            up: deltaUp,
            caption: kpis.couvertureDelta == null ? `${kpis.couverture ?? 0}% couverts` : undefined,
            tone: 'blue' as const,
            icon: <SafetyCertificateOutlined />,
            detail: { label: 'Voir le référentiel', onClick: () => scrollTo('cd-couverture') },
            spark: [pct(kpis.couverture)],
          },
        ]
      : []),
  ];

  const prioColor = (v: string) => {
    if (v === 'CRITIQUE') return 'red';
    if (v === 'HAUTE') return 'orange';
    if (v === 'MOYENNE') return 'gold';
    return 'blue';
  };
  const statutColor = (v: string) => {
    if (v === 'Planifiée') return 'blue';
    if (v === 'Réservée') return 'purple';
    return 'default';
  };
  const besoinCols = [
    {
      title: 'Priorité',
      dataIndex: 'priorite',
      key: 'priorite',
      width: 110,
      render: (v: string) => <Tag color={prioColor(v)}>{v}</Tag>,
    },
    { title: 'Thème / Besoin', dataIndex: 'label', key: 'label', ellipsis: true },
    {
      title: 'Groupe / UP',
      dataIndex: 'departement',
      key: 'departement',
      render: (v: string) => v ?? '—',
    },
    {
      title: 'Approbation',
      key: 'app',
      width: 140,
      render: (_: unknown, r: (typeof besoinsPriorises)[number]) => (
        <Tag color={r.urgency >= 4 ? 'volcano' : 'default'}>
          {r.urgency >= 4 ? 'Urgent' : 'À planifier'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'act',
      width: 110,
      render: () => (
        <Button size="small" type="primary" ghost onClick={() => scrollTo('cd-suivi')}>
          Traiter
        </Button>
      ),
    },
  ] as ColumnsType<(typeof besoinsPriorises)[number]>;

  const formCols = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 88 },
    { title: 'Formation', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: 'Inscrits',
      key: 'insc',
      width: 86,
      render: (_: unknown, r: FormationAVenir) => `${r.inscrits}/${r.capacite}`,
    },
    {
      title: 'Remplissage',
      key: 'fill',
      width: 160,
      render: (_: unknown, r: FormationAVenir) => (
        <Progress percent={Math.round((r.inscrits / r.capacite) * 100)} size="small" />
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 110,
      render: (v: string) => <Tag color={statutColor(v)}>{v}</Tag>,
    },
  ] as ColumnsType<FormationAVenir>;

  return (
    <div className="cd">
      {/* ── Header brand rouge (style Analyse Prédictive) ──── */}
      <header className="cd-header">
        <div className="cd-header-left">
          <div className="cd-header-icon">
            <DashboardOutlined />
          </div>
          <div className="cd-header-titles">
            <span className="cd-header-breadcrumb">
              <button type="button" onClick={() => navigate('/home')} className="cd-header-bc-link">
                Accueil
              </button>
              <span className="cd-header-bc-sep">/</span>
              <span>Tableau de bord</span>
            </span>
            <div className="cd-header-title-row">
              <h1 className="cd-header-title">Tableau de bord CUP</h1>
              {actionCount > 0 && <span className="cd-header-badge">{actionCount}</span>}
            </div>
            <span className="cd-header-sub">Vue consolidée de votre unité pédagogique</span>
          </div>
        </div>
        <div className="cd-header-actions">
          <span className="cd-header-updated">
            <ClockCircleOutlined /> {updateLabel}
          </span>
          <Button
            className="cd-header-btn"
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={handleRefresh}
          >
            Actualiser
          </Button>
          <Badge count={kpis.pendingBesoins ?? 0} size="small" offset={[-2, 2]}>
            <Button className="cd-header-btn" shape="circle" icon={<BellOutlined />} />
          </Badge>
          <Tooltip title={displayName}>
            <Avatar className="cd-header-avatar">{initials}</Avatar>
          </Tooltip>
        </div>
      </header>

      {/* ── Zone action prioritaire ─────────────────────────── */}
      <section className="cd-priority">
        <div className="cd-priority-main">
          <span className="cd-priority-dot" />
          <div>
            <div className="cd-priority-title">
              {actionCount} actions nécessitent votre attention
            </div>
            <div className="cd-priority-sub">
              Besoins en attente, inscriptions et formations à planifier dans votre unité.
            </div>
          </div>
        </div>
        <div className="cd-priority-stats">
          <div className="cd-pstat">
            <span className="cd-pstat-val">{kpis.pendingBesoins ?? 0}</span>
            <span className="cd-pstat-lbl">Besoins en attente</span>
          </div>
          <div className="cd-pstat">
            <span className="cd-pstat-val">{formationsAVenir.length || 0}</span>
            <span className="cd-pstat-lbl">Formations à venir</span>
          </div>
          <div className="cd-pstat">
            <span className="cd-pstat-val">{nbInscriptionsAttente}</span>
            <span className="cd-pstat-lbl">Inscriptions à valider</span>
          </div>
        </div>
        <div className="cd-priority-cta">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/home/Formation')}
          >
            Créer une formation
          </Button>
          <Button onClick={() => scrollTo('cd-suivi')}>Consulter les besoins</Button>
        </div>
      </section>

      {/* ── KPI principaux ──────────────────────────────────── */}
      <section className="cd-kpis">
        {kpiList.map((k) => (
          <KpiTile key={k.id} {...k} />
        ))}
      </section>

      {/* ── Activité des formations ─────────────────────────── */}
      <Section
        index={1}
        id="cd-activite"
        title="Activité des formations"
        subtitle="Répartition par type et évolution mensuelle de l'unité pédagogique"
      >
        <Card
          className="cd-span-5"
          title="Répartition par type"
          subtitle="Interne · Externe · En ligne"
          icon={<ApartmentOutlined />}
          iconColor="#2563eb"
          iconBg="rgba(37,99,235,.12)"
          loading={formationsByTypeLoading}
        >
          <SegBars items={typeItems} />
        </Card>
        <Card
          className="cd-span-7"
          title="Évolution mensuelle"
          subtitle={`${chartTotal} formation${chartTotal > 1 ? 's' : ''} · ${periodLabel[period]}`}
          icon={<RiseOutlined />}
          iconColor="#0e7490"
          iconBg="rgba(14,116,144,.12)"
          loading={timelineLoading}
          extra={
            <Segmented
              size="small"
              value={period}
              onChange={(v) => setPeriod(v as PeriodKey)}
              options={[
                { label: '30 j', value: '30j' },
                { label: 'Trimestre', value: 'trimestre' },
                { label: 'Semestre', value: 'semestre' },
                { label: 'Année', value: 'annee' },
              ]}
            />
          }
        >
          <AreaLineChart data={chartData} color={ACCENT} />
        </Card>
      </Section>

      {/* ── Répartition par domaine et compétence ──────────── */}
      <Section
        index={2}
        id="cd-domaines"
        title="Répartition par domaine et compétence"
        subtitle="Nombre de formations pour chaque domaine et compétence"
      >
        <Card
          className="cd-span-6"
          title="Formations par domaine"
          subtitle={`${formationsByDomaine.length} domaines · ${kpis.totalFormations ?? 0} formations`}
          icon={<ApartmentOutlined />}
          iconColor="#2563eb"
          iconBg="rgba(37,99,235,.12)"
          loading={formationsByDomaineLoading}
        >
          <SegBars items={domaineItems} />
        </Card>
        <Card
          className="cd-span-6"
          title="Formations par compétence"
          subtitle={`${formationsByCompetence.length} compétences · ${kpis.totalFormations ?? 0} formations`}
          icon={<ThunderboltOutlined />}
          iconColor="#ea580c"
          iconBg="rgba(234,88,12,.12)"
          loading={formationsByCompetenceLoading}
        >
          <SegBars items={competenceItems} />
        </Card>
      </Section>

      {/* ── Suivi opérationnel ─────────────────────────────── */}
      <Section
        index={3}
        id="cd-suivi"
        title="Suivi opérationnel"
        subtitle="Formations à venir et besoins à traiter"
      >
        <Card
          className="cd-span-6"
          title="Prochaines formations"
          subtitle={`${formationsAVenir.length} planifiées${formationsLoading ? ' (chargement…)' : ''}`}
          icon={<CalendarOutlined />}
          iconColor="#2563eb"
          iconBg="rgba(37,99,235,.12)"
        >
          <Table
            rowKey="id"
            size="middle"
            pagination={false}
            columns={formCols}
            dataSource={formationsAVenir}
            loading={formationsLoading}
          />
        </Card>
        <Card
          className="cd-span-6"
          title="Besoins à traiter"
          subtitle={`${besoinsPriorises.length} besoins · triés par priorité`}
          icon={<NodeIndexOutlined />}
          iconColor="#c1121f"
          iconBg="rgba(193,18,31,.10)"
          extra={
            <Input
              allowClear
              size="small"
              prefix={<SearchOutlined />}
              placeholder="Rechercher"
              value={besoinSearch}
              onChange={(e) => setBesoinSearch(e.target.value)}
              style={{ width: 180 }}
            />
          }
        >
          <Table
            rowKey="id"
            size="middle"
            pagination={false}
            loading={loading}
            columns={besoinCols}
            dataSource={besoinsTri}
          />
        </Card>
      </Section>

      {/* ── Couverture et compétences (réservé au pilotage) ───── */}
      {isPilotage && (
        <Section
          index={4}
          id="cd-couverture"
          title="Couverture et compétences"
          subtitle="Niveau de couverture de l'UP et compétences à renforcer"
        >
          <Card
            className="cd-span-5"
            title="Couverture globale"
            subtitle="Part des compétences au niveau requis"
            icon={<SafetyCertificateOutlined />}
            iconColor="#16a34a"
            iconBg="rgba(22,163,74,.12)"
          >
            <div className="cd-coverage-global">
              <Progress type="dashboard" percent={pct(kpis.couverture)} strokeColor="#16a34a" />
              <div className="cd-coverage-global-note">
                <div className="cd-coverage-global-val">{pct(kpis.couverture)} %</div>
                <div className="cd-coverage-global-lbl">
                  des compétences de l'UP sont couvertes au niveau requis.
                </div>
                <Button
                  size="small"
                  type="link"
                  icon={<RightOutlined />}
                  onClick={() => navigate('/home/competences')}
                >
                  Voir le référentiel
                </Button>
              </div>
            </div>
          </Card>
          <Card
            className="cd-span-7"
            title="Top 5 compétences à renforcer"
            subtitle="Les plus demandées et les moins couvertes"
            icon={<ThunderboltOutlined />}
            iconColor="#ea580c"
            iconBg="rgba(234,88,12,.12)"
          >
            <ol className="cd-coverage-list">
              {top5.map((c, i) => (
                <li key={`${c.name}-${i}`} className="cd-coverage-item">
                  <span className="cd-coverage-rank">{i + 1}</span>
                  <div className="cd-coverage-main">
                    <div className="cd-coverage-name">{c.name}</div>
                    <div className="cd-coverage-meta">
                      <Tag color={topPrioriteTag(c).color}>{topPrioriteTag(c).label}</Tag>
                      <span>
                        {c.count} enseignant{c.count > 1 ? 's' : ''} impacté{c.count > 1 ? 's' : ''}
                      </span>
                    </div>
                    <Progress percent={densityFor(c.count)} size="small" strokeColor="#ea580c" />
                  </div>
                  <Button size="small" onClick={() => navigate('/home/Formation')}>
                    Planifier
                  </Button>
                </li>
              ))}
            </ol>
          </Card>
        </Section>
      )}

      {/* ── Analyse prédictive (réservé au pilotage) ─────────── */}
      {isPilotage && (
        <Section title="Analyse prédictive">
          <Card className="cd-span-12" title={undefined}>
            <Alert
              type="info"
              showIcon
              message="Analyse prédictive détaillée"
              description="Pour la liste nominative des enseignants à risque, l'historique des alertes et les recommandations IA, consultez l'Analyse Prédictive."
              action={
                <Button
                  type="primary"
                  size="small"
                  onClick={() => navigate('/home/AnalysePredictive')}
                >
                  Ouvrir <RightOutlined />
                </Button>
              }
            />
          </Card>
        </Section>
      )}
    </div>
  );
}

/* ── Section (titre + corps en grille 12 col + index) ─────────────── */
function Section({
  id,
  index,
  title,
  subtitle,
  extra,
  children,
}: {
  readonly id?: string;
  readonly index?: number;
  readonly title: string;
  readonly subtitle?: string;
  readonly extra?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="rd-section" id={id}>
      <div className="rd-section-head">
        <div className="rd-section-titles">
          {index != null && <span className="cup-sec-idx">{String(index).padStart(2, '0')}</span>}
          <div>
            <h2 className="rd-section-title">{title}</h2>
            {subtitle && <p className="rd-section-sub">{subtitle}</p>}
          </div>
        </div>
        {extra}
      </div>
      <div className="cd-sec-body">{children}</div>
    </section>
  );
}

/* ── KPI tile (valeur dominante + delta réel + sparkline + lien) ──────── */
function KpiTile({
  label,
  value,
  suffix,
  delta,
  up,
  caption,
  tone,
  icon,
  detail,
  spark,
}: {
  readonly label: string;
  readonly value: number;
  readonly suffix: string;
  /** Variation réelle (comparaison vs période précédente), si disponible. */
  readonly delta?: string;
  /** Sens de la variation (uniquement si `delta` fourni). */
  readonly up?: boolean;
  /** Note descriptive affichée quand aucune comparaison réelle n'existe. */
  readonly caption?: string;
  readonly tone: 'navy' | 'orange' | 'green' | 'blue';
  readonly icon: ReactNode;
  readonly detail: { readonly label: string; readonly onClick: () => void };
  readonly spark: number[];
}) {
  let color: string;
  if (tone === 'green') color = '#16a34a';
  else if (tone === 'orange') color = '#ea580c';
  else if (tone === 'blue') color = '#2563eb';
  else color = '#102a43';
  return (
    <div className={`cup-kpi cup-kpi--${tone}`}>
      <div className="cup-kpi-top">
        <span className="cup-kpi-label">{label}</span>
        <Tooltip title={label}>
          <span className="cup-kpi-ic" style={{ color, background: `${color}14` }}>
            {icon}
          </span>
        </Tooltip>
      </div>
      <div className="cup-kpi-val">
        <Statistic
          value={value}
          suffix={suffix ? ` ${suffix}` : ''}
          valueStyle={{ color: '#0f2740', fontWeight: 800, fontSize: 30, letterSpacing: '-.02em' }}
        />
      </div>
      <div className="cup-kpi-foot">
        {delta != null && up != null ? (
          <>
            <span className={`cup-delta ${up ? 'up' : 'down'}`}>
              {up ? '▲' : '▼'} {delta}
            </span>
            <span className="cup-delta-note">vs préc.</span>
          </>
        ) : (
          <span className="cup-delta-note">{caption ?? '—'}</span>
        )}
        <Sparkline data={spark} tone={tone} />
      </div>
      <button type="button" className="cup-kpi-link" onClick={detail.onClick}>
        {detail.label} <RightOutlined />
      </button>
    </div>
  );
}

/* ── Sparkline (mini courbe SVG) ─────────────────────────────── */
function Sparkline({ data, tone }: { readonly data: number[]; readonly tone: string }) {
  const w = 76,
    h = 26;
  const safe = Array.isArray(data) ? data.filter((v) => Number.isFinite(v)) : [];
  let color: string;
  if (tone === 'green') color = '#16a34a';
  else if (tone === 'orange') color = '#ea580c';
  else if (tone === 'blue') color = '#2563eb';
  else color = '#102a43';
  if (safe.length < 2) {
    // Un seul point (ou données manquantes) : on dessine un repère discret
    // plutôt qu'une courbe (évite NaN dans les coordonnées du polyline).
    const v = safe[0] ?? 0;
    return (
      <svg className="cup-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <text x={2} y={h - 6} fontSize="10" fontWeight={700} fill={color}>
          {v}
        </text>
      </svg>
    );
  }
  const max = Math.max(...safe, 1),
    min = Math.min(...safe, 0);
  const span = max - min || 1;
  const pts = safe
    .map((v, i) => `${(i / (safe.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`)
    .join(' ');
  return (
    <svg className="cup-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── SegBars (rounded gradient + %) ──────────────────────────── */
function SegBars({
  items,
}: {
  readonly items: Array<{ readonly label: string; readonly value: number; readonly color: string }>;
}) {
  const sum = items.reduce((s, t) => s + t.value, 0);
  if (sum === 0) return <div className="cup-empty">Aucune donnée de typage</div>;
  const max = Math.max(1, ...items.map((t) => t.value));
  return (
    <div className="cd-bars">
      {items.map((t) => {
        const pct = (t.value / sum) * 100;
        return (
          <div key={t.label} className="cd-bar-row">
            <div className="cd-bar-head">
              <span className="cd-bar-label">
                <span className="cd-bar-icn" style={{ background: t.color }} />
                {t.label}
              </span>
              <span className="cd-bar-val">
                <b>{t.value}</b> · {Math.round(pct)}%
              </span>
            </div>
            <div className="cd-bar-track">
              <span
                className="cd-bar-fill"
                style={{
                  width: `${(t.value / max) * 100}%`,
                  background: `linear-gradient(90deg, ${t.color}, ${t.color}aa)`,
                }}
              >
                <span className="cd-bar-fill-pct">{Math.round(pct)}%</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── AreaLineChart (courbe lissée + aire + tooltip) ───────────── */
function buildSmoothPath(pts: ReadonlyArray<readonly [number, number]>) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const t = 0.16;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function AreaLineChart({
  data,
  color = ACCENT,
}: {
  readonly data: Array<{ readonly label: string; readonly value: number }>;
  readonly color?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <div className="cup-empty">Aucune donnée</div>;

  const W = 640,
    H = 260,
    PL = 40,
    PR = 20,
    PT = 22,
    PB = 38;
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = Math.max(4, Math.ceil(max / 4) * 4);
  const n = data.length;
  const innerW = W - PL - PR,
    innerH = H - PT - PB;
  // Évite la division par zéro quand n === 1 : on répartit les points sur la largeur.
  const x = (i: number) => PL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PT + innerH * (1 - v / niceMax);

  const px = data.map((d, i) => [x(i), y(d.value)] as const);
  // Cas d'un seul point : on génère une ligne horizontale + aire pour visualiser la valeur.
  const line =
    n < 2
      ? `M ${px[0][0].toFixed(1)} ${px[0][1].toFixed(1)} L ${(W - PR).toFixed(1)} ${px[0][1].toFixed(1)}`
      : buildSmoothPath(px);
  const area =
    n < 2
      ? `M ${px[0][0].toFixed(1)} ${(PT + innerH).toFixed(1)} L ${px[0][0].toFixed(1)} ${px[0][1].toFixed(1)} L ${(W - PR).toFixed(1)} ${px[0][1].toFixed(1)} L ${(W - PR).toFixed(1)} ${(PT + innerH).toFixed(1)} Z`
      : `${line} L ${x(n - 1).toFixed(1)} ${PT + innerH} L ${x(0).toFixed(1)} ${PT + innerH} Z`;

  const fmtX = (label: string) => {
    const d = dayjs(label);
    if (!d.isValid()) return label;
    const s = d.format('MMM YYYY');
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const step = Math.max(1, Math.ceil(n / 6));
  const gid = `cd-la-${color.replace(/[^a-z0-9]/gi, '')}`;
  const hoverPt = hover != null && hover < n ? px[hover] : null;

  return (
    <div className="cd-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', overflow: 'visible' }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pxr = ((e.clientX - rect.left) / rect.width) * W;
          const ratio = (pxr - PL) / innerW;
          setHover(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4].map((i) => {
          const gy = PT + (innerH * i) / 4;
          const vy = Math.round(niceMax * (1 - i / 4));
          return (
            <g key={`grid-${i}`}>
              <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="var(--cd-border)" strokeWidth={1} />
              <text
                x={PL - 8}
                y={gy + 3}
                textAnchor="end"
                fontSize="9"
                fontWeight={600}
                fill="var(--cd-ink-3)"
              >
                {vy}
              </text>
            </g>
          );
        })}

        {hoverPt && (
          <line
            x1={hoverPt[0]}
            y1={PT}
            x2={hoverPt[0]}
            y2={PT + innerH}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.4}
          />
        )}

        <path d={area} fill={`url(#${gid})`} className="cd-line-area" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          className="cd-line-draw"
        />

        {data.map((d, i) => (
          <circle
            key={d.label}
            cx={x(i)}
            cy={y(d.value)}
            r={hover === i ? 5 : 3}
            fill="#fff"
            stroke={color}
            strokeWidth={2}
            style={{ transition: 'r .15s ease' }}
          />
        ))}

        {hover != null &&
          hoverPt &&
          (() => {
            const boxX = Math.max(PL, Math.min(hoverPt[0] - 52, W - PR - 104));
            const boxY = Math.max(PT - 4, hoverPt[1] - 46);
            return (
              <g style={{ pointerEvents: 'none' }}>
                <circle cx={hoverPt[0]} cy={hoverPt[1]} r={9} fill={color} opacity={0.16} />
                <circle
                  cx={hoverPt[0]}
                  cy={hoverPt[1]}
                  r={5}
                  fill="#fff"
                  stroke={color}
                  strokeWidth={2.5}
                />
                <rect
                  x={boxX}
                  y={boxY}
                  width={104}
                  height={34}
                  rx={9}
                  fill="#0f2740"
                  opacity={0.94}
                />
                <text
                  x={boxX + 52}
                  y={boxY + 14}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={700}
                  fill="#fff"
                >
                  {data[hover].value} formations
                </text>
                <text x={boxX + 52} y={boxY + 27} textAnchor="middle" fontSize="9" fill="#cbd5e1">
                  {fmtX(data[hover].label)}
                </text>
              </g>
            );
          })()}

        {data.map((d, i) =>
          i % step === 0 || i === n - 1 ? (
            <text
              key={`x-${d.label}`}
              x={x(i)}
              y={H - 12}
              textAnchor="middle"
              fontSize="9"
              fontWeight={600}
              fill="var(--cd-ink-3)"
            >
              {fmtX(d.label)}
            </text>
          ) : null,
        )}
      </svg>
      <div className="cd-line-legend">
        <span className="cd-line-dot" style={{ background: color }} /> Formations créées par mois
      </div>
    </div>
  );
}
