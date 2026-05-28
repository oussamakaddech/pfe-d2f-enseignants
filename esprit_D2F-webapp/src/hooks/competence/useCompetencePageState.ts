import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

const normalizeTab = (tab: any) => {
  if (tab === "sousCompetences") return "competences";
  if (tab === "recherche") return "hierarchie";
  return tab ?? "domaines";
};

export default function useCompetencePageState({ crud, loadStructure }: any) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() =>
    normalizeTab(searchParams.get("tab")),
  );

  const [viewMode, setViewMode] = useState("buttons");
  const [consultNiveau, setConsultNiveau] = useState(0);
  const [consultDomaine, setConsultDomaine] = useState<any>(null);
  const [consultCompetence, setConsultCompetence] = useState<any>(null);
  const [consultScStack, setConsultScStack] = useState<any[]>([]);
  const [drawerSavoirs, setDrawerSavoirs] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const graphContainerRef = useRef<any>(null);
  const [graphContainerWidth, setGraphContainerWidth] = useState(900);

  const handleTabChange = useCallback(
    (tabKey: any) => {
      setActiveTab(tabKey);
      setSearchParams({ tab: tabKey });
    },
    [setSearchParams],
  );

  const handleStatNavigation = useCallback(
    (target: any) => {
      setActiveTab("hierarchie");
      setSearchParams({ tab: "hierarchie" });
      setViewMode("buttons");

      if (target === "domaines") {
        setConsultNiveau(0);
        setConsultDomaine(null);
        setConsultCompetence(null);
        setConsultScStack([]);
        return;
      }

      const nextDomaine = consultDomaine ?? crud.domaines?.[0] ?? null;
      if (!nextDomaine) return;

      if (target === "competences") {
        setConsultNiveau(1);
        setConsultDomaine(nextDomaine);
        setConsultCompetence(null);
        setConsultScStack([]);
        return;
      }

      const nextCompetence =
        consultCompetence &&
        String(consultCompetence.domaineId) === String(nextDomaine.id)
          ? consultCompetence
          : (crud.competences || []).find((c: any) => String(c.domaineId) === String(nextDomaine.id)) ?? null;

      if (!nextCompetence) return;

      setConsultNiveau(2);
      setConsultDomaine(nextDomaine);
      setConsultCompetence(nextCompetence);
      setConsultScStack([]);
    },
    [
      consultCompetence,
      consultDomaine,
      crud.competences,
      crud.domaines,
      setSearchParams,
    ],
  );

  const buildCardTrigger = useCallback(
    (target: any) => ({
      role: "button",
      tabIndex: 0,
      onClick: () => handleStatNavigation(target),
      onKeyDown: (e: any) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleStatNavigation(target);
        }
      },
      style: { cursor: "pointer" },
    }),
    [handleStatNavigation],
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;
    setActiveTab(normalizeTab(tab));
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === "hierarchie") loadStructure();
  }, [activeTab, loadStructure]);

  useEffect(() => {
    if (viewMode !== "graph") return;

    const refreshWidth = () => {
      const rect = graphContainerRef.current?.getBoundingClientRect();
      if (rect?.width) setGraphContainerWidth(rect.width);
    };

    refreshWidth();
    globalThis.addEventListener("resize", refreshWidth);
    return () => globalThis.removeEventListener("resize", refreshWidth);
  }, [viewMode]);

  return {
    activeTab,
    handleTabChange,
    viewMode,
    setViewMode,
    consultNiveau,
    setConsultNiveau,
    consultDomaine,
    setConsultDomaine,
    consultCompetence,
    setConsultCompetence,
    consultScStack,
    setConsultScStack,
    drawerSavoirs,
    setDrawerSavoirs,
    drawerVisible,
    setDrawerVisible,
    graphContainerRef,
    graphContainerWidth,
    buildCardTrigger,
  };
}






