import { memo } from "react";
import type { ReactNode } from "react";

interface SectionLabelProps {
  icon: ReactNode;
  title: string;
  hint?: string;
}

const SectionLabel = memo(function SectionLabel({ icon, title, hint }: SectionLabelProps) {
  return (
    <div className="bf-form-section">
      <div className="bf-form-section__icon">{icon}</div>
      <div className="bf-form-section__body">
        <div className="bf-form-section__title">{title}</div>
        {hint && <div className="bf-form-section__hint">{hint}</div>}
      </div>
    </div>
  );
});

export default SectionLabel;
