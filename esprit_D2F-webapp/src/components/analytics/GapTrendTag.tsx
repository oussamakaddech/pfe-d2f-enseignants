import { Tag, Tooltip } from 'antd';
import type { SkillGap } from '@/models/analyse/analyticsFeature';

/**
 * Tendance d'un gap, rendue telle que le backend la renvoie.
 *
 * Les deux tableaux de la page enseignant (« Gaps de compétences » et « Gaps
 * sur le périmètre ») affichaient un booléen `en_regression` qui ne testait
 * que `DECLINING`. Conséquence : un gap que le MODÈLE annonce en aggravation
 * (`WORSENING`) apparaissait « Stable » — l'information la plus utile de la
 * prédiction était perdue au mapping, et l'écran rassurait à tort.
 *
 * On distingue désormais ce qui est PRÉDIT par le modèle de ce qui est
 * OBSERVÉ dans l'historique des niveaux, et une tendance absente n'est jamais
 * présentée comme stable.
 */
const TREND_META: Record<string, { label: string; color?: string; hint: string }> = {
  WORSENING: {
    label: 'En aggravation',
    color: 'red',
    hint: "Aggravation PRÉDITE par le modèle : l'écart attendu à 3 mois dépasse l'écart actuel.",
  },
  DECLINING: {
    label: 'Régression',
    color: 'red',
    hint: "Régression OBSERVÉE dans l'historique des niveaux (moteur heuristique).",
  },
  IMPROVING: {
    label: 'En amélioration',
    color: 'green',
    hint: "Écart attendu à 3 mois inférieur à l'écart actuel.",
  },
  DECLARED_ML: {
    label: 'Prédit par le modèle',
    color: 'blue',
    hint: 'Prédiction du modèle sans écart notable par rapport à la situation actuelle.',
  },
  STABLE: {
    label: 'Stable',
    hint: "Aucune évolution notable dans l'historique des niveaux.",
  },
};

export default function GapTrendTag({ gap }: { readonly gap: SkillGap }) {
  const meta = gap.trend ? TREND_META[gap.trend] : undefined;
  if (meta) {
    return (
      <Tooltip title={meta.hint}>
        {meta.color ? <Tag color={meta.color}>{meta.label}</Tag> : <Tag>{meta.label}</Tag>}
      </Tooltip>
    );
  }
  // Valeur inconnue : on l'affiche brute plutôt que de l'interpréter.
  if (gap.trend) return <Tag>{gap.trend}</Tag>;
  // Aucune tendance fournie : ne jamais conclure « stable » à la place du backend.
  return (
    <Tooltip title="Le backend n'a pas fourni de tendance pour ce gap.">
      <Tag color="default">Non renseignée</Tag>
    </Tooltip>
  );
}
