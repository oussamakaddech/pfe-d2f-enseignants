import { Result, Button, Typography } from "antd";
import { neutral } from "@/styles/themes/tokens";

const { Paragraph } = Typography;

interface ErrorStateStandardProps {
  /** Titre de l'erreur */
  title?: string;
  /** Description détaillée */
  description?: string;
  /** Texte du bouton de retry */
  retryLabel?: string;
  /** Callback de retry */
  onRetry?: () => void;
  /** Statut Ant Design Result */
  status?: "error" | "warning" | "info" | "404" | "403" | "500";
  className?: string;
}

/**
 * Error state standardisé pour toutes les pages.
 * - Result Ant Design avec style cohérent
 * - Bouton retry optionnel
 * - Description détaillée optionnelle
 */
export default function ErrorStateStandard({
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
}




