import React, { useState, useEffect } from "react";
import {
  Select,
  DatePicker,
  Switch,
  Input,
  Button,
  Spin,
  Form,
  Drawer,
} from "antd";
import {
  FilterOutlined,
  HomeOutlined,
  GlobalOutlined,
  DesktopOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { neutral } from "@/styles/themes/tokens";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useDepartements, useUps } from "@/hooks/formation";
import { useKpiFormationsByTypeFilteredMutation } from "@/hooks/kpi";

const { RangePicker } = DatePicker;
const { Option } = Select;

const TYPE_CONFIG = [
  {
    key: "interne",
    label: "Interne",
    sub: "formations internes",
    icon: <HomeOutlined />,
    accent: "#B51200",
    accentBg: "#fff0ee",
  },
  {
    key: "externe",
    label: "Externe",
    sub: "formations externes",
    icon: <GlobalOutlined />,
    accent: "#3b82f6",
    accentBg: "#eff6ff",
  },
  {
    key: "enLigne",
    label: "En ligne",
    sub: "formations en ligne",
    icon: <DesktopOutlined />,
    accent: "#7c3aed",
    accentBg: "#f5f3ff",
  },
];

export default function FormationsByTypeFiltered() {
  const { message } = useAppNotification();
  const [filters, setFilters] = useState<Record<string, string | boolean | null>>({
    domaine: null, upId: null, deptId: null,
    ouverte: null, start: null, end: null, etat: null,
  });
  const [dataByType, setDataByType] = useState<Record<string, unknown> | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { data: deptsRaw = [], isLoading: loadingDepts } = useDepartements();
  const { data: upsRaw = [], isLoading: loadingUps } = useUps();
  const kpiMut = useKpiFormationsByTypeFilteredMutation();

  type OptionRow = { id?: unknown; libelle?: string };
  const deptsOptions = deptsRaw as OptionRow[];
  const upsOptions = upsRaw as OptionRow[];
  const loadingOptions = loadingDepts || loadingUps;
  const loadingData = kpiMut.isPending;

  useEffect(() => {
    if (!loadingOptions) {
      kpiMut.mutateAsync(filters)
        .then(setDataByType)
        .catch(() => {
          message.error("Impossible de récupérer les données par type.");
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingOptions]);

  const onFormChange = (_changedValues: Record<string, unknown>, allValues: Record<string, unknown>) => {
    const av = allValues;
    const dateRange = Array.isArray(av.dateRange) ? av.dateRange as [{ format: (f: string) => string }, { format: (f: string) => string }] : null;
    setFilters({
      domaine: (av.domaine as string | null) || null,
      upId: (av.upId as string | null) || null,
      deptId: (av.deptId as string | null) || null,
      ouverte: av.ouverte === undefined ? null : (av.ouverte as boolean | null),
      start: dateRange ? dateRange[0].format("YYYY-MM-DD") : null,
      end: dateRange ? dateRange[1].format("YYYY-MM-DD") : null,
      etat: (av.etat as string | null) || null,
    });
  };

  const onFinish = () => {
    kpiMut.mutateAsync(filters)
      .then(setDataByType)
      .catch(() => {
        message.error("Impossible de récupérer les données par type.");
      });
    setDrawerVisible(false);
  };

  if (loadingOptions) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <Spin tip="Chargement des filtres…"><div /></Spin>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 22px" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AppstoreOutlined style={{ color: "#3b82f6", fontSize: 16 }} />
          </div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 600, color: neutral[900], display: "block" }}>Formations par Type</span>
            <span style={{ fontSize: 12, color: neutral[500] }}>Répartition par type de formation</span>
          </div>
        </div>
        <Button icon={<FilterOutlined />} onClick={() => setDrawerVisible(true)}>Filtrer</Button>
      </div>

      {/* ── Type tiles ── */}
      {loadingData ? (
        <div style={{ textAlign: "center", padding: 50 }}>
          <Spin tip="Chargement des données…"><div /></Spin>
        </div>
      ) : dataByType && (
        <div className="kpi-type-grid" style={{ marginBottom: 0 }}>
          {TYPE_CONFIG.map(({ key, label, sub, icon, accent, accentBg }) => (
            <div
              key={key}
              className="kpi-type-tile"
              style={{ "--accent": accent, "--accent-bg": accentBg } as React.CSSProperties}
            >
              <div className="kpi-type-icon">{icon}</div>
              <div className="kpi-type-meta">
                <div className="kpi-type-name">{label}</div>
                <div className="kpi-type-value">{String(dataByType[key] ?? 0)}</div>
                <div className="kpi-type-sub">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Drawer filtres ── */}
      <Drawer
        title="Filtres de recherche"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={360}
        destroyOnHidden
      >
        <Form layout="vertical" onValuesChange={onFormChange} onFinish={onFinish}>
          <Form.Item label="Domaine" name="domaine">
            <Input placeholder="Ex : Informatique" allowClear />
          </Form.Item>
          <Form.Item label="UP" name="upId">
            <Select
              showSearch placeholder="Choisir une UP" allowClear optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string | undefined)?.toLowerCase().includes(input.toLowerCase()) ?? false
              }
            >
              {upsOptions.map((u) => (
                <Option key={String(u.id)} value={u.id as string}>{u.libelle}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Département" name="deptId">
            <Select
              showSearch placeholder="Choisir un département" allowClear optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string | undefined)?.toLowerCase().includes(input.toLowerCase()) ?? false
              }
            >
              {deptsOptions.map((d) => (
                <Option key={String(d.id)} value={d.id as string}>{d.libelle}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Ouverte" name="ouverte" valuePropName="checked">
            <Switch checkedChildren="Oui" unCheckedChildren="Non" />
          </Form.Item>
          <Form.Item label="Période" name="dateRange">
            <RangePicker style={{ width: "100%" }} allowEmpty={[false, false]} />
          </Form.Item>
          <Form.Item label="État" name="etat">
            <Select placeholder="PLANIFIE / ACHEVE / TOUT" allowClear>
              <Option value="PLANIFIE">PLANIFIE</Option>
              <Option value="ACHEVE">ACHEVE</Option>
              <Option value="TOUT">TOUT</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: "right" }}>
            <Button type="primary" htmlType="submit">Appliquer</Button>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
