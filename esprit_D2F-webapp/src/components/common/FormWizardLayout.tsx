import { Steps, Card } from "antd";
import { neutral, radius, shadow } from "@/styles/themes/tokens";

interface FormWizardLayoutProps {
  /** Étape active */
  currentStep: number;
  /** Définition des étapes */
  steps: Array<{ title: string; icon?: React.ReactNode }>;
  /** Contenu de l'étape active */
  children: React.ReactNode;
  /** Footer (boutons navigation) */
  footer?: React.ReactNode;
  /** Classe CSS */
  className?: string;
}

/**
 * Layout de formulaire wizard standardisé.
 * - Steps en haut avec fond gradient
 * - Card pour le contenu
 * - Footer pour la navigation
 */
export default function FormWizardLayout({
  currentStep,
  steps,
  children,
  footer,
  className = "",
}: FormWizardLayoutProps) {
  return (
    <div className={`form-wizard-layout ${className}`}>
      {/* Steps */}
      <div
        style={{
          marginBottom: 28,
          padding: "18px 24px",
          background: "linear-gradient(135deg, #f7fafc 0%, #f0f4f8 100%)",
          borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <Steps
          current={currentStep}
          items={steps.map((s) => ({ title: s.title, icon: s.icon }))}
        />
      </div>

      {/* Content */}
      <Card
        style={{
          borderRadius: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          border: "1px solid rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
        styles={{ body: { padding: "28px 32px" } }}
      >
        {children}

        {/* Footer */}
        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 36,
              paddingTop: 24,
              borderTop: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
}




