import { Card, Col, Row, Tag } from "antd";
import {
  ApartmentOutlined, BookOutlined, CalendarOutlined,
  CheckSquareOutlined, ClockCircleOutlined, TeamOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const STATUS_META = {
  ENREGISTRE: { label: "Enregistrée", color: "#6b7280", bg: "#f3f4f6" },
  PLANIFIE:   { label: "Planifiée",   color: "#2563eb", bg: "#eff6ff" },
  EN_COURS:   { label: "En cours",    color: "#d97706", bg: "#fffbeb" },
  ACHEVE:     { label: "Achevée",     color: "#059669", bg: "#ecfdf5" },
  ANNULE:     { label: "Annulée",     color: "#dc2626", bg: "#fef2f2" },
} as const;

type FormationStatus = keyof typeof STATUS_META;

interface Formation {
  etatFormation?: string;
  typeFormation?: string;
  titreFormation?: string;
  dateDebut?: string;
  dateFin?: string;
  up1?: { libelle?: string };
  departement1?: { libelle?: string };
  chargeHoraireGlobal?: number;
}

interface FormationHeaderCardProps {
  readonly formation: Formation;
  readonly seancesCount: number;
  readonly participantsCount: number;
  readonly globalTaux: number;
}

export function FormationHeaderCard({
  formation, seancesCount, participantsCount, globalTaux,
}: FormationHeaderCardProps) {
  const status = STATUS_META[(formation.etatFormation as FormationStatus)] ?? STATUS_META.ENREGISTRE;

  return (
    <Card className="fd-header-card" variant="borderless">
      <Row gutter={[24, 16]} align="middle">
        <Col xs={24} md={16}>
          <div className="fd-header-status-row">
            <span className="fd-header-status-pill" style={{ color: status.color, background: status.bg, borderColor: status.color + "33" }}>
              <span className="fd-status-dot" style={{ background: status.color }} />
              {status.label}
            </span>
            {formation.typeFormation && <Tag className="fd-header-tag">{formation.typeFormation}</Tag>}
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
              <span className="fd-header-meta-item"><ApartmentOutlined />{formation.up1.libelle}</span>
            )}
            {formation.departement1?.libelle && (
              <span className="fd-header-meta-item">{formation.departement1.libelle}</span>
            )}
            {(formation.chargeHoraireGlobal ?? 0) > 0 && (
              <span className="fd-header-meta-item"><ClockCircleOutlined />{formation.chargeHoraireGlobal}h</span>
            )}
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className="fd-header-stats">
            <div className="fd-header-stat">
              <div className="fd-header-stat-icon" style={{ background: "#eff6ff", color: "#2563eb" }}><CalendarOutlined /></div>
              <div><div className="fd-header-stat-value">{seancesCount}</div><div className="fd-header-stat-label">Séances</div></div>
            </div>
            <div className="fd-header-stat">
              <div className="fd-header-stat-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}><TeamOutlined /></div>
              <div><div className="fd-header-stat-value">{participantsCount}</div><div className="fd-header-stat-label">Enseignants</div></div>
            </div>
            <div className="fd-header-stat">
              <div className="fd-header-stat-icon" style={{ background: "#ecfdf5", color: "#10b981" }}><CheckSquareOutlined /></div>
              <div><div className="fd-header-stat-value">{globalTaux}%</div><div className="fd-header-stat-label">Taux présence</div></div>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
}
