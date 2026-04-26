import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Spin,
  Empty,
  Tooltip,
  Select,
  DatePicker,
  Input,
  Space,
  Badge,
  Typography,
  message,
  Tag,
  Button,
} from "antd";
import {
  EyeOutlined,
  UnlockOutlined,
  LockOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  CalendarOutlined,
  BookOutlined,
  ApartmentOutlined,
  FilterOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import moment from "moment";

import FormationWorkflowService from "../../services/FormationWorkflowService";
import InscriptionService from "../../services/InscriptionService";
import EnseignantService from "../../services/EnseignantService";
import { getProfile } from "../../services/accountService";

import "./FormationCards.css";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

function getTypeClass(type) {
  if (!type) return "type-default";
  const t = String(type).toUpperCase().replace(/\s/g, "_");
  return `type-${t}`;
}


export default function FormationCards() {
  const [currentUser, setCurrentUser] = useState(null);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState([]);
  const navigate = useNavigate();

  const [messageApi, contextHolder] = message.useMessage();

  // filtres
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState();
  const [upFilter, setUpFilter] = useState();
  const [deptFilter, setDeptFilter] = useState();
  const [ouverteFilter, setOuverteFilter] = useState();
  const [dateRange, setDateRange] = useState([]);

  // 1️⃣ Profil utilisateur
  useEffect(() => {
    (async () => {
      try {
        const user = await getProfile();
        if (!user.role || user.role === "admin") user.role = "D2F";
        setCurrentUser(user);
      } catch {
        messageApi.error("Impossible de récupérer le profil utilisateur");
      }
    })();
  }, [messageApi]);

  // 2️⃣ Chargement formations
  useEffect(() => {
    if (!currentUser) return;
    fetchFormations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const fetchFormations = async () => {
    setLoading(true);
    try {
      let data = [];
      if (currentUser.role === "D2F") {
        data = await FormationWorkflowService.getFormationsVisibles();
        if (!data || data.length === 0) {
          data = await FormationWorkflowService.getAllFormationWorkflows();
        }
      } else if (currentUser.role === "CUP") {
        const enseignant = await EnseignantService.getEnseignantById(currentUser.id);
        data = await FormationWorkflowService.getFormationsParUp(enseignant.up?.id);
      } else if (currentUser.role === "Formateur") {
        data = await InscriptionService.getFormationsAccessibles(currentUser.id);
      }
      setFormations(data || []);
    } catch (err) {
      console.error(err);
      messageApi.error("Erreur de chargement des formations");
      setFormations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (idFormation) => {
    try {
      setLoading(true);
      const cur = formations.find((f) => f.idFormation === idFormation);
      if (!cur) throw new Error("Formation introuvable");
      const nextState = !cur.inscriptionsOuvertes;
      await FormationWorkflowService.updateInscriptionsOuvertes(idFormation, nextState);
      await fetchFormations();
      messageApi.success(nextState ? "Inscriptions ouvertes" : "Inscriptions fermées");
    } catch (err) {
      messageApi.error(err.response?.data?.message || "Échec de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const handleDemande = async (idFormation) => {
    try {
      await InscriptionService.demanderInscription(idFormation, currentUser.id);
      messageApi.success("Demande d'inscription envoyée !");
      setRequested((prev) => [...prev, idFormation]);
    } catch (err) {
      messageApi.error(err.response?.data?.message || "Échec de la demande");
    }
  };

  const handleResetFilters = () => {
    setSearchText("");
    setTypeFilter(undefined);
    setUpFilter(undefined);
    setDeptFilter(undefined);
    setOuverteFilter(undefined);
    setDateRange([]);
  };

  const filtered = formations.filter((f) => {
    if (searchText && !f.titreFormation?.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (typeFilter && f.typeFormation !== typeFilter) return false;
    if (upFilter && f.up1?.libelle !== upFilter) return false;
    if (deptFilter && f.departement1?.libelle !== deptFilter) return false;
    if (ouverteFilter !== undefined && f.ouverte !== ouverteFilter) return false;
    if (dateRange.length === 2) {
      const [start, end] = dateRange;
      const d = moment(f.dateDebut);
      if (d.isBefore(start, "day") || d.isAfter(end, "day")) return false;
    }
    return true;
  });

  // options filtres
  const types = Array.from(new Set(formations.map((f) => f.typeFormation)))
    .filter(Boolean)
    .map((t) => ({ label: t, value: t }));
  const ups = Array.from(new Set(formations.map((f) => f.up1?.libelle).filter(Boolean)))
    .map((u) => ({ label: u, value: u }));
  const depts = Array.from(new Set(formations.map((f) => f.departement1?.libelle).filter(Boolean)))
    .map((d) => ({ label: d, value: d }));

  if (loading && formations.length === 0) {
    return <Spin style={{ display: "block", margin: "4rem auto" }} />;
  }
  if (!currentUser) {
    return <Spin style={{ display: "block", margin: "4rem auto" }} />;
  }
  if (!formations || formations.length === 0) {
    return <Empty description="Aucune formation disponible" style={{ marginTop: 80 }} />;
  }

  const isAdminLike = currentUser.role === "D2F" || currentUser.role === "CUP";

  return (
    <>
      {contextHolder}
      <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <BookOutlined style={{ marginRight: 12, color: "#B51200" }} />
              Liste des formations
            </Title>
            <Text type="secondary">
              {filtered.length} formation{filtered.length > 1 ? "s" : ""} sur {formations.length}
            </Text>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchFormations} loading={loading}>
              Actualiser
            </Button>
          </Col>
        </Row>

        {/* Barre de filtres */}
        <Card size="small" style={{ marginBottom: 24, borderRadius: 10 }}>
          <Space wrap size="middle" align="center">
            <FilterOutlined style={{ color: "#B51200", fontSize: 16 }} />
            <Input.Search
              placeholder="Rechercher un titre…"
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={setSearchText}
              style={{ width: 220 }}
            />
            <Select placeholder="Type" options={types} allowClear value={typeFilter} onChange={setTypeFilter} style={{ width: 140 }} />
            <Select placeholder="UP" options={ups} allowClear value={upFilter} onChange={setUpFilter} style={{ width: 160 }} />
            <Select placeholder="Département" options={depts} allowClear value={deptFilter} onChange={setDeptFilter} style={{ width: 160 }} />
            <Select
              placeholder="Inscriptions"
              allowClear
              value={ouverteFilter}
              onChange={setOuverteFilter}
              style={{ width: 150 }}
              options={[
                { label: "Ouvertes", value: true },
                { label: "Fermées", value: false },
              ]}
            />
            <RangePicker value={dateRange.length ? dateRange : null} onChange={(dates) => setDateRange(dates || [])} />
            <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>
              Réinitialiser
            </Button>
          </Space>
        </Card>

        {/* Grille de cartes */}
        <Row gutter={[20, 20]}>
          {filtered.map((f) => {
            const isOpen = f.ouverte;
            return (
              <Col key={f.idFormation} xs={24} sm={12} md={8} lg={6}>
                <Card
                  className="formation-card"
                  bodyStyle={{ padding: 0 }}
                  cover={
                    <div className={`card-header ${getTypeClass(f.typeFormation)}`}>
                      <span>
                        <Tag color="rgba(255,255,255,0.25)" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>
                          {f.typeFormation || "—"}
                        </Tag>
                      </span>
                      <span>{isOpen ? "🟢 Ouvert" : "🔒 Fermé"}</span>
                    </div>
                  }
                >
                  <div className="card-body">
                    <div className="card-title">{f.titreFormation}</div>

                    <div className="card-meta">
                      <div className="card-meta-item">
                        <CalendarOutlined style={{ color: "#B51200" }} />
                        <Text>
                          {new Date(f.dateDebut).toLocaleDateString("fr-FR")} →{" "}
                          {new Date(f.dateFin).toLocaleDateString("fr-FR")}
                        </Text>
                      </div>
                      <div className="card-meta-item">
                        <ApartmentOutlined style={{ color: "#B51200" }} />
                        <Text>{f.departement1?.libelle || "—"}</Text>
                      </div>
                      <div className="card-meta-item">
                        <TeamOutlined style={{ color: "#B51200" }} />
                        <Text>{f.up1?.libelle || "—"}</Text>
                      </div>
                    </div>

                    <div className="card-tags">
                      <Badge
                        status={isOpen ? "success" : "error"}
                        text={isOpen ? "Inscriptions ouvertes" : "Inscriptions fermées"}
                      />
                      {f.inscriptionsOuvertes && (
                        <Tag color="success" className="blink-open">
                          Actif
                        </Tag>
                      )}
                    </div>
                  </div>

                  <div className="card-actions">
                    <Tooltip title="Voir la fiche">
                      <EyeOutlined
                        style={{ color: "#595959" }}
                        onClick={() => navigate(`/home/ListeFormation/${f.idFormation}`)}
                      />
                    </Tooltip>

                    {isAdminLike && (
                      <Tooltip title={f.inscriptionsOuvertes ? "Fermer les inscriptions" : "Ouvrir les inscriptions"}>
                        {f.inscriptionsOuvertes ? (
                          <LockOutlined
                            style={{ color: "#ff4d4f" }}
                            onClick={() => handleToggle(f.idFormation)}
                          />
                        ) : (
                          <UnlockOutlined
                            style={{ color: "#52c41a" }}
                            onClick={() => handleToggle(f.idFormation)}
                          />
                        )}
                      </Tooltip>
                    )}

                    {currentUser.role === "Formateur" &&
                      (requested.includes(f.idFormation) ? (
                        <Tooltip title="Demande déjà envoyée">
                          <CheckCircleOutlined style={{ color: "#8c8c8c" }} />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Demander inscription">
                          <UserAddOutlined
                            style={{ color: "#1890ff" }}
                            onClick={() => handleDemande(f.idFormation)}
                          />
                        </Tooltip>
                      ))}

                    {isAdminLike && (
                      <Tooltip title="Voir les demandes">
                        <TeamOutlined
                          style={{ color: "#1890ff" }}
                          onClick={() => navigate(`/home/ListeFormation/${f.idFormation}/demandes`)}
                        />
                      </Tooltip>
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>

        {filtered.length === 0 && (
          <Empty description="Aucun résultat pour ces filtres" style={{ marginTop: 80 }} />
        )}
      </div>
    </>
  );
}
