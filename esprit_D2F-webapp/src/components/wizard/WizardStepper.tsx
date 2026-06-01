import { memo } from "react";
import { CheckOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";

interface Step {
  title: string;
  icon: ReactNode;
}

interface WizardStepperProps {
  steps: Step[];
  activeStep: number;
}

const WizardStepper = memo(function WizardStepper({ steps, activeStep }: WizardStepperProps) {
  return (
    <ol className="wf-stepper" aria-label="Étapes du formulaire">
      {steps.map((s, i) => (
        <li
          key={s.title}
          className={`wf-step${i === activeStep ? " active" : ""}${i < activeStep ? " done" : ""}`}
          aria-current={i === activeStep ? "step" : undefined}
        >
          <div className="wf-step-circle" aria-hidden="true">
            {i < activeStep ? <CheckOutlined /> : s.icon}
          </div>
          <span className="wf-step-label">{s.title}</span>
        </li>
      ))}
    </ol>
  );
});

export default WizardStepper;
