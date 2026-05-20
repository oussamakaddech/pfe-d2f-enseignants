import { Spin, Typography } from "antd";
import { neutral } from "@/styles/themes/tokens";

const { Text } = Typography;

interface PageLoaderProps {
  /** Texte optionnel sous le spinner */
  tip?: string;
  /** Taille du spinner */
  size?: "small" | "default" | "large";
  /** Hauteur minimale du conteneur */
  minHeight?: number | string;
  className?: string;
}

/**
 * Loader standardisé pour les pages entières.
 * - Centré verticalement et horizontalement
 * - Tip optionnel
 * - Hauteur minimale configurable
 */
export default function PageLoader({
  tip = "Chargement...",
  size = "large",
  minHeight = 400,
  className = "",
}: PageLoaderProps) {
  return (
    <div
      className={`page-loader ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight,
        gap: 16,
      }}
    >
      <Spin size={size} />
      {tip && (
        <Text style={{ fontSize: 13, color: neutral[500] }}>{tip}</Text>
      )}
    </div>
  );
}




