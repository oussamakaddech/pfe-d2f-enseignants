import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  Card,
  Typography,
  Tabs,
  Tag,
  Spin,
  Button,
  Row,
  Col,
  Table,
  Avatar,
  Empty,
  Tooltip,
  Progress,
  Skeleton,
} from "antd";
import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  CheckSquareOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import FormationWorkflowService from "@/services/formation/FormationWorkflowService";
import SeanceCard from "./SeanceCard";
import FormationEvaluationsTab from "./FormationEvaluationsTab";
import useAppNotification from "@/hooks/ui/useAppNotification";
import "@/styles/pages/formation-detail.css";

const { Text } = Typography;

const STATUS_META = {
  ENREGISTRE: { label: "Enregistrée", color: "#6b7280", bg: "#f3f4f6" },
  PLANIFIE:   { label: "Planifiée",   color: "#2563eb", bg: "#eff6ff" },
  EN_COURS:   { label: "En cours",    color: "#d97706", bg: "#fffbeb" },
  ACHEVE:     { label: "Achevée",     color: "#059669", bg: "#ecfdf5" },
  ANNULE:     { label: "Annulée",     color: "#dc2626", bg: "#fef2f2" },
};

const initialsOf = (nom, prenom) => {
  const a = (prenom || "").trim().charAt(0).toUpperCase();
  const b = (nom || "").trim().charAt(0).toUpperCase();
  return (a + b) || "?";
};

