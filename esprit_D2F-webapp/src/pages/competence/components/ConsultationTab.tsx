import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Select, Spin } from "antd";
import StructureSearchResultsView, { type SearchResults } from "./StructureSearchResultsView";
import SearchBar from "./consultation/SearchBar";
import StatCards from "./consultation/StatCards";
import ViewToolbar from "./consultation/ViewToolbar";
import CardsView from "./consultation/CardsView";
import ListView from "./consultation/ListView";
import SavoirDetailDrawer, { type DrawerPayload } from "./consultation/SavoirDetailDrawer";
import { buildFlatSavoirs, DISPLAY_MODE_KEY, type FlatSavoir } from "@/utils/helpers/consultationViewUtils";
import { useAllUps } from "@/hooks/formation/useUpCrud";
import { useAllDepts } from "@/hooks/formation/useDeptCrud";
import type useStructureData from "@/hooks/competence/useStructureData";
import type { Domaine, Competence, SousCompetence, Savoir } from "@/models/competence";
import "@/styles/pages/consultation-tab.css";

interface RefItem { id?: string | number; name?: string; libelle?: string; }

interface ConsultationCrud {
  domaines?: Domaine[];
  competences?: Competence[];
  sousComps?: SousCompetence[];
  savoirs?: Savoir[];
}

interface ConsultationTabProps {
  structure: ReturnType<typeof useStructureData>;
  crud: ConsultationCrud;
  handleExportExcel: () => void;
}

