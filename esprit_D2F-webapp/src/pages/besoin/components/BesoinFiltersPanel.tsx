import { useMemo } from "react";
import { Input, Select, DatePicker, Button, Tag } from "antd";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
dayjs.extend(isoWeek);
import {
  SearchOutlined,
  CloseOutlined,
  FilterOutlined,
  FireOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
} from "@ant-design/icons";

const { Option } = Select;
const { RangePicker } = DatePicker;

const STATUS_OPTIONS = [
  { value: "approuve",   label: "Approuvé" },
  { value: "en_attente", label: "En attente" },
];

const PRIORITY_OPTIONS = [
  { value: "CRITIQUE", label: "Critique" },
  { value: "HAUTE",    label: "Haute" },
  { value: "MOYENNE",  label: "Moyenne" },
  { value: "BASSE",    label: "Basse" },
];

const TYPE_LABELS = {
  INDIVIDUEL: "Individuel",
  COLLECTIF:  "Collectif",
};

/**
 * Panneau de filtres premium.
 * - Ligne 1 (primaire) : recherche + plage de dates + reset → toujours visible
 * - Ligne 2 (secondaire) : selects métier
 * - Footer : pills "filtres actifs" avec clear individuel
 */
interface NamedItem { id: number | string; name?: string; libelle?: string }
interface BesoinFilters {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
  statut?: string | null;
  priorite?: string | null;
  type?: string | null;
  upId?: number | string | null;
  deptId?: number | string | null;
}
interface BesoinFiltersPanelProps {
  searchText: string;
  filters: BesoinFilters;
  types: string[];
  ups: NamedItem[];
  departements: NamedItem[];
  onSearchChange: (value: string) => void;
  onFiltersChange: (filters: BesoinFilters) => void;
  onReset: () => void;
}

