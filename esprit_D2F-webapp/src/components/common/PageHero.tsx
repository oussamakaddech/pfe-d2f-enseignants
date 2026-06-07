import { memo } from "react";
import type { ReactNode } from "react";
import s from "./PageHero.module.css";
import { neutral, semantic } from "@/styles/themes/tokens";

export type PageHeroTone = "brand" | "info" | "success" | "warning" | "danger" | "neutral";

interface PageHeroProps {
  readonly icon: ReactNode;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly tone?: PageHeroTone;
  readonly actions?: ReactNode;
  readonly badge?: ReactNode;
  /** Affichage compact (réduit le padding et la taille du titre). */
  readonly compact?: boolean;
  readonly className?: string;
}

const TONE_GRADIENT: Record<PageHeroTone, { from: string; to: string; ring: string }> = {
  brand:   { from: "#fff0ee", to: "#ffddd9", ring: "rgba(181, 18, 0, 0.12)" },
  info:    { from: "#eff6ff", to: "#dbeafe", ring: "rgba(59, 130, 246, 0.12)" },
  success: { from: "#ecfdf5", to: "#d1fae5", ring: "rgba(16, 185, 129, 0.16)" },
  warning: { from: "#fffbeb", to: "#fef3c7", ring: "rgba(245, 158, 11, 0.16)" },
  danger:  { from: "#fef2f2", to: "#fee2e2", ring: "rgba(239, 68, 68, 0.16)" },
  neutral: { from: neutral[50], to: neutral[100], ring: "rgba(15, 23, 42, 0.10)" },
};

const TONE_ACCENT: Record<PageHeroTone, string> = {
  brand:   "#B51200",
  info:    semantic.info,
  success: semantic.success,
  warning: semantic.warning,
  danger:  semantic.error,
  neutral: neutral[700],
};

/**
 * En-tête de page modernisé avec gradient, glow décoratif et badge optionnel.
 * Standardise l'apparence des pages d'inscription (InscriptionForm, DemandesList,
 * MesInscriptions, InscriptionsOverview, etc.) en remplacement des simples
 * `<AppPageHeader>` ou des `<div className="fc-hero">` ad-hoc.
 */
const PageHero = memo(function PageHero({
  icon,
  title,
  subtitle,
  tone = "brand",
  actions,
  badge,
  compact = false,
  className,
}: Readonly<PageHeroProps>) {
  const palette = TONE_GRADIENT[tone];
  const accent = TONE_ACCENT[tone];

  return (
    <div
      className={`${s.hero} ${compact ? s.compact : ""} ${className ?? ""}`}
      style={{
        background: `linear-gradient(135deg, #ffffff 0%, ${palette.from} 50%, ${palette.to} 100%)`,
        border: `1px solid ${palette.ring}`,
      }}
    >
      <div className={s.glowA} style={{ background: `radial-gradient(circle, ${palette.ring}, transparent 70%)` }} />
      <div className={s.glowB} style={{ background: `radial-gradient(circle, ${palette.ring}, transparent 70%)` }} />

      <div className={s.content}>
        <div className={s.left}>
          <div
            className={s.iconBox}
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              color: "#fff",
              boxShadow: `0 8px 20px ${palette.ring}`,
            }}
          >
            {icon}
            <span aria-hidden="true" className={s.iconOverlay} />
          </div>

          <div className={s.titleBlock}>
            <div className={s.titleRow}>
              <h2
                className={s.title}
                style={{
                  background: `linear-gradient(135deg, ${neutral[900]} 0%, ${accent} 90%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && <div className={s.subtitle}>{subtitle}</div>}
          </div>
        </div>

        {actions && <div className={s.actions}>{actions}</div>}
      </div>
    </div>
  );
});

export default PageHero;
