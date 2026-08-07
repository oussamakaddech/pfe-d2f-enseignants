import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Select, Spin, Button, Typography, Tag, Input } from 'antd';
import {
  ReloadOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import StructureSearchResultsView, { type SearchResults } from './StructureSearchResultsView';
import ViewToolbar from './consultation/ViewToolbar';
import CardsView from './consultation/CardsView';
import SavoirDetailDrawer, { type DrawerPayload } from './consultation/SavoirDetailDrawer';
import {
  buildFlatSavoirs,
  DISPLAY_MODE_KEY,
  type FlatSavoir,
} from '@/utils/helpers/consultationViewUtils';
import { useAllUps } from '@/hooks/formation/useUpCrud';
import { useAllDepts } from '@/hooks/formation/useDeptCrud';
import type useStructureData from '@/hooks/competence/useStructureData';
import type {
  Domaine,
  Competence,
  SousCompetence,
  Savoir,
  StructureData,
} from '@/models/competence';
import type { LookupItem } from '@/models/common';
import { brand, neutral, semantic } from '@/styles/themes/tokens';
import '@/styles/pages/consultation-tab.css';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

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

const STAT_DEFS = [
  {
    key: 'domaines',
    statKey: 'totalDomaines',
    label: 'Domaines',
    icon: <AppstoreOutlined />,
    color: brand[500],
    bg: brand[50],
  },
  {
    key: 'competences',
    statKey: 'totalCompetences',
    label: 'Compétences',
    icon: <ApartmentOutlined />,
    color: semantic.info,
    bg: semantic.infoBg,
  },
  {
    key: 'sousCompetences',
    statKey: 'totalSousCompetences',
    label: 'Sous-comp.',
    icon: <ApartmentOutlined />,
    color: semantic.warning,
    bg: semantic.warningBg,
  },
  {
    key: 'savoirs',
    statKey: 'totalSavoirs',
    label: 'Savoirs',
    icon: <ApartmentOutlined />,
    color: semantic.success,
    bg: semantic.successBg,
  },
  {
    key: 'theoriques',
    statKey: 'totalSavoirsTheoriques',
    label: 'Théoriques',
    icon: <ApartmentOutlined />,
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    key: 'pratiques',
    statKey: 'totalSavoirsPratiques',
    label: 'Pratiques',
    icon: <ApartmentOutlined />,
    color: '#0891b2',
    bg: '#ecfeff',
  },
];

export default function ConsultationTab({
  structure,
  crud,
  handleExportExcel,
}: Readonly<ConsultationTabProps>) {
  const [displayMode, setDisplayMode] = useState<string>('cards');
  const [cardsOpenAll, setCardsOpenAll] = useState(false);
  const [justNavigated, setJustNavigated] = useState(false);
  const [drawerPayload, setDrawerPayload] = useState<DrawerPayload | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: ups = [] } = useAllUps();
  const { data: depts = [] } = useAllDepts();
  const [selectedUpId, setSelectedUpId] = useState<number | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [selectedDomaineId, setSelectedDomaineId] = useState<number | null>(null);

  const handleFilterChange = useCallback(
    (upId: number | null, deptId: number | null, domaineId: number | null) => {
      setSelectedUpId(upId);
      setSelectedDeptId(deptId);
      setSelectedDomaineId(domaineId);
      structure.applyFilter?.(upId, deptId);
      structure.setSelectedDomaine?.(domaineId);
    },
    [structure],
  );

  const handleSearchChange = useCallback(
    (val: string) => {
      structure.setSearchKeyword?.(val);
    },
    [structure],
  );

  const handleSearchExecute = useCallback(
    (val: string) => {
      structure.handleSearch?.(val);
    },
    [structure],
  );

  const handleSearchClear = useCallback(() => {
    structure.handleClearSearch?.();
    structure.setSearchKeyword?.('');
  }, [structure]);

  const stats = useMemo(
    () => ({
      totalDomaines: crud.domaines?.length ?? 0,
      totalCompetences: crud.competences?.length ?? 0,
      totalSousCompetences: crud.sousComps?.length ?? 0,
      totalSavoirs: crud.savoirs?.length ?? 0,
      totalSavoirsTheoriques: crud.savoirs?.filter((s) => s.type === 'THEORIQUE').length ?? 0,
      totalSavoirsPratiques: crud.savoirs?.filter((s) => s.type === 'PRATIQUE').length ?? 0,
    }),
    [crud],
  );

  const flatSavoirs = useMemo(() => buildFlatSavoirs(crud) as unknown as FlatSavoir[], [crud]);

  const isSearchLoading = structure.searchLoading;
  const hasSearchResults = !isSearchLoading && !!structure.searchResults;
  const isStructureLoading =
    !isSearchLoading && !structure.searchResults && structure.structureLoading;
  const showContent = !isSearchLoading && !structure.searchResults && !structure.structureLoading;

  useEffect(() => {
    localStorage.setItem(DISPLAY_MODE_KEY, displayMode);
  }, [displayMode]);

  const scrollToContent = useCallback(() => {
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  const handleStatClick = useCallback(
    (key: string) => {
      setDisplayMode('cards');
      setCardsOpenAll(true);
      setJustNavigated(true);
      setTimeout(() => setJustNavigated(false), 800);
      scrollToContent();
    },
    [scrollToContent],
  );

  const openSingleSavoir = useCallback((savoir: FlatSavoir) => {
    setDrawerPayload({ mode: 'single', savoir: savoir || null });
  }, []);

  const activeFilterCount =
    (selectedUpId ? 1 : 0) + (selectedDeptId ? 1 : 0) + (selectedDomaineId ? 1 : 0);

  const clearAllFilters = useCallback(() => {
    handleFilterChange(null, null, null);
    handleSearchClear();
  }, [handleFilterChange, handleSearchClear]);

  const domaineOptions = useMemo(() => {
    const data = structure.structure as StructureData | undefined;
    return data?.domaines ?? [];
  }, [structure.structure]);

  return (
    <div className="ctp">
      {/* ── Header ── */}
      <div className="ctp-header">
        <div className="ctp-header__left">
          <div className="ctp-header__icon-wrap">
            <ApartmentOutlined />
          </div>
          <div>
            <Title level={2} className="ctp-header__title">
              Arborescence des Compétences
            </Title>
            <Paragraph className="ctp-header__subtitle">
              Domaines → Compétences → Sous-compétences → Savoirs
            </Paragraph>
          </div>
        </div>
        {structure.loadStructure && (
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => void structure.loadStructure()}
            size="middle"
            className="ctp-header__btn"
          >
            Actualiser
          </Button>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="ctp-stat-grid ctp-section">
        {STAT_DEFS.map((def) => (
          <button
            key={def.key}
            className="ctp-stat-card"
            style={{ '--ctp-stat-accent': def.color } as React.CSSProperties}
            onClick={() => handleStatClick(def.key)}
          >
            <div className="ctp-stat-card__icon" style={{ background: def.bg, color: def.color }}>
              {def.icon}
            </div>
            <div className="ctp-stat-card__value">
              {stats[def.statKey as keyof typeof stats] ?? 0}
            </div>
            <div className="ctp-stat-card__label">{def.label}</div>
          </button>
        ))}
      </div>

      {/* ── Filters Bar ── */}
      <div className="ctp-filters-bar">
        <div className="ctp-filters-bar__left">
          <FilterOutlined style={{ color: neutral[500], fontSize: 14 }} />
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 600 }}>
            Filtres
          </Text>
        </div>
        <div className="ctp-filters-bar__controls">
          <Select
            allowClear
            placeholder="Filtrer par UP"
            style={{ minWidth: 150 }}
            value={selectedUpId}
            onChange={(val) => handleFilterChange(val ?? null, selectedDeptId, selectedDomaineId)}
            showSearch
            optionFilterProp="children"
            size="middle"
          >
            {(ups as LookupItem[]).map((u) => (
              <Select.Option key={String(u.id)} value={u.id}>
                {u.name || u.libelle}
              </Select.Option>
            ))}
          </Select>
          <Select
            allowClear
            placeholder="Filtrer par département"
            style={{ minWidth: 170 }}
            value={selectedDeptId}
            onChange={(val) => handleFilterChange(selectedUpId, val ?? null, selectedDomaineId)}
            showSearch
            optionFilterProp="children"
            size="middle"
          >
            {(depts as LookupItem[]).map((d) => (
              <Select.Option key={String(d.id)} value={d.id}>
                {d.name || d.libelle}
              </Select.Option>
            ))}
          </Select>
          <Select
            allowClear
            placeholder="Filtrer par domaine"
            style={{ minWidth: 180 }}
            value={selectedDomaineId}
            onChange={(val) => handleFilterChange(selectedUpId, selectedDeptId, val ?? null)}
            showSearch
            optionFilterProp="children"
            size="middle"
          >
            {domaineOptions.map((d) => (
              <Select.Option key={String(d.id)} value={d.id}>
                {d.nom}
              </Select.Option>
            ))}
          </Select>
          <Search
            placeholder="Rechercher..."
            allowClear
            onSearch={handleSearchExecute}
            onChange={(e) => handleSearchChange(e.target.value)}
            onClear={handleSearchClear}
            style={{ width: 200 }}
            size="middle"
          />
          {activeFilterCount > 0 && (
            <Tag closable onClose={clearAllFilters} style={{ borderRadius: 6, fontWeight: 600 }}>
              {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif
              {activeFilterCount > 1 ? 's' : ''}
            </Tag>
          )}
        </div>
      </div>

      {isSearchLoading && (
        <div className="ctp-empty-box">
          <div className="ctp-loading-center">
            <Spin size="large" tip="Recherche en cours..." />
          </div>
        </div>
      )}

      {hasSearchResults && (
        <StructureSearchResultsView results={structure.searchResults as unknown as SearchResults} />
      )}

      {isStructureLoading && (
        <div className="ctp-empty-box">
          <div className="ctp-loading-center">
            <Spin size="large" tip="Chargement de la structure..." />
          </div>
        </div>
      )}

      {showContent && (
        <>
          <div ref={contentRef} className={justNavigated ? 'ctp-content-highlight' : ''}>
            <ViewToolbar
              displayMode={displayMode}
              setDisplayMode={setDisplayMode}
              handleExportExcel={handleExportExcel}
              crud={crud as unknown as Record<string, unknown>}
              structure={structure as unknown as Record<string, unknown>}
              stats={stats}
            />

            {displayMode === 'cards' && (
              <CardsView
                crud={crud}
                selectedDomaine={structure.selectedDomaine}
                flatSavoirs={flatSavoirs}
                onOpenSavoir={openSingleSavoir}
                openAll={cardsOpenAll}
                onOpenAllConsumed={() => setCardsOpenAll(false)}
              />
            )}
          </div>

          <SavoirDetailDrawer
            payload={drawerPayload}
            open={Boolean(drawerPayload)}
            onClose={() => setDrawerPayload(null)}
          />
        </>
      )}
    </div>
  );
}
