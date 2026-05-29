import { useState, useEffect, useRef, useCallback } from "react";
import { useRiceEnseignants } from "@/hooks/analyse/useRiceService";
import type { EnseignantRef } from "@/pages/competence/rice/riceTypes";

interface MsgApi {
  warning: (msg: string) => void;
}

export function useRiceEnseignantsLoader(departement: string, msgApi: MsgApi) {
  const [allEnseignants, setAllEnseignants] = useState<EnseignantRef[]>([]);
  const [enseignantsLoading, setEnseignantsLoading] = useState(false);
  const [enseignantsError, setEnseignantsError] = useState<string | null>(null);
  const [enseignantsLoadSlow, setEnseignantsLoadSlow] = useState(false);
  const [ignoreEnseignants, setIgnoreEnseignants] = useState(false);

  const riceEnsQuery = useRiceEnseignants(departement === "auto" ? null : departement);
  const ensSlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadEnseignants = useCallback(() => {
    setIgnoreEnseignants(false);
    void riceEnsQuery.refetch();
  }, [riceEnsQuery]);

  const continueWithoutEnseignants = useCallback(() => {
    setIgnoreEnseignants(true);
    setEnseignantsLoadSlow(false);
    setEnseignantsError(null);
    setEnseignantsLoading(false);
    setAllEnseignants([]);
  }, []);

  useEffect(() => {
    if (ignoreEnseignants) return;

    if (riceEnsQuery.isLoading) {
      setEnseignantsLoading(true);
      setEnseignantsError(null);
      setEnseignantsLoadSlow(false);
      ensSlowTimerRef.current = setTimeout(() => setEnseignantsLoadSlow(true), 5000);
    }

    if (riceEnsQuery.data) {
      if (ensSlowTimerRef.current) clearTimeout(ensSlowTimerRef.current);
      setAllEnseignants(Array.isArray(riceEnsQuery.data) ? (riceEnsQuery.data as EnseignantRef[]) : []);
      setEnseignantsLoading(false);
      setEnseignantsLoadSlow(false);
    }

    if (riceEnsQuery.error) {
      if (ensSlowTimerRef.current) clearTimeout(ensSlowTimerRef.current);
      const err = riceEnsQuery.error as { response?: { status?: number } };
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setEnseignantsError("Session expirée. Veuillez vous reconnecter pour charger les enseignants.");
        msgApi.warning("Session expirée — reconnectez-vous");
      } else {
        setEnseignantsError("Impossible de charger les enseignants. Vérifiez votre connexion ou contactez l'admin.");
        msgApi.warning("Enseignants non chargés — affectation manuelle uniquement");
      }
      setAllEnseignants([]);
      setEnseignantsLoading(false);
      setEnseignantsLoadSlow(false);
    }

    return () => { if (ensSlowTimerRef.current) clearTimeout(ensSlowTimerRef.current); };
  }, [riceEnsQuery.data, riceEnsQuery.isLoading, riceEnsQuery.error, ignoreEnseignants, msgApi]);

  return {
    allEnseignants, setAllEnseignants,
    enseignantsLoading, enseignantsError, enseignantsLoadSlow, ignoreEnseignants,
    loadEnseignants, continueWithoutEnseignants,
  };
}