export default function ConsultationTab({ structure, crud, handleExportExcel }: Readonly<ConsultationTabProps>) {
  const [displayMode, setDisplayMode] = useState(() => {
    const saved = localStorage.getItem(DISPLAY_MODE_KEY);
    return (saved !== null && ["cards", "list"].includes(saved) ? saved : "cards");
  });
  const [listMode, setListMode] = useState("grouped");
  const [listFilters, setListFilters] = useState({ q: "", type: "ALL", niveau: "ALL" });
  const [cardsOpenAll, setCardsOpenAll] = useState(false);
  const [justNavigated, setJustNavigated] = useState(false);
  const [drawerPayload, setDrawerPayload] = useState<DrawerPayload | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deferredCrud, setDeferredCrud] = useState(crud);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: ups = [] } = useAllUps();
  const { data: depts = [] } = useAllDepts();
  const [selectedUpId, setSelectedUpId] = useState<number | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  const handleFilterChange = useCallback((upId: number | null, deptId: number | null) => {
    setSelectedUpId(upId);
    setSelectedDeptId(deptId);
    structure.applyFilter?.(upId, deptId);
  }, [structure]);

  const stats = useMemo(() => ({
    totalDomaines: deferredCrud.domaines?.length ?? 0,
    totalCompetences: deferredCrud.competences?.length ?? 0,
    totalSousCompetences: deferredCrud.sousComps?.length ?? 0,
    totalSavoirs: deferredCrud.savoirs?.length ?? 0,
    totalSavoirsTheoriques: deferredCrud.savoirs?.filter((s) => s.type === "THEORIQUE").length ?? 0,
    totalSavoirsPratiques: deferredCrud.savoirs?.filter((s) => s.type === "PRATIQUE").length ?? 0,
  }), [deferredCrud]);

  useEffect(() => {
    startTransition(() => setDeferredCrud(crud));
  }, [crud]);

  const flatSavoirs = useMemo(() => buildFlatSavoirs(deferredCrud) as unknown as FlatSavoir[], [deferredCrud]);

  const isSearchLoading = structure.searchLoading;
  const hasSearchResults = !isSearchLoading && !!structure.searchResults;
  const isStructureLoading = !isSearchLoading && !structure.searchResults && structure.structureLoading;
  const showContent = !isSearchLoading && !structure.searchResults && !structure.structureLoading;

  useEffect(() => {
    localStorage.setItem(DISPLAY_MODE_KEY, displayMode);
  }, [displayMode]);

  const scrollToContent = useCallback(() => {
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const handleStatClick = useCallback((key: string) => {
    switch (key) {
      case "domaines":
      case "competences":
      case "sousCompetences":
        setDisplayMode("cards");
        setCardsOpenAll(true);
        break;
      case "savoirs":
        setDisplayMode("list");
        setListMode("flat");
        setListFilters({ q: "", type: "ALL", niveau: "ALL" });
        break;
      case "theoriques":
        setDisplayMode("list");
        setListMode("flat");
        setListFilters({ q: "", type: "THEORIQUE", niveau: "ALL" });
        break;
      case "pratiques":
        setDisplayMode("list");
        setListMode("flat");
        setListFilters({ q: "", type: "PRATIQUE", niveau: "ALL" });
        break;
      default:
        return;
    }

    setJustNavigated(true);
    setTimeout(() => setJustNavigated(false), 800);
    scrollToContent();
  }, [scrollToContent]);

  const openSingleSavoir = useCallback((savoir: FlatSavoir) => {
    setDrawerPayload({ mode: "single", savoir: savoir || null });
  }, []);

  return (
    <div className="ctp">
      {/* ── Filtres UP / Département ── */}
      <div className="ctp-filters" style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Select
          allowClear
          placeholder="Filtrer par UP"
          style={{ minWidth: 200 }}
          value={selectedUpId}
          onChange={(val) => handleFilterChange(val ?? null, selectedDeptId)}
          showSearch
          optionFilterProp="children"
        >
          {(ups as RefItem[]).map((u) => (
            <Select.Option key={String(u.id)} value={u.id}>{u.name || u.libelle}</Select.Option>
          ))}
        </Select>
        <Select
          allowClear
          placeholder="Filtrer par département"
          style={{ minWidth: 220 }}
          value={selectedDeptId}
          onChange={(val) => handleFilterChange(selectedUpId, val ?? null)}
          showSearch
          optionFilterProp="children"
        >
          {(depts as RefItem[]).map((d) => (
            <Select.Option key={String(d.id)} value={d.id}>{d.name || d.libelle}</Select.Option>
          ))}
        </Select>
      </div>

      <SearchBar structure={structure} />

      {isSearchLoading && (
        <div className="ctp-empty-box">
          <div className="ctp-loading-center">
            <Spin size="large" tip="Recherche en cours..." />
          </div>
        </div>
      )}

      {hasSearchResults && <StructureSearchResultsView results={structure.searchResults as unknown as SearchResults} />}

      {isStructureLoading && (
        <div className="ctp-empty-box">
          <div className="ctp-loading-center">
            <Spin size="large" tip="Chargement de la structure..." />
          </div>
        </div>
      )}

      {showContent && (
        <>
          {stats && <StatCards stats={stats} onStatClick={handleStatClick} />}

          <div ref={contentRef} className={justNavigated ? "ctp-content-highlight" : ""}>
            <ViewToolbar
              displayMode={displayMode}
              setDisplayMode={setDisplayMode}
              handleExportExcel={handleExportExcel}
              crud={crud as unknown as Record<string, unknown>}
              structure={structure as unknown as Record<string, unknown>}
              stats={stats}
            />

            {isPending && (
              <div className="ctp-refresh-bar">
                <span className="ctp-refresh-dot" />{" "}
                Mise a jour des donnees...
              </div>
            )}

            {displayMode === "cards" && (
              <CardsView
                crud={crud}
                selectedDomaine={structure.selectedDomaine}
                flatSavoirs={flatSavoirs}
                onOpenSavoir={openSingleSavoir}
                openAll={cardsOpenAll}
                onOpenAllConsumed={() => setCardsOpenAll(false)}
              />
            )}

            {displayMode === "list" && (
              <ListView
                flatSavoirs={flatSavoirs}
                selectedDomaine={structure.selectedDomaine}
                onOpenSavoir={openSingleSavoir}
                competences={crud.competences || []}
                listMode={listMode}
                setListMode={setListMode}
                listFilters={listFilters}
                setListFilters={setListFilters}
              />
            )}
          </div>

          <SavoirDetailDrawer payload={drawerPayload} open={Boolean(drawerPayload)} onClose={() => setDrawerPayload(null)} />
        </>
      )}
    </div>
  );
}






