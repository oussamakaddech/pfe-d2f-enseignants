import { memo } from "react";
import { Result, Button, Typography } from "antd";
import { neutral } from "@/styles/themes/tokens";

const { Paragraph } = Typography;

interface ErrorStateStandardProps {
  /** Titre de l'erreur */
  readonly title?: string;
  /** Description détaillée */
  readonly description?: string;
  /** Texte du bouton de retry */
  readonly retryLabel?: string;
  /** Callback de retry */
  readonly onRetry?: () => void;
  /** Statut Ant Design Result */
  readonly status?: "error" | "warning" | "info" | "404" | "403" | "500";
  readonly className?: string;
}

/**
 * Error state standardisé pour toutes les pages.
 * - Result Ant Design avec style cohérent
 * - Bouton retry optionnel
 * - Description détaillée optionnelle
 */
const ErrorStateStandard = memo(function ErrorStateStandard({
  title = "Une erreur est survenue",
  description,
  retryLabel = "Réessayer",
  onRetry,
  status = "error",
  className = "",
}: ErrorStateStandardProps) {
  return (
    <div
      className={`error-state-standard ${className}`}
      style={{
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <Result
        status={status}
        title={<span style={{ color: neutral[900], fontWeight: 600 }}>{title}</span>}
        subTitle={
          description ? (
            <Paragraph style={{ fontSize: 14, color: neutral[600], maxWidth: 480, margin: "0 auto" }}>
              {description}
            </Paragraph>
          ) : undefined
        }
        extra={
          onRetry ? (
            <Button
              onClick={onRetry}
              style={{ borderRadius: 8, fontWeight: 500 }}
            >
              {retryLabel}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
});

export default ErrorStateStandard;




