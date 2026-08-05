import { Tooltip } from "antd";
import {
  ThunderboltOutlined, ApiOutlined, InfoCircleOutlined,
} from "@ant-design/icons";

type Mode = "ML" | "HEURISTIC_FALLBACK" | undefined;

interface Props {
  readonly modelMode: Mode;
  readonly modelVersion?: string | null;
  readonly size?: "small" | "default";
}

/**
 * Badge visuel compact qui indique si l'analyse repose sur un vrai modele
 * ML (artefact temporel entraine) ou sur le fallback heuristique.
 */
export default function ModelBadge({ modelMode, modelVersion, size = "default" }: Props) {
  const isML = modelMode === "ML";
  const tooltip = isML
    ? `Modele ML actif (${modelVersion ?? "version inconnue"}) - GradientBoosting temporel entraine sur le corpus DB + synthetique`
    : "Mode heuristique (fallback) - pas de modele entraine disponible";

  const cls = isML ? "at-badge at-badge-ml" : "at-badge at-badge-heur";
  const fontSize = size === "small" ? 11 : 12;
  const padding = size === "small" ? "2px 8px" : "4px 12px";

  return (
    <Tooltip title={tooltip}>
      <span className={cls} style={{ fontSize, padding }}>
        {isML ? <ThunderboltOutlined /> : <ApiOutlined />}
        {isML ? " ML actif" : " Heuristique"}
        {isML && modelVersion && (
          <span style={{ opacity: 0.75, marginLeft: 6 }}>
            <InfoCircleOutlined style={{ fontSize: "0.85em" }} />
          </span>
        )}
      </span>
    </Tooltip>
  );
}
