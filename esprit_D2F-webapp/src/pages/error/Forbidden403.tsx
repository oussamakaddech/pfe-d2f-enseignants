import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";

/** Page 403 dédiée (audit DSI) — affichée quand un utilisateur authentifié
 *  tente d'accéder à une route interdite à son rôle. */
export default function Forbidden403() {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="403"
      subTitle="Désolé, vous n'avez pas les droits nécessaires pour accéder à cette page."
      extra={
        <Button type="primary" onClick={() => navigate("/home/profile")}>
          Retour à mon profil
        </Button>
      }
    />
  );
}
