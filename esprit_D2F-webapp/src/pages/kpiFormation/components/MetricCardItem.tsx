import {
  Card,
  Col,
  Drawer,
  Form,
  Input,
  Select,
  Switch,
  Tooltip,
  Typography,
  DatePicker,
  Button,
} from "antd";
import {
  SettingOutlined,
  CloseOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { brand, neutral, shadow, radius } from "@/styles/themes/tokens";
import dayjs from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export interface NamedOption { id?: unknown; libelle?: string }

export interface CardFilters {
  domaine?: string | null;
  upId?: string | null;
  deptId?: string | null;
  ouverte?: boolean | null;
  start?: string | null;
  end?: string | null;
  etat?: string | null;
}

export interface MetricCard {
  id: unknown;
  visible: unknown;
  filters: CardFilters;
  count: unknown;
  totalHeures: unknown;
  title: string;
}

interface MetricCardItemProps {
  card: MetricCard;
  upsOptions: NamedOption[];
  deptsOptions: NamedOption[];
  onOpenSettings: (id: unknown) => void;
  onCloseSettings: (id: unknown) => void;
  onDelete: (id: unknown) => void;
  onFormSubmit: (id: unknown, values: Record<string, unknown>) => Promise<void>;
}

export function MetricCardItem({
  card,
  upsOptions,
  deptsOptions,
  onOpenSettings,
  onCloseSettings,
  onDelete,
  onFormSubmit,
}: Readonly<MetricCardItemProps>) {
  return (
    <Col xs={24} sm={12} md={8} lg={6}>
      <Tooltip title={card.title} placement="top" mouseEnterDelay={0.4}>
        <Card
          hoverable
          style={{
            borderRadius: radius.lg,
            borderTop: `3px solid ${brand[500]}`,
            boxShadow: shadow.sm,
            border: "1px solid rgba(0,0,0,0.07)",
            overflow: "hidden",
          }}
          styles={{ body: { padding: "16px 18px" } }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <Text strong style={{ fontSize: 12, color: neutral[700], lineHeight: 1.4, maxWidth: "75%" }}>
              {card.title.length > 40 ? card.title.slice(0, 40) + "…" : card.title}
            </Text>
            <div style={{ display: "flex", gap: 4 }}>
              <Tooltip title="Configurer">
                <SettingOutlined
                  style={{ fontSize: 14, color: neutral[400], cursor: "pointer", padding: 4 }}
                  onClick={() => onOpenSettings(card.id)}
                />
              </Tooltip>
              <Tooltip title="Supprimer">
                <CloseOutlined
                  style={{ fontSize: 14, color: "#ef4444", cursor: "pointer", padding: 4 }}
                  onClick={() => onDelete(card.id)}
                />
              </Tooltip>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: neutral[900], lineHeight: 1 }}>
              {card.count === null ? "—" : card.count as React.ReactNode}
            </span>
            <Text style={{ fontSize: 12, color: neutral[500] }}>formations</Text>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ClockCircleOutlined style={{ color: neutral[400], fontSize: 12 }} />
            <Text style={{ fontSize: 12, color: neutral[500] }}>
              {card.totalHeures === null ? "—" : `${card.totalHeures as React.ReactNode} h totales`}
            </Text>
          </div>
        </Card>
      </Tooltip>

      <Drawer
        title="Configurer l'indicateur"
        placement="right"
        onClose={() => onCloseSettings(card.id)}
        open={Boolean(card.visible)}
        width={350}
        destroyOnHidden
      >
        <Form
          layout="vertical"
          onFinish={(values) => onFormSubmit(card.id, values as Record<string, unknown>)}
          initialValues={{
            domaine:   card.filters.domaine,
            upId:      card.filters.upId,
            deptId:    card.filters.deptId,
            ouverte:   card.filters.ouverte,
            etat:      card.filters.etat,
            dateRange:
              card.filters.start && card.filters.end
                ? [
                    dayjs(card.filters.start, "YYYY-MM-DD"),
                    dayjs(card.filters.end,   "YYYY-MM-DD"),
                  ]
                : null,
          }}
        >
          <Form.Item label="Domaine" name="domaine">
            <Input placeholder="Ex : Informatique" allowClear />
          </Form.Item>

          <Form.Item label="UP" name="upId">
            <Select showSearch placeholder="Sélectionner une UP" allowClear optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {upsOptions.map((u) => (
                <Option key={String(u.id)} value={u.id as string}>{u.libelle}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Département" name="deptId">
            <Select showSearch placeholder="Sélectionner un département" allowClear optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
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
            <Select placeholder="Sélectionner l'état (facultatif)" allowClear>
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
    </Col>
  );
}
