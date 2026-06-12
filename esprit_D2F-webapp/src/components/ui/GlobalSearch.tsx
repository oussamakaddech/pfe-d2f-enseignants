import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Input, Modal, Tag } from "antd";
import { BookOutlined, ReadOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import EnseignantService from "@/services/formation/EnseignantService";
import FormationService from "@/services/formation/FormationService";
import CompetenceService from "@/services/competence/CompetenceService";
import { useAuth } from "@/hooks/auth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import EmptyState from "@/components/common/EmptyState";
import Skeleton from "./Skeleton";
import styles from "./GlobalSearch.module.css";

const RECENT_KEY = "d2f.globalSearch.recent";
const MAX_PER_GROUP = 6;

interface SearchHit {
  id: string;
  title: string;
  meta?: string;
  path: string;
}

function normalize(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "");
}

/** Surligne la portion correspondante (insensible aux accents/casse). */
function Highlight({ text, query }: { readonly text: string; readonly query: string }) {
  const idx = normalize(text).indexOf(normalize(query));
  if (idx < 0 || !query) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function loadRecent(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  const next = [term, ...loadRecent().filter((t) => t !== term)].slice(0, 6);
  sessionStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

/**
 * Recherche globale (Ctrl+K / Cmd+K) — enseignants, formations, compétences.
 * Résultats groupés par catégorie, surlignage des correspondances,
 * recherches récentes en sessionStorage. Catégories filtrées selon le rôle.
 */
const GlobalSearch = memo(function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [queryText, setQueryText] = useState("");
  const query = useDebouncedValue(queryText.trim(), 300);
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = normalize(user?.role);
  const canSeeEnseignants = ["admin", "cup", "chefdepartement", "chef_departement"].includes(role);
  const canSeeCompetences = canSeeEnseignants;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, []);

  const enseignantsQuery = useQuery({
    queryKey: ["globalSearch", "enseignants"],
    queryFn: () => EnseignantService.getAllEnseignants(),
    enabled: open && canSeeEnseignants,
  });
  const formationsQuery = useQuery({
    queryKey: ["globalSearch", "formations"],
    queryFn: () => FormationService.getAllFormations(),
    enabled: open,
  });
  const competencesQuery = useQuery({
    queryKey: ["globalSearch", "competences"],
    queryFn: () => CompetenceService.competence.getAll(),
    enabled: open && canSeeCompetences,
  });

  const groups = useMemo((): { key: string; title: string; icon: ReactNode; hits: SearchHit[] }[] => {
    if (!query) return [];
    const q = normalize(query);
    const matches = (...fields: unknown[]) => fields.some((f) => normalize(f).includes(q));

    const enseignants: SearchHit[] = (enseignantsQuery.data ?? [])
      .filter((e) => matches(e.nom, e.prenom, e.email, `${e.prenom} ${e.nom}`))
      .slice(0, MAX_PER_GROUP)
      .map((e) => ({
        id: `e-${e.id}`,
        title: `${e.prenom ?? ""} ${e.nom ?? ""}`.trim() || (e.email ?? "Enseignant"),
        meta: [e.departement, e.unitePedagogique].filter(Boolean).join(" · "),
        path: `/home/competences/enseignant/${e.id}`,
      }));

    const formations: SearchHit[] = (formationsQuery.data ?? [])
      .filter((f) => matches(f.titreFormation, f.domaine, f.responsableName))
      .slice(0, MAX_PER_GROUP)
      .map((f) => ({
        id: `f-${f.idFormation}`,
        title: f.titreFormation ?? "Formation",
        meta: [f.typeFormation, f.etatFormation].filter(Boolean).join(" · "),
        path: `/home/ListeFormation/${f.idFormation}`,
      }));

    const competences: SearchHit[] = (competencesQuery.data ?? [])
      .filter((c) => matches(c.nom, c.nomCompetence, c.code, c.domaineNom))
      .slice(0, MAX_PER_GROUP)
      .map((c) => ({
        id: `c-${c.id}`,
        title: c.nomCompetence ?? c.nom ?? c.code ?? "Compétence",
        meta: c.domaineNom,
        path: "/home/competences",
      }));

    return [
      { key: "enseignants", title: "Enseignants", icon: <UserOutlined />, hits: enseignants },
      { key: "formations", title: "Formations", icon: <ReadOutlined />, hits: formations },
      { key: "competences", title: "Compétences", icon: <BookOutlined />, hits: competences },
    ].filter((g) => g.hits.length > 0);
  }, [query, enseignantsQuery.data, formationsQuery.data, competencesQuery.data]);

  const isSearching =
    Boolean(query) &&
    (enseignantsQuery.isLoading || formationsQuery.isLoading || competencesQuery.isLoading);

  const close = useCallback(() => {
    setOpen(false);
    setQueryText("");
  }, []);

  const go = (hit: SearchHit) => {
    pushRecent(query);
    close();
    navigate(hit.path);
  };

  const recent = loadRecent();

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)} aria-label="Recherche globale">
        <SearchOutlined />
        <span>Rechercher…</span>
        <kbd className={styles.kbd}>Ctrl K</kbd>
      </button>

      <Modal open={open} onCancel={close} footer={null} closable={false} width={640} destroyOnHidden>
        <Input
          autoFocus
          size="large"
          prefix={<SearchOutlined style={{ color: "var(--color-text-muted)" }} />}
          placeholder="Rechercher un enseignant, une formation, une compétence…"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          allowClear
          variant="borderless"
        />

        {!query && recent.length > 0 && (
          <div>
            <div className={styles.recentTitle}>Recherches récentes</div>
            <div className={styles.recentRow}>
              {recent.map((t) => (
                <Tag key={t} style={{ cursor: "pointer" }} onClick={() => setQueryText(t)}>
                  {t}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {isSearching && <Skeleton variant="text" lines={4} />}

        {query && !isSearching && groups.length === 0 && (
          <EmptyState
            compact
            icon={<SearchOutlined />}
            title="Aucun résultat"
            description={`Rien ne correspond à « ${query} ».`}
          />
        )}

        {groups.length > 0 && (
          <div className={styles.results}>
            {groups.map((g) => (
              <div key={g.key} className={styles.group}>
                <div className={styles.groupTitle}>{g.icon}{g.title}</div>
                {g.hits.map((hit) => (
                  <button key={hit.id} type="button" className={styles.item} onClick={() => go(hit)}>
                    <span className={styles.itemTitle}>
                      <Highlight text={hit.title} query={query} />
                    </span>
                    {hit.meta && <span className={styles.itemMeta}>{hit.meta}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
});

export default GlobalSearch;
