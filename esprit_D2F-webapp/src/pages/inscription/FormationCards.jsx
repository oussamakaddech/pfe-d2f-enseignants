
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
} from "antd";
import {
  EyeOutlined,
  UnlockOutlined,
  LockOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import moment from "moment";

import FormationWorkflowService from "../../services/FormationWorkflowService";
import InscriptionService from "../../services/InscriptionService";
import EnseignantService from "../../services/EnseignantService";
import { getProfile } from "../../services/accountService";

import "./FormationCards.css";

const { Meta } = Card;
const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function FormationCards() {
  const [currentUser, setCurrentUser] = useState(null);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState([]); // pour suivre les demandes envoyées
  const navigate = useNavigate();

  const [messageApi, contextHolder] = message.useMessage();

  // 1️⃣ Récupération du profil de l'utilisateur
  useEffect(() => {
    (async () => {
      try {
        const user = await getProfile();
        setCurrentUser(user);
      } catch (err) {
        console.log(err);
        messageApi.error("Impossible de récupérer le profil utilisateur");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2️⃣ Chargement des formations une fois que currentUser est défini
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
      } else if (currentUser.role === "CUP") {
        // On récupère d'abord l'entité Enseignant pour extraire son up.id
        const enseignant = await EnseignantService.getEnseignantById(currentUser.id);
        console.log(enseignant);
        const upId = enseignant.up?.id;
        console.log(upId);
        data = await FormationWorkflowService.getFormationsParUp(upId);
      } else if (currentUser.role === "Formateur") {
        data = await InscriptionService.getFormationsAccessibles(currentUser.id);
      }
      setFormations(data);
    } catch (err) {
      console.error("❌ Erreur fetchFormations :", err);
      messageApi.error("Erreur de chargement des formations");
    } finally {
      setLoading(false);
    }
  };

  // bascule inscriptions (pour D2F)
  const handleToggle = async (idFormation) => {
    try {
      setLoading(true);
      const cur = formations.find(f => f.idFormation === idFormation);
      if (!cur) throw new Error("Formation introuvable");
      const nextState = !cur.inscriptionsOuvertes;
      await FormationWorkflowService.updateInscriptionsOuvertes(idFormation, nextState);
      await fetchFormations();
      messageApi.success(
        nextState
          ? "Inscriptions ouvertes avec succès"
          : "Inscriptions fermées avec succès"
      );
    } catch (err) {
      console.error("Erreur toggle:", err);
      messageApi.error(err.response?.data?.message || "Échec de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  // envoyer une demande d'inscription (pour Formateur)
  const handleDemande = async (idFormation) => {
    try {
      await InscriptionService.demanderInscription(idFormation, currentUser.id);
      messageApi.success("Demande d'inscription envoyée !");
      setRequested(prev => [...prev, idFormation]);
    } catch (err) {
      console.error("Erreur demande :", err);
      messageApi.error(err.response?.data?.message || "Échec de la demande");
    }
  };

  // filtres
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState();
  const [upFilter, setUpFilter] = useState();
  const [deptFilter, setDeptFilter] = useState();
  const [ouverteFilter, setOuverteFilter] = useState();
  const [dateRange, setDateRange] = useState([]);

  const filtered = formations.filter(f => {
    if (searchText && !f.titreFormation.toLowerCase().includes(searchText.toLowerCase())) return false;
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

  if (loading) return <Spin style={{ display: "block", margin: "2rem auto" }} />;
  if (!formations.length) return <Empty description="Aucune formation disponible" />;

  // options pour les selects
  const types = Array.from(new Set(formations.map(f => f.typeFormation)))
    .map(t => ({ label: t, value: t }));
  const ups = Array.from(new Set(formations.map(f => f.up1?.libelle).filter(Boolean)))
    .map(u => ({ label: u, value: u }));
  const depts = Array.from(
    new Set(formations.map(f => f.departement1?.libelle).filter(Boolean))
  ).map(d => ({ label: d, value: d }));

  return (
    <>
      {contextHolder}
      <div style={{ padding: 24 }}>
        <Title level={2}>Liste des formations</Title>

        <Space wrap style={{ marginBottom: 24 }}>
          <Input.Search
            placeholder="Rechercher titre…"
            allowClear
            onSearch={setSearchText}
            style={{ width: 200 }}
          />
          <Select placeholder="Type" options={types} allowClear onChange={setTypeFilter} style={{ width: 150 }} />
          <Select placeholder="UP"   options={ups}   allowClear onChange={setUpFilter}    style={{ width: 150 }} />
          <Select placeholder="Département" options={depts} allowClear onChange={setDeptFilter} style={{ width: 150 }} />
          <Select
            placeholder="Statut inscriptions"
            options={[
              { label: "Ouvertes", value: true },
              { label: "Fermées",  value: false },
            ]}
            allowClear
            onChange={setOuverteFilter}
            style={{ width: 180 }}
          />
          <RangePicker onChange={dates => setDateRange(dates || [])} />
        </Space>

        <Row gutter={[16, 16]}>
          {filtered.map(f => (
            <Col key={f.idFormation} xs={24} sm={12} md={8} lg={6} style={{ overflow: "visible" }}>
              <Badge.Ribbon
                text={f.ouverte ? "Ouvert" : f.up1?.libelle || ""}
                color={f.ouverte ? "green" : "red"}
                className={f.ouverte ? "blink" : ""}
              >
                <Card
                  hoverable
                  onClick={() => navigate(`/home/ListeFormation/${f.idFormation}`)}
                  style={{ cursor: "pointer", position: "relative", overflow: "visible" }}
                  actions={[
                    <Tooltip key="view" title="Voir la fiche">
                      <EyeOutlined
                        onClick={e => { e.stopPropagation(); navigate(`/home/ListeFormation/${f.idFormation}`); }}
                      />
                    </Tooltip>,
                    // bouton bascule pour D2F
                    (currentUser.role === "D2F" || currentUser.role === "CUP")&& (
                      <Tooltip
                        key="toggle"
                        title={f.inscriptionsOuvertes ? "Fermer les inscriptions" : "Ouvrir les inscriptions"}
                      >
                        {f.inscriptionsOuvertes ? (
                          <LockOutlined
                            style={{ color: "#ff4d4f" }}
                            onClick={e => { e.stopPropagation(); handleToggle(f.idFormation); }}
                          />
                        ) : (
                          <UnlockOutlined
                            style={{ color: "#52c41a" }}
                            onClick={e => { e.stopPropagation(); handleToggle(f.idFormation); }}
                          />
                        )}
                      </Tooltip>
                    ),
                    // nouveau bouton pour Formateur
                    currentUser.role === "Formateur" && (
                      requested.includes(f.idFormation) ? (
                        <Tooltip key="requested" title="Demande déjà envoyée">
                          <CheckCircleOutlined style={{ color: "gray" }} />
                        </Tooltip>
                      ) : (
                        <Tooltip key="demande" title="Demander inscription">
                          <UserAddOutlined
                            style={{ color: "#1890ff" }}
                            onClick={e => { e.stopPropagation(); handleDemande(f.idFormation); }}
                          />
                        </Tooltip>
                      )
                    ),
                   // nouveau bouton "Voir demandes" pour CAP et D2F
                   (currentUser.role === "D2F" || currentUser.role === "CUP") && (
                     <Tooltip key="demandes" title="Voir les demandes">
                       <TeamOutlined
                         style={{ color: "#1890ff" }}
                         onClick={e => {
                           e.stopPropagation();
                           navigate(`/home/ListeFormation/${f.idFormation}/demandes`);
                         }}
                       />
                     </Tooltip>
                   ),
                  ].filter(Boolean)}
                >
                  <Meta
                    title={f.titreFormation}
                    description={`Du ${new Date(f.dateDebut).toLocaleDateString()} au ${new Date(f.dateFin).toLocaleDateString()}`}
                  />
                </Card>
              </Badge.Ribbon>
            </Col>
          ))}
        </Row>

        {filtered.length === 0 && (
          <Empty description="Aucun résultat pour ces filtres" style={{ marginTop: 48 }} />
        )}
      </div>
    </>
  );
}
