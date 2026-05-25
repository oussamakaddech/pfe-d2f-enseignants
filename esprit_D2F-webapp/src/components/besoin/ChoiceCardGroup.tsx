import type { ReactNode } from "react";
import { CheckCircleOutlined } from "@ant-design/icons";

export type ChoiceOption = { value: string; label: string; description?: string; icon?: ReactNode; accent?: string; accentBg?: string };

interface ChoiceCardGroupProps {
  options: ChoiceOption[];
  value: string;
  onChange: (val: string) => void;
  variant?: string;
}

export default function ChoiceCardGroup({ options, value, onChange, variant = "type" }: ChoiceCardGroupProps) {
  return (
    <div className={`bf-choice-grid bf-choice-grid--${variant}`}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            type="button"
            key={opt.value}
            className={`bf-choice${active ? " bf-choice--active" : ""}`}
            style={{
              "--choice-accent": opt.accent,
              "--choice-accent-bg": opt.accentBg,
            } as React.CSSProperties}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
          >
            {variant === "type" ? (
              <span className="bf-choice__icon">{opt.icon}</span>
            ) : (
              <span className="bf-choice__dot" aria-hidden="true" />
            )}
            <span className="bf-choice__body">
              <span className="bf-choice__title">{opt.label}</span>
              <span className="bf-choice__desc">{opt.description}</span>
            </span>
            {active && (
              <span className="bf-choice__check" aria-hidden="true">
                <CheckCircleOutlined />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
