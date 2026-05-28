import { memo } from "react";
import type { ReactNode } from "react";
import { Typography } from "antd";
import { brand, neutral, radius } from "@/styles/themes/tokens";
import s from "./D2FPageHeader.module.css";

const { Title, Text } = Typography;

interface D2FPageHeaderProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly subtitle?: string;
  readonly iconColor?: string;
  readonly actions?: ReactNode;
  readonly tags?: ReactNode;
  readonly divider?: boolean;
}

const D2FPageHeader = memo(function D2FPageHeader({
  icon,
  title,
  subtitle,
  iconColor = brand[500],
  actions,
  tags,
  divider = true,
}: D2FPageHeaderProps) {
  return (
    <div className={`${s.header} ${divider ? s.headerDivider : ""}`}>
      <div className={s.headerRow}>
        <div className={s.leftSection}>
          <div
            className={s.iconBox}
            style={{
              background: iconColor,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px ${iconColor}38`,
            }}
          >
            {icon}
          </div>
          <div className={s.titleSection}>
            <div className={s.titleRow}>
              <Title level={3} className={s.title} style={{ color: neutral[900] }}>
                {title}
              </Title>
              {tags}
            </div>
            {subtitle && (
              <Text className={s.subtitle} style={{ color: neutral[600] }}>
                {subtitle}
              </Text>
            )}
          </div>
        </div>
        {actions && (
          <div className={s.actionsSection}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
});

export default D2FPageHeader;




