import { memo } from "react";
import type { ReactNode } from "react";
import { Typography } from "antd";
import s from "./AppPageHeader.module.css";

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
    <div className={`${s.header} ${divider ? s.headerDivider : ""}`}>
      <div className={s.headerRow}>
        {/* Left: icon + title */}
        <div className={s.leftSection}>
          <div
            className={s.iconBox}
            style={{ background: iconColor }}
          >
            {icon}
            <span aria-hidden="true" className={s.iconOverlay} />
          </div>

          <div className={s.titleSection}>
            <div className={s.titleRow}>
              <Title level={3} className={s.title}>
                {title}
              </Title>
              {tags}
            </div>
            {subtitle && (
              <Text className={s.subtitle}>
                {subtitle}
              </Text>
            )}
          </div>
        </div>

        {/* Right: actions */}
        {actions && (
          <div className={s.actionsSection}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
});

export default AppPageHeader;




