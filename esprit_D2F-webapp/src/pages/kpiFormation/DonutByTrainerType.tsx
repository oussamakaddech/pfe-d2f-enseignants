import { useState, useEffect } from "react";
import {
  Row, Col, Modal, List, Avatar, Button, Typography, Spin, Drawer,
  Form, Select, DatePicker, Switch, Input,
  Tooltip,
} from "antd";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { BookOutlined, FilterOutlined, UserOutlined, MailOutlined, HomeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useKpiCountByTrainerTypeMutation } from "@/hooks/kpi";
import { useAllFormations, useDepartements, useUps } from "@/hooks/formation";
import DonutChart from "./charts/DonutChart";
import LegendTable from "./charts/LegendTable";

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const COLORS = ["#FF4D4F", "#1890FF", "#52C41A"];
const STORAGE_KEY = "trainerFilters";

interface Animateur { id?: number | string; [key: string]: unknown }
interface Seance { animateurs?: Animateur[] }
interface FormationWithSeances { seances?: Seance[] }

const collectInterneAnimateurs = (formation: FormationWithSeances): Animateur[] => {
  const result: Animateur[] = [];
  formation.seances?.forEach((s) => {
    s.animateurs?.forEach((a) => {
      if (!result.some((x) => x.id === a.id)) result.push(a);
    });
  });
  return result;
};

