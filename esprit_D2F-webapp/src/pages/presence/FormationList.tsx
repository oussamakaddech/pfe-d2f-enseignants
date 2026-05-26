import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Layout,
  Row,
  Col,
  Card,
  Typography,
  Input,
  Select,
  DatePicker,
  Button,
  Empty,
  Tag,
  Tooltip,
  Skeleton,
} from "antd";
import {
  ReadOutlined,
  CalendarOutlined,
  ReloadOutlined,
  TeamOutlined,
  ScheduleOutlined,
  CheckSquareOutlined,
  ArrowRightOutlined,
  ApartmentOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useFormationsByAnimateur } from "@/hooks/presence/usePresence";
import { useFormationsAchevees } from "@/hooks/formation/useFormations";
import { ROLES } from "@/utils/constants/roles";
import { useAuth } from "@/hooks/auth/useAuth";
import { AppPageHeader } from "@/components/common";
import "@/styles/pages/formation-list.css";

const { Content } = Layout;
const { Text } = Typography;
const { Option } = Select;

const STATUS_META = {
  ENREGISTRE: { label: "Enregistrée", color: "#6b7280", bg: "#f3f4f6" },
  PLANIFIE:   { label: "Planifiée",   color: "#2563eb", bg: "#eff6ff" },
  EN_COURS:   { label: "En cours",    color: "#d97706", bg: "#fffbeb" },
  ACHEVE:     { label: "Achevée",     color: "#059669", bg: "#ecfdf5" },
  ANNULE:     { label: "Annulée",     color: "#dc2626", bg: "#fef2f2" },
};

const uniqueByMail = (list) => {
  const map = new Map();
  (list || []).forEach((p) => {
    const key = p?.mail || p?.id;
    if (key && !map.has(key)) map.set(key, p);
  });
  return Array.from(map.values());
};

