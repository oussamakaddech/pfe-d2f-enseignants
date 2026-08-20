import type { RiskFactor } from '@/models/analyse/analyticsFeature';

/**
 * Formate le libellé d'un facteur. Le label et le scope sont deux champs
 * distincts fournis par l'API — jamais concaténés côté backend
 * (évite « périmètrepérimètre »).
 */
export function formatFactorLabel(factor: RiskFactor): string {
  return factor.nom;
}

/**
 * Périmètre affichable d'un facteur (deuxième ligne).
 * Utilise `scope_type` et `scope_label` du backend :
 * - `TEACHER` → « Périmètre : Enseignant »
 * - `DEPARTMENT` → « Périmètre : Département Réseaux »
 */
export function formatScopeLabel(factor: RiskFactor): string | null {
  if (!factor.scope_label) return null;
  if (factor.scope_type?.toUpperCase() === 'TEACHER') return 'Périmètre : Enseignant';
  return `Périmètre : ${factor.scope_label}`;
}

/**
 * Ligne d'un facteur du score de risque (page AnalyticsTeacherPage).
 *
 * Affichage normalisé : valeur brute de la métrique + contribution en
 * pourcentage (jamais > 100% — la contribution est bornée dans [0, 1] côté
 * backend, donc jamais d'affichage type « 300% / 3.000 »).
 * Le nom du facteur et son périmètre sont affichés sur deux lignes
 * distinctes (label + scope, deux champs séparés).
 */
export default function RiskFactorRow({ facteur }: Readonly<{ facteur: RiskFactor }>) {
  const contribPct = Math.min(
    100,
    Math.round(Math.abs(facteur.contribution_percent ?? facteur.contribution * 100)),
  );
  const isRisk = facteur.contribution >= 0;
  const rawValue =
    facteur.valeur_brute % 1 === 0 ? facteur.valeur_brute : facteur.valeur_brute.toFixed(2);
  const label = formatFactorLabel(facteur);
  const scopeLabel = formatScopeLabel(facteur);
  return (
    <div className="at-factor-row" data-testid={`factor-${facteur.code ?? facteur.nom}`}>
      <div>
        <div className="at-factor-name">
          {label}
        </div>
        {scopeLabel ? (
          <div className="at-factor-scope" style={{ fontSize: 11, color: 'var(--at-ink3)' }}>
            {scopeLabel}
          </div>
        ) : null}
        <div className="at-factor-bar-wrap">
          <div className="at-factor-bar">
            <div
              className={`at-factor-bar-fill ${isRisk ? 'is-risk' : 'is-safe'}`}
              style={{ width: `${contribPct}%` }}
            />
          </div>
          <span
            className="at-factor-weight"
            title="Valeur brute de la métrique (proba pour les facteurs ML, sinon valeur brute métrique)"
          >
            valeur {rawValue}
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className={`at-factor-contrib ${isRisk ? 'is-risk' : 'is-safe'}`}>{contribPct}%</div>
        <div style={{ fontSize: 10, color: 'var(--at-ink3)' }}>
          contribution {facteur.contribution_percent ?? Math.round(facteur.contribution * 100)}%
        </div>
      </div>
    </div>
  );
}
