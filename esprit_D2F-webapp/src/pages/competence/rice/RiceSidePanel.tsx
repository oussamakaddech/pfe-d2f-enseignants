import { Alert, Button, Typography } from "antd";
import {
  ApiOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";

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

const STEP_ICONS = ["📤", "🤖", "🔍", "📊"];

export default function RiceSidePanel({
  ignoreEnseignants, enseignantsCount, currentDeptLabel,
  enseignantsLoading, enseignantsError, steps, currentStep,
  onReload, onContinueWithout,
}: Readonly<RiceSidePanelProps>) {

  const syncStatus = enseignantsLoading
    ? "Chargement…"
    : enseignantsError
    ? "Erreur"
    : "Active";

  const syncIcon = enseignantsLoading
    ? <LoadingOutlined style={{ color: "#f59e0b" }} />
    : enseignantsError
    ? <WarningOutlined style={{ color: "#ef4444" }} />
    : <CheckCircleOutlined style={{ color: "#10b981" }} />;

  return (
    <aside className="rice-workbench-aside">
      {/* ── Backend connector ─────────────────────────── */}
      <div className="rice-side-card ant-card ant-card-bordered">
        <div className="ant-card-head">
          <div className="ant-card-head-title">
            <ApiOutlined style={{ marginRight: 6, color: "#2563eb" }} />
            Connecteur backend
          </div>
        </div>
        <div className="ant-card-body">
          <div className="rice-side-stat-list">
            <div className="rice-side-stat">
              <Text type="secondary">
                <TeamOutlined style={{ marginRight: 4 }} />
                Enseignants
              </Text>
              <strong>{ignoreEnseignants ? 0 : enseignantsCount}</strong>
            </div>
            <div className="rice-side-stat">
              <Text type="secondary">Département</Text>
              <strong>{currentDeptLabel}</strong>
            </div>
            <div className="rice-side-stat">
              <Text type="secondary">Synchronisation</Text>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600, fontSize: 12 }}>
                {syncIcon} {syncStatus}
              </span>
            </div>
          </div>

          {enseignantsError && (
            <Alert
              type="warning"
              showIcon
              message={enseignantsError}
              className="rice-side-alert"
              style={{ marginTop: 8 }}
            />
          )}

          <div className="rice-side-actions">
            <Button block size="small" onClick={onReload} icon={<LoadingOutlined />}>
              Recharger
            </Button>
            <Button block size="small" type="text" onClick={onContinueWithout}>
              Continuer sans enseignants
            </Button>
          </div>
        </div>
      </div>

      {/* ── Step journey ──────────────────────────────── */}
      <div className="rice-side-card ant-card ant-card-bordered">
        <div className="ant-card-head">
          <div className="ant-card-head-title">Parcours</div>
        </div>
        <div className="ant-card-body">
          <div className="rice-journey-list">
            {steps.map((step, index) => {
              const isDone   = index < currentStep;
              const isActive = index === currentStep;
              return (
                <div
                  key={step.title}
                  className={`rice-journey-item${isActive ? " active" : ""}${isDone ? " done" : ""}`}
                >
                  <span className="rice-journey-index">
                    {isDone ? "✓" : STEP_ICONS[index] ?? index + 1}
                  </span>
                  <div>
                    <strong>{step.title}</strong>
                    <div>{step.description ?? (isActive ? "En cours" : isDone ? "Terminé" : "En attente")}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
