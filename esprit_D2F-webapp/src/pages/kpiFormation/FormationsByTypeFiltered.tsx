
import{ useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Select,
  DatePicker,
  Switch,
  Input,
  Button,
  Spin,
  Form,
  Drawer,
} from "antd";
import { FilterOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useDepartements, useUps } from "@/hooks/formation";
import { useKpiFormationsByTypeFilteredMutation } from "@/hooks/kpi";


const { RangePicker } = DatePicker;
const { Option } = Select;

export default function FormationsByTypeFiltered() {
  const { message } = useAppNotification();
  const [filters, setFilters] = useState({
    domaine: null, upId: null, deptId: null,
    ouverte: null, start: null, end: null, etat: null,
  });
  const [dataByType, setDataByType] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { data: deptsRaw = [], isLoading: loadingDepts } = useDepartements();
  const { data: upsRaw = [], isLoading: loadingUps }     = useUps();
  const kpiMut = useKpiFormationsByTypeFilteredMutation();

  type OptionRow = { id?: unknown; libelle?: string };
  const deptsOptions = deptsRaw as OptionRow[];
  const upsOptions   = upsRaw   as OptionRow[];
  const loadingOptions = loadingDepts || loadingUps;
  const loadingData    = kpiMut.isPending;

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

  // ─── Dès qu’on modifie un champ du formulaire, on met à jour l’objet filters
  const onFormChange = (_changedValues: any, allValues: any) => {
    const newFilters = {
      domaine:    allValues.domaine    || null,
      upId:       allValues.upId       || null,
      deptId:     allValues.deptId     || null,
      ouverte:    allValues.ouverte    !== undefined ? allValues.ouverte : null,
      start:      allValues.dateRange
                    ? allValues.dateRange[0].format("YYYY-MM-DD")
                    : null,
      end:        allValues.dateRange
                    ? allValues.dateRange[1].format("YYYY-MM-DD")
                    : null,
      etat:       allValues.etat || null,
    };
    setFilters(newFilters);
  };

  const onFinish = () => {
    kpiMut.mutateAsync(filters)
      .then(setDataByType)
      .catch(() => {
        message.error("Impossible de récupérer les données par type.");
      });
    setDrawerVisible(false);
  };

  // ─── Affiche un spinner tant que les listes de filtres ne sont pas chargées
  if (loadingOptions) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <Spin tip="Chargement des filtres…"><div /></Spin>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "auto", padding: 20 }}>
      {/* TITRE + BOUTON OUVRIR LE DRAWER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h4 style={{ margin: 0 }}>📊 Formations par Type </h4>
        <Button
          type="primary"
          icon={<FilterOutlined />}
          onClick={() => setDrawerVisible(true)}
        >
          Ouvrir filtres
        </Button>
      </div>

      {/* DRAWER contenant le formulaire de filtres */}
      <Drawer
        title="Filtres de recherche"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={360}
        destroyOnHidden
      >
        <Form
          layout="vertical"
          onValuesChange={onFormChange}
          onFinish={onFinish}
        >
          <Form.Item label="Domaine" name="domaine">
            <Input placeholder="Ex : Informatique" allowClear />
          </Form.Item>

          <Form.Item label="UP" name="upId">
            <Select
              showSearch
              placeholder="Choisir une UP"
              allowClear
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string | undefined)?.toLowerCase().includes(input.toLowerCase()) ?? false
              }
            >
              {upsOptions.map((u) => (
                <Option key={String(u.id)} value={u.id as string}>
                  {u.libelle}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Département" name="deptId">
            <Select
              showSearch
              placeholder="Choisir un département"
              allowClear
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string | undefined)?.toLowerCase().includes(input.toLowerCase()) ?? false
              }
            >
              {deptsOptions.map((d) => (
                <Option key={String(d.id)} value={d.id as string}>
                  {d.libelle}
                </Option>
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
            <Button type="primary" htmlType="submit">
              Appliquer
            </Button>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Si on charge les données, on affiche un spinner */}
      {(() => {
        if (loadingData) return (
          <div style={{ textAlign: "center", padding: 50 }}>
            <Spin tip="Chargement des données…"><div /></Spin>
          </div>
        );
        if (!dataByType) return null;
        return (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card
              className="type-card"
              title="INTERNE"
              variant="borderless"
              style={{ textAlign: "center" }}
            >
              <span style={{ fontSize: "2rem", fontWeight: "bold", color: "#f5222d" }}>
                {dataByType.interne}
              </span>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card
              className="type-card"
              title="EXTERNE"
              variant="borderless"
              style={{ textAlign: "center" }}
            >
              <span style={{ fontSize: "2rem", fontWeight: "bold", color: "#f5222d" }}>
                {dataByType.externe}
              </span>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card
              className="type-card"
              title="EN_LIGNE"
              variant="borderless"
              style={{ textAlign: "center" }}
            >
              <span style={{ fontSize: "2rem", fontWeight: "bold", color: "#f5222d" }}>
                {dataByType.enLigne}
              </span>
            </Card>
          </Col>
        </Row>
        );
      })()}
    </div>
  );
}




