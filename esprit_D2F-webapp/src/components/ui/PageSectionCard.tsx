import { Card, Skeleton } from "antd";

interface PageSectionCardProps {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  noPadding?: boolean;
}

/**
 * Card de section standardisée pour toutes les pages.
 * - radius 16, shadow sm, border subtle
 * - Optionnel : titre + extra en header
 * - Optionnel : loading skeleton
 */
export default function PageSectionCard({
  title,
  extra,
  children,
  className = "",
  style,
  loading = false,
  noPadding = false,
}: PageSectionCardProps) {
  return (
    <Card
      className={`page-section-card ${className}`}
      style={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        ...style,
      }}
      styles={{
        body: {
          padding: noPadding ? 0 : 24,
        },
      }}
      title={title ? <span style={{ fontWeight: 600, fontSize: "var(--text-md)", color: "var(--text-main)" }}>{title}</span> : undefined}
      extra={extra}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        children
      )}
    </Card>
  );
}
