import { useEffect, useState, useMemo } from "react";
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
  AppstoreOutlined,
} from "@ant-design/icons";
import moment from "moment";

import FormationWorkflowService from "@/services/formation/FormationWorkflowService";
import InscriptionService from "@/services/formation/InscriptionService";
import EnseignantService from "@/services/formation/EnseignantService";
import { getProfile } from "@/services/auth/AccountService";
import { ROLES } from "@/utils/constants/roles";

import "@/styles/pages/formation-cards.css";
import useAppNotification from "@/hooks/ui/useAppNotification";

const { Text } = Typography;
const { RangePicker } = DatePicker;

function getTypeClass(type) {
  if (!type) return "type-default";
  const t = String(type).toUpperCase().replaceAll(/\s/g, "_");
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
  const formationsList = Array.isArray(formations) ? formations : [];

  // 1️⃣ Profil utilisateur
  useEffect(() => {
    (async () => {
      try {
        const user = await getProfile();
        if (!user.role || user.role === ROLES.ADMIN) user.role = ROLES.D2F;
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
      if (currentUser.role === ROLES.CUP) {
        const identifier = currentUser.emailAddress || currentUser.email || currentUser.id;
        const enseignant = await EnseignantService.getEnseignantById(identifier);
        data = await FormationWorkflowService.getFormationsParUp(enseignant.up?.id);
      } else if (currentUser.role === ROLES.FORMATEUR) {
        const identifier = currentUser.emailAddress || currentUser.email || currentUser.id;
        data = await InscriptionService.getFormationsAccessibles(identifier);
      } else {
        // admin, D2F, Enseignant, etc.
        data = await FormationWorkflowService.getFormationsVisibles();
        // Fallback for admin-like roles to see everything if nothing is marked visible
        if ((currentUser.role === ROLES.D2F || currentUser.role === ROLES.ADMIN) && (!data || data.length === 0)) {
          data = await FormationWorkflowService.getAllFormationWorkflows();
        }
      }
      setFormations(Array.isArray(data) ? data : []);
    } catch {
      messageApi.error("Erreur de chargement des formations");
      setFormations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (idFormation) => {
    try {
      setLoading(true);
      const cur = formationsList.find((f) => f.idFormation === idFormation);
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

  const filtered = formationsList.filter((f) => {
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
  const types = Array.from(new Set(formationsList.map((f) => f.typeFormation)))
    .filter(Boolean)
    .map((t) => ({ label: t, value: t }));
  const ups = Array.from(new Set(formationsList.map((f) => f.up1?.libelle).filter(Boolean)))
    .map((u) => ({ label: u, value: u }));
  const depts = Array.from(new Set(formationsList.map((f) => f.departement1?.libelle).filter(Boolean)))
    .map((d) => ({ label: d, value: d }));

  // Stats
  const stats = useMemo(() => {
    const total = formationsList.length;
    const open = formationsList.filter(f => f.ouverte).length;
    const closed = total - open;
    const uniqueTypes = new Set(formationsList.map(f => f.typeFormation).filter(Boolean)).size;
    return { total, open, closed, uniqueTypes };
  }, [formationsList]);

  const isAdminLike = currentUser?.role === ROLES.D2F || currentUser?.role === ROLES.CUP;

  if (loading && formationsList.length === 0) {
    return <div className="fc-loading"><Spin size="large" /></div>;
  }
  if (!currentUser) {
    return <div className="fc-loading"><Spin size="large" /></div>;
  }
  if (!formationsList || formationsList.length === 0) {
    return <Empty description="Aucune formation disponible" style={{ marginTop: 80 }} />;
  }

  return (
    <div className="fc-page">
        {/* Hero Banner */}
        <div className="fc-hero">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h2 className="fc-hero-title">Liste des Formations</h2>
                <span className="fc-hero-badge">
                  {filtered.length}
                  <span className="fc-hero-badge-total">/ {formationsList.length}</span>
                </span>
              </div>
              <div className="fc-hero-subtitle">
                {(() => {
                  const fCount = filtered.length;
                  const tCount = formationsList.length;
                  if (fCount !== tCount) {
                    const p = fCount > 1 ? "s" : "";
                    return `${fCount} formation${p} affichée${p} sur ${tCount}`;
                  }
                  const p = tCount > 1 ? "s" : "";
                  return `${tCount} formation${p} disponible${p}`;
                })()}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchFormations}
                loading={loading}
                className="fc-btn-refresh"
              >
                Actualiser
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="fc-stats">
          <div className="fc-stat-card fc-stat-card--total">
            <div className="fc-stat-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>
              <AppstoreOutlined />
            </div>
            <div className="fc-stat-label">Total</div>
            <div className="fc-stat-value" style={{ color: "#10b981" }}>{stats.total}</div>
          </div>
          <div className="fc-stat-card fc-stat-card--open">
            <div className="fc-stat-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
              <UnlockOutlined />
            </div>
            <div className="fc-stat-label">Inscriptions ouvertes</div>
            <div className="fc-stat-value" style={{ color: "#2563eb" }}>{stats.open}</div>
          </div>
          <div className="fc-stat-card fc-stat-card--closed">
            <div className="fc-stat-icon" style={{ background: "#fef2f2", color: "#ef4444" }}>
              <LockOutlined />
            </div>
            <div className="fc-stat-label">Inscriptions fermées</div>
            <div className="fc-stat-value" style={{ color: "#ef4444" }}>{stats.closed}</div>
          </div>
          <div className="fc-stat-card fc-stat-card--types">
            <div className="fc-stat-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
              <BookOutlined />
            </div>
            <div className="fc-stat-label">Types de formation</div>
            <div className="fc-stat-value" style={{ color: "#7c3aed" }}>{stats.uniqueTypes}</div>
          </div>
        </div>

        {/* Barre de filtres */}
        <div className="fc-filter-bar">
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
          <div className="fc-filter-divider" />
          <Button icon={<ReloadOutlined />} onClick={handleResetFilters} className="fc-btn-reset">
            Réinitialiser
          </Button>
        </div>

        {/* Grille de cartes */}
        <Row gutter={[20, 20]}>
          {filtered.map((f) => {
            const isOpen = f.ouverte;
            return (
              <Col key={f.idFormation} xs={24} sm={12} md={8} lg={6}>
                <Card
                  className="formation-card"
                  styles={{ body: { padding: 0 } }}
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

                    {(currentUser.role === ROLES.FORMATEUR || currentUser.role === ROLES.ENSEIGNANT) &&
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
  );
}




