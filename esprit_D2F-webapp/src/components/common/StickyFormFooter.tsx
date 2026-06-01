import { memo } from "react";
import { Button, Space, Typography } from "antd";
import { neutral } from "@/styles/themes/tokens";

const { Text } = Typography;

interface StickyFormFooterProps {
  /** Bouton retour / annuler */
  readonly onBack?: () => void;
  readonly backLabel?: string;
  readonly backDisabled?: boolean;
  /** Bouton suivant */
  readonly onNext?: () => void;
  readonly nextLabel?: string;
  readonly nextDisabled?: boolean;
  /** Bouton submit final */
  readonly onSubmit?: () => void;
  readonly submitLabel?: string;
  readonly submitDisabled?: boolean;
  /** Indicateur d'étape */
  readonly stepIndicator?: string;
  /** Contenu personnalisé à droite */
  readonly actions?: React.ReactNode;
  readonly className?: string;
}

/**
 * Footer sticky standardisé pour les formulaires multi-étapes.
 * - Bordure supérieure subtile
 * - Boutons avec styles cohérents
 * - Indicateur d'étape optionnel
 */
const StickyFormFooter = memo(function StickyFormFooter({
  onBack,
  backLabel = "Retour",
  backDisabled = false,
  onNext,
  nextLabel = "Suivant →",
  nextDisabled = false,
  onSubmit,
  submitLabel = "Enregistrer",
  submitDisabled = false,
  stepIndicator,
  actions,
  className = "",
}: StickyFormFooterProps) {
  return (
    <div
      className={`sticky-form-footer ${className}`}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 36,
        paddingTop: 24,
        borderTop: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* Left: Back button */}
      <div>
        {onBack && (
          <Button
            onClick={onBack}
            disabled={backDisabled}
            size="large"
            style={{
              borderRadius: 10,
              minWidth: 110,
              fontWeight: 500,
              height: 42,
            }}
          >
            {backLabel}
          </Button>
        )}
      </div>

      {/* Center: Step indicator */}
      <div>
        {stepIndicator && (
          <Text style={{ color: neutral[500], fontSize: 13, fontWeight: 500 }}>
            {stepIndicator}
          </Text>
        )}
      </div>

      {/* Right: Actions */}
      <Space size={8}>
        {actions}
        {onNext && (
          <Button
            type="primary"
            onClick={onNext}
            disabled={nextDisabled}
            size="large"
            style={{
              minWidth: 130,
              borderRadius: 10,
              fontWeight: 600,
              height: 42,
              background: "linear-gradient(135deg, #B51200 0%, #9a0f00 100%)",
              borderColor: "#B51200",
              boxShadow: "0 4px 12px rgba(181, 18, 0, 0.3)",
            }}
          >
            {nextLabel}
          </Button>
        )}
        {onSubmit && (
          <Button
            type="primary"
            onClick={onSubmit}
            disabled={submitDisabled}
            size="large"
            style={{
              minWidth: 170,
              borderRadius: 10,
              fontWeight: 700,
              height: 42,
              fontSize: 15,
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              borderColor: "#059669",
              boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
            }}
          >
            {submitLabel}
          </Button>
        )}
      </Space>
    </div>
  );
});

export default StickyFormFooter;




