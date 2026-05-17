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
import useAppNotification from "../../hooks/useAppNotification";
import { AppPageHeader, brand } from "../../theme";

const { Text } = Typography;
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

  const { message: messageApi } = useAppNotification();

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
      if (currentUser.role === "CUP") {
        const identifier = currentUser.emailAddress || currentUser.email || currentUser.id;
        const enseignant = await EnseignantService.getEnseignantById(identifier);
        data = await FormationWorkflowService.getFormationsParUp(enseignant.up?.id);
      } else if (currentUser.role === "Formateur") {
        const identifier = currentUser.emailAddress || currentUser.email || currentUser.id;
        data = await InscriptionService.getFormationsAccessibles(identifier);
      } else {
        // admin, D2F, Enseignant, etc.
        data = await FormationWorkflowService.getFormationsVisibles();
        // Fallback for admin-like roles to see everything if nothing is marked visible
        if ((currentUser.role === "D2F" || currentUser.role === "admin") && (!data || data.length === 0)) {
          data = await FormationWorkflowService.getAllFormationWorkflows();
        }
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
      const identifier = currentUser.emailAddress || currentUser.email || currentUser.id;
      await InscriptionService.demanderInscription(idFormation, identifier);
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
      <div className="fc-page">
        <AppPageHeader
          icon={<BookOutlined />}
          title="Liste des Formations"
          subtitle={`${filtered.length} formation${filtered.length > 1 ? "s" : ""} sur ${formations.length}`}
          actions={
            <Button icon={<ReloadOutlined />} onClick={fetchFormations} loading={loading}>
              Actualiser
            </Button>
          }
        />

        {/* Barre de filtres */}
        <Card size="small" className="fc-filter-card">
          <Space wrap size="middle" align="center">
            <FilterOutlined className="fc-filter-icon" />
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
                        <Tag className="card-header-tag">
                          {f.typeFormation || "—"}
                        </Tag>
                      </span>
                      <Badge status={isOpen ? "success" : "error"} text={isOpen ? "Ouvert" : "Fermé"} className="card-header-badge" />
                    </div>
                  }
                >
                  <div className="card-body">
                    <div className="card-title">{f.titreFormation}</div>

                    <div className="card-meta">
                      <div className="card-meta-item">
                        <CalendarOutlined className="icon-primary" />
                        <Text>
                          {new Date(f.dateDebut).toLocaleDateString("fr-FR")} →{" "}
                          {new Date(f.dateFin).toLocaleDateString("fr-FR")}
                        </Text>
                      </div>
                      <div className="card-meta-item">
                        <ApartmentOutlined className="icon-primary" />
                        <Text>{f.departement1?.libelle || "—"}</Text>
                      </div>
                      <div className="card-meta-item">
                        <TeamOutlined className="icon-primary" />
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
                        className="icon-muted"
                        role="button"
                        tabIndex={0}
                        aria-label={`Voir la fiche de ${f.titreFormation}`}
                        onClick={() => navigate(`/home/ListeFormation/${f.idFormation}`)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/home/ListeFormation/${f.idFormation}`); }}
                      />
                    </Tooltip>

                    {isAdminLike && (
                      <Tooltip title={f.inscriptionsOuvertes ? "Fermer les inscriptions" : "Ouvrir les inscriptions"}>
                        {f.inscriptionsOuvertes ? (
                          <LockOutlined
                            className="icon-error"
                            role="button"
                            tabIndex={0}
                            aria-label="Fermer les inscriptions"
                            onClick={() => handleToggle(f.idFormation)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleToggle(f.idFormation); }}
                          />
                        ) : (
                          <UnlockOutlined
                            className="icon-success"
                            role="button"
                            tabIndex={0}
                            aria-label="Ouvrir les inscriptions"
                            onClick={() => handleToggle(f.idFormation)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleToggle(f.idFormation); }}
                          />
                        )}
                      </Tooltip>
                    )}

                    {(currentUser.role === "Formateur" || currentUser.role === "Enseignant") &&
                      f.inscriptionsOuvertes &&
                      (requested.includes(f.idFormation) ? (
                        <Tooltip title="Demande déjà envoyée">
                          <CheckCircleOutlined className="icon-disabled" aria-label="Demande déjà envoyée" />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Demander inscription">
                          <UserAddOutlined
                            className="icon-info"
                            role="button"
                            tabIndex={0}
                            aria-label={`Demander inscription à ${f.titreFormation}`}
                            onClick={() => handleDemande(f.idFormation)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleDemande(f.idFormation); }}
                          />
                        </Tooltip>
                      ))}

                    {isAdminLike && (
                      <Tooltip title="Voir les demandes">
                        <TeamOutlined
                          className="icon-info"
                          role="button"
                          tabIndex={0}
                          aria-label="Voir les demandes d'inscription"
                          onClick={() => navigate(`/home/ListeFormation/${f.idFormation}/demandes`)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/home/ListeFormation/${f.idFormation}/demandes`); }}
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
          <Empty description="Aucun résultat pour ces filtres" className="fc-empty" />
        )}
      </div>
    </>
  );
}