export default function BesoinFiltersPanel({
  searchText,
  filters,
  types,
  ups,
  departements,
  onSearchChange,
  onFiltersChange,
  onReset,
}: Readonly<BesoinFiltersPanelProps>) {
  const setFilter = <K extends keyof BesoinFilters>(key: K, value: BesoinFilters[K]) => onFiltersChange({ ...filters, [key]: value });

  // Compute active filter chips for the footer
  const activeChips = useMemo(() => {
    const chips = [];
    if (searchText) chips.push({ key: "search", label: `Recherche : "${searchText}"`, clear: () => onSearchChange("") });
    if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
      chips.push({
        key: "date",
        label: `Période : ${filters.dateRange[0].format("DD/MM/YYYY")} → ${filters.dateRange[1].format("DD/MM/YYYY")}`,
        clear: () => setFilter("dateRange", null),
      });
    }
    if (filters.statut) {
      const lbl = STATUS_OPTIONS.find((o) => o.value === filters.statut)?.label;
      chips.push({ key: "statut", label: `Statut : ${lbl}`, clear: () => setFilter("statut", null) });
    }
    if (filters.priorite) chips.push({ key: "priorite", label: `Priorité : ${filters.priorite}`, clear: () => setFilter("priorite", null) });
    if (filters.type) {
      chips.push({ key: "type", label: `Type : ${(TYPE_LABELS as Record<string, string>)[filters.type] || filters.type}`, clear: () => setFilter("type", null) });
    }
    if (filters.upId) {
      const lbl = ups.find((u) => String(u.id) === String(filters.upId))?.name || ups.find((u) => String(u.id) === String(filters.upId))?.libelle;
      chips.push({ key: "up", label: `UP : ${lbl}`, clear: () => setFilter("upId", null) });
    }
    if (filters.deptId) {
      const lbl = departements.find((d) => String(d.id) === String(filters.deptId))?.name || departements.find((d) => String(d.id) === String(filters.deptId))?.libelle;
      chips.push({ key: "dept", label: `Département : ${lbl}`, clear: () => setFilter("deptId", null) });
    }
    return chips;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, filters, ups, departements]);

  const activeCount = activeChips.length;

  // Quick filter chips — accès 1-clic aux filtres les plus courants
  const isQuickActive = <K extends keyof BesoinFilters>(key: K, value: BesoinFilters[K]) => filters[key] === value;
  const toggleQuick = <K extends keyof BesoinFilters>(key: K, value: BesoinFilters[K]) => setFilter(key, isQuickActive(key, value) ? null : value);
  const isThisWeekActive = useMemo(() => {
    if (!filters.dateRange?.[0] || !filters.dateRange?.[1]) return false;
    const weekStart = dayjs().startOf("isoWeek");
    const weekEnd   = dayjs().endOf("isoWeek");
    return (
      filters.dateRange[0].isSame(weekStart, "day") &&
      filters.dateRange[1].isSame(weekEnd, "day")
    );
  }, [filters.dateRange]);
  const toggleThisWeek = () => {
    if (isThisWeekActive) setFilter("dateRange", null);
    else setFilter("dateRange", [dayjs().startOf("isoWeek"), dayjs().endOf("isoWeek")]);
  };

  return (
    <section className="bf-filters" aria-label="Filtres">
      {/* Primary row */}
      <div className="bf-filters__primary">
        <div className="bf-filters__search">
          <Input
            allowClear
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher par titre, objectif ou demandeur..."
            prefix={<SearchOutlined />}
            size="middle"
            autoComplete="off"
          />
        </div>
        <RangePicker
          placeholder={["Date début", "Date fin"]}
          value={filters.dateRange}
          onChange={(dates) => setFilter("dateRange", dates as [import("dayjs").Dayjs, import("dayjs").Dayjs] | null)}
          size="middle"
          className="bf-filters__range"
          allowClear
        />
        <Button
          icon={<CloseOutlined />}
          onClick={onReset}
          disabled={activeCount === 0}
          className="bf-btn bf-btn--ghost"
        >
          Tout effacer
        </Button>
      </div>

      {/* Quick filters — 1-clic */}
      <fieldset className="bf-quickfilters" aria-label="Filtres rapides">
        <span className="bf-quickfilters__label">
          <ThunderboltOutlined /> Filtres rapides
        </span>
        <button
          type="button"
          className={`bf-quickchip bf-quickchip--danger ${isQuickActive("priorite", "CRITIQUE") ? "bf-quickchip--active" : ""}`}
          onClick={() => toggleQuick("priorite", "CRITIQUE")}
          aria-pressed={isQuickActive("priorite", "CRITIQUE")}
        >
          <FireOutlined /> Critique
        </button>
        <button
          type="button"
          className={`bf-quickchip bf-quickchip--danger ${isQuickActive("priorite", "HAUTE") ? "bf-quickchip--active" : ""}`}
          onClick={() => toggleQuick("priorite", "HAUTE")}
          aria-pressed={isQuickActive("priorite", "HAUTE")}
        >
          <span className="bf-quickchip__dot" /> Haute
        </button>
        <button
          type="button"
          className={`bf-quickchip bf-quickchip--warning ${isQuickActive("statut", "en_attente") ? "bf-quickchip--active" : ""}`}
          onClick={() => toggleQuick("statut", "en_attente")}
          aria-pressed={isQuickActive("statut", "en_attente")}
        >
          <ClockCircleOutlined /> En attente
        </button>
        <button
          type="button"
          className={`bf-quickchip bf-quickchip--success ${isQuickActive("statut", "approuve") ? "bf-quickchip--active" : ""}`}
          onClick={() => toggleQuick("statut", "approuve")}
          aria-pressed={isQuickActive("statut", "approuve")}
        >
          <CheckCircleOutlined /> Approuvés
        </button>
        <button
          type="button"
          className={`bf-quickchip bf-quickchip--info ${isThisWeekActive ? "bf-quickchip--active" : ""}`}
          onClick={toggleThisWeek}
          aria-pressed={isThisWeekActive}
        >
          <CalendarOutlined /> Cette semaine
        </button>
      </fieldset>

      {/* Secondary row */}
      <div className="bf-filters__secondary">
        <Select
          allowClear
          placeholder="Statut"
          value={filters.statut}
          onChange={(v) => setFilter("statut", v)}
          options={STATUS_OPTIONS}
        />
        <Select
          allowClear
          placeholder="Priorité"
          value={filters.priorite}
          onChange={(v) => setFilter("priorite", v)}
          options={PRIORITY_OPTIONS}
        />
        <Select
          allowClear
          placeholder="Type"
          value={filters.type}
          onChange={(v) => setFilter("type", v)}
        >
          {types.map((t) => (
            <Option key={t} value={t}>              {(TYPE_LABELS as Record<string, string>)[t] || t?.replaceAll("_", " ")}</Option>
          ))}
        </Select>
        <Select
          allowClear
          placeholder="Unité Pédagogique"
          value={filters.upId}
          onChange={(v) => setFilter("upId", v)}
        >
          {ups.map((u) => <Option key={u.id} value={u.id}>{u.name || u.libelle}</Option>)}
        </Select>
        <Select
          allowClear
          placeholder="Département"
          value={filters.deptId}
          onChange={(v) => setFilter("deptId", v)}
        >
          {departements.map((d) => <Option key={d.id} value={d.id}>{d.name || d.libelle}</Option>)}
        </Select>
      </div>

      {/* Active filters footer */}
      {activeCount > 0 && (
        <div className="bf-filters__footer">
          <span className="bf-filters__footer-label">
            <FilterOutlined /> {activeCount} filtre{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""}
          </span>
          <div className="bf-filters__chips">
            {activeChips.map((c) => (
              <Tag key={c.key} closable onClose={c.clear} className="bf-filter-chip">
                {c.label}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}





