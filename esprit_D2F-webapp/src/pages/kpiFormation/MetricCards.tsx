import { useState, useEffect, useRef } from "react";
import { Row, Button, DatePicker, Spin, Typography } from "antd";
import { BarChartOutlined, PlusOutlined } from "@ant-design/icons";
import { EmptyState } from "@/components/common";
import { brand, neutral, radius } from "@/styles/themes/tokens";
import useAppNotification from "@/hooks/ui/useAppNotification";
import dayjs from "dayjs";

import { useDepartements, useUps } from "@/hooks/formation";
import { useKpiCountAndHeuresMutation } from "@/hooks/kpi";
import { MetricCardItem } from "./components/MetricCardItem";
import type { MetricCard, CardFilters, NamedOption } from "./components/MetricCardItem";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const LOCALSTORAGE_KEY = "metricCardsConfiguration";

function pushFilterPart<T>(parts: string[], value: T | null | undefined, label: string, fmt: (v: T) => string): void {
  if (value !== null && value !== undefined) parts.push(`${label}=${fmt(value)}`);
}

function buildGenericTitleParts(filters: CardFilters, upsOptions: NamedOption[], deptsOptions: NamedOption[]): string[] {
  const { domaine, upId, deptId, ouverte, start, end, etat } = filters;
  const parts: string[] = [];
  pushFilterPart(parts, domaine, "Domaine", (v) => v);
  pushFilterPart(parts, upId, "UP", (v) => { const i = upsOptions.find((u) => u.id === v); return i ? i.libelle : String(v); });
  pushFilterPart(parts, deptId, "Dépt", (v) => { const i = deptsOptions.find((d) => d.id === v); return i ? i.libelle : String(v); });
  pushFilterPart(parts, ouverte, "Ouverte", (v) => v ? "Oui" : "Non");
  if (start && end) parts.push(`Période=${start}→${end}`);
  pushFilterPart(parts, etat, "État", (v) => v);
  return parts;
}