export default function DonutByTrainerTypeWithFilters() {
  const { message } = useAppNotification();
  const [filters, setFilters] = useState({ domaine: null, upId: null, deptId: null, ouverte: null, start: null, end: null, etat: null });
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: deptsOptions = [], isLoading: loadingOptions } = useDepartements();
  const { data: upsOptions = [] } = useUps();
  const { data: allFormations = [] } = useAllFormations();
  const kpiTrainerTypeMut = useKpiCountByTrainerTypeMutation();

  const [countsData, setCountsData] = useState<Record<string, number | number[]> | null>(null);
  const [externeFormations, setExterneFormations] = useState<Record<string, unknown>[]>([]);
  const [interneFormations, setInterneFormations] = useState<Record<string, unknown>[]>([]);
  const [mixteFormations, setMixteFormations] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFilters({ domaine: parsed.domaine ?? null, upId: parsed.upId ?? null, deptId: parsed.deptId ?? null, ouverte: parsed.ouverte ?? null, start: parsed.start ?? null, end: parsed.end ?? null, etat: parsed.etat ?? null });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(filters)); } catch { /* ignore */ }
  }, [filters]);

  const fetchCountsAndLists = async () => {
    try {
      const data = await kpiTrainerTypeMut.mutateAsync(filters);
      setCountsData(data);
      const findById = (id: unknown) => (allFormations as Record<string, unknown>[]).find((f) => f.idFormation === id || f.id === id) || null;
      setExterneFormations(((data.externeOnlyIds as unknown[]) || []).map(findById).filter(Boolean) as Record<string, unknown>[]);
      setInterneFormations(((data.interneOnlyIds as unknown[]) || []).map(findById).filter(Boolean) as Record<string, unknown>[]);
      setMixteFormations(((data.mixteIds as unknown[]) || []).map(findById).filter(Boolean) as Record<string, unknown>[]);
    } catch {
      message.error("Impossible de récupérer les données par type de formateur.");
      setExterneFormations([]); setInterneFormations([]); setMixteFormations([]);
    }
  };

  useEffect(() => {
    if (!loadingOptions) fetchCountsAndLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingOptions, filters]);

  if (!countsData) {
    return <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" tip="Chargement des données…"><div /></Spin></div>;
  }

  const { externeOnlyCount, interneOnlyCount, mixteCount } = countsData as Record<string, number>;
  const total = externeOnlyCount + interneOnlyCount + mixteCount;

  const chartData = [
    { name: "Externe uniquement", value: externeOnlyCount },
    { name: "Interne uniquement", value: interneOnlyCount },
    { name: "Mixtes", value: mixteCount },
  ];

  const legendEntries = chartData.map((d, i) => ({ ...d, color: COLORS[i] }));

  const dataToShowInModal = selectedCategory === "Externe uniquement" ? externeFormations
    : selectedCategory === "Interne uniquement" ? interneFormations
    : mixteFormations;

  return (
    <div style={{ maxWidth: 1000, margin: "auto", padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <h4>Formations par Formateur</h4>
        <Button type="primary" danger icon={<FilterOutlined />} onClick={() => setDrawerVisible(true)}>Ouvrir filtres</Button>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <DonutChart data={chartData} colors={COLORS} total={total} onClick={() => setModalVisible(true)} />
        </Col>
        <Col xs={24} md={12}>
          <LegendTable entries={legendEntries} total={total} onRowClick={(name) => { setSelectedCategory(name); setModalVisible(true); }} />
        </Col>
      </Row>

      {/* Detail Modal */}
      <Modal
        title={selectedCategory ? `Détail des formations "${selectedCategory}" (${dataToShowInModal.length})` : ""}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[<Button key="close" type="primary" danger onClick={() => setModalVisible(false)}>Fermer</Button>]}
        width={720}
      >
        {dataToShowInModal.length === 0 ? (
          <Text type="secondary"><em>Aucune formation à afficher pour cette catégorie.</em></Text>
        ) : (
          <List
            itemLayout="vertical" size="large" dataSource={dataToShowInModal}
            pagination={{ pageSize: 5, showSizeChanger: false, style: { textAlign: "center", marginTop: 16 } }}
            renderItem={(formation: Record<string, unknown>) => {
              const interneAnimateurs = collectInterneAnimateurs(formation as FormationWithSeances);
              const isExterne = Boolean(formation.externeFormateurEmail && String(formation.externeFormateurEmail).trim() !== "");
              return (
                <List.Item key={String(formation.idFormation)} style={{ padding: "12px 0" }}>
                  <List.Item.Meta
                    avatar={<Avatar icon={<BookOutlined />} style={{ backgroundColor: "#FF4D4F" }} />}
                    title={
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Tooltip title={String(formation.titreFormation)}>
                            <Text
                              strong
                              style={{
                                display: "block",
                                maxWidth: 360,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                minWidth: 0,
                              }}
                            >
                              {String(formation.titreFormation)}
                            </Text>
                          </Tooltip>
                        </Col>
                        <Col><Text type="secondary">{String(formation.dateDebut ?? "").split("T")[0] || String(formation.dateDebut ?? "")}</Text></Col>
                      </Row>
                    }
                    description={
                      <div style={{ fontSize: "0.875rem", marginTop: 4 }}>
                        <Row gutter={8} align="middle">
                          <Col><HomeOutlined /> <Text>{(formation.departement1 as Record<string, unknown>)?.libelle as string || "—"}</Text></Col>
                          <Col><HomeOutlined /> <Text>{(formation.up1 as Record<string, unknown>)?.libelle as string || "—"}</Text></Col>
                        </Row>
                        {isExterne && (
                          <div style={{ marginTop: 8 }}>
                            <Text strong>Formateur externe : </Text>
                            <div style={{ marginLeft: 16 }}>
                              <Row align="middle" gutter={4}><Col><UserOutlined /></Col><Col><Text>{String(formation.externeFormateurNom)} {String(formation.externeFormateurPrenom)}</Text></Col></Row>
                              <Row align="middle" gutter={4} style={{ marginTop: 4 }}><Col><MailOutlined /></Col><Col><Text>{String(formation.externeFormateurEmail)}</Text></Col></Row>
                              {Boolean(formation.organismeRefExterne) && <Row align="middle" gutter={4} style={{ marginTop: 4 }}><Col><Text strong>Organisme :</Text></Col><Col><Text>{String(formation.organismeRefExterne)}</Text></Col></Row>}
                            </div>
                          </div>
                        )}
                        {interneAnimateurs.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <Text strong>Animateur{interneAnimateurs.length > 1 ? "s" : ""} interne{interneAnimateurs.length > 1 ? "s" : ""} :</Text>
                            <div style={{ marginLeft: 16, marginTop: 4 }}>
                              {interneAnimateurs.map((a) => (
                                <div key={String(a.id)} style={{ marginBottom: 4 }}>
                                  <Row align="middle" gutter={4}><Col><UserOutlined /></Col><Col><Text>{String(a.nom)} {String(a.prenom)}</Text></Col></Row>
                                  <Row align="middle" gutter={4} style={{ marginLeft: 16, marginTop: 2 }}><Col><MailOutlined /></Col><Col><Text type="secondary">{String(a.mail)}</Text></Col></Row>
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

      {/* Filters Drawer */}
      <Drawer title="Filtres de recherche" placement="right" onClose={() => setDrawerVisible(false)} open={drawerVisible} width={360} destroyOnHidden>
        <Form
          layout="vertical"
          initialValues={{ domaine: filters.domaine, upId: filters.upId, deptId: filters.deptId, ouverte: filters.ouverte, dateRange: filters.start && filters.end ? [dayjs(filters.start, "YYYY-MM-DD"), dayjs(filters.end, "YYYY-MM-DD")] : null, etat: filters.etat }}
          onValuesChange={(_, allValues) => {
            setFilters({ domaine: allValues.domaine || null, upId: allValues.upId || null, deptId: allValues.deptId || null, ouverte: allValues.ouverte !== undefined ? allValues.ouverte : null, start: allValues.dateRange ? allValues.dateRange[0].format("YYYY-MM-DD") : null, end: allValues.dateRange ? allValues.dateRange[1].format("YYYY-MM-DD") : null, etat: allValues.etat || null });
          }}
          onFinish={() => setDrawerVisible(false)}
        >
          <Form.Item label="Domaine" name="domaine"><Input placeholder="Ex : Informatique" allowClear /></Form.Item>
          <Form.Item label="UP" name="upId">
            <Select showSearch placeholder="Choisir une UP" allowClear optionFilterProp="children" filterOption={(input, option) => String(option?.children ?? "").toLowerCase().includes(input.toLowerCase())}>
              {(upsOptions as Record<string, unknown>[]).map((u) => <Option key={String(u.id)} value={u.id}>{String(u.libelle)}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Département" name="deptId">
            <Select showSearch placeholder="Choisir un département" allowClear optionFilterProp="children" filterOption={(input, option) => String(option?.children ?? "").toLowerCase().includes(input.toLowerCase())}>
              {(deptsOptions as Record<string, unknown>[]).map((d) => <Option key={String(d.id)} value={d.id}>{String(d.libelle)}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Ouverte" name="ouverte" valuePropName="checked"><Switch checkedChildren="Oui" unCheckedChildren="Non" /></Form.Item>
          <Form.Item label="Période" name="dateRange"><RangePicker style={{ width: "100%" }} allowEmpty={[false, false]} /></Form.Item>
          <Form.Item label="État" name="etat">
            <Select placeholder="PLANIFIE / ACHEVE / TOUT" allowClear>
              <Option value="PLANIFIE">PLANIFIE</Option>
              <Option value="ACHEVE">ACHEVE</Option>
              <Option value="TOUT">TOUT</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: "right" }}><Button type="primary" htmlType="submit" danger>Appliquer</Button></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
