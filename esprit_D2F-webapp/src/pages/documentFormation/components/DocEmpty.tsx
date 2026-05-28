import type { ReactNode } from "react";

interface DocEmptyProps {
  readonly variant?: "default" | "tree" | "preview";
  readonly icon: ReactNode;
  readonly title?: string;
  readonly text: string;
}

export function DocEmpty({ variant = "default", icon, title, text }: DocEmptyProps) {
  let variantClass = "";
  if (variant === "tree") variantClass = " doc-empty-icon--tree";
  else if (variant === "preview") variantClass = " doc-empty-icon--preview";
  return (
    <div className="doc-empty">
      <div className={`doc-empty-icon${variantClass}`}>{icon}</div>
      {title && <div className="doc-empty-title">{title}</div>}
      <div className="doc-empty-text">{text}</div>
    </div>
  );
}
