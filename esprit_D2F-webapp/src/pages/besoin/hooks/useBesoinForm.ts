/* ─────────────────────────────────────────────────────────────────────────
 * useBesoinForm — Extracted state + logic from BesoinForm wizard.
 * ─────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import { Form } from 'antd';
import { getActiveRole } from '@/utils/storage/storage';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAddBesoin, useReplaceBesoinCompetences } from '@/hooks/besoin/useBesoins';
import { useEnseignants } from '@/hooks/enseignant/useEnseignants';
import { buildActeurOptions } from '@/utils/besoin/acteurs';
import type { BesoinCompetenceLink, BesoinFormation } from '@/models/besoin';
import type { Id } from '@/models/common';
import {
  useCompetenceDomaineApi,
  useCompetenceApi,
  useSousCompetenceApi,
  useSavoirApi,
} from '@/hooks/competence/useCompetenceService';
import { useAllDepts } from '@/hooks/formation/useDeptCrud';
import { useAllUps } from '@/hooks/formation/useUpCrud';
import useAppNotification from '@/hooks/ui/useAppNotification';
import { ROLES } from '@/utils/constants/roles';

function getErrorMessage(err: unknown): string {
  const e = err as {
    response?: { status?: number; data?: { message?: string; error?: string } };
    message?: string;
  };
  const backendMsg = e.response?.data?.message || e.response?.data?.error;
  const status = e.response?.status;
  return (
    backendMsg ||
    (status ? `Le serveur a répondu ${status}.` : null) ||
    (e.message ? `Échec réseau : ${e.message}` : null) ||
    "Erreur lors de l'ajout du besoin"
  );
}
import * as XLSX from 'xlsx-js-style';

type DayjsLike = { format: (f: string) => string };

type BesoinPayloadValues = {
  idBesoinFormation?: Id;
  codeBesoin?: string;
  titre?: string;
  typeBesoin?: string;
  description?: string;
  dateDebut?: DayjsLike;
  dateFin?: DayjsLike;
  priorite?: string;
  impactStrategique?: string;
  publicCible?: string;
  estOuverte?: boolean;
  autresInformations?: string;
  theme?: string;
  dureeFormation?: number | string;
  nbMaxParticipants?: number | string;
  periodCode?: string;
  customPeriodLabel?: string;
  objectifsPedagogiques?: string;
  methodesEvaluationAcquis?: string;
};

type ReferentielDomaine = { id?: string | number; nom?: string };
type ReferentielCompetence = { id?: string | number; nom?: string; domaineId?: string | number };
type ReferentielSousCompetence = {
  id?: string | number;
  nom?: string;
  competenceId?: string | number;
};
type ReferentielSavoir = {
  id?: string | number;
  nom?: string;
  type?: string;
  sousCompetenceId?: string | number;
};

const toNum = (v: string | number | null | undefined): number | null =>
  v == null ? null : Number(v);

export function useBesoinForm() {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const activeRole = String(getActiveRole() || '').toUpperCase();
  const userRole = String(user?.role || '').toUpperCase();
  const canManageParticipants =
    [ROLES.CUP.toUpperCase(), ROLES.ADMIN.toUpperCase()].includes(userRole) ||
    [ROLES.CUP.toUpperCase(), ROLES.ADMIN.toUpperCase()].includes(activeRole);

  const { message: msgApi } = useAppNotification();
  const { data: departements = [], isLoading: deptsLoading } = useAllDepts();
  const { data: ups = [], isLoading: upsLoading } = useAllUps();
  const { data: enseignants = [], isLoading: enseignantsLoading } = useEnseignants();
  const loading = deptsLoading || upsLoading;

  // Options des sélecteurs Animateurs / Enseignants (base enseignants).
  const acteurOptions = buildActeurOptions(enseignants);

  // Mutations must be created at the top level of the hook (Rules of Hooks),
  // not inside the handleSubmit event handler.
  const addBesoin = useAddBesoin();
  const replaceBesoinCompetences = useReplaceBesoinCompetences();
  const competenceDomaineApi = useCompetenceDomaineApi();
  const competenceApiService = useCompetenceApi();
  const sousCompetenceApiService = useSousCompetenceApi();
  const savoirApiService = useSavoirApi();

  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [lastImportCount, setLastImportCount] = useState(0);

  const participantsFileInputRef = useRef<HTMLInputElement>(null);
  const participantsText = String(Form.useWatch('publicCible', form) || '');
  const participantsLines = participantsText
    .split(/\r?\n/)
    .map((l: string) => l.trim())
    .filter(Boolean);
  const participantsCount = participantsLines.length;

  // Competence RICE state
  const [compDomaines, setCompDomaines] = useState<ReferentielDomaine[]>([]);
  const [compCompetences, setCompCompetences] = useState<ReferentielCompetence[]>([]);
  const [selectedCompLinks, setSelectedCompLinks] = useState<BesoinCompetenceLink[]>([]);
  const [rowSousCompetences, setRowSousCompetences] = useState<
    Record<number, ReferentielSousCompetence[]>
  >({});
  const [rowSavoirs, setRowSavoirs] = useState<Record<number, ReferentielSavoir[]>>({});
  const [compLoaded, setCompLoaded] = useState(false);
  const [compSearch, setCompSearch] = useState('');

  // Lazy-load référentiel RICE when user reaches step 3
  useEffect(() => {
    if (currentStep === 3 && !compLoaded) {
      const upId = form.getFieldValue('up') ? Number(form.getFieldValue('up')) : null;
      const deptId = form.getFieldValue('departement')
        ? Number(form.getFieldValue('departement'))
        : null;
      Promise.all([competenceDomaineApi.getAll(upId, deptId), competenceApiService.getAll()])
        .then(([domainesData, competencesData]) => {
          setCompDomaines(Array.isArray(domainesData) ? domainesData : []);
          setCompCompetences(Array.isArray(competencesData) ? competencesData : []);
          setCompLoaded(true);
        })
        .catch(() => msgApi.error('Impossible de charger le référentiel de compétences'));
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCompetenceChange = async (idx: number, competence: ReferentielCompetence | null) => {
    const updated = [...selectedCompLinks];
    updated[idx] = {
      ...updated[idx],
      competenceId: toNum(competence?.id ?? null),
      competenceNom: competence?.nom || '',
      domaineId: toNum(competence?.domaineId ?? updated[idx]?.domaineId ?? null),
      sousCompetenceId: null,
      sousCompetenceNom: undefined,
      sousCompetenceIds: [],
      sousCompetenceNoms: [],
      savoirId: null,
      savoirIds: [],
      savoirNoms: [],
    };
    setSelectedCompLinks(updated);
    const newSous: Record<number, ReferentielSousCompetence[]> = { ...rowSousCompetences };
    const newSavoirs: Record<number, ReferentielSavoir[]> = { ...rowSavoirs };
    newSous[idx] = [];
    newSavoirs[idx] = [];
    if (competence?.id) {
      // Sous-compétences de la compétence + savoirs rattachés directement
      // (affinés ensuite par les sous-compétences sélectionnées).
      try {
        newSous[idx] = (await sousCompetenceApiService.getByCompetence(
          competence.id,
        )) as ReferentielSousCompetence[];
      } catch {
        /* ignore */
      }
      try {
        newSavoirs[idx] = (await savoirApiService.getByCompetence(
          competence.id,
        )) as ReferentielSavoir[];
      } catch {
        /* ignore */
      }
    }
    setRowSousCompetences(newSous);
    setRowSavoirs(newSavoirs);
  };

  const handleSousCompetencesChange = async (idx: number, ids: (string | number)[]) => {
    const options = Array.isArray(rowSousCompetences[idx]) ? rowSousCompetences[idx] : [];
    const selected = options.filter((o) => ids.includes(o.id as string | number));
    const updated = [...selectedCompLinks];
    updated[idx] = {
      ...updated[idx],
      sousCompetenceId: selected.length === 1 ? toNum(selected[0].id) : null,
      sousCompetenceNom: selected.length === 1 ? selected[0].nom || undefined : undefined,
      sousCompetenceIds: ids,
      sousCompetenceNoms: selected.map((o) => o.nom || ''),
      savoirId: null,
      savoirIds: [],
      savoirNoms: [],
    };
    setSelectedCompLinks(updated);
    // Savoirs proposés = union des savoirs des sous-compétences choisies ;
    // sans sous-compétence → savoirs rattachés directement à la compétence.
    const newSavoirs: Record<number, ReferentielSavoir[]> = { ...rowSavoirs };
    if (selected.length > 0) {
      try {
        const perSousComp = await Promise.all(
          selected.map((sc) =>
            savoirApiService
              .getBySousCompetence(sc.id as string | number)
              .catch(() => [] as ReferentielSavoir[]),
          ),
        );
        const merged = new Map<string | number, ReferentielSavoir>();
        perSousComp.flat().forEach((s) => {
          if (s?.id != null) merged.set(s.id, s);
        });
        newSavoirs[idx] = Array.from(merged.values());
      } catch {
        /* ignore */
      }
    } else if (updated[idx].competenceId != null) {
      const competenceId = updated[idx].competenceId as string | number;
      try {
        newSavoirs[idx] = (await savoirApiService.getByCompetence(
          competenceId,
        )) as ReferentielSavoir[];
      } catch {
        /* ignore */
      }
    } else {
      newSavoirs[idx] = [];
    }
    setRowSavoirs(newSavoirs);
  };

  const handleSavoirsChange = (idx: number, ids: (string | number)[]) => {
    const options = Array.isArray(rowSavoirs[idx]) ? rowSavoirs[idx] : [];
    const selected = options.filter((o) => ids.includes(o.id as string | number));
    const updated = [...selectedCompLinks];
    updated[idx] = {
      ...updated[idx],
      // savoirId unique conservé (parité API) : premier savoir sélectionné
      savoirId: selected.length > 0 ? toNum(selected[0].id) : null,
      savoirNom: selected.length > 0 ? selected[0].nom || '' : '',
      savoirIds: ids,
      savoirNoms: selected.map((o) => o.nom || ''),
    };
    setSelectedCompLinks(updated);
  };

  /**
   * V27 — expansion des sélections multiples en lignes plates persistées :
   *  - savoirs sélectionnés   → une ligne par savoir (sous-compétence résolue via le savoir) ;
   *  - sinon sous-compétences → une ligne par sous-compétence ;
   *  - sinon                  → une ligne compétence seule.
   */
  const buildFlatLinks = (): BesoinCompetenceLink[] => {
    const links: BesoinCompetenceLink[] = [];
    selectedCompLinks.forEach((row, idx) => {
      if (!row.competenceId) return;
      const savoirOptions = Array.isArray(rowSavoirs[idx]) ? rowSavoirs[idx] : [];
      const savoirById = new Map(savoirOptions.map((s) => [String(s.id), s]));
      const sousOptions = Array.isArray(rowSousCompetences[idx]) ? rowSousCompetences[idx] : [];
      const sousById = new Map(sousOptions.map((s) => [String(s.id), s]));
      const base = {
        domaineId: row.domaineId,
        competenceId: row.competenceId,
        competenceNom: row.competenceNom,
      };
      const savoirIds = row.savoirIds ?? [];
      const sousIds = row.sousCompetenceIds ?? [];
      if (savoirIds.length > 0) {
        savoirIds.forEach((sid) => {
          const s = savoirById.get(String(sid));
          let sousCompetenceId = s?.sousCompetenceId != null ? toNum(s.sousCompetenceId) : null;
          let sousCompetenceNom: string | undefined =
            sousCompetenceId != null
              ? sousById.get(String(sousCompetenceId))?.nom || undefined
              : undefined;
          if (sousCompetenceId == null && sousIds.length === 1) {
            sousCompetenceId = toNum(sousIds[0]);
            sousCompetenceNom = sousById.get(String(sousIds[0]))?.nom || undefined;
          }
          links.push({
            ...base,
            savoirId: toNum(s?.id ?? sid),
            savoirNom: s?.nom || '',
            sousCompetenceId,
            sousCompetenceNom,
          });
        });
      } else if (sousIds.length > 0) {
        sousIds.forEach((scid) => {
          links.push({
            ...base,
            sousCompetenceId: toNum(scid),
            sousCompetenceNom: sousById.get(String(scid))?.nom || undefined,
            savoirId: null,
            savoirNom: '',
          });
        });
      } else {
        links.push({
          ...base,
          sousCompetenceId: null,
          sousCompetenceNom: undefined,
          savoirId: null,
          savoirNom: '',
        });
      }
    });
    // Déduplication défensive (miroir de l'index unique V27)
    const seen = new Set<string>();
    return links.filter((l) => {
      const key = `${l.competenceId}:${l.sousCompetenceId}:${l.savoirId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const getStepFields = (step: number): string[] => {
    switch (step) {
      case 0:
        return ['up', 'departement', 'typeBesoin', 'publicCible'];
      case 1:
        return [
          'titre',
          'theme',
          'objectifFormation',
          'objectifsPedagogiques',
          'priorite',
          'impactStrategique',
        ];
      case 2:
        return [
          'propositionAnimateur',
          'dateDebut',
          'dateFin',
          'dureeFormation',
          'nbMaxParticipants',
          'periodCode',
          'customPeriodLabel',
        ];
      case 3:
        return [];
      case 4:
        return ['estOuverte', 'methodesEvaluationAcquis', 'autresInformations'];
      default:
        return [];
    }
  };

  const next = async () => {
    try {
      await form.validateFields(getStepFields(currentStep));
      setDirection(1);
      setCurrentStep((s) => s + 1);
    } catch {
      /* validation failed */
    }
  };

  const prev = () => {
    setDirection(-1);
    setCurrentStep((s) => s - 1);
  };

  const importParticipantsFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        msgApi.warning('Fichier Excel vide');
        return;
      }
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1 });
      if (!Array.isArray(rows) || rows.length === 0) {
        msgApi.warning('Aucune donnée participants trouvée');
        return;
      }
      const [headerRow = [], ...dataRows] = rows as unknown[][];
      const header = headerRow.map((cell) =>
        String(cell || '')
          .trim()
          .toLowerCase(),
      );
      const idxNom = header.findIndex((h: string) => ['nom', 'name'].includes(h));
      const idxPrenom = header.findIndex((h: string) =>
        ['prénom', 'prenom', 'first name', 'firstname'].includes(h),
      );
      const idxEmail = header.findIndex((h: string) => ['email', 'mail'].includes(h));
      const parsedLines = dataRows
        .map((row) => {
          if (!Array.isArray(row)) return '';
          const nom = idxNom >= 0 ? String(row[idxNom] || '').trim() : '';
          const prenom = idxPrenom >= 0 ? String(row[idxPrenom] || '').trim() : '';
          const email = idxEmail >= 0 ? String(row[idxEmail] || '').trim() : '';
          const fallback = String(row[0] || '').trim();
          if (nom || prenom || email) {
            return [nom, prenom].filter(Boolean).join(' ') + (email ? ` <${email}>` : '');
          }
          return fallback;
        })
        .map((l) => l.trim())
        .filter(Boolean);
      const uniqueLines = [...new Set(parsedLines)];
      const currentValue = String(form.getFieldValue('publicCible') || '').trim();
      const merged = [currentValue, ...uniqueLines].filter(Boolean).join('\n');
      form.setFieldsValue({ publicCible: merged });
      setLastImportCount(uniqueLines.length);
      msgApi.success(`${uniqueLines.length} participant(s) importé(s) depuis Excel`);
    } catch {
      msgApi.error("Erreur lors de l'import Excel des participants");
    } finally {
      if (participantsFileInputRef.current) participantsFileInputRef.current.value = '';
    }
  };

  const clearParticipants = () => {
    form.setFieldsValue({ publicCible: '' });
    setLastImportCount(0);
  };

  const formatParticipantsSummary = (rawValue: unknown): string => {
    const lines = String(rawValue || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return '—';
    const preview = lines.slice(0, 3).join(' | ');
    if (lines.length <= 3) return `${lines.length} participant(s) — ${preview}`;
    return `${lines.length} participant(s) — ${preview} ...`;
  };

  function buildPayload(values: BesoinPayloadValues) {
    return {
      idBesoinFormation: values.idBesoinFormation,
      codeBesoin: values.codeBesoin,
      titre: values.titre,
      typeBesoin: values.typeBesoin as BesoinFormation['typeBesoin'],
      description: values.description,
      dateDebut: values.dateDebut ? values.dateDebut.format('YYYY-MM-DD') : undefined,
      dateFin: values.dateFin ? values.dateFin.format('YYYY-MM-DD') : undefined,
      priorite: values.priorite as BesoinFormation['priorite'],
      impactStrategique: values.impactStrategique,
      publicCible:
        canManageParticipants ||
        values.typeBesoin === 'INDIVIDUEL' ||
        values.typeBesoin === 'COLLECTIF'
          ? values.publicCible
          : undefined,
      estOuverte: values.estOuverte || false,
      autresInformations: values.autresInformations,
      theme: values.theme,
      dureeFormation: values.dureeFormation ? Number(values.dureeFormation) : undefined,
      nbMaxParticipants: values.nbMaxParticipants ? Number(values.nbMaxParticipants) : undefined,
      periodCode: values.periodCode,
      customPeriodLabel: values.customPeriodLabel,
      objectifsPedagogiques: values.objectifsPedagogiques,
      methodesEvaluationAcquis: values.methodesEvaluationAcquis,
    };
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const values = form.getFieldsValue(true) as unknown as BesoinPayloadValues;
      const payload = buildPayload(values);
      const created = await addBesoin.mutateAsync(payload);
      const besoinId = created?.idBesoinFormation;
      if (besoinId) {
        const links = buildFlatLinks();
        if (links.length > 0) {
          await replaceBesoinCompetences.mutateAsync({ besoinId: Number(besoinId), links });
        }
      }
      msgApi.success('Besoin de formation ajouté avec succès !');
      setSubmitted(true);
      form.resetFields();
      setSelectedCompLinks([]);
      setRowSousCompetences({});
      setRowSavoirs({});
      setCompLoaded(false);
      setCompSearch('');
      setLastImportCount(0);
      setCurrentStep(0);
    } catch (err: unknown) {
      msgApi.error(`Erreur lors de l'ajout du besoin — ${getErrorMessage(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    user,
    canManageParticipants,
    loading,
    submitting,
    currentStep,
    setCurrentStep,
    direction,
    setDirection,
    submitted,
    setSubmitted,
    participantsFileInputRef,
    participantsCount,
    lastImportCount,
    compDomaines,
    compCompetences,
    selectedCompLinks,
    setSelectedCompLinks,
    rowSousCompetences,
    rowSavoirs,
    setRowSavoirs,
    compLoaded,
    compSearch,
    setCompSearch,
    departements,
    ups,
    acteurOptions,
    enseignantsLoading,
    handleCompetenceChange,
    handleSousCompetencesChange,
    handleSavoirsChange,
    handleSubmit,
    next,
    prev,
    importParticipantsFromExcel,
    clearParticipants,
    formatParticipantsSummary,
  };
}
