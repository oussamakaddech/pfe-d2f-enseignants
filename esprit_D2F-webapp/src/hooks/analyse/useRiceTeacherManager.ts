import { useState, useCallback } from "react";
import type { RiceDomaine } from "@/models/competence";
import type { CreateEnsTarget, EnseignantRef, ExtractedEnseignant } from "@/pages/competence/rice/riceTypes";

interface MsgApi {
  warning: (msg: string) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
}

interface UseRiceTeacherManagerParams {
  msgApi: MsgApi;
  createEnseignantMutate: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  setAllEnseignants: React.Dispatch<React.SetStateAction<EnseignantRef[]>>;
  tree: RiceDomaine[];
  setEnseignants: (di: number, ci: number, sci: number, si: number, ids: string[]) => void;
  remapInTree: (extId: string, realId: string) => void;
  setExtractedEnseignants: React.Dispatch<React.SetStateAction<ExtractedEnseignant[]>>;
}

export function useRiceTeacherManager({
  msgApi, createEnseignantMutate,
  setAllEnseignants, tree, setEnseignants, remapInTree, setExtractedEnseignants,
}: UseRiceTeacherManagerParams) {
  const [createEnsModal, setCreateEnsModal] = useState(false);
  const [createEnsTarget, setCreateEnsTarget] = useState<CreateEnsTarget | null>(null);
  const [createEnsData, setCreateEnsData] = useState({ nom: "", prenom: "", mail: "" });
  const [savingNewEns, setSavingNewEns] = useState(false);

  const remapEnseignant = useCallback((extId: string, realId: string) => {
    remapInTree(extId, realId);
    const extIdx = Number.parseInt(extId.replace("ext_", ""), 10);
    setExtractedEnseignants((prev) => {
      const next = prev.map((ex, i) => (i === extIdx ? { ...ex, matched_id: realId } : ex));
      try { sessionStorage.setItem("rice_extracted_enseignants", JSON.stringify(next)); } catch { }
      return next;
    });
    msgApi.success("Enseignant identifié");
  }, [remapInTree, setExtractedEnseignants, msgApi]);

  const handleCreateNewEnseignant = useCallback(async () => {
    if (!createEnsTarget || !createEnsData.nom.trim()) {
      msgApi.warning("Le nom est requis");
      return;
    }
    setSavingNewEns(true);
    try {
      const nomUp = createEnsData.nom.trim().toUpperCase();
      const prenom = createEnsData.prenom.trim();
      const mail = createEnsData.mail.trim() ||
        `${nomUp.toLowerCase()}.${prenom.toLowerCase().replaceAll(/\s+/g, ".")}@esprit.tn`;
      const created = await createEnseignantMutate({ nom: nomUp, prenom, mail, type: "P", etat: "A" });
      const realId = String(created.id ?? created.enseignantId);
      setAllEnseignants((prev) => [...prev, { ...created, enseignantId: realId } as EnseignantRef]);
      if (Array.isArray(createEnsTarget.path) && createEnsTarget.path.length >= 3) {
        const [di, ci, sci, si] = createEnsTarget.path;
        const savoir = sci === -1
          ? tree?.[di]?.competences?.[ci]?.savoirs?.[si]
          : tree?.[di]?.competences?.[ci]?.sousCompetences?.[sci]?.savoirs?.[si];
        if (savoir) {
          const ids = new Set((savoir.enseignantsSuggeres ?? []).map(String));
          ids.add(realId);
          setEnseignants(di, ci, sci, si, Array.from(ids));
        }
        msgApi.success(`Enseignant ${prenom} ${nomUp} créé et lié au savoir sélectionné`);
      } else if (createEnsTarget.eid) {
        remapEnseignant(createEnsTarget.eid, realId);
        msgApi.success(`Enseignant ${prenom} ${nomUp} créé et lié`);
      } else {
        msgApi.success(`Enseignant ${prenom} ${nomUp} créé`);
      }
      setCreateEnsModal(false);
      setCreateEnsTarget(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      msgApi.error(e?.response?.data?.message ?? "Erreur lors de la création");
    } finally {
      setSavingNewEns(false);
    }
  }, [createEnsTarget, createEnsData, createEnseignantMutate, setAllEnseignants, tree, setEnseignants, remapEnseignant, msgApi]);

  return {
    createEnsModal, setCreateEnsModal,
    createEnsTarget, setCreateEnsTarget,
    createEnsData, setCreateEnsData,
    savingNewEns,
    remapEnseignant,
    handleCreateNewEnseignant,
  };
}