const MetricCards = () => {
  const { message } = useAppNotification();
  const [cards, setCards] = useState<MetricCard[]>([]);
  const [globalPeriod, setGlobalPeriod] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const isFirstMount = useRef(true);

  const { data: deptsRaw = [], isLoading: loadingDepts } = useDepartements();
  const { data: upsRaw = [], isLoading: loadingUps }     = useUps();
  const kpiMut = useKpiCountAndHeuresMutation();

  const deptsOptions = deptsRaw as NamedOption[];
  const upsOptions   = upsRaw   as NamedOption[];
  const loadingOptions = loadingDepts || loadingUps;

  const buildTitle = (filters: CardFilters): string => {
    const { domaine, upId, deptId, ouverte, start, end, etat } = filters;
    const onlyOuverte = ouverte === true && !domaine && upId === null && deptId === null && !start && !end && !etat;
    if (onlyOuverte) return "Formations transversales (ouvertes)";
    const onlyPeriod = start && end && !domaine && upId === null && deptId === null && ouverte === null && !etat;
    if (onlyPeriod) return `Formations du ${start} au ${end}`;
    if (upId !== null && !domaine && deptId === null && ouverte === null && !start && !end && !etat) {
      const upItem = upsOptions.find((u) => u.id === upId);
      return `Formations UP : ${upItem ? upItem.libelle : `UP ${upId}`}`;
    }
    if (deptId !== null && !domaine && upId === null && ouverte === null && !start && !end && !etat) {
      const deptItem = deptsOptions.find((d) => d.id === deptId);
      return `Formations Département : ${deptItem ? deptItem.libelle : `Dept ${deptId}`}`;
    }
    const parts = buildGenericTitleParts(filters, upsOptions, deptsOptions);
    return parts.length === 0 ? "Toutes formations (PLANIFIE + ACHEVE)" : parts.join("  •  ");
  };

  useEffect(() => {
    const stored = localStorage.getItem(LOCALSTORAGE_KEY);
    if (stored) {
      let parsed = [];
      try { parsed = JSON.parse(stored); } catch { /* ignore */ }
      setCards(parsed);
      if (parsed.length > 0) {
        (async () => {
          const rafraichies = await Promise.all(
            (parsed as MetricCard[]).map(async (c) => {
              try {
                const { count, totalHeures } = await kpiMut.mutateAsync(c.filters);
                return { ...c, count, totalHeures, title: buildTitle(c.filters) };
              } catch { return c; }
            })
          );
          setCards(rafraichies);
        })();
      }
    }
  }, []);

  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  const openSettings  = (id: unknown) => setCards((prev) => prev.map((c) => (c.id === id ? { ...c, visible: true } : c)));
  const closeSettings = (id: unknown) => setCards((prev) => prev.map((c) => (c.id === id ? { ...c, visible: false } : c)));
  const deleteCard    = (id: unknown) => setCards((prev) => prev.filter((c) => c.id !== id));

  const addCard = () => {
    setCards((prev) => [...prev, {
      id: Date.now(), visible: false,
      filters: { domaine: null, upId: null, deptId: null, ouverte: null, start: null, end: null, etat: null },
      count: null, totalHeures: null,
      title: "Toutes formations (PLANIFIE + ACHEVE)",
    }]);
  };

  const handleFormSubmit = async (cardId: unknown, values: Record<string, unknown>) => {
    const filters: CardFilters = {
      domaine: values.domaine as string || null,
      upId:    values.upId != null ? String(values.upId) : null,
      deptId:  values.deptId != null ? String(values.deptId) : null,
      ouverte: values.ouverte !== undefined ? values.ouverte as boolean : null,
      start:   values.dateRange ? (values.dateRange as dayjs.Dayjs[])[0].format("YYYY-MM-DD") : null,
      end:     values.dateRange ? (values.dateRange as dayjs.Dayjs[])[1].format("YYYY-MM-DD") : null,
      etat:    values.etat as string || null,
    };
    try {
      const { count, totalHeures } = await kpiMut.mutateAsync(filters);
      setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, count, totalHeures, filters, title: buildTitle(filters) } : c));
    } catch {
      message.error("Impossible de calculer l'indicateur. Vérifiez vos filtres.");
    } finally {
      closeSettings(cardId);
    }
  };

  const handleGlobalPeriodChange = async (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (!dates?.[0] || !dates?.[1]) { setGlobalPeriod(null); return; }
    const newStart = dates[0].format("YYYY-MM-DD");
    const newEnd   = dates[1].format("YYYY-MM-DD");
    setGlobalPeriod([dates[0], dates[1]]);
    const updated = await Promise.all(
      cards.map(async (c) => {
        const newFilters = { ...c.filters, start: newStart, end: newEnd };
        try {
          const { count, totalHeures } = await kpiMut.mutateAsync(newFilters);
          return { ...c, filters: newFilters, count, totalHeures, title: buildTitle(newFilters) };
        } catch { return { ...c, filters: newFilters }; }
      })
    );
    setCards(updated);
  };

  if (loadingOptions) {
    return (
      <div style={{ textAlign: "center", padding: "50px 0" }}>
        <Spin size="large" tip="Chargement des filtres …"><div /></Spin>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: radius.sm, background: `${brand[500]}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BarChartOutlined style={{ color: brand[500], fontSize: 16 }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 15, color: neutral[900] }}>Indicateurs personnalisés</Text>
            <Text style={{ display: "block", fontSize: 12, color: neutral[500] }}>Nombre et heures de formation par filtre</Text>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <RangePicker style={{ maxWidth: 290 }} value={globalPeriod} onChange={handleGlobalPeriodChange} placeholder={["Date début", "Date fin"]} />
          <Button type="primary" onClick={addCard} icon={<PlusOutlined />} style={{ background: brand[500], borderColor: brand[500] }}>
            Ajouter
          </Button>
        </div>
      </div>

      {cards.length === 0 && (
        <EmptyState
          icon={<BarChartOutlined />}
          title="Aucun indicateur configuré"
          description="Cliquez sur « Ajouter » pour créer votre premier indicateur personnalisé."
          action={{ label: "Ajouter un indicateur", onClick: addCard, icon: <PlusOutlined /> }}
          compact
        />
      )}

      <Row gutter={[16, 16]}>
        {cards.map((card) => (
          <MetricCardItem
            key={String(card.id)}
            card={card}
            upsOptions={upsOptions}
            deptsOptions={deptsOptions}
            onOpenSettings={openSettings}
            onCloseSettings={closeSettings}
            onDelete={deleteCard}
            onFormSubmit={handleFormSubmit}
          />
        ))}
      </Row>
    </div>
  );
};

export default MetricCards;
