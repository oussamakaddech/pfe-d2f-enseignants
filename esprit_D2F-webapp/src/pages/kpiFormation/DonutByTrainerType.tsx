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
  Drawer,
  Form,
  Select,
  DatePicker,
  Switch,
  Input,
} from "antd";
import useAppNotification from "@/hooks/ui/useAppNotification";
import {
  BookOutlined,
  FilterOutlined,
  UserOutlined,
  MailOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Doughnut } from "react-chartjs-2";
import moment from "moment";

import { useKpiCountByTrainerTypeMutation } from "@/hooks/kpi";
import { useAllFormations, useDepartements, useUps } from "@/hooks/formation";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const collectInterneAnimateurs = (formation) => {
  const result = [];
  formation.seances?.forEach((s) => {
    s.animateurs?.forEach((a) => {
      if (!result.some((x) => x.id === a.id)) result.push(a);
    });
  });
  return result;
};

const COLORS = ["#FF4D4F", "#1890FF", "#52C41A"];

// Clé utilisée pour stocker/charger les filtres dans localStorage
const STORAGE_KEY = "trainerFilters";

export default function DonutByTrainerTypeWithFilters() {
  // ─── 1) État “filters”, initialisé depuis localStorage si possible ──────────────────────
  const { message } = useAppNotification();
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
    } catch {
      // ignore invalid stored filters
    }
  }, []);

  // ─── Dès que “filters” change, on l’enregistre dans localStorage ───────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // ignore localStorage write failures
    }
  }, [filters]);

  // ─── 2) État pour afficher/fermer le Drawer de filtres ─────────────────────────────────
  const [drawerVisible, setDrawerVisible] = useState(false);

  // ─── 3) Options pour remplir les Select dans le Drawer (Compétences, Dépts, UPs) ───────
  const { data: deptsOptions = [], isLoading: loadingOptions } = useDepartements();
  const { data: upsOptions = [] } = useUps();
  const { data: allFormations = [] } = useAllFormations();
  const kpiTrainerTypeMut = useKpiCountByTrainerTypeMutation();

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


  // ─── 8) Fonction pour récupérer counts + formations complètes par ID ──────────────────
  const fetchCountsAndLists = async () => {
    try {
      // 1) Récupérer le count et les listes d’IDs
      const data = await kpiTrainerTypeMut.mutateAsync(filters);
      setCountsData(data);

      const externeIds = data.externeOnlyIds || [];
      const interneIds = data.interneOnlyIds || [];
      const mixteIds = data.mixteIds || [];

      // 2) Trouver les formations par ID depuis le cache
      const findById = (id) => allFormations.find((f) => f.idFormation === id || f.id === id) || null;

      const externes = externeIds.map(findById).filter(Boolean);
      const internes = interneIds.map(findById).filter(Boolean);
      const mixtes = mixteIds.map(findById).filter(Boolean);

      setExterneFormations(externes);
      setInterneFormations(internes);
      setMixteFormations(mixtes);
    } catch (err) {
      message.error("Impossible de récupérer les données par type de formateur.");
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
        <Spin size="large" tip="Chargement des données…"><div /></Spin>
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
        {/* ─── Donut Chart (chart.js) */}
        <Col xs={24} md={12}>
          <Card
            style={{ borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            styles={{ body: { padding: 16 } }}
          >
            <div role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => setModalVisible(true)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setModalVisible(true); } }}>
              <Doughnut
                data={{
                  labels: chartData.map((d) => d.name),
                  datasets: [{
                    data: chartData.map((d) => d.value),
                    backgroundColor: COLORS,
                    borderWidth: 2,
                    borderColor: "#fff",
                  }],
                }}
                options={{
                  cutout: "60%",
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: {
                        padding: 16,
                        font: { size: 12 },
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const val = ctx.parsed;
                          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
                          return `${ctx.label}: ${val} (${pct}%)`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
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
                styles={{ body: { padding: 16 } }}
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
                styles={{ body: { padding: 16 } }}
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
                styles={{ body: { padding: 16 } }}
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
        open={modalVisible}
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
              const interneAnimateurs = collectInterneAnimateurs(formation);
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
        open={drawerVisible}
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
                String(option?.children ?? "").toLowerCase().includes(input.toLowerCase())
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
                String(option?.children ?? "").toLowerCase().includes(input.toLowerCase())
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




