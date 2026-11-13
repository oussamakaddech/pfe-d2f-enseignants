import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import FormationFeedbackService, {
  type FeedbackStats,
  type FormationAEvaluer,
  type FormationFeedbackPayload,
} from '@/services/evaluation/FormationFeedbackService';

const KEYS = {
  aEvaluer: ['formation-feedback', 'a-evaluer'] as const,
  mine: ['formation-feedback', 'mine'] as const,
  stats: (formationId?: number) => ['formation-feedback', 'stats', formationId ?? 'all'] as const,
};

export function useFormationsAEvaluer() {
  return useQuery<FormationAEvaluer[]>({
    queryKey: KEYS.aEvaluer,
    queryFn: () => FormationFeedbackService.getFormationsAEvaluer(),
  });
}

export function useMesFormationsEvaluees() {
  return useQuery<number[]>({
    queryKey: KEYS.mine,
    queryFn: () => FormationFeedbackService.getMesFormationsEvaluees(),
  });
}

export function useSubmitFormationFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FormationFeedbackPayload) => FormationFeedbackService.submit(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formation-feedback'] }),
  });
}

export function useFeedbackStats(formationId?: number) {
  return useQuery<FeedbackStats>({
    queryKey: KEYS.stats(formationId),
    queryFn: () => FormationFeedbackService.getStats(formationId),
  });
}
