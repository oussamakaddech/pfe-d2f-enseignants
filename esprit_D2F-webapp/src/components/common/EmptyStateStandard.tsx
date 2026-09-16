import { memo } from "react";
import { Empty, Button, Typography } from "antd";
import { neutral } from "@/styles/themes/tokens";

const { Text, Paragraph } = Typography;

interface EmptyStateStandardProps {
  /** Titre principal */
  readonly title?: string;
  /** Description */
  readonly description?: string;
  /** Icône personnalisée */
  readonly image?: React.ReactNode;
  /** Texte du bouton d'action */
  readonly actionLabel?: string;
  /** Icône du bouton d'action */
  readonly actionIcon?: React.ReactNode;
  /** Callback du bouton d'action */
  readonly onAction?: () => void;
  /** Type de bouton */
  readonly actionType?: "primary" | "default" | "dashed";
  readonly className?: string;
}

/**
 * Empty state standardisé pour toutes les pages.
 * - Image simple Ant Design
 * - Titre + description
 * - Bouton d'action optionnel
 */
const EmptyStateStandard = memo(function EmptyStateStandard({
  title = "Aucune donnée",
  description,
  image,
  actionLabel,
  actionIcon,
  onAction,
  actionType = "primary",
  className = "",
}: EmptyStateStandardProps) {
  return (
    <div
      className={`empty-state-standard ${className}`}
      style={{
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <Empty
        image={image || Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <Text strong style={{ fontSize: 15, color: neutral[800], display: "block", marginBottom: 4 }}>
              {title}
            </Text>
            {description && (
              <Paragraph style={{ fontSize: 13, color: neutral[500], margin: 0 }}>
                {description}
              </Paragraph>
            )}
          </div>
        }
      >
        {actionLabel && onAction && (
          <Button
            type={actionType}
            icon={actionIcon}
            onClick={onAction}
            style={{ borderRadius: 8, fontWeight: 500 }}
          >
            {actionLabel}
          </Button>
        )}
      </Empty>
    </div>
  );
});

export default EmptyStateStandard;




