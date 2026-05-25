import { Row, Col, Card, Statistic } from "antd";
import { neutral } from "@/styles/themes/tokens";

interface SummaryStatItem {
  /** Titre de la stat */
  readonly title: string;
  /** Valeur numérique */
  readonly value: number | string;
  /** Préfixe (icône) */
  readonly prefix?: React.ReactNode;
  /** Suffixe (unité) */
  readonly suffix?: string;
  /** Couleur de la valeur */
  readonly color?: string;
}

interface SummaryStatsRowProps {
  /** Liste des statistiques à afficher */
  readonly stats: SummaryStatItem[];
  /** Nombre de colonnes (défaut: auto basé sur stats.length) */
  readonly cols?: number;
  /** Gap entre les cartes */
  readonly gutter?: number | [number, number];
  readonly className?: string;
}

/**
 * Ligne de statistiques résumées standardisée.
 * - Cards avec radius 14, shadow subtil
 * - Hover animé
 * - Responsive
 */
export default function SummaryStatsRow({
  stats,
  cols,
  gutter = [16, 16],
  className = "",
}: SummaryStatsRowProps) {
  const colSpan = cols ? 24 / cols : Math.min(Math.floor(24 / stats.length), 8);

  return (
    <Row gutter={gutter} className={className} style={{ marginBottom: 20 }}>
      {stats.map((stat) => (
        <Col xs={24} sm={12} md={colSpan >= 8 ? 8 : colSpan * 3} lg={colSpan} key={stat.title}>
          <Card
            size="small"
            style={{
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.07)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              transition: "box-shadow 0.2s ease, transform 0.2s ease",
            }}
            hoverable
          >
            <Statistic
              title={stat.title}
              value={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              valueStyle={{
                color: stat.color || neutral[900],
                fontWeight: 700,
                fontSize: 24,
              }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}




