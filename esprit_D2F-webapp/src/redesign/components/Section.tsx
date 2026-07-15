import type { ReactNode } from "react";
import { Empty } from "antd";

export function Section({
  title,
  subtitle,
  children,
  extra,
  id,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  extra?: ReactNode;
  id?: string;
}) {
  return (
    <section className="rd-section" id={id}>
      <div className="rd-section-head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 className="rd-section-title">{title}</h2>
          {subtitle && <p className="rd-section-sub">{subtitle}</p>}
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function Card({
  title,
  subtitle,
  icon,
  iconColor,
  iconBg,
  extra,
  children,
  className = "",
  interactive = false,
  onClick,
  loading = false,
}: {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  iconColor?: string;
  iconBg?: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <div
      className={`rd-card ${interactive ? "interactive" : ""} ${className}`}
      onClick={onClick}
      role={interactive ? "button" : undefined}
    >
      {(title || extra) && (
        <div className="rd-card-head">
          <div>
            {title && (
              <div className="rd-card-title">
                {icon && (
                  <span className="rd-card-ic" style={{ color: iconColor, background: iconBg }}>
                    {icon}
                  </span>
                )}
                {title}
              </div>
            )}
            {subtitle && <div className="rd-card-sub">{subtitle}</div>}
          </div>
          {extra}
        </div>
      )}
      {loading ? <div className="cd-skel" style={{ height: 220, marginTop: 4 }} /> : children}
    </div>
  );
}

export { Empty };
