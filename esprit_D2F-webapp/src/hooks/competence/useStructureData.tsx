import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useAppNotification from "@/hooks/ui/useAppNotification";
import CompetenceService from "@/services/competence/CompetenceService";
import { buildDomaineNode } from "@/components/competence/tree/TreeNodeBuilders";
import type { Id } from "@/models/common";
import type { TreeNode, StructureData } from "@/models/competence";

interface NiveauTarget {
  type: "competence" | "sousCompetence";
  id: Id;
  nom: string;
}

interface NiveauFormValues {
  niveau?: string;
  savoirId?: Id;
  description?: string;
}

interface NiveauRequest extends Record<string, unknown> {
  niveau?: string;
  savoirId?: Id;
  description?: string;
  competenceId?: Id;
  sousCompetenceId?: Id;
}

export default function useStructureData() {
  const { message } = useAppNotification();
  const qc = useQueryClient();

  const [searchResults, setSearchResults] = useState<TreeNode[] | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDomaine, setSelectedDomaine] = useState<Id | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [niveauModalVisible, setNiveauModalVisible] = useState(false);
  const [niveauTarget, setNiveauTarget] = useState<NiveauTarget | null>(null);

  const [filterUpId, setFilterUpId] = useState<number | null>(null);
  const [filterDeptId, setFilterDeptId] = useState<number | null>(null);

  const [matrixCompId, setMatrixCompId] = useState<Id | null>(null);

  const openNiveauModal = useCallback(async (type: NiveauTarget["type"], id: Id, nom: string) => {
    setNiveauTarget({ type, id, nom });
    setNiveauModalVisible(true);
  }, []);

  const allSavoirsQuery = useQuery({
    queryKey: ["all-savoirs"],
    queryFn: () => CompetenceService.savoir.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const structureQuery = useQuery({
    queryKey: ["structure", filterUpId, filterDeptId],
    queryFn: () => CompetenceService.structure.getArbreComplet(filterUpId, filterDeptId),
  });

  const niveauQuery = useQuery({
    queryKey: ["niveau", niveauTarget?.type, niveauTarget?.id],
    queryFn: () =>
      niveauTarget?.type === "competence"
        ? CompetenceService.niveauDefinition.getByCompetence(niveauTarget.id)
        : CompetenceService.niveauDefinition.getBySousCompetence(niveauTarget!.id),
    enabled: niveauModalVisible && !!niveauTarget,
  });

  const matrixQuery = useQuery({
    queryKey: ["matrix", matrixCompId],
    queryFn: () => CompetenceService.niveauDefinition.getByCompetence(matrixCompId!),
    enabled: !!matrixCompId,
    select: (resp: unknown): Record<string, Array<{ savoirCode?: string }>> => {
      const r = resp as Record<string, unknown>;
      return (r?.niveaux ?? resp) as Record<string, Array<{ savoirCode?: string }>>;
    },
  });

  const addNiveauMutation = useMutation<unknown, Error, { values: NiveauFormValues; target: NiveauTarget }>({
    mutationFn: ({ values, target }) => {
      const request: NiveauRequest = {
        niveau: values.niveau,
        savoirId: values.savoirId,
        description: values.description,
      };
      if (target.type === "competence") request.competenceId = target.id;
      else request.sousCompetenceId = target.id;
      return CompetenceService.niveauDefinition.add(request);
    },
    onSuccess: (_, variables) => {
      message.success("Savoir requis ajouté au niveau");
      qc.invalidateQueries({ queryKey: ["niveau", variables.target?.type, variables.target?.id] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e?.response?.data?.message || "Erreur lors de l'ajout");
    },
  });

  const removeNiveauMutation = useMutation<unknown, Error, { id: Id; target: NiveauTarget }>({
    mutationFn: ({ id }) => CompetenceService.niveauDefinition.remove(id),
    onSuccess: (_, variables) => {
      message.success("Savoir requis supprimé du niveau");
      qc.invalidateQueries({ queryKey: ["niveau", variables.target?.type, variables.target?.id] });
    },
    onError: () => {
      message.error("Erreur lors de la suppression");
    },
  });

  const treeData = useMemo(() => {
    const data = structureQuery.data as unknown as StructureData | undefined;
    if (!data?.domaines) return [];
    return data.domaines.map((d) => buildDomaineNode(d, openNiveauModal));
  }, [structureQuery.data, openNiveauModal]);

  const loadStructure = useCallback(() => structureQuery.refetch(), [structureQuery]);

  const invalidateStructure = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["structure"] });
  }, [qc]);

  const refreshMatrixIfNeeded = useCallback(() => {
    if (matrixCompId) qc.invalidateQueries({ queryKey: ["matrix"] });
  }, [qc, matrixCompId]);

  const applyFilter = useCallback((upId: number | null, deptId: number | null) => {
    setFilterUpId(upId);
    setFilterDeptId(deptId);
  }, []);

  const handleAddNiveauSavoir = useCallback(async (values: NiveauFormValues) => {
    if (!niveauTarget) return;
    await addNiveauMutation.mutateAsync({ values, target: niveauTarget });
  }, [niveauTarget, addNiveauMutation]);

  const handleRemoveNiveauSavoir = useCallback(async (id: Id) => {
    if (!niveauTarget) return;
    await removeNiveauMutation.mutateAsync({ id, target: niveauTarget });
  }, [niveauTarget, removeNiveauMutation]);

  const loadMatrixData = useCallback((compId: Id) => {
    setMatrixCompId(compId);
  }, []);

  const doSearch = useCallback(async (keyword: string, domaine: Id | null) => {
    if (!keyword || keyword.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      let data: TreeNode[];
      if (domaine) data = await CompetenceService.structure.rechercheParDomaine(domaine, keyword.trim());
      else data = await CompetenceService.structure.rechercheGlobale(keyword.trim());
      setSearchResults(data);
    } catch {
      message.error("Erreur de recherche");
    } finally {
      setSearchLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchKeyword || searchKeyword.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void doSearch(searchKeyword, selectedDomaine);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [doSearch, searchKeyword, selectedDomaine]);

  const handleSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void doSearch(value, selectedDomaine);
  }, [doSearch, selectedDomaine]);

  const handleClearSearch = useCallback(() => {
    setSearchKeyword("");
    setSearchResults(null);
  }, []);

  return {
    structure: structureQuery.data,
    structureLoading: structureQuery.isLoading,
    loadStructure,
    invalidateStructure,
    filterUpId,
    filterDeptId,
    applyFilter,
    searchResults,
    searchKeyword,
    selectedDomaine,
    searchLoading,
    setSearchKeyword,
    setSelectedDomaine,
    handleSearch,
    handleClearSearch,
    niveauModalVisible,
    setNiveauModalVisible,
    niveauTarget,
    niveauData: niveauQuery.data ?? {},
    niveauLoading: niveauQuery.isLoading,
    handleAddNiveauSavoir,
    handleRemoveNiveauSavoir,
    allSavoirsHierarchie: allSavoirsQuery.data ?? [],
    setAllSavoirsHierarchie: () => {},
    treeData,
    matrixCompId,
    setMatrixCompId,
    matrixData: matrixQuery.data,
    matrixLoading: matrixQuery.isLoading,
    loadMatrixData,
    refreshMatrixIfNeeded,
    openNiveauModal,
  };
}
