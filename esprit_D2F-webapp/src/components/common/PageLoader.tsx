import { memo } from "react";
import { Spin, Typography } from "antd";
import styles from "./PageLoader.module.css";

const { Text } = Typography;

interface PageLoaderProps {
  /** Texte optionnel sous le spinner */
  readonly tip?: string;
  /** Taille du spinner */
  readonly size?: "small" | "default" | "large";
  /** Hauteur minimale du conteneur */
  readonly minHeight?: number | string;
  readonly className?: string;
}

/**
 * Loader standardisé pour les pages entières.
 * - Centré verticalement et horizontalement
 * - Tip optionnel
 * - Hauteur minimale configurable
 */
const PageLoader = memo(function PageLoader({
  tip = "Chargement...",
  size = "large",
  minHeight = 400,
  className = "",
}: PageLoaderProps) {
  return (
    <div
      className={`${styles.loader} ${className}`}
      style={{ minHeight }}
    >
      <Spin size={size} />
      {tip && <Text className={styles.tip}>{tip}</Text>}
    </div>
  );
});

export default PageLoader;
