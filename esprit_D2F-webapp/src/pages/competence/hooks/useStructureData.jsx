import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { message, Space, Tag, Typography } from "antd";
import {
  ApartmentOutlined,
  BookOutlined,
  BulbOutlined,
  ExperimentOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import CompetenceService from "../services/competenceFeatureApi";

const { Text } = Typography;

export default function useStructureData() {
  const [structure, setStructure] = useState(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureLoaded, setStructureLoaded] = useState(false);

  const [searchResults, setSearchResults] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDomaine, setSelectedDomaine] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef(null);

  const [niveauModalVisible, setNiveauModalVisible] = useState(false);
  const [niveauTarget, setNiveauTarget] = useState(null);
  const [niveauData, setNiveauData] = useState({});
  const [niveauLoading, setNiveauLoading] = useState(false);
  const [allSavoirsHierarchie, setAllSavoirsHierarchie] = useState([]);

  const [matrixCompId, setMatrixCompId] = useState(null);
  const [matrixData, setMatrixData] = useState(null);
  const [matrixLoading, setMatrixLoading] = useState(false);

  const loadAllSavoirs = useCallback(async () => {
    try {
      const all = await CompetenceService.savoir.getAll();
      setAllSavoirsHierarchie(all);
    } catch (err) {
      console.error("[useStructureData] loadAllSavoirs error:", err?.message);
    }
  }, []);

  useEffect(() => {
    loadAllSavoirs();
  }, [loadAllSavoirs]);

  const loadStructure = useCallback(async () => {
    if (structureLoaded) return;
    setStructureLoading(true);
    try {
      const data = await CompetenceService.structure.getArbreComplet();
      setStructure(data);
      setStructureLoaded(true);
    } catch (err) {
      message.error("Erreur lors du chargement de la structure");
      console.error(err);
    } finally {
      setStructureLoading(false);
    }
  }, [structureLoaded]);

  const invalidateStructure = useCallback(() => {
    setStructureLoaded(false);
  }, []);

  const openNiveauModal = useCallback(async (type, id, nom) => {
    setNiveauTarget({ type, id, nom });
    setNiveauModalVisible(true);
    setNiveauLoading(true);
    try {
      let data;
      if (type === "competence") {
        data = await CompetenceService.niveauDefinition.getByCompetence(id);
      } else {
        data = await CompetenceService.niveauDefinition.getBySousCompetence(id);
      }
      setNiveauData(data);
    } catch (err) {
      message.error("Erreur lors du chargement des niveaux");
      console.error(err);
    } finally {
      setNiveauLoading(false);
    }
  }, []);

  const handleAddNiveauSavoir = useCallback(async (values) => {
    if (!niveauTarget) return;
    try {
      const request = {
        niveau: values.niveau,
        savoirId: values.savoirId,
        description: values.description,
      };
      if (niveauTarget.type === "competence") request.competenceId = niveauTarget.id;
      else request.sousCompetenceId = niveauTarget.id;

      await CompetenceService.niveauDefinition.add(request);
      message.success("Savoir requis ajouté au niveau");
      const refresh = niveauTarget.type === "competence"
        ? await CompetenceService.niveauDefinition.getByCompetence(niveauTarget.id)
        : await CompetenceService.niveauDefinition.getBySousCompetence(niveauTarget.id);
      setNiveauData(refresh);
    } catch (err) {
      message.error(err.response?.data?.message || "Erreur lors de l'ajout");
      console.error(err);
    }
  }, [niveauTarget]);

  const handleRemoveNiveauSavoir = useCallback(async (id) => {
    if (!niveauTarget) return;
    try {
      await CompetenceService.niveauDefinition.remove(id);
      message.success("Savoir requis supprimé du niveau");
      const refresh = niveauTarget.type === "competence"
        ? await CompetenceService.niveauDefinition.getByCompetence(niveauTarget.id)
        : await CompetenceService.niveauDefinition.getBySousCompetence(niveauTarget.id);
      setNiveauData(refresh);
    } catch (err) {
      message.error("Erreur lors de la suppression");
      console.error(err);
    }
  }, [niveauTarget]);

  const loadMatrixData = useCallback(async (compId) => {
    if (!compId) {
      setMatrixData(null);
      return;
    }
    setMatrixLoading(true);
    try {
      const resp = await CompetenceService.niveauDefinition.getByCompetence(compId);
      setMatrixData(resp.niveaux ?? resp);
    } catch (err) {
      message.error("Erreur lors du chargement de la matrice des niveaux");
      console.error(err);
    } finally {
      setMatrixLoading(false);
    }
  }, []);

  const refreshMatrixIfNeeded = useCallback(() => {
    if (matrixCompId) loadMatrixData(matrixCompId);
  }, [loadMatrixData, matrixCompId]);

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
    } catch (err) {
      message.error("Erreur de recherche");
      console.error(err);
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

  const treeData = useMemo(() => {
    if (!structure?.domaines) return [];

    const buildSousCompNode = (sc) => {
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
          ...(isLeaf
            ? (sc.savoirs ?? []).map((s) => ({
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
            }))
            : []),
        ],
      };
    };

    return structure.domaines.map((domaine) => ({
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
      children: domaine.competences?.map((comp) => ({
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
      })) || [],
    }));
  }, [openNiveauModal, structure]);

  return {
    structure,
    structureLoading,
    loadStructure,
    invalidateStructure,
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
    niveauData,
    niveauLoading,
    handleAddNiveauSavoir,
    handleRemoveNiveauSavoir,
    allSavoirsHierarchie,
    setAllSavoirsHierarchie,
    treeData,
    matrixCompId,
    setMatrixCompId,
    matrixData,
    matrixLoading,
    loadMatrixData,
    refreshMatrixIfNeeded,
    openNiveauModal,
  };
}
