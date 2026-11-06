import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FormationCompetenceService from '@/services/competence/FormationCompetenceService';
import type { Id } from '@/models/common';

const KEYS = {
  byFormation: (id: Id) => ['formation-competences', 'formation', id] as const,
  byCompetence: (id: Id) => ['formation-competences', 'competence', id] as const,
  byDomaine: (id: Id) => ['formation-competences', 'domaine', id] as const,
};

export function useFormationCompetencesByFormation(formationId: Id | undefined) {
  return useQuery({
    queryKey: KEYS.byFormation(formationId ?? 0),
    queryFn: () => FormationCompetenceService.getByFormation(formationId!),
    enabled: !!formationId,
  });
}

export function useAddFormationCompetence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formationId, fc }: { formationId: Id; fc: Record<string, unknown> }) =>
      FormationCompetenceService.addFormationCompetence(formationId, fc),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formation-competences'] }),
  });
}

export function useUpdateFormationCompetence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fc }: { id: Id; fc: Record<string, unknown> }) =>
      FormationCompetenceService.updateFormationCompetence(id, fc),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formation-competences'] }),
  });
}

export function useDeleteFormationCompetence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => FormationCompetenceService.deleteFormationCompetence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formation-competences'] }),
  });
}

export function useReplaceAllFormationCompetences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      formationId,
      newLinks,
    }: {
      formationId: Id;
      newLinks: Record<string, unknown>[];
    }) => FormationCompetenceService.replaceAllForFormation(formationId, newLinks),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formation-competences'] }),
  });
}

/**
 * Toutes les liaisons formation ↔ compétence (formations actives) : filtre
 * « par compétence » du catalogue. Désactivable pour les rôles qui n'ont pas
 * la permission de lecture (`FORMATION_COMPETENCE_READ`).
 */
export function useAllFormationCompetenceLinks(enabled = true) {
  return useQuery({
    queryKey: ['formation-competences', 'all'] as const,
    queryFn: () => FormationCompetenceService.getAllLinks(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFormationCompetencesByCompetence(competenceId: Id | undefined) {
  return useQuery({
    queryKey: KEYS.byCompetence(competenceId ?? 0),
    queryFn: () => FormationCompetenceService.getByCompetence(competenceId!),
    enabled: !!competenceId,
  });
}
