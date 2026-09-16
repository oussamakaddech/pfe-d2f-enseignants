import { memo, type ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

interface BadgeProps {
  readonly variant?: BadgeVariant;
  readonly children: ReactNode;
  /** Point lumineux clignotant (alertes : « À risque », etc.). */
  readonly pulse?: boolean;
  /** Afficher un point de statut (toujours présent si pulse). */
  readonly dot?: boolean;
  readonly className?: string;
}

/**
 * Pastille de statut universelle.
 *
 *   <Badge variant="success">Actif</Badge>
 *   <Badge variant="danger">Inactif 8 mois</Badge>
 *   <Badge variant="warning" pulse>À risque</Badge>
 */
const Badge = memo(function Badge({
  variant = "neutral",
  children,
  pulse = false,
  dot = false,
  className = "",
}: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {(dot || pulse) && (
        <span aria-hidden="true" className={`${styles.dot} ${pulse ? styles.pulse : ""}`} />
      )}
      {children}
    </span>
  );
});

export default Badge;
