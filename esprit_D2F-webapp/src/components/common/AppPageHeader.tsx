import { memo } from "react";
import type { ReactNode } from "react";
import { Typography } from "antd";

const { Title, Text } = Typography;

interface AppPageHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  iconColor?: string;
  actions?: ReactNode;
  tags?: ReactNode;
  /** Affiche un séparateur fin sous l'en-tête. Défaut : true */
  divider?: boolean;
}

/**
 * En-tête standardisé pour toutes les pages de l'application.
 * Remplace les titres ad-hoc, les breadcrumbs dupliqués et les emojis.
 *
 * Usage :
 *   <AppPageHeader
 *     icon={<BookOutlined />}
 *     title="Formations"
 *     subtitle="Catalogue et gestion des formations"
 *     actions={<Button type="primary">Nouvelle formation</Button>}
 *   />
 */
const AppPageHeader = memo(function AppPageHeader({
  icon,
  title,
  subtitle,
  iconColor = "var(--primary-500)",
  actions,
  tags,
  divider = true,
}: Readonly<AppPageHeaderProps>) {
  return (
    <div
      style={{
        marginBottom: "var(--page-header-gap)",
        paddingBottom: divider ? 18 : 0,
        borderBottom: divider ? "1px solid var(--page-header-border)" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {/* Left: icon + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div
            style={{
              flexShrink: 0,
              width: 46,
              height: 46,
              borderRadius: "var(--radius-md)",
              background: iconColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: "var(--text-on-dark)",
              boxShadow: "var(--page-header-icon-shadow)",
              position: "relative",
            }}
          >
            {icon}
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(255,255,255,0.12)",
                pointerEvents: "none",
              }}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Title
                level={3}
                style={{
                  margin: 0,
                  fontWeight: 700,
                  color: "var(--text-main)",
                  lineHeight: 1.2,
                  fontSize: 20,
                  letterSpacing: "-0.01em",
                }}
              >
                {title}
              </Title>
              {tags}
            </div>
            {subtitle && (
              <Text
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  lineHeight: "20px",
                  marginTop: 2,
                  display: "block",
                }}
              >
                {subtitle}
              </Text>
            )}
          </div>
        </div>

        {/* Right: actions */}
        {actions && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
});

export default AppPageHeader;




