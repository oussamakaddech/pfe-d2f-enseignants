import { Progress } from "antd";
import { TeamOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";

interface PresenceStatsBannerProps {
  readonly total: number;
  readonly presents: number;
  readonly absents: number;
  readonly taux: number;
}

export function PresenceStatsBanner({ total, presents, absents, taux }: PresenceStatsBannerProps) {
  return (
    <div className="presence-stats-banner">
      <div className="presence-stats-left">
        <div className="presence-stat-card presence-stat-total">
          <span className="presence-stat-icon"><TeamOutlined /></span>
          <div>
            <div className="presence-stat-value">{total}</div>
            <div className="presence-stat-label">Inscrits</div>
          </div>
        </div>
        <div className="presence-stat-card presence-stat-present">
          <span className="presence-stat-icon"><CheckCircleOutlined /></span>
          <div>
            <div className="presence-stat-value">{presents}</div>
            <div className="presence-stat-label">Présents</div>
          </div>
        </div>
        <div className="presence-stat-card presence-stat-absent">
          <span className="presence-stat-icon"><CloseCircleOutlined /></span>
          <div>
            <div className="presence-stat-value">{absents}</div>
            <div className="presence-stat-label">Absents</div>
          </div>
        </div>
      </div>
      <div className="presence-stats-right">
        <div className="presence-taux-label">Taux de présence</div>
        <Progress
          type="circle"
          percent={taux}
          size={72}
          strokeColor={{ "0%": "#10b981", "100%": "#059669" }}
          format={(p) => <span style={{ fontWeight: 700, fontSize: 14 }}>{p}%</span>}
        />
      </div>
    </div>
  );
}
