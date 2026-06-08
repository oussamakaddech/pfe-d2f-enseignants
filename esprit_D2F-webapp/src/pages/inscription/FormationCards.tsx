import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Space,
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
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useFormationsVisibles, useAllFormations, useFormationsParUp, useUpdateInscriptionsOuvertes } from "@/hooks/formation/useFormations";
import { useProfile, useDemanderInscription, useFormationsAccessibles, useInscriptionsByEnseignant } from "@/hooks/formation/useFormationExtras";
import { useEnseignantById } from "@/hooks/enseignant/useEnseignants";
import { ROLES } from "@/utils/constants/roles";

import "@/styles/pages/formation-cards.css";
import { PageLoader, EmptyStateStandard, InscriptionStatGrid, PageHero } from "@/components/common";
import useAppNotification from "@/hooks/ui/useAppNotification";
import type { Id } from "@/models/common";
import type { Dayjs } from "dayjs";

interface FormationItem {
  idFormation?: Id;
  titreFormation?: string;
  typeFormation?: string;
  dateDebut?: string;
  dateFin?: string;
  ouverte?: boolean;
  inscriptionsOuvertes?: boolean;
  up1?: { libelle?: string };
  departement1?: { libelle?: string };
}

interface EnseignantData {
  up?: { id?: Id };
  [key: string]: unknown;
}

const { Text } = Typography;
const { RangePicker } = DatePicker;

function getTypeClass(type: string | undefined) {
  if (!type) return "type-default";
  const t = String(type).toUpperCase().replaceAll(/\s/g, "_");
  return `type-${t}`;
}

/**
 * P3 - F9 : calcule l'écart entre aujourd'hui et dateDebut.
 *  - retourne null si la formation n'est pas ouverte aux inscriptions
 *    ou si dateDebut est absente.
 *  - retourne un entier négatif si la formation a déjà démarré.
 *  - retourne 0 si elle démarre aujourd'hui.
 */
function daysUntilStart(dateDebut?: string): number | null {
  if (!dateDebut) return null;
  const start = dayjs(dateDebut);
  if (!start.isValid()) return null;
  return start.startOf("day").diff(dayjs().startOf("day"), "day");
}


