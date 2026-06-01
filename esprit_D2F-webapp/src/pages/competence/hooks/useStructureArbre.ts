import { useEffect, useState, useCallback, useRef } from "react";
import { Form } from "antd";
import { useStructureApi, useNiveauDefinitionApi, useSavoirApi } from "@/hooks/competence/useCompetenceService";
import useAppNotification from "@/hooks/ui/useAppNotification";
import type { TreeNode, NiveauDefinition } from "@/models/competence";

export function useStructureArbre() {
  const { message } = useAppNotification();
  const structureApi = useStructureApi();
  const niveauDefApi = useNiveauDefinitionApi();
  const savoirApi = useSavoirApi();

  const [loading, setLoading] = useState(true);
  const [structure, setStructure] = useState<TreeNode[] | null>(null);
  const [searchResults, setSearchResults] = useState<TreeNode[] | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDomaine, setSelectedDomaine] = useState<number | string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("tree");

  // Niveau definitions modal
  const [niveauModalVisible, setNiveauModalVisible] = useState(false);
  const [niveauTarget, setNiveauTarget] = useState<{ type: string; id: number; nom: string } | null>(null);
  const [niveauData, setNiveauData] = useState<NiveauDefinition[]>([]);
  const [niveauLoading, setNiveauLoading] = useState(false);
  const [addNiveauForm] = Form.useForm();
  const [allSavoirs, setAllSavoirs] = useState<Record<string, unknown>[]>([]);

  const fetchStructure = useCallback(async () => {
    setLoading(true);
    try {
      const data = await structureApi.getArbreComplet();
      setStructure(data);
    } catch {
      message.error("Erreur lors du chargement de la structure");
    } finally {
      setLoading(false);
    }
  }, [structureApi, message]);

  useEffect(() => {
    fetchStructure();
  }, [fetchStructure]);

  useEffect(() => {
    savoirApi
      .getAll()
      .then((s) => setAllSavoirs(s as Record<string, unknown>[]))
      .catch(() => {});
  }, [savoirApi]);

  // ── Search ──────────────────────────────────────────────────────────────

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (keyword: string, domaine: number | string | null) => {
      if (!keyword || keyword.trim().length < 2) {
        setSearchResults(null);
        return;
      }
      setSearchLoading(true);
      try {
        let data;
        if (domaine) {
          data = await structureApi.rechercheParDomaine(domaine, keyword.trim());
        } else {
          data = await structureApi.rechercheGlobale(keyword.trim());
        }
        setSearchResults(data);
        setActiveTab("search");
      } catch {
        message.error("Erreur de recherche");
      } finally {
        setSearchLoading(false);
      }
    },
    [structureApi, message]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchKeyword || searchKeyword.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(searchKeyword, selectedDomaine);
    }, 400);
    return () => clearTimeout(debounceRef.current!);
  }, [searchKeyword]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevDomaineRef = useRef<number | string | null | undefined>(undefined);
  useEffect(() => {
    if (prevDomaineRef.current === undefined) {
      prevDomaineRef.current = selectedDomaine;
      return;
    }
    prevDomaineRef.current = selectedDomaine;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchKeyword && searchKeyword.trim().length >= 2) {
      doSearch(searchKeyword, selectedDomaine);
    }
  }, [selectedDomaine]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(value, selectedDomaine);
    },
    [selectedDomaine, doSearch]
  );

  const handleClearSearch = useCallback(() => {
    setSearchKeyword("");
    setSearchResults(null);
  }, []);

  // ── Niveau modal ─────────────────────────────────────────────────────────

  const openNiveauModal = useCallback(
    async (type: string, id: number, nom: string) => {
      setNiveauTarget({ type, id, nom });
      setNiveauModalVisible(true);
      setNiveauLoading(true);
      try {
        let data;
        if (type === "competence") {
          data = await niveauDefApi.getByCompetence(id);
        } else {
          data = await niveauDefApi.getBySousCompetence(id);
        }
        setNiveauData(data);
      } catch {
        message.error("Erreur lors du chargement des niveaux");
      } finally {
        setNiveauLoading(false);
      }
    },
    [niveauDefApi, message]
  );

  const handleAddNiveauSavoir = useCallback(
    async (values: { niveau: string; savoirId: number; description?: string }) => {
      try {
        const request: Record<string, unknown> = {
          niveau: values.niveau,
          savoirId: values.savoirId,
          description: values.description,
        };
        if (niveauTarget?.type === "competence") {
          request.competenceId = niveauTarget.id;
        } else {
          request.sousCompetenceId = niveauTarget?.id;
        }
        await niveauDefApi.add(request);
        message.success("Savoir requis ajouté au niveau");
        addNiveauForm.resetFields();
        if (niveauTarget) {
          openNiveauModal(niveauTarget.type, niveauTarget.id, niveauTarget.nom);
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        message.error(axiosErr.response?.data?.message || "Erreur lors de l'ajout");
      }
    },
    [niveauTarget, addNiveauForm, openNiveauModal, niveauDefApi, message]
  );

  const handleRemoveNiveauSavoir = useCallback(
    async (id: number) => {
      try {
        await niveauDefApi.remove(id);
        message.success("Savoir requis supprimé du niveau");
        if (niveauTarget) {
          openNiveauModal(niveauTarget.type, niveauTarget.id, niveauTarget.nom);
        }
      } catch {
        message.error("Erreur lors de la suppression");
      }
    },
    [niveauTarget, openNiveauModal, niveauDefApi, message]
  );

  // ── Tree node builders ────────────────────────────────────────────────────
  // These are plain functions (not memoized with hooks) to keep this file
  // under 200 lines; they are consumed by the page component which calls
  // useMemo at the call site.

  return {
    // data
    loading,
    structure,
    allSavoirs,
    // search
    searchResults,
    searchKeyword,
    setSearchKeyword,
    selectedDomaine,
    setSelectedDomaine,
    searchLoading,
    activeTab,
    setActiveTab,
    handleSearch,
    handleClearSearch,
    // niveau modal
    niveauModalVisible,
    setNiveauModalVisible,
    niveauTarget,
    niveauData,
    niveauLoading,
    addNiveauForm,
    openNiveauModal,
    handleAddNiveauSavoir,
    handleRemoveNiveauSavoir,
  };
}
