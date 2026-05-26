import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Space, Tag, Typography } from "antd";
import {
  ApartmentOutlined,
  BookOutlined,
  BulbOutlined,
  ExperimentOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useAppNotification from "@/hooks/ui/useAppNotification";
import CompetenceService from "@/services/competence/CompetenceService";

const { Text } = Typography;

export default function useStructureData() {
  const { message } = useAppNotification();
  const qc = useQueryClient();

  const [searchResults, setSearchResults] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDomaine, setSelectedDomaine] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef(null);

  const [niveauModalVisible, setNiveauModalVisible] = useState(false);
  const [niveauTarget, setNiveauTarget] = useState(null);

  const [filterUpId, setFilterUpId] = useState<number | null>(null);
  const [filterDeptId, setFilterDeptId] = useState<number | null>(null);

  const [matrixCompId, setMatrixCompId] = useState(null);

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
      niveauTarget.type === "competence"
        ? CompetenceService.niveauDefinition.getByCompetence(niveauTarget.id)
        : CompetenceService.niveauDefinition.getBySousCompetence(niveauTarget.id),
    enabled: niveauModalVisible && !!niveauTarget,
  });

  const matrixQuery = useQuery({
    queryKey: ["matrix", matrixCompId],
    queryFn: () => CompetenceService.niveauDefinition.getByCompetence(matrixCompId),
    enabled: !!matrixCompId,
    select: (resp) => resp.niveaux ?? resp,
  });

  const addNiveauMutation = useMutation({
    mutationFn: ({ values, target }) => {
      const request = {
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
      message.error(err.response?.data?.message || "Erreur lors de l'ajout");
    },
  });

  const removeNiveauMutation = useMutation({
    mutationFn: ({ id, target }) => CompetenceService.niveauDefinition.remove(id),
    onSuccess: (_, variables) => {
      message.success("Savoir requis supprimé du niveau");
      qc.invalidateQueries({ queryKey: ["niveau", variables.target?.type, variables.target?.id] });
    },
    onError: () => {
      message.error("Erreur lors de la suppression");
    },
  });

  const buildSavoirNode = (s) => ({
    key: `sav-${s.id}`,
    title: (
      <Space>
        {s.type === "THEORIQUE" ? <BookOutlined style={{ color: "#722ed1" }} /> : <ExperimentOutlined style={{ color: "#13c2c2" }} />}
        <Text type="secondary">{s.nom}</Text>
        <Tag color={s.type === "THEORIQUE" ? "purple" : "cyan"}>
          {s.type === "THEORIQUE" ? "Théorique" : "Pratique"}
        </Tag>
        <Tag>{s.code}</Tag>
      </Space>
    ),
    isLeaf: true,
  });

  const buildSousCompNode = useCallback((sc) => {
    const enfants = sc.enfants ?? [];
    const isLeaf = enfants.length === 0;

    return {
      key: `sc-${sc.id}`,
      title: (
        <Space>
          <BulbOutlined style={{ color: "#fa8c16" }} />
          <Text>{sc.nom}</Text>
          <Tag color="orange">{sc.code}</Tag>
          <Tag color="geekblue">N{sc.niveau ?? "-"}</Tag>
          <Tag icon={<BookOutlined />}>{sc.nombreSavoirs}</Tag>
          <Tag icon={<TeamOutlined />} color="purple">{sc.nombreEnseignants}</Tag>
          <Tag
            style={{ cursor: "pointer" }}
            icon={<InfoCircleOutlined />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openNiveauModal("sousCompetence", sc.id, sc.nom);
            }}
          >
            Niveaux
          </Tag>
        </Space>
      ),
      children: [
        ...enfants.map(buildSousCompNode),
        ...(isLeaf ? (sc.savoirs ?? []).map(buildSavoirNode) : []),
      ],
    };
  }, [openNiveauModal]);

  const buildCompetenceNode = useCallback((comp) => ({
    key: `comp-${comp.id}`,
    title: (
      <Space>
        <ApartmentOutlined style={{ color: "#52c41a" }} />
        <Text>{comp.nom}</Text>
        <Tag color="green">{comp.code}</Tag>
        <Tag>{comp.nombreSousCompetences} SC / {comp.nombreSavoirs} S</Tag>
        <Tag icon={<TeamOutlined />} color="purple">{comp.nombreEnseignants}</Tag>
        <Tag
          style={{ cursor: "pointer" }}
          icon={<InfoCircleOutlined />}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openNiveauModal("competence", comp.id, comp.nom);
          }}
        >
          Niveaux
        </Tag>
      </Space>
    ),
    children: [
      ...(comp.sousCompetences?.map(buildSousCompNode) || []),
      ...(comp.savoirsDirect?.map((s) => ({
        key: `sav-direct-${s.id}`,
        title: (
          <Space>
            {s.type === "THEORIQUE" ? <BookOutlined style={{ color: "#722ed1" }} /> : <ExperimentOutlined style={{ color: "#13c2c2" }} />}
            <Text type="secondary">{s.nom}</Text>
            <Tag color={s.type === "THEORIQUE" ? "purple" : "cyan"}>
              {s.type === "THEORIQUE" ? "Théorique" : "Pratique"}
            </Tag>
            <Tag>{s.code}</Tag>
            <Tag color="gold">Direct</Tag>
          </Space>
        ),
        isLeaf: true,
      })) || []),
    ],
  }), [buildSousCompNode]);

  const buildDomaineNode = useCallback((domaine) => ({
    key: `dom-${domaine.id}`,
    title: (
      <Space>
        <FolderOpenOutlined style={{ color: "#1890ff" }} />
        <Text strong>{domaine.nom}</Text>
        <Tag color="blue">{domaine.code}</Tag>
        <Tag color="green">{domaine.nombreCompetences}</Tag>
        <Tag icon={<TeamOutlined />} color="purple">{domaine.nombreEnseignants}</Tag>
        {!domaine.actif && <Tag color="red">Inactif</Tag>}
      </Space>
    ),
    children: domaine.competences?.map(buildCompetenceNode) || [],
  }), [buildCompetenceNode]);

  const treeData = useMemo(() => {
    if (!structureQuery.data?.domaines) return [];
    return structureQuery.data.domaines.map(buildDomaineNode);
  }, [structureQuery.data, buildDomaineNode]);

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

  const openNiveauModal = useCallback(async (type, id, nom) => {
    setNiveauTarget({ type, id, nom });
    setNiveauModalVisible(true);
  }, []);

  const handleAddNiveauSavoir = useCallback(async (values) => {
    if (!niveauTarget) return;
    await addNiveauMutation.mutateAsync({ values, target: niveauTarget });
  }, [niveauTarget, addNiveauMutation]);

  const handleRemoveNiveauSavoir = useCallback(async (id) => {
    if (!niveauTarget) return;
    await removeNiveauMutation.mutateAsync({ id, target: niveauTarget });
  }, [niveauTarget, removeNiveauMutation]);

  const loadMatrixData = useCallback((compId) => {
    setMatrixCompId(compId);
  }, []);

  const doSearch = useCallback(async (keyword, domaine) => {
    if (!keyword || keyword.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      let data;
      if (domaine) data = await CompetenceService.structure.rechercheParDomaine(domaine, keyword.trim());
      else data = await CompetenceService.structure.rechercheGlobale(keyword.trim());
      setSearchResults(data);
    } catch {
      message.error("Erreur de recherche");
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchKeyword || searchKeyword.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(searchKeyword, selectedDomaine);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [doSearch, searchKeyword, selectedDomaine]);

  const handleSearch = useCallback((value) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(value, selectedDomaine);
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
    niveauData: niveauQuery.data,
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
