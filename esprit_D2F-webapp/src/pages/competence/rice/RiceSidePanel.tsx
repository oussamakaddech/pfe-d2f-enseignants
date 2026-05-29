import { Alert, Button, Card, Typography } from "antd";

interface StepItem { title: string; description?: string; }

interface RiceSidePanelProps {
  ignoreEnseignants: boolean;
  enseignantsCount: number;
  currentDeptLabel: string;
  enseignantsLoading: boolean;
  enseignantsError: string | null;
  steps: StepItem[];
  currentStep: number;
  onReload: () => void;
  onContinueWithout: () => void;
}

const { Text } = Typography;

export default function RiceSidePanel({
  ignoreEnseignants, enseignantsCount, currentDeptLabel,
  enseignantsLoading, enseignantsError, steps, currentStep,
  onReload, onContinueWithout,
}: Readonly<RiceSidePanelProps>) {
  return (
    <aside className="rice-workbench-aside">
      <Card className="rice-side-card" bordered={false} title="Connecteur backend">
        <div className="rice-side-stat-list">
          <div className="rice-side-stat">
            <Text type="secondary">Enseignants chargés</Text>
            <strong>{ignoreEnseignants ? 0 : enseignantsCount}</strong>
          </div>
          <div className="rice-side-stat">
            <Text type="secondary">Département</Text>
            <strong>{currentDeptLabel}</strong>
          </div>
          <div className="rice-side-stat">
            <Text type="secondary">Synchronisation</Text>
            <strong>{enseignantsLoading ? "En cours" : "Active"}</strong>
          </div>
        </div>
        {enseignantsError && (
          <Alert type="warning" showIcon message={enseignantsError} className="rice-side-alert" />
        )}
        <div className="rice-side-actions">
          <Button block onClick={onReload}>Recharger le backend</Button>
          <Button block onClick={onContinueWithout}>Continuer sans enseignants</Button>
        </div>
      </Card>

      <Card className="rice-side-card" bordered={false} title="Parcours rapide">
        <div className="rice-journey-list">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className={`rice-journey-item${index === currentStep ? " active" : ""}${index < currentStep ? " done" : ""}`}
            >
              <span className="rice-journey-index">{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <div>{step.description || "Prêt"}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </aside>
  );
}
