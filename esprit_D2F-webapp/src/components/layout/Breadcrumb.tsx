import { memo, useMemo } from "react";
import { Breadcrumb as AntBreadcrumb } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";

import { ROUTE_LABELS } from "./AppLayoutConstants";

/**
 * Fil d'Ariane auto-généré depuis la route React Router.
 * Segments intermédiaires cliquables, page courante en gras non cliquable.
 * Affiché sur TOUTES les pages via AppLayout (modules imbriqués profonds).
 */
const Breadcrumb = memo(function Breadcrumb() {
  const { pathname } = useLocation();

  const items = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((seg, i) => {
      const path = "/" + segments.slice(0, i + 1).join("/");
      const label = ROUTE_LABELS[seg] ?? decodeURIComponent(seg);
      const isLast = i === segments.length - 1;
      return {
        title: isLast ? (
          <span style={{ color: "var(--breadcrumb-active)", fontWeight: 600, fontSize: 13 }}>{label}</span>
        ) : (
          <Link to={path} style={{ color: "var(--breadcrumb-link)", fontSize: 13 }}>{label}</Link>
        ),
      };
    });
  }, [pathname]);

  return (
    <nav aria-label="Fil d'Ariane" style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <HomeOutlined style={{ color: "var(--neutral-300)", fontSize: 13 }} />
      <AntBreadcrumb items={items} separator={<span style={{ color: "var(--neutral-300)" }}>/</span>} />
    </nav>
  );
});

export default Breadcrumb;
