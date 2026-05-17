import { useLocation, useNavigate, Link } from "react-router-dom";
import { Tag, Breadcrumb, Button } from "antd";
import useAppNotification from "../../hooks/useAppNotification";
import {
  BookOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  AppstoreOutlined,
  PlusCircleOutlined,
  AppstoreAddOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  SafetyCertificateOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import FormationWorkflowForm from "../FormationWorkflowForm";
import "./FormationCreationPage.css";

export default function FormationCreationPage() {
  const { message: msgApi } = useAppNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const besoinInfo = location.state?.besoinInfo || null;

  const handleCreated = () => {
    msgApi.success("Formation créée avec succès !");
  };

  return (
    <div className="creation-page">
      {/* ── Hero header (full width, gradient background, decoration) ── */}
      <section className="creation-hero" aria-labelledby="creation-hero-title">
        <div className="creation-hero-decoration" aria-hidden="true" />
        <div className="creation-hero-decoration creation-hero-decoration-2" aria-hidden="true" />

        <div className="creation-hero-inner">
          <Breadcrumb
            className="creation-breadcrumb"
            items={[
              {
                title: (
                  <Link to="/home"><HomeOutlined /> Accueil</Link>
                ),
              },
              {
                title: (
                  <Link to="/home/Formation"><AppstoreOutlined /> Formations</Link>
                ),
              },
              {
                title: (
                  <span className="creation-breadcrumb-current">
                    <PlusCircleOutlined /> Nouvelle formation
                  </span>
                ),
              },
            ]}
          />

          <div className="creation-hero-row">
            <div className="creation-hero-left">
              <div className="creation-hero-icon">
                <BookOutlined />
              </div>
              <div className="creation-hero-text">
                <h1 id="creation-hero-title" className="creation-hero-title">
                  Créer une formation
                </h1>
                <p className="creation-hero-subtitle">
                  Configurez un nouveau programme pédagogique en 5 étapes guidées :
                  général, pédagogie, planning, compétences RICE et coûts.
                </p>
                {besoinInfo && (
                  <Tag color="processing" className="creation-tag-besoin">
                    Lié au besoin : {besoinInfo.titre || besoinInfo.objectifFormation || "Besoin"}
                  </Tag>
                )}
              </div>
            </div>

            <div className="creation-hero-actions">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                className="creation-hero-back-btn"
                size="large"
              >
                Retour
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Info pills strip ──────────────────────────────────────────── */}
      <div className="creation-info-strip" role="list" aria-label="Informations sur le formulaire">
        <div className="creation-info-pill" role="listitem">
          <div className="creation-info-pill-icon">
            <AppstoreAddOutlined />
          </div>
          <div className="creation-info-pill-content">
            <span className="creation-info-pill-value">5 étapes</span>
            <span className="creation-info-pill-label">Configuration guidée</span>
          </div>
        </div>

        <div className="creation-info-pill" role="listitem">
          <div className="creation-info-pill-icon">
            <ClockCircleOutlined />
          </div>
          <div className="creation-info-pill-content">
            <span className="creation-info-pill-value">~ 10 min</span>
            <span className="creation-info-pill-label">Durée estimée</span>
          </div>
        </div>

        <div className="creation-info-pill" role="listitem">
          <div className="creation-info-pill-icon">
            <BulbOutlined />
          </div>
          <div className="creation-info-pill-content">
            <span className="creation-info-pill-value">RICE</span>
            <span className="creation-info-pill-label">Compétences ciblées</span>
          </div>
        </div>

        <div className="creation-info-pill" role="listitem">
          <div className="creation-info-pill-icon">
            <SafetyCertificateOutlined />
          </div>
          <div className="creation-info-pill-content">
            <span className="creation-info-pill-value">Validation</span>
            <span className="creation-info-pill-label">Contrôles intégrés</span>
          </div>
        </div>
      </div>

      {/* ── Premium form card ─────────────────────────────────────────── */}
      <div className="creation-form-card">
        <FormationWorkflowForm onFormationCreated={handleCreated} besoinInfo={besoinInfo} />
      </div>

      {/* ── Footer help section ──────────────────────────────────────── */}
      <div className="creation-help-footer" role="complementary">
        <div className="creation-help-icon">
          <QuestionCircleOutlined />
        </div>
        <div className="creation-help-text">
          <strong>Besoin d&apos;aide ?</strong>
          <span>
            Les champs sont enregistrés à chaque étape. Vous pouvez revenir en arrière à tout moment
            pour modifier vos saisies avant validation finale.
          </span>
        </div>
      </div>
    </div>
  );
}
