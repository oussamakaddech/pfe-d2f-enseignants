import type { ReactNode } from 'react';

export function Section({
  title,
  subtitle,
  children,
  extra,
  id,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly extra?: ReactNode;
  readonly id?: string;
}) {
  return (
    <section className="rd-section" id={id}>
      <div
        className="rd-section-head"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
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
  className = '',
  interactive = false,
  onClick,
  loading = false,
}: {
  readonly title?: string;
  readonly subtitle?: string;
  readonly icon?: ReactNode;
  readonly iconColor?: string;
  readonly iconBg?: string;
  readonly extra?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly interactive?: boolean;
  readonly onClick?: () => void;
  readonly loading?: boolean;
}) {
  if (interactive) {
    return (
      <button
        className={`rd-card interactive ${className}`}
        onClick={onClick}
        tabIndex={0}
        style={{ textAlign: 'left', width: '100%', cursor: 'pointer' }}
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
      </button>
    );
  }
  return (
    <div className={`rd-card ${className}`}>
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
