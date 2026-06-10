import { memo, type ReactNode } from "react";
import styles from "./InfoCard.module.css";

type InfoCardVariant = "default" | "compact" | "highlighted";

interface InfoCardProps {
  readonly title: string;
  readonly icon?: ReactNode;
  /** Pastille de statut affichée à droite du titre (ex. <Badge variant="success">Actif</Badge>). */
  readonly badge?: ReactNode;
  readonly children: ReactNode;
  /** Boutons d'action en pied de carte. */
  readonly footer?: ReactNode;
  readonly variant?: InfoCardVariant;
  readonly className?: string;
}

/**
 * Carte d'information (profil enseignant, détail formation…).
 * Header icône + titre + badge, corps libre, footer d'actions optionnel.
 */
const InfoCard = memo(function InfoCard({
  title,
  icon,
  badge,
  children,
  footer,
  variant = "default",
  className = "",
}: InfoCardProps) {
  const variantClass = [
    variant === "compact" ? styles.compact : "",
    variant === "highlighted" ? styles.highlighted : "",
  ].join(" ");

  return (
    <section className={`${styles.card} ${variantClass} ${className}`}>
      <header className={styles.header}>
        {icon && <span className={styles.iconBox} aria-hidden="true">{icon}</span>}
        <h3 className={styles.title}>{title}</h3>
        {badge}
      </header>
      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </section>
  );
});

export default InfoCard;
