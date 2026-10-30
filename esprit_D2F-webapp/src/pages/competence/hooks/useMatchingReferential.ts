import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import CompetenceService from '@/services/competence/CompetenceService';
import type { Competence, Domaine, SousCompetence } from '@/models/competence';

/** Aplatit l'arbre des sous-compétences (champ `enfants` récursif). */
function flattenSousCompetences(list: SousCompetence[]): SousCompetence[] {
  const acc: SousCompetence[] = [];
  const walk = (items: SousCompetence[] | undefined) => {
    (items ?? []).forEach((item) => {
      acc.push(item);
      if (item.enfants?.length) walk(item.enfants);
    });
  };
  walk(list);
  const seen = new Map<string, SousCompetence>();
  acc.forEach((sc) => {
    const k = String(sc.id);
    if (!seen.has(k)) seen.set(k, sc);
  });
  return Array.from(seen.values());
}

/**
 * Charge le référentiel hiérarchique (domaines › compétences › sous-compétences)
 * pour la page Matchmaking : options des filtres en cascade et résolution de
 * la hiérarchie de chaque savoir.
 */
export function useMatchingReferential() {
  const domainesQuery = useQuery({
    queryKey: ['matching', 'domaines'],
    queryFn: () => CompetenceService.domaine.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const competencesQuery = useQuery({
    queryKey: ['matching', 'competences'],
    queryFn: () => CompetenceService.competence.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const sousCompetencesQuery = useQuery({
    queryKey: ['matching', 'sousCompetences'],
    queryFn: () => CompetenceService.sousCompetence.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const domaines: Domaine[] = useMemo(() => domainesQuery.data ?? [], [domainesQuery.data]);
  const competences: Competence[] = useMemo(
    () => competencesQuery.data ?? [],
    [competencesQuery.data],
  );
  const sousCompetences: SousCompetence[] = useMemo(
    () => flattenSousCompetences(sousCompetencesQuery.data ?? []),
    [sousCompetencesQuery.data],
  );

  const competenceById = useMemo(() => {
    const map = new Map<string, Competence>();
    competences.forEach((c) => map.set(String(c.id), c));
    return map;
  }, [competences]);

  const sousCompetenceById = useMemo(() => {
    const map = new Map<string, SousCompetence>();
    sousCompetences.forEach((sc) => map.set(String(sc.id), sc));
    return map;
  }, [sousCompetences]);

  return {
    domaines,
    competences,
    sousCompetences,
    competenceById,
    sousCompetenceById,
    isLoading:
      domainesQuery.isLoading || competencesQuery.isLoading || sousCompetencesQuery.isLoading,
  };
}
