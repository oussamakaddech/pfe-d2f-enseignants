import { type CSSProperties, type ReactNode } from "react";

interface GlassCardProps {
  readonly title?: ReactNode;
  readonly subtitle?: ReactNode;
  readonly icon?: ReactNode;
  readonly iconColor?: string;
  readonly iconBg?: string;
  readonly extra?: ReactNode;
  readonly children: ReactNode;
  readonly hoverable?: boolean;
  readonly style?: CSSProperties;
  readonly bodyStyle?: CSSProperties;
  readonly className?: string;
}

/** Carte en verre dépoli réutilisable (design system glassmorphism D2F). */
export default function GlassCard({
  title,
  subtitle,
  icon,
  iconColor = "#b51200",
  iconBg = "rgba(181,18,0,0.10)",
  extra,
  children,
  hoverable = false,
  style,
  bodyStyle,
  className = "",
}: GlassCardProps) {
  return (
    <div
      className={`glass-card ${hoverable ? "hoverable" : ""} ${className}`}
      style={style}
    >
      {(title || icon || extra) && (
        <div className="glass-card-head">
          {icon && (
            <span className="glass-card-icon" style={{ color: iconColor, background: iconBg }}>
              {icon}
            </span>
          )}
          {(title || subtitle) && (
            <div className="glass-card-titles">
              {title && <div className="glass-card-title">{title}</div>}
              {subtitle && <div className="glass-card-sub">{subtitle}</div>}
            </div>
          )}
          {extra && <div className="glass-card-extra">{extra}</div>}
        </div>
      )}
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}
