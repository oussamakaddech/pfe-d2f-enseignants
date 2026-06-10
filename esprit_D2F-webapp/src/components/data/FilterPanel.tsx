import { memo, useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Input, Select, Slider, Tag } from "antd";
import { ClearOutlined, DownOutlined, FilterOutlined, SearchOutlined, UpOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { FilterConfig, FilterValues } from "./types";
import styles from "./FilterPanel.module.css";

const { RangePicker } = DatePicker;

interface FilterPanelProps {
  readonly filters: FilterConfig[];
  readonly values: FilterValues;
  readonly onChange: (values: FilterValues) => void;
  readonly defaultOpen?: boolean;
}

function isActive(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** Champ texte débouncé (300 ms) — pas d'appel API à chaque frappe. */
function SearchFilter({
  placeholder,
  value,
  onCommit,
}: {
  readonly placeholder?: string;
  readonly value: string;
  readonly onCommit: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text, 300);

  useEffect(() => {
    if (debounced !== value) onCommit(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => { setText(value); }, [value]);

  return (
    <Input
      prefix={<SearchOutlined style={{ color: "var(--color-text-muted)" }} />}
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(e.target.value)}
      allowClear
      style={{ width: 220 }}
    />
  );
}

/**
 * Panneau de filtres déclaratif (collapsible — pas une modale).
 * Les filtres actifs apparaissent en chips retirables + « Tout effacer ».
 */
const FilterPanel = memo(function FilterPanel({
  filters,
  values,
  onChange,
  defaultOpen = false,
}: FilterPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  const activeEntries = useMemo(
    () => filters.filter((f) => isActive(values[f.key])),
    [filters, values],
  );

  const setValue = (key: string, value: unknown) => {
    const next = { ...values };
    if (isActive(value)) {
      next[key] = value;
    } else {
      delete next[key];
    }
    onChange(next);
  };

  const clearAll = () => onChange({});

  const chipLabel = (f: FilterConfig): string => {
    const v = values[f.key];
    switch (f.type) {
      case "select": {
        const opt = f.options.find((o) => String(o.value) === String(v));
        return `${f.label} : ${opt?.label ?? String(v)}`;
      }
      case "multiSelect": {
        const arr = v as (string | number)[];
        const names = arr
          .map((x) => f.options.find((o) => String(o.value) === String(x))?.label ?? String(x))
          .join(", ");
        return `${f.label} : ${names}`;
      }
      case "dateRange": {
        const [a, b] = v as [string, string];
        return `${f.label} : ${dayjs(a).format("DD/MM/YYYY")} → ${dayjs(b).format("DD/MM/YYYY")}`;
      }
      case "rangeSlider": {
        const [a, b] = v as [number, number];
        return `${f.label} : ${a}–${b}${f.unit ? ` ${f.unit}` : ""}`;
      }
      case "search":
        return `${f.label} : « ${String(v)} »`;
    }
  };

  const renderControl = (f: FilterConfig) => {
    switch (f.type) {
      case "select":
        return (
          <Select
            placeholder={f.placeholder ?? f.label}
            value={(values[f.key] as string | number | undefined) ?? undefined}
            onChange={(v) => setValue(f.key, v)}
            options={f.options}
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ minWidth: 180 }}
          />
        );
      case "multiSelect":
        return (
          <Select
            mode="multiple"
            placeholder={f.placeholder ?? f.label}
            value={(values[f.key] as (string | number)[] | undefined) ?? []}
            onChange={(v) => setValue(f.key, v)}
            options={f.options}
            allowClear
            showSearch
            optionFilterProp="label"
            maxTagCount="responsive"
            style={{ minWidth: 220 }}
          />
        );
      case "dateRange": {
        const v = values[f.key] as [string, string] | undefined;
        return (
          <RangePicker
            value={v ? [dayjs(v[0]), dayjs(v[1])] : null}
            onChange={(range) =>
              setValue(
                f.key,
                range?.[0] && range[1]
                  ? [range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD")]
                  : undefined,
              )
            }
            format="DD/MM/YYYY"
            placeholder={["Début", "Fin"]}
          />
        );
      }
      case "rangeSlider": {
        const v = (values[f.key] as [number, number] | undefined) ?? [f.min, f.max];
        return (
          <div className={styles.sliderBox}>
            <span className={styles.sliderLabel}>{f.label}</span>
            <Slider
              range
              min={f.min}
              max={f.max}
              value={v}
              onChange={(val) => setValue(f.key, val as [number, number])}
              tooltip={{ formatter: (x) => `${x}${f.unit ? ` ${f.unit}` : ""}` }}
            />
          </div>
        );
      }
      case "search":
        return (
          <SearchFilter
            placeholder={f.placeholder ?? f.label}
            value={(values[f.key] as string | undefined) ?? ""}
            onCommit={(v) => setValue(f.key, v)}
          />
        );
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.headerRow}>
        <Button
          type="text"
          size="small"
          icon={<FilterOutlined />}
          onClick={() => setOpen(!open)}
          className={styles.toggle}
        >
          Filtres
          {activeEntries.length > 0 && <span className={styles.count}>{activeEntries.length}</span>}
          {open ? <UpOutlined className={styles.chevron} /> : <DownOutlined className={styles.chevron} />}
        </Button>

        {activeEntries.length > 0 && (
          <Button type="text" size="small" icon={<ClearOutlined />} onClick={clearAll} className={styles.clear}>
            Effacer tous les filtres
          </Button>
        )}
      </div>

      {open && (
        <div className={styles.controls}>
          {filters.map((f) => (
            <div key={f.key} className={styles.control}>
              {f.type !== "rangeSlider" && f.type !== "search" && (
                <span className={styles.controlLabel}>{f.label}</span>
              )}
              {renderControl(f)}
            </div>
          ))}
        </div>
      )}

      {activeEntries.length > 0 && (
        <div className={styles.chips}>
          {activeEntries.map((f) => (
            <Tag
              key={f.key}
              closable
              onClose={(e) => { e.preventDefault(); setValue(f.key, undefined); }}
              className={styles.chip}
            >
              {chipLabel(f)}
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
});

export default FilterPanel;