export default function FormationCards() {
  const [requested, setRequested] = useState<Id[]>([]);
  const navigate = useNavigate();

  const { message: messageApi } = useAppNotification();

  const { data: profile, isLoading: profileLoading } = useProfile();
  const currentUser = useMemo(() => {
    if (!profile) return null;
    return { ...profile };
  }, [profile]);

  const identifier = currentUser?.emailAddress || currentUser?.email || currentUser?.id;
  const { data: enseignant } = useEnseignantById(currentUser?.role === ROLES.CUP ? identifier : undefined);
  const { data: parUp, refetch: refetchParUp } = useFormationsParUp(currentUser?.role === ROLES.CUP ? (enseignant as EnseignantData | undefined)?.up?.id : undefined);
  const { data: accessibles, refetch: refetchAccessibles } = useFormationsAccessibles(currentUser?.role === ROLES.ANIMATEUR ? identifier : undefined);
  const { data: visibles, isLoading: visiblesLoading, refetch: refetchVisibles } = useFormationsVisibles();
  const { data: all } = useAllFormations();
  const { mutateAsync: updateOuvertes } = useUpdateInscriptionsOuvertes();
  const { mutateAsync: demanderMutation } = useDemanderInscription();

  // État « déjà demandé » réel (serveur) : on récupère les inscriptions de
  // l'enseignant pour marquer les formations déjà demandées (persistant au reload).
  const isTeacherForData = currentUser?.role === ROLES.ENSEIGNANT || currentUser?.role === ROLES.ANIMATEUR;
  const { data: enseignantSelf } = useEnseignantById(isTeacherForData ? identifier : undefined);
  const { data: myInscriptions = [] } = useInscriptionsByEnseignant(
    (enseignantSelf as { id?: Id } | undefined)?.id,
  );
  const requestedServer = useMemo(() => {
    const s = new Set<string>();
    (myInscriptions as Array<{ formationId?: string; etat?: string }>).forEach((i) => {
      if (i.formationId && i.etat !== "REJECTED") s.add(String(i.formationId));
    });
    return s;
  }, [myInscriptions]);

  const formations = useMemo(() => {
    if (!currentUser) return [];
    let data: FormationItem[] = [];
    if (currentUser.role === ROLES.CUP) {
      data = (parUp as FormationItem[] | undefined) ?? [];
    } else if (currentUser.role === ROLES.ANIMATEUR) {
      data = (accessibles as FormationItem[] | undefined) ?? [];
    } else {
      data = (visibles as FormationItem[] | undefined) ?? [];
      if (currentUser.role === ROLES.ADMIN && data.length === 0) {
        data = (all as FormationItem[] | undefined) ?? [];
      }
    }
    const list = Array.isArray(data) ? data : [];
    // Enseignant / animateur : on n'affiche que les formations dont les
    // inscriptions sont ouvertes (les seules auxquelles ils peuvent s'inscrire).
    const isTeacher = currentUser.role === ROLES.ENSEIGNANT || currentUser.role === ROLES.ANIMATEUR;
    return isTeacher ? list.filter((f) => f.inscriptionsOuvertes === true) : list;
  }, [currentUser, parUp, accessibles, visibles, all]);

  const loading = profileLoading || visiblesLoading || (!currentUser);

  // filtres
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [upFilter, setUpFilter] = useState<string | undefined>();
  const [deptFilter, setDeptFilter] = useState<string | undefined>();
  const [ouverteFilter, setOuverteFilter] = useState<boolean | undefined>();
  const [dateRange, setDateRange] = useState<Dayjs[]>([]);
  const formationsList = Array.isArray(formations) ? formations : [];

  const handleToggle = async (idFormation: Id) => {
    try {
      const cur = formationsList.find((f) => f.idFormation === idFormation);
      if (!cur) throw new Error("Formation introuvable");
      const nextState = !cur.inscriptionsOuvertes;
      await updateOuvertes({ id: idFormation, ouvert: nextState });
      messageApi.success(nextState ? "Inscriptions ouvertes" : "Inscriptions fermées");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      messageApi.error(e.response?.data?.message || "Échec de la mise à jour");
    }
  };

  const handleDemande = async (idFormation: Id) => {
    try {
      await demanderMutation({ formationId: idFormation, enseignantId: identifier as Id });
      messageApi.success("Demande d'inscription envoyée !");
    } catch (err: unknown) {
      // On retire l'id de `requested` pour ne pas bloquer le bouton en cas
      // d'erreur réseau / chevauchement / quota : l'utilisateur doit pouvoir
      // retenter. La source de vérité reste `requestedServer` (re-fetch à
      // l'ouverture suivante via `useInscriptionsByEnseignant`).
      setRequested((prev) => prev.filter((id) => id !== idFormation));
      const e = err as { response?: { data?: { message?: string } } };
      messageApi.error(e.response?.data?.message || "Échec de la demande");
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
      const d = dayjs(f.dateDebut);
      if (d.isBefore(start, "day") || d.isAfter(end, "day")) return false;
    }
    return true;
  });

  // options filtres
  const types = Array.from(new Set(formationsList.map((f) => f.typeFormation)))
    .filter(Boolean)
    .map((t) => ({ label: t as string, value: t as string }));
  const ups = Array.from(new Set(formationsList.map((f) => f.up1?.libelle).filter(Boolean)))
    .map((u) => ({ label: u as string, value: u as string }));
  const depts = Array.from(new Set(formationsList.map((f) => f.departement1?.libelle).filter(Boolean)))
    .map((d) => ({ label: d as string, value: d as string }));

  // Stats
  const stats = useMemo(() => {
    const total = formationsList.length;
    const open = formationsList.filter((f) => f.inscriptionsOuvertes).length;
    const closed = total - open;
    const uniqueTypes = new Set(formationsList.map((f) => f.typeFormation).filter(Boolean)).size;
    const startingSoon = formationsList.filter((f) => {
      if (!f.inscriptionsOuvertes) return false;
      const d = daysUntilStart(f.dateDebut);
      return d !== null && d >= 0 && d <= 7;
    }).length;
    return { total, open, closed, uniqueTypes, startingSoon };
  }, [formationsList]);

  const isAdminLike = currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.CUP;
  const isTeacherView = currentUser?.role === ROLES.ENSEIGNANT || currentUser?.role === ROLES.ANIMATEUR;

  if (loading && formationsList.length === 0) {
    return <PageLoader tip="Chargement des formations..." />;
  }
  if (!currentUser) {
    return <PageLoader tip="Chargement de votre profil..." />;
  }
  if (!formationsList || formationsList.length === 0) {
    return (
      <EmptyStateStandard
        title={isTeacherView ? "Aucune formation ouverte à l'inscription" : "Aucune formation disponible"}
        description={
          isTeacherView
            ? "Aucune formation n'est ouverte aux inscriptions pour le moment. Revenez plus tard."
            : "Le catalogue est vide. Créez une formation pour commencer."
        }
      />
    );
  }

  return (
    <div className="fc-page">
        {/* Hero Banner — unifié via PageHero (P2) */}
        <PageHero
          icon={<AppstoreOutlined />}
          tone="success"
          title="Liste des Formations"
          badge={
            <span className="fc-hero-badge">
              {filtered.length}
              <span className="fc-hero-badge-total">/ {formationsList.length}</span>
            </span>
          }
          subtitle={(() => {
            const fCount = filtered.length;
            const tCount = formationsList.length;
            const suffix = isTeacherView ? " ouverte%s à l'inscription" : " disponible%s";
            if (fCount !== tCount) {
              const p = fCount > 1 ? "s" : "";
              return `${fCount} formation${p} affichée${p} sur ${tCount}`;
            }
            const p = tCount > 1 ? "s" : "";
            return `${tCount} formation${p}${suffix.replaceAll("%s", p)}`;
          })()}
          actions={
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                if (currentUser?.role === ROLES.CUP) refetchParUp();
                else if (currentUser?.role === ROLES.ANIMATEUR) refetchAccessibles();
                else refetchVisibles();
              }}
              loading={loading}
              className="fc-btn-refresh"
            >
              Actualiser
            </Button>
          }
        />

        {/* Stats — grille unifiée via InscriptionStatGrid (P2) */}
        <InscriptionStatGrid
          stats={[
            {
              icon: <AppstoreOutlined />,
              label: isTeacherView ? "Formations disponibles" : "Total",
              value: stats.total,
              tone: "brand",
              loading,
            },
            ...(isTeacherView
              ? []
              : [
                  { icon: <UnlockOutlined />, label: "Inscriptions ouvertes", value: stats.open,    tone: "success" as const, loading },
                  { icon: <LockOutlined />,   label: "Inscriptions fermées",  value: stats.closed,  tone: "danger"  as const, loading },
                ]),
            { icon: <BookOutlined />, label: "Types de formation", value: stats.uniqueTypes, tone: "info", loading },
            ...(stats.startingSoon > 0
              ? [{ icon: <ThunderboltOutlined />, label: "Démarrage < 7 jours", value: stats.startingSoon, tone: "warning" as const, loading }]
              : []),
          ]}
        />

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
          <RangePicker
            value={dateRange.length === 2 ? [dateRange[0], dateRange[1]] : null}
            onChange={(dates) => setDateRange(dates?.filter((d): d is Dayjs => d !== null) ?? [])}
          />
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
                          {f.dateDebut ? new Date(f.dateDebut).toLocaleDateString("fr-FR") : "—"} →{" "}
                          {f.dateFin ? new Date(f.dateFin).toLocaleDateString("fr-FR") : "—"}
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
                      {(() => {
                        const d = daysUntilStart(f.dateDebut);
                        if (d === null || !f.inscriptionsOuvertes || d > 7) return null;
                        const label = d === 0
                          ? "Démarre aujourd'hui"
                          : d < 0
                            ? `Démarré il y a ${-d} j`
                            : `Démarre dans ${d} j`;
                        return (
                          <Tag
                            icon={<ThunderboltOutlined />}
                            color="warning"
                            className="card-soon-tag"
                            style={{ fontWeight: 600 }}
                          >
                            {label}
                          </Tag>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="card-actions">
                    <Space size={8} wrap>
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/home/ListeFormation/${f.idFormation}`)}
                      >
                        Détails
                      </Button>

                      {(currentUser.role === ROLES.ANIMATEUR || currentUser.role === ROLES.ENSEIGNANT) &&
                        f.inscriptionsOuvertes &&
                        (f.idFormation != null && (requested.includes(f.idFormation) || requestedServer.has(String(f.idFormation))) ? (
                          <Button size="small" disabled icon={<CheckCircleOutlined />}>
                            Demande envoyée
                          </Button>
                        ) : (
                          <Button
                            type="primary"
                            size="small"
                            icon={<UserAddOutlined />}
                            onClick={() => f.idFormation != null && handleDemande(f.idFormation)}
                          >
                            S'inscrire
                          </Button>
                        ))}

                      {isAdminLike && (
                        <Button
                          size="small"
                          danger={f.inscriptionsOuvertes}
                          icon={f.inscriptionsOuvertes ? <LockOutlined /> : <UnlockOutlined />}
                          onClick={() => f.idFormation != null && handleToggle(f.idFormation)}
                        >
                          {f.inscriptionsOuvertes ? "Fermer" : "Ouvrir"}
                        </Button>
                      )}

                      {isAdminLike && (
                        <Button
                          size="small"
                          icon={<TeamOutlined />}
                          onClick={() => navigate(`/home/ListeFormation/${f.idFormation}/demandes`)}
                        >
                          Demandes
                        </Button>
                      )}
                    </Space>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>

        {filtered.length === 0 && (
          <EmptyStateStandard
            title="Aucun résultat"
            description="Aucune formation ne correspond aux filtres appliqués. Réinitialisez-les pour voir toutes les formations."
          />
        )}
    </div>
  );
}




