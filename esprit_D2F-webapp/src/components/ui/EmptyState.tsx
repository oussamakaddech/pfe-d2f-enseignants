/**
 * État vide contextualisé — alias du composant canonique de `common/`.
 * Toujours fournir un message métier (jamais un « Aucune donnée » générique) :
 *
 *   <EmptyState
 *     icon={<CalendarOutlined />}
 *     title="Aucune formation planifiée"
 *     description="Créez une nouvelle formation pour démarrer."
 *     action={{ label: "Créer une formation", onClick: goToCreate }}
 *   />
 */
export { default } from '@/components/common/EmptyState';
