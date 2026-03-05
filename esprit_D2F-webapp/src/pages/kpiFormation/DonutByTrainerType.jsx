// src/components/KPI/DonutByTrainerTypeWithFilters.jsx

import  { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Modal,
  List,
  Avatar,
  Button,
  Typography,
  Spin,
  message,
  Drawer,
  Form,
  Select,
  DatePicker,
  Switch,
  Input,
} from "antd";
import {
  BookOutlined,
  FilterOutlined,
  UserOutlined,
  MailOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import moment from "moment";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

import KPIService from "../../services/KPIService";
import FormationWorkflowService from "../../services/FormationWorkflowService";
import DeptService from "../../services/DeptService";
import UpService from "../../services/upService";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Couleurs : Externe = rouge, Interne = bleu, Mixte = vert
const COLORS = ["#FF4D4F", "#1890FF", "#52C41A"];

// Clé utilisée pour stocker/charger les filtres dans localStorage
const STORAGE_KEY = "trainerFilters";

export default function DonutByTrainerTypeWithFilters() {
  // ─── 1) État “filters”, initialisé depuis localStorage si possible ──────────────────────
  const [filters, setFilters] = useState({
    domaine: null,
    upId: null,
    deptId: null,
    ouverte: null,
    start: null,
    end: null,
    etat: null,
  });

  // ─── Au montage, on charge les filtres depuis localStorage (s’ils existent) ─────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFilters({
          domaine: parsed.domaine ?? null,
          upId: parsed.upId ?? null,
          deptId: parsed.deptId ?? null,
          ouverte: parsed.ouverte ?? null,
          start: parsed.start ?? null,
          end: parsed.end ?? null,
          etat: parsed.etat ?? null,
        });
      }
    } catch (e) {
      console.warn("Impossible de lire les filtres depuis localStorage :", e);
    }
  }, []);

  // ─── Dès que “filters” change, on l’enregistre dans localStorage ───────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (e) {
      console.warn("Impossible de sauvegarder les filtres dans localStorage :", e);
    }
  }, [filters]);

  // ─── 2) État pour afficher/fermer le Drawer de filtres ─────────────────────────────────
  const [drawerVisible, setDrawerVisible] = useState(false);

  // ─── 3) Options pour remplir les Select dans le Drawer (Compétences, Dépts, UPs) ───────
  const [deptsOptions, setDeptsOptions] = useState([]);
  const [upsOptions, setUpsOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // ─── 4) État pour récupérer counts + listes d’IDs depuis KPIService ────────────────────
  const [countsData, setCountsData] = useState(null);
  // { externeOnlyCount, interneOnlyCount, mixteCount, externeOnlyIds, interneOnlyIds, mixteIds }

  // ─── 5) État pour stocker les objets “formation” complets (retrouvés par ID) ────────────
  const [externeFormations, setExterneFormations] = useState([]);
  const [interneFormations, setInterneFormations] = useState([]);
  const [mixteFormations, setMixteFormations] = useState([]);

  // ─── 6) État pour le Modal (catégorie + visibilité) ──────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  // selectedCategory ∈ { "Externe uniquement", "Interne uniquement", "Mixtes" }

  // ─── 7) Charger les options (Compétences, Dépts, UPs) au montage ───────────────────────
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

  // ─── 8) Fonction pour récupérer counts + formations complètes par ID ──────────────────
  const fetchCountsAndLists = async () => {
    try {
      // 1) Récupérer le count et les listes d’IDs
      const data = await KPIService.getCountByTrainerTypeWithIds(filters);
      setCountsData(data);

      const externeIds = data.externeOnlyIds || [];
      const interneIds = data.interneOnlyIds || [];
      const mixteIds = data.mixteIds || [];

      // 2) Pour chaque ID, appeler FormationWorkflowService.getFormationWorkflowById(id)
      const promExterne =
        externeIds.length > 0
          ? Promise.all(
              externeIds.map((id) =>
                FormationWorkflowService.getFormationWorkflowById(id)
              )
            )
          : Promise.resolve([]);

      const promInterne =
        interneIds.length > 0
          ? Promise.all(
              interneIds.map((id) =>
                FormationWorkflowService.getFormationWorkflowById(id)
              )
            )
          : Promise.resolve([]);

      const promMixte =
        mixteIds.length > 0
          ? Promise.all(
              mixteIds.map((id) =>
                FormationWorkflowService.getFormationWorkflowById(id)
              )
            )
          : Promise.resolve([]);

      // 3) Attendre les trois promesses en parallèle
      const [externes, internes, mixtes] = await Promise.all([
        promExterne.catch(() => []),
        promInterne.catch(() => []),
        promMixte.catch(() => []),
      ]);

      setExterneFormations(externes);
      setInterneFormations(internes);
      setMixteFormations(mixtes);
    } catch (err) {
      console.error("Erreur récupération données par type de formateur :", err);
      message.error("Impossible de récupérer les données “par type de formateur”.");
      setCountsData(null);
      setExterneFormations([]);
      setInterneFormations([]);
      setMixteFormations([]);
    }
  };

  // ─── 9) Lancer le fetch dès que loadingOptions est fini ou que filters change ──────────
  useEffect(() => {
    if (!loadingOptions) {
      fetchCountsAndLists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingOptions, filters]);

  // ─── 10) Préparation des données pour le Donut Chart ─────────────────────────────────
  if (!countsData) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" tip="Chargement des données…" />
      </div>
    );
  }

  const { externeOnlyCount, interneOnlyCount, mixteCount } = countsData;
  const total = externeOnlyCount + interneOnlyCount + mixteCount;

  const chartData = [
    {
      name: "Externe uniquement",
      value: externeOnlyCount,
      rawList: externeFormations,
    },
    {
      name: "Interne uniquement",
      value: interneOnlyCount,
      rawList: interneFormations,
    },
    {
      name: "Mixtes",
      value: mixteCount,
      rawList: mixteFormations,
    },
  ];

  // ─── 11) Gestion du clic sur un segment du donut ───────────────────────────────────────
  const onPieClick = (_, index) => {
    const category = chartData[index].name;
    setSelectedCategory(category);
    setModalVisible(true);
  };

  // Sélectionne la liste à afficher dans le Modal selon la catégorie
  let dataToShowInModal = [];
  if (selectedCategory === "Externe uniquement") {
    dataToShowInModal = externeFormations;
  } else if (selectedCategory === "Interne uniquement") {
    dataToShowInModal = interneFormations;
  } else if (selectedCategory === "Mixtes") {
    dataToShowInModal = mixteFormations;
  }

  // ─── 12) Composant complet ─────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1000, margin: "auto", padding: 24 }}>
      {/* TITRE + BOUTON FILTRES */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <h4 >📊 Formations par Formateur</h4>
        <Button
          type="primary"
          danger
          icon={<FilterOutlined />}
          onClick={() => setDrawerVisible(true)}
        >
          Ouvrir filtres
        </Button>
      </Row>

      {/* Donut Chart + Cards statistiques */}
      <Row gutter={[24, 24]}>
        {/* ─── Donut Chart */}
        <Col xs={24} md={12}>
          <Card
            style={{ borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            bodyStyle={{ padding: 16 }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={4}
                  onClick={onPieClick}
                >
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={COLORS[idx]}
                      cursor="pointer"
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value}`, `${name}`]}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  payload={chartData.map((item, idx) => ({
                    id: idx,
                    type: "square",
                    value: `${item.name} (${
                      total > 0
                        ? ((item.value / total) * 100).toFixed(1)
                        : "0.0"
                    }%)`,
                    color: COLORS[idx],
                  }))}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* ─── Statistiques (+ ouverture de Modal au clic) */}
        <Col xs={24} md={12}>
          <Row gutter={[16, 16]}>
            {/* Externe uniquement */}
            <Col span={24}>
              <Card
                hoverable
                style={{
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
                bodyStyle={{ padding: 16 }}
                onClick={() => {
                  setSelectedCategory("Externe uniquement");
                  setModalVisible(true);
                }}
              >
                <Statistic
                  title="Externe uniquement"
                  value={externeOnlyCount}
                  valueStyle={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: COLORS[0],
                  }}
                />
                <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                  {total > 0
                    ? ((externeOnlyCount / total) * 100).toFixed(1) + "% du total"
                    : "0.0% du total"}
                </Text>
              </Card>
            </Col>

            {/* Interne uniquement */}
            <Col span={24}>
              <Card
                hoverable
                style={{
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
                bodyStyle={{ padding: 16 }}
                onClick={() => {
                  setSelectedCategory("Interne uniquement");
                  setModalVisible(true);
                }}
              >
                <Statistic
                  title="Interne uniquement"
                  value={interneOnlyCount}
                  valueStyle={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: COLORS[1],
                  }}
                />
                <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                  {total > 0
                    ? ((interneOnlyCount / total) * 100).toFixed(1) + "% du total"
                    : "0.0% du total"}
                </Text>
              </Card>
            </Col>

            {/* Mixtes */}
            <Col span={24}>
              <Card
                hoverable
                style={{
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
                bodyStyle={{ padding: 16 }}
                onClick={() => {
                  setSelectedCategory("Mixtes");
                  setModalVisible(true);
                }}
              >
                <Statistic
                  title="Mixtes"
                  value={mixteCount}
                  valueStyle={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: COLORS[2],
                  }}
                />
                <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                  {total > 0
                    ? ((mixteCount / total) * 100).toFixed(1) + "% du total"
                    : "0.0% du total"}
                </Text>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* ─── MODAL : liste paginée des formations par catégorie ───────────────────────────── */}
      <Modal
        title={
          selectedCategory
            ? `Détail des formations “${selectedCategory}” (${dataToShowInModal.length})`
            : ""
        }
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" type="primary" danger onClick={() => setModalVisible(false)}>
            Fermer
          </Button>,
        ]}
        width={720}
      >
        {dataToShowInModal.length === 0 ? (
          <Text type="secondary">
            <em>Aucune formation à afficher pour cette catégorie.</em>
          </Text>
        ) : (
          <List
            itemLayout="vertical"
            size="large"
            dataSource={dataToShowInModal}
            pagination={{
              pageSize: 5,
              showSizeChanger: false,
              style: { textAlign: "center", marginTop: 16 },
            }}
            renderItem={(formation) => {
              // Récupérer la liste unique des animateurs internes
              const interneAnimateurs = [];
              formation.seances?.forEach((s) => {
                s.animateurs?.forEach((a) => {
                  if (!interneAnimateurs.find((x) => x.id === a.id)) {
                    interneAnimateurs.push(a);
                  }
                });
              });
              const isExterne = Boolean(
                formation.externeFormateurEmail &&
                  formation.externeFormateurEmail.trim() !== ""
              );

              return (
                <List.Item
                  key={formation.idFormation}
                  style={{ padding: "12px 0" }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        icon={<BookOutlined />}
                        style={{ backgroundColor: "#FF4D4F" }}
                      />
                    }
                    title={
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Text
                            strong
                            ellipsis={{ tooltip: formation.titreFormation }}
                          >
                            {formation.titreFormation}
                          </Text>
                        </Col>
                        <Col>
                          <Text type="secondary">
                            {formation.dateDebut?.split("T")[0] ||
                              formation.dateDebut}
                          </Text>
                        </Col>
                      </Row>
                    }
                    description={
                      <div style={{ fontSize: "0.875rem", marginTop: 4 }}>
                        <Row gutter={8} align="middle">
                          <Col>
                            <HomeOutlined />{" "}
                            <Text>
                              {formation.departement1?.libelle || "—"}
                            </Text>
                          </Col>
                          <Col>
                            <HomeOutlined />{" "}
                            <Text>{formation.up1?.libelle || "—"}</Text>
                          </Col>
                        </Row>
                        {/* Formateur externe */}
                        {isExterne && (
                          <div style={{ marginTop: 8 }}>
                            <Text strong>Formateur externe&nbsp;: </Text>
                            <div style={{ marginLeft: 16 }}>
                              <Row align="middle" gutter={4}>
                                <Col>
                                  <UserOutlined />
                                </Col>
                                <Col>
                                  <Text>
                                    {formation.externeFormateurNom}{" "}
                                    {formation.externeFormateurPrenom}
                                  </Text>
                                </Col>
                              </Row>
                              <Row
                                align="middle"
                                gutter={4}
                                style={{ marginTop: 4 }}
                              >
                                <Col>
                                  <MailOutlined />
                                </Col>
                                <Col>
                                  <Text>
                                    {formation.externeFormateurEmail}
                                  </Text>
                                </Col>
                              </Row>
                              {formation.organismeRefExterne && (
                                <Row
                                  align="middle"
                                  gutter={4}
                                  style={{ marginTop: 4 }}
                                >
                                  <Col>
                                    <Text strong>Organisme&nbsp;:</Text>
                                  </Col>
                                  <Col>
                                    <Text>
                                      {formation.organismeRefExterne}
                                    </Text>
                                  </Col>
                                </Row>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Animateurs internes */}
                        {interneAnimateurs.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <Text strong>
                              Animateur
                              {interneAnimateurs.length > 1 ? "s" : ""} interne
                              {interneAnimateurs.length > 1 ? "s" : ""}
                              &nbsp;:
                            </Text>
                            <div style={{ marginLeft: 16, marginTop: 4 }}>
                              {interneAnimateurs.map((a) => (
                                <div key={a.id} style={{ marginBottom: 4 }}>
                                  <Row align="middle" gutter={4}>
                                    <Col>
                                      <UserOutlined />
                                    </Col>
                                    <Col>
                                      <Text>
                                        {a.nom} {a.prenom}
                                      </Text>
                                    </Col>
                                  </Row>
                                  <Row
                                    align="middle"
                                    gutter={4}
                                    style={{
                                      marginLeft: 16,
                                      marginTop: 2,
                                    }}
                                  >
                                    <Col>
                                      <MailOutlined />
                                    </Col>
                                    <Col>
                                      <Text type="secondary">{a.mail}</Text>
                                    </Col>
                                  </Row>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Modal>

      {/* ─── DRAWER DE FILTRES ─────────────────────────────────────────────────────────────── */}
      <Drawer
        title="Filtres de recherche"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        width={360}
        destroyOnHidden
      >
        <Form
          layout="vertical"
          initialValues={{
            domaine: filters.domaine,
            upId: filters.upId,
            deptId: filters.deptId,
            ouverte: filters.ouverte,
            dateRange:
              filters.start && filters.end
                ? [
                    moment(filters.start, "YYYY-MM-DD"),
                    moment(filters.end, "YYYY-MM-DD"),
                  ]
                : null,
            etat: filters.etat,
          }}
          onValuesChange={(changedValues, allValues) => {
            setFilters({
              domaine: allValues.domaine || null,
              upId: allValues.upId || null,
              deptId: allValues.deptId || null,
              ouverte:
                allValues.ouverte !== undefined ? allValues.ouverte : null,
              start: allValues.dateRange
                ? allValues.dateRange[0].format("YYYY-MM-DD")
                : null,
              end: allValues.dateRange
                ? allValues.dateRange[1].format("YYYY-MM-DD")
                : null,
              etat: allValues.etat || null,
            });
          }}
          onFinish={() => {
            // On ferme simplement le Drawer, le useEffect([filters]) relancera fetchCountsAndLists()
            setDrawerVisible(false);
          }}
        >
          {/* Domaine */}
          <Form.Item label="Domaine" name="domaine">
            <Input placeholder="Ex : Informatique" allowClear />
          </Form.Item>

          {/* UP */}
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

          {/* Département */}
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

          {/* Ouverte */}
          <Form.Item label="Ouverte" name="ouverte" valuePropName="checked">
            <Switch checkedChildren="Oui" unCheckedChildren="Non" />
          </Form.Item>

          {/* Période */}
          <Form.Item label="Période" name="dateRange">
            <RangePicker
              style={{ width: "100%" }}
              allowEmpty={[false, false]}
            />
          </Form.Item>

          {/* État */}
          <Form.Item label="État" name="etat">
            <Select placeholder="PLANIFIE / ACHEVE / TOUT" allowClear>
              <Option value="PLANIFIE">PLANIFIE</Option>
              <Option value="ACHEVE">ACHEVE</Option>
              <Option value="TOUT">TOUT</Option>
            </Select>
          </Form.Item>

          {/* Bouton Appliquer */}
          <Form.Item style={{ textAlign: "right" }}>
            <Button type="primary" htmlType="submit" danger>
              Appliquer
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
