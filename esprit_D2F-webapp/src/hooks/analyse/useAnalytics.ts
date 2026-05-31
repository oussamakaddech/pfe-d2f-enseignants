import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AnalyticsService from "@/services/analyse/AnalyticsService";
import type {
  AnalyseResult, GapsResponse, RecommendationsResponse, TrainingPath,
} from "@/models/analyse";

interface GapParams   { urgence?: string; page: number }
interface RecoParams  { competenceId?: number; page: number }

export function useAnalytics(enseignantId: string) {
  const [gapParams,           setGapParams]           = useState<GapParams | null>(null);
  const [recoParams,          setRecoParams]          = useState<RecoParams | null>(null);
  const [trainingCompetenceId, setTrainingCompetenceId] = useState<number | null>(null);

  const analysisMutation = useMutation<AnalyseResult, Error>({
    mutationFn: () => AnalyticsService.analyzeEnseignant(enseignantId),
  });

  const gapsQ = useQuery<GapsResponse>({
    queryKey: ["gaps", enseignantId, gapParams],
    queryFn:  () => AnalyticsService.getGaps(enseignantId, gapParams!),
    enabled:  !!enseignantId && gapParams !== null,
  });

  const recoQ = useQuery<RecommendationsResponse>({
    queryKey: ["recommendations", enseignantId, recoParams],
    queryFn:  () =>
      AnalyticsService.getRecommendations(enseignantId, {
        competence_id: recoParams?.competenceId,
        page:          recoParams?.page,
      }),
    enabled: !!enseignantId && recoParams !== null,
  });

  const trainingPathQ = useQuery<TrainingPath>({
    queryKey: ["training-path", enseignantId, trainingCompetenceId],
    queryFn:  () => AnalyticsService.getTrainingPath(enseignantId, trainingCompetenceId!),
    enabled:  !!enseignantId && trainingCompetenceId !== null,
    retry:    (_count: number, error: unknown) => (error as { response?: { status: number } })?.response?.status !== 404,
  });

  const runAnalysis = useCallback(async () => {
    if (!enseignantId) return;
    return analysisMutation.mutateAsync();
  }, [enseignantId, analysisMutation]);

  const fetchGaps = useCallback((urgence?: string, page = 0) => {
    if (!enseignantId) return;
    setGapParams({ urgence, page });
  }, [enseignantId]);

  const fetchRecommendations = useCallback((competenceId?: number, page = 0) => {
    if (!enseignantId) return;
    setRecoParams({ competenceId, page });
  }, [enseignantId]);

  const fetchTrainingPath = useCallback((competenceId: number) => {
    if (!enseignantId) return;
    setTrainingCompetenceId(competenceId);
  }, [enseignantId]);

  let error: string | null = null;
  if (analysisMutation.isError) {
    error = (analysisMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Erreur lors de l'analyse";
  } else if (gapsQ.isError) {
    error = "Erreur chargement gaps";
  } else if (recoQ.isError) {
    error = "Erreur chargement recommandations";
  } else if (trainingPathQ.isError) {
    error = "Erreur chargement parcours";
  }

  return {
    loading:         gapsQ.isLoading || recoQ.isLoading || trainingPathQ.isLoading,
    analysing:       analysisMutation.isPending,
    gaps:            gapsQ.data ?? null,
    recommendations: recoQ.data ?? null,
    trainingPath:    trainingPathQ.data ?? null,
    analyseResult:   analysisMutation.data ?? null,
    error,
    runAnalysis,
    fetchGaps,
    fetchRecommendations,
    fetchTrainingPath,
  };
}




