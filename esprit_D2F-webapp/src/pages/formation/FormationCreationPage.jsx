import { useNavigate } from "react-router-dom";
import { Button, Typography, Breadcrumb, message } from "antd";
import { HomeOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import FormationWorkflowForm from "../FormationWorkflowForm";

const { Title } = Typography;

export default function FormationCreationPage() {
  const navigate = useNavigate();
  const [msgApi, msgCtx] = message.useMessage();

  const handleCreated = () => {
    msgApi.success("Formation créée avec succès !");
  };

  return (
    <>
      {msgCtx}
      <div style={{ padding: "16px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <Breadcrumb
              items={[
                {
                  title: (
                    <>
                      <HomeOutlined /> Accueil
                    </>
                  ),
                  onClick: () => navigate("/home"),
                  style: { cursor: "pointer" },
                },
                {
                  title: "Formations",
                  onClick: () => navigate("/home/Formation"),
                  style: { cursor: "pointer" },
                },
                { title: "Créer" },
              ]}
            />
            <Title level={4} style={{ marginTop: 8, marginBottom: 0 }}>
              🆕 Créer une Formation
            </Title>
          </div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/home/Formation")}
          >
            Retour
          </Button>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: "24px 32px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <FormationWorkflowForm onFormationCreated={handleCreated} />
        </div>
      </div>
    </>
  );
}