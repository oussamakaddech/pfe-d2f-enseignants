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
  FileExcelOutlined,
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
  useUps,
  useDepartements,
} from '@/hooks/formation';
import { useAllFormationCompetenceLinks } from '@/hooks/competence/useFormationCompetence';
import type { Formation, Personne } from '@/models/formation';
import type { FormationDocument } from '@/models/document';
import type { Id } from '@/models/common';
import MailForm from '@/pages/besoin/MailForm';
import useAppNotification from '@/hooks/ui/useAppNotification';
import { writeExcel, exportDateLabel, isoDate } from '@/utils/helpers/excelExport';
import {
  buildCompetenceByFormation,
  buildCompetenceOptions,
  buildFormateurOptions,
  filterFormations,
  personLabel,
} from './catalogueFilters';

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
  // Parité FORMATION_CREATE/UPDATE/DELETE (AuthorizationMatrix) : ADMIN, CUP et
  // CHEF_DEPARTEMENT gèrent les formations (contrôle fin du périmètre côté serveur).
  const canManageFormations = ['admin', 'cup', 'chefdepartement'].includes(
    normalizeRole(user?.role),
  );
  const isChefDept = normalizeRole(user?.role) === 'chefdepartement';
  const isCup = normalizeRole(user?.role) === 'cup';
  // Scoping serveur (§8) : CUP → son UP, chef → son département (ADMIN = global).
  const isScopedPilote = isCup || isChefDept;
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

  // Les liaisons formation ↔ compétence ne sont lisibles que par les rôles de
  // FORMATION_COMPETENCE_READ (ni RESPONSABLE_DOSSIER ni les autres) : inutile
  // d'appeler une route qui répondrait 403.
  const canReadCompetenceLinks = ['admin', 'cup', 'chefdepartement'].includes(
    normalizeRole(user?.role),
  );
  const { data: competenceLinks = [] } = useAllFormationCompetenceLinks(canReadCompetenceLinks);
  const formationIdSet = useMemo(
    () => new Set(formations.map((f) => String(f.idFormation))),
    [formations],
  );
  const competenceByFormation = useMemo(
    () => buildCompetenceByFormation(competenceLinks, formationIdSet),
    [competenceLinks, formationIdSet],
  );
  const competenceOptions = useMemo(
    () => buildCompetenceOptions(competenceLinks, formationIdSet),
    [competenceLinks, formationIdSet],
  );
  const formateurOptions = useMemo(() => buildFormateurOptions(formations), [formations]);

  const [filterText, setFilterText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [etatFilter, setEtatFilter] = useState<string | undefined>();
  const [upFilter, setUpFilter] = useState<Id | undefined>();
  const [deptFilter, setDeptFilter] = useState<Id | undefined>();
  const [periodFilter, setPeriodFilter] = useState<string | undefined>();
  const [periodRange, setPeriodRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [formateurFilter, setFormateurFilter] = useState<string | undefined>();
  const [competenceFilter, setCompetenceFilter] = useState<string | undefined>();
  const [exportingFormationId, setExportingFormationId] = useState<Id | null>(null);

  const [openExport, setOpenExport] = useState(false);
  // Filtres propres à l'export (préremplis avec ceux du catalogue à l'ouverture).
  const [exportText, setExportText] = useState('');
  const [exportUpId, setExportUpId] = useState<Id | undefined>();
  const [exportDeptId, setExportDeptId] = useState<Id | undefined>();
  const [exportRange, setExportRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [openMail, setOpenMail] = useState(false);

  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);

  const filtered = useMemo(
    () =>
      filterFormations(
        formations,
        {
          text: filterText,
          type: typeFilter,
          etat: etatFilter,
          upId: upFilter,
          deptId: deptFilter,
          period: periodFilter,
          start: periodRange?.[0],
          end: periodRange?.[1],
          formateurKey: formateurFilter,
          competenceId: competenceFilter,
        },
        competenceByFormation,
      ),
    [
      formations,
      filterText,
      typeFilter,
      etatFilter,
      upFilter,
      deptFilter,
      periodFilter,
      periodRange,
      formateurFilter,
      competenceFilter,
      competenceByFormation,
    ],
  );

  /** Formations retenues par les filtres de la fenêtre d'export Excel. */
  const exportRows = useMemo(
    () =>
      filterFormations(
        formations,
        {
          text: exportText,
          upId: exportUpId,
          deptId: exportDeptId,
          start: exportRange?.[0],
          end: exportRange?.[1],
        },
        competenceByFormation,
      ),
    [formations, exportText, exportUpId, exportDeptId, exportRange, competenceByFormation],
  );

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
      const up = upsOptions.find((u) => String(u.id) === String(upFilter));
      chips.push({
        key: 'up',
        label: `UP : ${up?.libelle || upFilter}`,
        onClear: () => setUpFilter(undefined),
      });
    }
    if (deptFilter) {
      const dept = deptsOptions.find((d) => String(d.id) === String(deptFilter));
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
    if (formateurFilter) {
      const opt = formateurOptions.find((o) => o.key === formateurFilter);
      chips.push({
        key: 'formateur',
        label: `Formateur : ${opt?.label ?? formateurFilter}`,
        onClear: () => setFormateurFilter(undefined),
      });
    }
    if (competenceFilter) {
      const opt = competenceOptions.find((o) => o.key === competenceFilter);
      chips.push({
        key: 'competence',
        label: `Compétence : ${opt?.label ?? competenceFilter}`,
        onClear: () => setCompetenceFilter(undefined),
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
    formateurFilter,
    competenceFilter,
    formateurOptions,
    competenceOptions,
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

  function handleExportFormation(formation: Formation) {
    if (formation.idFormation == null) return;
    setExportingFormationId(formation.idFormation);
    try {
      const refLabel = (item?: RefItem) => item?.libelle || item?.nom || '';
      const dateLabel = (value?: string) => (value ? dayjs(value).format('DD/MM/YYYY') : '');
      const sessionRows = (formation.seances ?? []).map((seance, index) => ({
        Formation: formation.titreFormation || '',
        Type: formation.typeFormation || '',
        État: formation.etatFormation || '',
        Période:
          formation.periodCode === 'OTHER'
            ? formation.customPeriodLabel || 'Autre'
            : (PERIOD_OPTIONS.find((option) => option.value === formation.periodCode)?.label ??
              formation.periodeFormation ??
              ''),
        UP: refLabel(formation.up ?? formation.up1),
        Département: refLabel(formation.departement ?? formation.departement1),
        Début: dateLabel(formation.dateDebut),
        Fin: dateLabel(formation.dateFin),
        Séance: index + 1,
        'Date séance': dateLabel(seance.dateSeance),
        'Heure début': seance.heureDebut ?? '',
        'Heure fin': seance.heureFin ?? '',
        Salle: seance.salle ?? formation.salle ?? '',
        Animateurs: (seance.animateurs ?? formation.animateurs ?? [])
          .map((personne) => `${personne.prenom ?? ''} ${personne.nom ?? ''}`.trim())
          .filter(Boolean)
          .join(', '),
        Participants: (seance.participants ?? [])
          .map((personne) => `${personne.prenom ?? ''} ${personne.nom ?? ''}`.trim())
          .filter(Boolean)
          .join(', '),
      }));
      const formationRow = {
        Formation: formation.titreFormation || '',
        Type: formation.typeFormation || '',
        État: formation.etatFormation || '',
        Période:
          formation.periodCode === 'OTHER'
            ? formation.customPeriodLabel || 'Autre'
            : (PERIOD_OPTIONS.find((option) => option.value === formation.periodCode)?.label ??
              formation.periodeFormation ??
              ''),
        UP: refLabel(formation.up ?? formation.up1),
        Département: refLabel(formation.departement ?? formation.departement1),
        Début: dateLabel(formation.dateDebut),
        Fin: dateLabel(formation.dateFin),
        'Charge horaire (h)': formation.chargeHoraireGlobal ?? '',
        Salle: formation.salle ?? '',
        Objectifs: formation.objectifs ?? formation.objectif ?? '',
        'Objectifs pédagogiques': formation.objectifsPedago ?? '',
        Animateurs: (formation.animateurs ?? [])
          .map((personne) => `${personne.prenom ?? ''} ${personne.nom ?? ''}`.trim())
          .filter(Boolean)
          .join(', '),
        Participants: (formation.participants ?? [])
          .map((personne) => `${personne.prenom ?? ''} ${personne.nom ?? ''}`.trim())
          .filter(Boolean)
          .join(', '),
      };
      const safeTitle = (formation.titreFormation || `formation_${formation.idFormation}`)
        .replaceAll(/[\\/:*?"<>|]/g, '_')
        .trim();
      writeExcel(
        [
          {
            name: 'Formation',
            title: formation.titreFormation || 'Détail de la formation',
            subtitle: `Exporté le ${dayjs().format('DD/MM/YYYY HH:mm')}`,
            rows: [formationRow],
          },
          ...(sessionRows.length > 0
            ? [{ name: 'Séances', title: 'Séances de la formation', rows: sessionRows }]
            : []),
        ],
        `formation_${safeTitle}_${formation.idFormation}.xlsx`,
      );
      msgApi.success('Export Excel de la formation téléchargé.');
    } catch (error: unknown) {
      const e = error as { message?: string };
      msgApi.error(`Échec de l’export Excel : ${e.message || 'erreur inattendue'}`);
    } finally {
      setExportingFormationId(null);
    }
  }

  function openExportModal() {
    // Les filtres du catalogue servent de valeur de départ à l'export.
    setExportText(filterText);
    setExportUpId(upFilter);
    setExportDeptId(deptFilter);
    setExportRange(periodRange);
    setOpenExport(true);
  }

  /**
   * Export Excel du catalogue filtré : recherche + UP + département (+ dates),
   * avec une feuille de synthèse par UP / département et une par compétence.
   */
  function handleExport() {
    if (exportRows.length === 0) {
      msgApi.error('Aucune formation à exporter avec ces critères.');
      return;
    }
    try {
      const refLabel = (item?: RefItem) => item?.libelle || item?.nom || '';
      const dateLabel = (value?: string) => (value ? dayjs(value).format('DD/MM/YYYY') : '');
      const periodLabel = (formation: Formation) =>
        formation.periodCode === 'OTHER'
          ? formation.customPeriodLabel || 'Autre'
          : (PERIOD_OPTIONS.find((option) => option.value === formation.periodCode)?.label ??
            formation.periodeFormation ??
            '');
      const personsLabel = (list?: Personne[]) =>
        (list ?? [])
          .map((personne) => personLabel(personne))
          .filter(Boolean)
          .join(', ');
      const competencesOf = (formation: Formation) =>
        (competenceByFormation.get(String(formation.idFormation)) ?? [])
          .map((competence) => competence.nom)
          .join(', ');

      const formationRows = exportRows.map((formation) => ({
        Formation: formation.titreFormation || '',
        Type: formation.typeFormation || '',
        État: formation.etatFormation || '',
        Période: periodLabel(formation),
        UP: refLabel(formation.up ?? formation.up1),
        Département: refLabel(formation.departement ?? formation.departement1),
        Début: dateLabel(formation.dateDebut),
        Fin: dateLabel(formation.dateFin),
        'Charge horaire (h)': formation.chargeHoraireGlobal ?? '',
        Formateurs: personsLabel(formation.animateurs),
        'Nb séances': (formation.seances ?? []).length,
        'Nb participants': (formation.participants ?? []).length,
        Compétences: competencesOf(formation),
      }));

      const seanceRows = exportRows.flatMap((formation) =>
        (formation.seances ?? []).map((seance, index) => ({
          Formation: formation.titreFormation || '',
          UP: refLabel(formation.up ?? formation.up1),
          Département: refLabel(formation.departement ?? formation.departement1),
          Séance: `${index + 1}/${formation.seances?.length ?? 0}`,
          Date: dateLabel(seance.dateSeance),
          'Heure début': seance.heureDebut ?? '',
          'Heure fin': seance.heureFin ?? '',
          Salle: seance.salle ?? formation.salle ?? '',
          Formateurs: personsLabel(seance.animateurs ?? formation.animateurs),
          'Nb participants': (seance.participants ?? []).length,
        })),
      );

      type GroupeSynthese = {
        UP: string;
        Département: string;
        Formations: number;
        Internes: number;
        Externes: number;
        'Nb participants': number;
        'Charge horaire (h)': number;
      };
      const groupes = new Map<string, GroupeSynthese>();
      exportRows.forEach((formation) => {
        const up = refLabel(formation.up ?? formation.up1) || '—';
        const dept = refLabel(formation.departement ?? formation.departement1) || '—';
        const key = `${up}||${dept}`;
        const groupe = groupes.get(key) ?? {
          UP: up,
          Département: dept,
          Formations: 0,
          Internes: 0,
          Externes: 0,
          'Nb participants': 0,
          'Charge horaire (h)': 0,
        };
        groupe.Formations += 1;
        if (formation.typeFormation === 'INTERNE') groupe.Internes += 1;
        if (formation.typeFormation === 'EXTERNE') groupe.Externes += 1;
        groupe['Nb participants'] += (formation.participants ?? []).length;
        groupe['Charge horaire (h)'] += formation.chargeHoraireGlobal ?? 0;
        groupes.set(key, groupe);
      });
      const syntheseRows = Array.from(groupes.values()).sort(
        (a, b) =>
          a.UP.localeCompare(b.UP, 'fr') || a.Département.localeCompare(b.Département, 'fr'),
      );

      const parCompetence = new Map<string, string[]>();
      exportRows.forEach((formation) => {
        (competenceByFormation.get(String(formation.idFormation)) ?? []).forEach((competence) => {
          const titres = parCompetence.get(competence.nom) ?? [];
          if (formation.titreFormation) titres.push(formation.titreFormation);
          parCompetence.set(competence.nom, titres);
        });
      });
      const competenceRows = Array.from(parCompetence, ([nom, titres]) => ({
        Compétence: nom,
        Formations: titres.length,
        'Titres des formations': titres.join(' · '),
      })).sort(
        (a, b) => b.Formations - a.Formations || a.Compétence.localeCompare(b.Compétence, 'fr'),
      );

      const criteres: string[] = [];
      if (exportText) criteres.push(`recherche « ${exportText} »`);
      if (exportUpId) {
        const up = upsOptions.find((u) => String(u.id) === String(exportUpId));
        criteres.push(`UP ${up?.libelle ?? exportUpId}`);
      }
      if (exportDeptId) {
        const dept = deptsOptions.find((d) => String(d.id) === String(exportDeptId));
        criteres.push(`département ${dept?.libelle ?? exportDeptId}`);
      }
      if (exportRange) {
        criteres.push(
          `du ${exportRange[0].format('DD/MM/YYYY')} au ${exportRange[1].format('DD/MM/YYYY')}`,
        );
      }
      const subtitle = `${exportRows.length} formation${exportRows.length === 1 ? '' : 's'} · ${
        criteres.length ? criteres.join(' · ') : 'catalogue complet'
      } · ${exportDateLabel()}`;

      writeExcel(
        [
          {
            name: 'Formations',
            title: 'Catalogue des formations',
            subtitle,
            rows: formationRows,
          },
          ...(seanceRows.length
            ? [
                {
                  name: 'Séances',
                  title: 'Séances des formations exportées',
                  subtitle: `${seanceRows.length} séance(s) · ${exportDateLabel()}`,
                  rows: seanceRows,
                },
              ]
            : []),
          {
            name: 'Synthèse UP-Département',
            title: 'Synthèse par UP et département',
            subtitle: `${syntheseRows.length} regroupement(s) · ${exportDateLabel()}`,
            rows: syntheseRows,
          },
          ...(competenceRows.length
            ? [
                {
                  name: 'Par compétence',
                  title: 'Formations par compétence',
                  subtitle: `${competenceRows.length} compétence(s) · ${exportDateLabel()}`,
                  rows: competenceRows,
                },
              ]
            : []),
        ],
        `catalogue_formations_${isoDate()}.xlsx`,
      );
      msgApi.success(
        `Export Excel : ${exportRows.length} formation${exportRows.length === 1 ? '' : 's'} téléchargée${exportRows.length === 1 ? '' : 's'}.`,
      );
      setOpenExport(false);
    } catch (error: unknown) {
      const e = error as { message?: string };
      msgApi.error(`Échec de l’export Excel : ${e.message || 'erreur inattendue'}`);
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
        return opt ? <Tag>{opt.label}</Tag> : r.periodeFormation || '—';
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
      width: 140,
      align: 'center' as const,
      render: (_, r) => {
        const role = normalizeRole(user?.role);
        const isResponsableDossier = role === 'responsabledossier';
        return (
          <Space size={4}>
            <Tooltip title="Exporter cette formation en Excel">
              <Button
                type="text"
                shape="circle"
                icon={<FileExcelOutlined />}
                loading={exportingFormationId === r.idFormation}
                disabled={r.idFormation == null || exportingFormationId !== null}
                onClick={() => void handleExportFormation(r)}
                aria-label={`Exporter ${r.titreFormation || 'la formation'} en Excel`}
                className="formation-btn-export-row"
              />
            </Tooltip>
            {canManageFormations || isResponsableDossier ? (
              <>
                <Button
                  type="text"
                  shape="circle"
                  icon={<EditOutlined />}
                  onClick={() => {
                    if (r.idFormation == null) return;
                    // Page dédiée (GET détail frais) pour les gestionnaires ;
                    // le responsable dossier gère les documents de la formation.
                    navigate(
                      canManageFormations
                        ? `/home/Formation/Modifier/${r.idFormation}`
                        : `/home/Formation/Consulter/${r.idFormation}/documents`,
                    );
                  }}
                  title={isResponsableDossier ? 'Gérer Dossier' : 'Modifier'}
                  className="formation-btn-edit"
                />
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
              </>
            ) : (
              <Tag color="blue" className="formation-tag-consultation">
                Consultation
              </Tag>
            )}
          </Space>
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
    setFormateurFilter(undefined);
    setCompetenceFilter(undefined);
  };

  const hasActiveFilters =
    filterText ||
    typeFilter ||
    etatFilter ||
    upFilter ||
    deptFilter ||
    periodFilter ||
    periodRange ||
    formateurFilter ||
    competenceFilter;

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
              onClick={openExportModal}
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
          <Select
            placeholder="Formateur (nb formations)"
            allowClear
            value={formateurFilter}
            onChange={setFormateurFilter}
            style={{ width: 240 }}
            showSearch
            optionFilterProp="label"
            options={formateurOptions.map((option) => ({
              value: option.key,
              label: `${option.label} (${option.count})`,
            }))}
          />
          {competenceOptions.length > 0 && (
            <Select
              placeholder="Compétence"
              allowClear
              value={competenceFilter}
              onChange={setCompetenceFilter}
              style={{ width: 240 }}
              showSearch
              optionFilterProp="label"
              options={competenceOptions.map((option) => ({
                value: option.key,
                label: `${option.label} (${option.count})`,
              }))}
            />
          )}
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

      {/* Modal Export */}
      <Modal
        title="Exporter le catalogue en Excel"
        open={openExport}
        onOk={handleExport}
        onCancel={() => setOpenExport(false)}
        okText={`Exporter (${exportRows.length})`}
        okButtonProps={{ disabled: exportRows.length === 0 }}
        cancelText="Annuler"
        width={560}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            L’export porte sur les formations qui correspondent à la recherche, à l’UP et au
            département choisis. La plage de dates est facultative : sans elle, toutes les périodes
            sont incluses.
          </Text>
          <Input
            placeholder="Rechercher par titre…"
            allowClear
            value={exportText}
            onChange={(e) => setExportText(e.target.value)}
            prefix={
              <span style={{ color: '#b51200' }}>
                <FilterOutlined />
              </span>
            }
          />
          <Space size={8} wrap>
            <Select
              placeholder="UP"
              allowClear
              value={exportUpId as string}
              onChange={(v) => setExportUpId(v as Id)}
              style={{ width: 240 }}
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
              value={exportDeptId as string}
              onChange={(v) => setExportDeptId(v as Id)}
              style={{ width: 240 }}
              showSearch
              optionFilterProp="children"
            >
              {deptsOptions.map((d) => (
                <Option key={String(d.id)} value={d.id as string}>
                  {d.libelle}
                </Option>
              ))}
            </Select>
          </Space>
          <RangePicker
            style={{ width: '100%' }}
            value={exportRange}
            onChange={(dates) => setExportRange(dates as [Dayjs, Dayjs] | null)}
            placeholder={['Début (facultatif)', 'Fin (facultatif)']}
          />
          <Text>
            <b>{exportRows.length}</b> formation{exportRows.length === 1 ? '' : 's'} sera
            {exportRows.length === 1 ? '' : 'ont'} exportée{exportRows.length === 1 ? '' : 's'} —
            feuilles « Formations », « Séances », « Synthèse UP-Département »
            {competenceOptions.length > 0 ? ', « Par compétence »' : ''}.
          </Text>
        </Space>
      </Modal>
    </div>
  );
}
