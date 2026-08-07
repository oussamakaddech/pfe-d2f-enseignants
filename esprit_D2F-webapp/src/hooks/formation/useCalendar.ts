/**
 * Hooks react-query pour la fonctionnalité Calendrier des ateliers.
 * Sépare la logique métier (appels API, cache, invalidation) de l'UI.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CalendarService from '@/services/formation/CalendarService';
import type {
  CalendarFormation,
  CalendarFormationFilters,
  CalendarPage,
  CalendarParticipant,
  ConflictReport,
  ImportReport,
  ParsedCalendar,
  SendInvitationsResult,
} from '@/models/calendar';

const KEYS = {
  formations: (filters: CalendarFormationFilters) => ['calendar', 'formations', filters] as const,
  participants: (id: number, page: number, size: number) =>
    ['calendar', 'participants', id, page, size] as const,
  conflicts: ['calendar', 'conflicts'] as const,
};

/** Aperçu (parsing sans persistance). */
export function usePreviewImport() {
  return useMutation<ParsedCalendar, unknown, File>({
    mutationFn: (file: File) => CalendarService.preview(file),
  });
}

/** Import persistant ; invalide les listes du calendrier. */
export function useImportCalendar() {
  const queryClient = useQueryClient();
  return useMutation<ImportReport, unknown, { file: File; force?: boolean }>({
    mutationFn: ({ file, force }) => CalendarService.importCalendar(file, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useCalendarFormations(filters: CalendarFormationFilters) {
  return useQuery<CalendarPage<CalendarFormation>>({
    queryKey: KEYS.formations(filters),
    queryFn: () => CalendarService.listFormations(filters),
  });
}

export function useCalendarParticipants(id: number | undefined, page = 0, size = 50) {
  return useQuery<CalendarPage<CalendarParticipant>>({
    queryKey: KEYS.participants(id ?? -1, page, size),
    queryFn: () => CalendarService.getParticipants(id as number, page, size),
    enabled: !!id,
  });
}

export function useCalendarConflicts(enabled = true) {
  return useQuery<ConflictReport>({
    queryKey: KEYS.conflicts,
    queryFn: () => CalendarService.getConflicts(),
    enabled,
  });
}

export function useSendInvitations() {
  return useMutation<SendInvitationsResult, unknown, number>({
    mutationFn: (formationId: number) => CalendarService.sendInvitations(formationId),
  });
}

export function useSendAllInvitations() {
  return useMutation<SendInvitationsResult, unknown, void>({
    mutationFn: () => CalendarService.sendAllInvitations(),
  });
}
