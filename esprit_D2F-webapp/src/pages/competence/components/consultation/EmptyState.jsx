/* eslint-disable react/prop-types */
import {
  InboxOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

const EMPTY_CONFIGS = {
  noData: {
    icon: InboxOutlined,
    title: "Aucune donnee disponible",
    desc: "La structure de competences est vide.",
    action: null,
  },
  noResults: {
    icon: SearchOutlined,
    title: "Aucun resultat",
    desc: "Aucun savoir ne correspond a vos filtres actifs.",
    action: "Effacer les filtres",
  },
  noComp: {
    icon: UnorderedListOutlined,
    title: "Aucune competence",
    desc: "Ce domaine ne contient pas encore de competences.",
    action: null,
  },
};

export default function EmptyState({ type, onClear }) {
  const cfg = EMPTY_CONFIGS[type] || EMPTY_CONFIGS.noData;
  const Icon = cfg.icon;

  return (
    <div className="ctp-empty-state">
      <div className="ctp-empty-state__icon"><Icon /></div>
      <div className="ctp-empty-state__title">{cfg.title}</div>
      <div className="ctp-empty-state__desc">{cfg.desc}</div>
      {cfg.action && onClear && (
        <button
          className="ctp-empty-state__action"
          onClick={onClear}
        >
          {cfg.action}
        </button>
      )}
    </div>
  );
}
