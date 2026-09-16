import { memo } from "react";
import { Button } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, SaveOutlined } from "@ant-design/icons";

interface WizardNavFooterProps {
  activeStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

const WizardNavFooter = memo(function WizardNavFooter({ activeStep, totalSteps, onBack, onNext, onSubmit }: WizardNavFooterProps) {
  return (
    <div className="creation-nav-footer">
      <Button
        disabled={activeStep === 0}
        onClick={onBack}
        size="large"
        icon={<ArrowLeftOutlined />}
        className="creation-btn-back"
      >
        Retour
      </Button>
      <span className="creation-step-counter" aria-live="polite">
        {activeStep + 1} / {totalSteps}
      </span>
      {activeStep === totalSteps - 1 ? (
        <Button
          type="primary"
          size="large"
          onClick={onSubmit}
          icon={<SaveOutlined />}
          className="creation-btn-submit"
        >
          Finaliser &amp; Créer
        </Button>
      ) : (
        <Button
          type="primary"
          size="large"
          onClick={onNext}
          icon={<ArrowRightOutlined />}
          iconPosition="end"
          className="creation-btn-next"
        >
          Suivant
        </Button>
      )}
    </div>
  );
});

export default WizardNavFooter;