const colorOfName = (str) => {
  const palette = ["#B51200", "#0891b2", "#7c3aed", "#059669", "#d97706", "#2563eb", "#db2777"];
  let h = 0;
  for (let i = 0; i < (str || "").length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

const FormationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message: msgApi } = useAppNotification();
  const [formation, setFormation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [presencesBySeance, setPresencesBySeance] = useState({}); // { [seanceId]: PresenceDTO[] }
  const [aggLoading, setAggLoading] = useState(false);

  const fetchFormation = () => {
    setLoading(true);
    FormationWorkflowService.getFormationWorkflowById(id)
      .then((data) => setFormation(data))
      .catch(() => msgApi.error("Erreur lors du chargement de la formation"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFormation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Aggregate presences across all seances for the "Enseignants" tab
  const loadAggregatedPresences = async () => {
    if (!formation?.seances?.length) return;
    setAggLoading(true);
    try {
      const results = await Promise.all(
        formation.seances.map((s) =>
          FormationWorkflowService.getPresencesBySeance(s.idSeance).catch(() => [])
        )
      );
      const byId = {};
      formation.seances.forEach((s, idx) => {
        byId[s.idSeance] = (results[idx] || []).map((p) => ({
          ...p,
          presence: typeof p.present === "boolean" ? p.present : !!p.presence,
        }));
      });
      setPresencesBySeance(byId);
    } finally {
      setAggLoading(false);
    }
  };

  // Auto-load aggregated presences once formation is loaded
  useEffect(() => {
    if (formation?.seances?.length) loadAggregatedPresences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formation?.idFormation]);

  // Derived data
  const seancesCount = formation?.seances?.length || 0;

  const allParticipants = useMemo(() => {
    if (!formation?.seances) return [];
    const map = new Map();
    formation.seances.forEach((s) => {
      (s.participants || []).forEach((p) => {
        const key = p.mail || p.id;
        if (!key) return;
        if (!map.has(key)) {
          map.set(key, { ...p, seancesInscrites: 0 });
        }
        map.get(key).seancesInscrites += 1;
      });
    });
    return Array.from(map.values());
  }, [formation]);

  const participantsWithStats = useMemo(() => {
    return allParticipants.map((ens) => {
      let presentes = 0;
      let totalSeancesAvecPresence = 0;
      Object.values(presencesBySeance).forEach((presences) => {
        const p = presences.find(
          (x) => (x.enseignant?.mail && x.enseignant.mail === ens.mail) ||
                 (x.enseignant?.id && x.enseignant.id === ens.id)
        );
        if (p) {
          totalSeancesAvecPresence += 1;
          if (p.presence) presentes += 1;
        }
      });
      const taux = totalSeancesAvecPresence === 0 ? 0 : Math.round((presentes * 100) / totalSeancesAvecPresence);
      return { ...ens, presentes, totalSeancesAvecPresence, taux };
    });
  }, [allParticipants, presencesBySeance]);

  const globalStats = useMemo(() => {
    let total = 0, presents = 0;
    Object.values(presencesBySeance).forEach((presences) => {
      presences.forEach((p) => {
        total += 1;
        if (p.presence) presents += 1;
      });
    });
    const taux = total === 0 ? 0 : Math.round((presents * 100) / total);
    return { total, presents, absents: total - presents, taux };
  }, [presencesBySeance]);

  if (loading || !formation) {
    return (
      <div className="fd-container">
        <Skeleton active paragraph={{ rows: 4 }} />
        <Skeleton active paragraph={{ rows: 8 }} style={{ marginTop: 24 }} />
      </div>
    );
  }

  const status = STATUS_META[formation.etatFormation] || STATUS_META.ENREGISTRE;

  // Tabs
  const tabItems = [
    {
      key: "presences",
      label: (
        <span>
          <CheckCircleOutlined style={{ marginRight: 6 }} />
          Présences par séance
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8 }}>
          {formation.seances && formation.seances.length > 0 ? (
            formation.seances.map((s) => (
              <SeanceCard key={s.idSeance} seance={s} />
            ))
          ) : (
            <Empty description="Aucune séance pour cette formation" />
          )}
        </div>
      ),
    },
    {
      key: "enseignants",
      label: (
        <span>
          <TeamOutlined style={{ marginRight: 6 }} />
          Enseignants ({allParticipants.length})
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8 }}>
          <div className="fd-tab-toolbar">
            <Text type="secondary">
              {allParticipants.length} enseignant{allParticipants.length > 1 ? "s" : ""} participent à cette formation
            </Text>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={aggLoading}
              onClick={loadAggregatedPresences}
            >
              Recalculer les présences
            </Button>
          </div>
          <Table
            dataSource={participantsWithStats}
            rowKey={(r) => r.mail || r.id}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            loading={aggLoading}
            className="fd-enseignants-table"
            size="middle"
            locale={{ emptyText: "Aucun enseignant participant" }}
            columns={[
              {
                title: "Enseignant",
                key: "ens",
                render: (_, r) => {
                  const fullName = `${r.prenom || ""} ${r.nom || ""}`.trim();
                  return (
                    <div className="fd-ens-cell">
                      <Avatar
                        size={36}
                        style={{ background: colorOfName(fullName), fontWeight: 600, fontSize: 13 }}
                      >
                        {initialsOf(r.nom, r.prenom)}
                      </Avatar>
                      <div style={{ minWidth: 0 }}>
                        <div className="fd-ens-name">{fullName || "—"}</div>
                        <div className="fd-ens-mail">{r.mail || "—"}</div>
                      </div>
                    </div>
                  );
                },
                sorter: (a, b) =>
                  `${a.nom || ""} ${a.prenom || ""}`.localeCompare(`${b.nom || ""} ${b.prenom || ""}`),
              },
              {
                title: "Type",
                dataIndex: "type",
                key: "type",
                width: 120,
                render: (t) => {
                  if (!t) return <Text type="secondary">—</Text>;
                  const label = t === "P" ? "Permanent" : t === "V" ? "Vacataire" : t;
                  const cls = t === "P" ? "fd-type-tag p" : "fd-type-tag v";
                  return <span className={cls}>{label}</span>;
                },
                filters: [
                  { text: "Permanent", value: "P" },
                  { text: "Vacataire", value: "V" },
                ],
                onFilter: (v, r) => r.type === v,
              },
              {
                title: "Séances inscrites",
                dataIndex: "seancesInscrites",
                key: "seancesInscrites",
                width: 140,
                align: "center",
                render: (n) => (
                  <Tag color="blue" style={{ borderRadius: 999, fontWeight: 600 }}>
                    {n} / {seancesCount}
                  </Tag>
                ),
                sorter: (a, b) => a.seancesInscrites - b.seancesInscrites,
              },
              {
                title: "Présent",
                dataIndex: "presentes",
                key: "presentes",
                width: 110,
                align: "center",
                render: (n, r) => (
                  <Tooltip title={`${n} séance(s) marquée(s) présent / ${r.totalSeancesAvecPresence} séance(s) jouée(s)`}>
                    <Tag
                      color="green"
                      style={{ borderRadius: 999, fontWeight: 600 }}
                    >
                      {n} / {r.totalSeancesAvecPresence}
                    </Tag>
                  </Tooltip>
                ),
                sorter: (a, b) => a.presentes - b.presentes,
              },
              {
                title: "Taux",
                dataIndex: "taux",
                key: "taux",
                width: 160,
                render: (t) => {
                  let strokeColor = "#10b981";
                  if (t < 50) strokeColor = "#ef4444";
                  else if (t < 75) strokeColor = "#f59e0b";
                  return (
                    <Progress
                      percent={t}
                      size="small"
                      strokeColor={strokeColor}
                      format={(p) => `${p}%`}
                    />
                  );
                },
                sorter: (a, b) => a.taux - b.taux,
                defaultSortOrder: "descend",
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: "evaluations",
      label: (
        <span>
          <CommentOutlined style={{ marginRight: 6 }} />
          Évaluations
        </span>
      ),
      children: <FormationEvaluationsTab formationId={id} />,
    },
  ];

  return (
    <div className="fd-container">
      {/* Back button */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/home/animateur-formations")}
        className="fd-back-btn"
      >
        Retour aux formations
      </Button>

      {/* Premium header */}
      <Card className="fd-header-card" variant="borderless">
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} md={16}>
            <div className="fd-header-status-row">
              <span
                className="fd-header-status-pill"
                style={{ color: status.color, background: status.bg, borderColor: status.color + "33" }}
              >
                <span className="fd-status-dot" style={{ background: status.color }} />
                {status.label}
              </span>
              {formation.typeFormation && (
                <Tag className="fd-header-tag">{formation.typeFormation}</Tag>
              )}
            </div>

            <div className="fd-header-title">
              <BookOutlined style={{ marginRight: 10, color: "var(--primary-500)" }} />
              {formation.titreFormation}
            </div>

            <div className="fd-header-meta">
              <span className="fd-header-meta-item">
                <CalendarOutlined />
                Du {dayjs(formation.dateDebut).format("DD MMM YYYY")} au {dayjs(formation.dateFin).format("DD MMM YYYY")}
              </span>
              {formation.up1?.libelle && (
                <span className="fd-header-meta-item">
                  <ApartmentOutlined />
                  {formation.up1.libelle}
                </span>
              )}
              {formation.departement1?.libelle && (
                <span className="fd-header-meta-item">{formation.departement1.libelle}</span>
              )}
              {formation.chargeHoraireGlobal > 0 && (
                <span className="fd-header-meta-item">
                  <ClockCircleOutlined />
                  {formation.chargeHoraireGlobal}h
                </span>
              )}
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="fd-header-stats">
              <div className="fd-header-stat">
                <div className="fd-header-stat-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                  <CalendarOutlined />
                </div>
                <div>
                  <div className="fd-header-stat-value">{seancesCount}</div>
                  <div className="fd-header-stat-label">Séances</div>
                </div>
              </div>
              <div className="fd-header-stat">
                <div className="fd-header-stat-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                  <TeamOutlined />
                </div>
                <div>
                  <div className="fd-header-stat-value">{allParticipants.length}</div>
                  <div className="fd-header-stat-label">Enseignants</div>
                </div>
              </div>
              <div className="fd-header-stat">
                <div className="fd-header-stat-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>
                  <CheckSquareOutlined />
                </div>
                <div>
                  <div className="fd-header-stat-value">{globalStats.taux}%</div>
                  <div className="fd-header-stat-label">Taux présence</div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <Card className="fd-tabs-card" variant="borderless">
        <Tabs items={tabItems} className="fd-tabs" />
      </Card>
    </div>
  );
};

export default FormationDetail;








