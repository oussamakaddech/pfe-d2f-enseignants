// src/components/KPI/FormationsByTypeFiltered.jsx

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
  message,
  Form,
  Drawer,
} from "antd";
import { FilterOutlined } from "@ant-design/icons";
import KPIService from "../../services/KPIService";
import DeptService from "../../services/DeptService";
import UpService from "../../services/upService";


const { RangePicker } = DatePicker;
const { Option } = Select;

export default function FormationsByTypeFiltered() {
  // 1) État des filtres initialisés à null
  const [filters, setFilters] = useState({
    domaine:    null,
    upId:       null,
    deptId:     null,
    ouverte:    null,
    start:      null,
    end:        null,
    etat:       null,
  });

  // 2) Stocke { interne, externe, enLigne } retourné par l’API
  const [dataByType, setDataByType] = useState(null);

  // 3) Options pour les selects (chargées dynamiquement)
  const [deptsOptions, setDeptsOptions] = useState([]);
  const [upsOptions, setUpsOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // 4) Loading pour l’appel principal
  const [loadingData, setLoadingData] = useState(false);

  // 5) Visibilité du Drawer de filtres
  const [drawerVisible, setDrawerVisible] = useState(false);

  // ─── Charger les listes de filtres (Compétences, Départements, UPs)
  useEffect(() => {
    const fetchAllOptions = async () => {
      try {
        const [depts, ups] = await Promise.all([
          DeptService.getAllDepts(),
          UpService.getAllUps(),
        ]);
        setDeptsOptions(depts || []);
        setUpsOptions(ups || []);
      } catch (err) {
        console.error("Erreur chargement options :", err);
        message.error("Impossible de charger les listes de filtres.");
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchAllOptions();
  }, []);

  // ─── Fonction pour appeler l’API avec les filtres
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const result = await KPIService.getFormationsByTypeFiltered(filters);
      setDataByType(result);
    } catch (err) {
      console.error("Erreur récupération données par type :", err);
      message.error("Impossible de récupérer les données par type.");
    } finally {
      setLoadingData(false);
    }
  };

  // ─── Au premier rendu, après chargement des options, on déclenche fetchData()
  useEffect(() => {
    if (!loadingOptions) {
      fetchData();
    }
  }, [loadingOptions]);

  // ─── Dès qu’on modifie un champ du formulaire, on met à jour l’objet filters
  const onFormChange = (changedValues, allValues) => {
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

  // ─── Quand l’utilisateur clique sur “Appliquer”, on relance fetchData() puis on ferme le Drawer
  const onFinish = () => {
    fetchData();
    setDrawerVisible(false);
  };

  // ─── Affiche un spinner tant que les listes de filtres ne sont pas chargées
  if (loadingOptions) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <Spin tip="Chargement des filtres…" />
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
        visible={drawerVisible}
        width={360}
        destroyOnClose
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
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {upsOptions.map((u) => (
                <Option key={u.id} value={u.id}>
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
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {deptsOptions.map((d) => (
                <Option key={d.id} value={d.id}>
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
      {loadingData ? (
        <div style={{ textAlign: "center", padding: 50 }}>
          <Spin tip="Chargement des données…" />
        </div>
      ) : dataByType ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card
              className="type-card"
              title="INTERNE"
              bordered={false}
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
              bordered={false}
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
              bordered={false}
              style={{ textAlign: "center" }}
            >
              <span style={{ fontSize: "2rem", fontWeight: "bold", color: "#f5222d" }}>
                {dataByType.enLigne}
              </span>
            </Card>
          </Col>
        </Row>
      ) : null}
    </div>
  );
}
