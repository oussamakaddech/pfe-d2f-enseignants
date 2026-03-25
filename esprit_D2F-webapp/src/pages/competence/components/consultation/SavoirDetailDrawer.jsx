/* eslint-disable react/prop-types */
import { BookOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Divider, Drawer, Empty, Progress, Tag, Tooltip, Typography } from "antd";
import { formatNiveau, getNiveauStyle, getTypeBadge, getTypeLabel, ACCENT } from "./utils";

const { Paragraph } = Typography;

function Badge({ text, type = "muted" }) {
  const cls = ACCENT[type]?.badgeCls || "ctp-badge--muted";
  return <span className={`ctp-badge ${cls}`}>{text}</span>;
}

export default function SavoirDetailDrawer({ payload, open, onClose }) {
  if (!payload) return null;

  const mode = payload?.mode || "single";
  const single = payload?.savoir || null;
  const items = payload?.items || payload?.savoirs || [];

  if (mode === "single" && single) {
    const niveauStyle = getNiveauStyle(single.niveau);
    const codeStyle = {
      background: `${(niveauStyle.color || "#334155")}1A`,
      color: niveauStyle.color,
      border: `1px solid ${(niveauStyle.color || "#334155")}66`,
    };
    const titleText = single.nom || "Savoir";
    const shortTitle = titleText.length > 45 ? `${titleText.slice(0, 45)}...` : titleText;

    return (
      <Drawer
        title={
          <div className="ctp-drawer-header">
            <span className="ctp-drawer-code" style={codeStyle}>{single.code || "-"}</span>
            <Tooltip title={titleText}><span className="ctp-drawer-title">{shortTitle}</span></Tooltip>
          </div>
        }
        placement="right"
        width={460}
        open={open}
        onClose={onClose}
        footer={<Button block onClick={onClose}>Fermer</Button>}
      >
        <div className="ctp-drawer-body">
          <div className="ctp-drawer-section">
            <div className="ctp-drawer-section-title">Informations</div>
            <div className="ctp-drawer-row">
              <span className="ctp-drawer-key">Type</span>
              <span className="ctp-drawer-val"><Badge text={getTypeLabel(single.type)} type={getTypeBadge(single.type)} /></span>
            </div>
            <div className="ctp-drawer-row">
              <span className="ctp-drawer-key">Niveau</span>
              <span className="ctp-drawer-val"><span className="ctp-badge" style={{ color: niveauStyle.color, background: niveauStyle.bg, borderColor: niveauStyle.border }}>{formatNiveau(single.niveau)}</span></span>
            </div>
            <div className="ctp-drawer-row">
              <span className="ctp-drawer-key">Competence</span>
              <span className="ctp-drawer-val">{single.competenceNom} ({single.competenceCode || "-"})</span>
            </div>
            <div className="ctp-drawer-row">
              <span className="ctp-drawer-key">Appartenance</span>
              <span className="ctp-drawer-val">{single.isDirect ? <Tag color="blue">Lien direct</Tag> : (single.sousCompetenceNom || "-")}</span>
            </div>
            <div className="ctp-drawer-row">
              <span className="ctp-drawer-key">Domaine</span>
              <span className="ctp-drawer-val">{single.domaineNom || "-"}</span>
            </div>
          </div>

          <Divider orientation="left">Enseignants</Divider>

          <div className="ctp-drawer-section">
            <Alert type="info" showIcon icon={<InfoCircleOutlined />} message="Assignez des enseignants via le module RICE" style={{ fontSize: 12 }} />
            <div style={{ marginTop: 10 }}>
              <Progress percent={0} size="small" status="normal" strokeColor="#94a3b8" format={() => "Non assigne"} />
            </div>
          </div>

          {single.description ? (
            <>
              <Divider orientation="left">Description</Divider>
              <div className="ctp-drawer-section">
                <Paragraph style={{ fontSize: 12, color: "#475569", marginBottom: 0 }}>{single.description}</Paragraph>
              </div>
            </>
          ) : null}
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      title={<div className="ctp-drawer-header"><div className="ctp-drawer-header__icon"><BookOutlined /></div><span className="ctp-drawer-title">{payload?.title || "Detail savoirs"}</span></div>}
      placement="right"
      width={460}
      open={open}
      onClose={onClose}
      footer={<Button block onClick={onClose}>Fermer</Button>}
    >
      {items.length === 0 ? (
        <Empty description="Aucun savoir disponible" />
      ) : (
        <div className="ctp-savoir-list">
          {items.map((s) => (
            <div key={`${s.id}-${s.code}`} className="ctp-savoir-item">
              <div className="ctp-savoir-item__name">{s.nom}</div>
              <div className="ctp-savoir-item__code">{s.code}</div>
              <div className="ctp-savoir-item__path">
                {s.domaineNom} · {s.competenceNom}
                {s.sousCompetenceNom ? ` · ${s.sousCompetenceNom}` : " · direct"}
              </div>
              <div className="ctp-savoir-item__tags">
                <Badge text={getTypeLabel(s.type)} type={getTypeBadge(s.type)} />
                <span className="ctp-badge ctp-badge--muted">{formatNiveau(s.niveau)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
