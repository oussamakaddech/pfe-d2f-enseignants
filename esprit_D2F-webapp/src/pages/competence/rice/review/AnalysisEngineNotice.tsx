import { Alert } from 'antd';

export interface RiceAnalysisStats {
  referentielSource?: string;
  moteurIA?: { llm?: boolean; mode?: string; modele?: string | null };
}

/**
 * Dit d'où viennent les suggestions de l'analyse RICE : moteur exécuté sur le
 * serveur (aucun LLM, aucun service externe) et référentiel utilisé. Si le
 * référentiel officiel n'a pas pu être lu, les codes proposés viennent d'un
 * référentiel de secours et peuvent ne pas exister en base : on le signale au
 * lieu de les présenter comme fiables. Rien n'est affiché pour un backend qui
 * ne renseigne pas ces champs.
 */
export default function AnalysisEngineNotice({
  stats,
}: Readonly<{ stats?: RiceAnalysisStats | null }>) {
  if (!stats?.referentielSource) return null;

  const semantique = stats.moteurIA?.mode?.startsWith('semantique') ?? false;
  const modele = stats.moteurIA?.modele?.split('@')[0];
  const modeleSuffix = modele ? ` (${modele})` : '';
  const moteur = semantique
    ? `Rapprochement au référentiel par un modèle d'embeddings exécuté sur le serveur${modeleSuffix}.`
    :'Modèle sémantique non chargé : rapprochement par mots-clés uniquement.';

  if (stats.referentielSource !== 'competence-db') {
    return (
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message="Référentiel officiel indisponible : codes référentiels indicatifs"
        description={`Le service RICE n'a pas pu lire le référentiel en base. Les codes proposés viennent d'un référentiel de secours et peuvent ne pas exister. ${moteur}`}
      />
    );
  }

  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 12 }}
      message="Analyse locale : aucun LLM, aucun service externe"
      description={`${moteur} Les savoirs et enseignants proposés sont des suggestions à valider.`}
    />
  );
}