const FormationList = () => {
  const { user } = useAuth();
  const [titleFilter, setTitleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [upFilter, setUpFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const navigate = useNavigate();

  const isD2F = user?.role === ROLES.D2F;
  const { data: achevees = [], isLoading: loadingAchevees } = useFormationsAchevees();
  const { data: parAnimateur = [], isLoading: loadingAnimateur } = useFormationsByAnimateur();
  const formations = isD2F ? achevees : parAnimateur;
  const loading = isD2F ? loadingAchevees : loadingAnimateur;

  // Extract dropdown options
  const depts = useMemo(() => {
    const m = {};
    formations.forEach((f) => { if (f.departement1) m[f.departement1.id] = f.departement1.libelle; });
    return Object.entries(m).map(([id, libelle]) => ({ id, libelle }));
  }, [formations]);

  const ups = useMemo(() => {
    const m = {};
    formations.forEach((f) => { if (f.up1) m[f.up1.id] = f.up1.libelle; });
    return Object.entries(m).map(([id, libelle]) => ({ id, libelle }));
  }, [formations]);

  const filtered = useMemo(() => {
    return formations.filter((f) => {
      if (titleFilter && !(f.titreFormation || "").toLowerCase().includes(titleFilter.toLowerCase())) return false;
      if (deptFilter && f.departement1?.id !== deptFilter) return false;
      if (upFilter && f.up1?.id !== upFilter) return false;
      if (statusFilter && f.etatFormation !== statusFilter) return false;
      if (startDate && dayjs(f.dateDebut).isBefore(startDate, "day")) return false;
      if (endDate && dayjs(f.dateFin).isAfter(endDate, "day")) return false;
      return true;
    });
  }, [formations, titleFilter, deptFilter, upFilter, statusFilter, startDate, endDate]);

  const resetFilters = () => {
    setTitleFilter("");
    setDeptFilter("");
    setUpFilter("");
    setStatusFilter("");
    setStartDate(null);
    setEndDate(null);
  };

  // Global stats
  const stats = useMemo(() => {
    const total = formations.length;
    const enCours = formations.filter((f) => f.etatFormation === "EN_COURS").length;
    const achevees = formations.filter((f) => f.etatFormation === "ACHEVE").length;
    const totalSeances = formations.reduce((sum, f) => sum + (f.seances?.length || 0), 0);
    return { total, enCours, achevees, totalSeances };
  }, [formations]);

  return (
    <Content className="fl-content">
      <AppPageHeader
        icon={<ReadOutlined />}
        title={user?.role === "D2F" ? "Toutes les Formations" : "Mes Formations à animer"}
        subtitle="Consultez vos formations et marquez la présence des enseignants à chaque séance"
      />

      {/* Stats banner */}
      <div className="fl-stats-banner">
        <div className="fl-stat-card fl-stat-total">
          <span className="fl-stat-icon"><ReadOutlined /></span>
          <div>
            <div className="fl-stat-value">{stats.total}</div>
            <div className="fl-stat-label">Formations</div>
          </div>
        </div>
        <div className="fl-stat-card fl-stat-en-cours">
          <span className="fl-stat-icon"><ScheduleOutlined /></span>
          <div>
            <div className="fl-stat-value">{stats.enCours}</div>
            <div className="fl-stat-label">En cours</div>
          </div>
        </div>
        <div className="fl-stat-card fl-stat-achevees">
          <span className="fl-stat-icon"><CheckSquareOutlined /></span>
          <div>
            <div className="fl-stat-value">{stats.achevees}</div>
            <div className="fl-stat-label">Achevées</div>
          </div>
        </div>
        <div className="fl-stat-card fl-stat-seances">
          <span className="fl-stat-icon"><CalendarOutlined /></span>
          <div>
            <div className="fl-stat-value">{stats.totalSeances}</div>
            <div className="fl-stat-label">Séances totales</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="fl-filter-card" variant="borderless">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Rechercher par titre"
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              allowClear
              prefix={<SearchOutlined style={{ color: "var(--neutral-400)" }} />}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Statut"
              value={statusFilter || undefined}
              onChange={(v) => setStatusFilter(v || "")}
              allowClear
              style={{ width: "100%" }}
            >
              {Object.entries(STATUS_META).map(([k, v]) => (
                <Option key={k} value={k}>{v.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Département"
              value={deptFilter || undefined}
              onChange={(v) => setDeptFilter(v || "")}
              allowClear
              style={{ width: "100%" }}
            >
              {depts.map((d) => <Option key={d.id} value={d.id}>{d.libelle}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="UP"
              value={upFilter || undefined}
              onChange={(v) => setUpFilter(v || "")}
              allowClear
              style={{ width: "100%" }}
            >
              {ups.map((u) => <Option key={u.id} value={u.id}>{u.libelle}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={3}>
            <DatePicker
              placeholder="Date début"
              value={startDate}
              onChange={(d) => setStartDate(d)}
              style={{ width: "100%" }}
            />
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Button icon={<ReloadOutlined />} onClick={resetFilters} style={{ width: "100%" }}>
              Réinitialiser
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Formation cards grid */}
      {loading && formations.length === 0 ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map((i) => (
            <Col xs={24} sm={12} md={8} lg={6} key={i}>
              <Card className="fl-card-skeleton">
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((f) => {
            const seancesCount = f.seances?.length || 0;
            const participants = uniqueByMail((f.seances || []).flatMap((s) => s.participants || []));
            const participantsCount = participants.length;
            const status = STATUS_META[f.etatFormation] || STATUS_META.ENREGISTRE;
            const goTo = () => navigate(`/home/animateur-formations/${f.idFormation}`);

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={f.idFormation}>
                <Card
                  className="fl-card"
                  onClick={goTo}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ouvrir : ${f.titreFormation}`}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") goTo(); }}
                >
                  {/* status pill */}
                  <div className="fl-card-status-row">
                    <span
                      className="fl-card-status-pill"
                      style={{ color: status.color, background: status.bg, borderColor: status.color + "33" }}
                    >
                      <span className="fl-card-status-dot" style={{ background: status.color }} />
                      {status.label}
                    </span>
                  </div>

                  {/* title */}
                  <Tooltip title={f.titreFormation}>
                    <div className="fl-card-title">{f.titreFormation}</div>
                  </Tooltip>

                  {/* date range */}
                  <div className="fl-card-meta">
                    <CalendarOutlined className="fl-card-calendar-icon" />
                    {dayjs(f.dateDebut).format("DD/MM/YYYY")} → {dayjs(f.dateFin).format("DD/MM/YYYY")}
                  </div>

                  {/* UP / Dept chips */}
                  {(f.up1 || f.departement1) && (
                    <div className="fl-card-chips">
                      {f.up1 && (
                        <Tag className="fl-card-chip">
                          <ApartmentOutlined style={{ marginRight: 4 }} />
                          {f.up1.libelle}
                        </Tag>
                      )}
                      {f.departement1 && (
                        <Tag className="fl-card-chip">{f.departement1.libelle}</Tag>
                      )}
                    </div>
                  )}

                  {/* stats row */}
                  <div className="fl-card-stats">
                    <div className="fl-card-stat">
                      <CalendarOutlined />
                      <span><strong>{seancesCount}</strong> séance{seancesCount > 1 ? "s" : ""}</span>
                    </div>
                    <div className="fl-card-stat">
                      <TeamOutlined />
                      <span><strong>{participantsCount}</strong> participant{participantsCount > 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <Button
                    type="primary"
                    block
                    className="fl-card-cta"
                    icon={<CheckSquareOutlined />}
                  >
                    Voir & marquer présences
                    <ArrowRightOutlined style={{ marginLeft: 6 }} />
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {!loading && filtered.length === 0 && (
        <Empty className="fl-empty" description="Aucune formation ne correspond à vos critères" />
      )}
    </Content>
  );
};

export default FormationList;








