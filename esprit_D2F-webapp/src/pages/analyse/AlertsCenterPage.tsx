import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Space, Alert } from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import { useAlertsSummary, useBulkUpdateAlerts } from "@/hooks/analyse/useAnalysePredictive";
import PriorityAlertsPanel from "@/components/charts/PriorityAlertsPanel";
import { AppPageHeader, shadow } from "@/components/common";

const cardStyle = {
  background: "#fff",
  boxShadow: shadow.sm,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.07)",
};

export default function AlertsCenterPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useAlertsSummary();
  const bulkUpdate = useBulkUpdateAlerts();

  const handleBulkUpdate = useCallback(
    async (alertIds: number[], statut: string, commentaire?: string) => {
      await bulkUpdate.mutateAsync({ alert_ids: alertIds, statut, commentaire });
    },
    [bulkUpdate],
  );

  return (
    <div>
      <AppPageHeader
        icon={<span role="img" aria-label="alertes">🚨</span>}
        title="Centre d'alertes"
        subtitle="Consultation et traitement des alertes prioritaires"
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
              Rafraîchir
            </Button>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/home")}>
              Retour
            </Button>
          </Space>
        }
      />

      {isError && (
        <Alert
          message="Erreur de chargement"
          description="Impossible de charger les alertes. Veuillez réessayer."
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16, borderRadius: 8 }}
          action={
            <Button size="small" onClick={() => refetch()}>
              Réessayer
            </Button>
          }
        />
      )}

      <div style={{ ...cardStyle, padding: 0 }}>
        <PriorityAlertsPanel
          data={data}
          loading={isLoading}
          onBulkUpdate={handleBulkUpdate}
        />
      </div>
    </div>
  );
}
