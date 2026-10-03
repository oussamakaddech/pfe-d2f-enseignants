import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Badge,
  Alert,
  Typography,
  Row,
  Col,
  Button,
  Space,
  Timeline,
} from 'antd';
import {
  InfoCircleOutlined,
  ArrowLeftOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  BarChartOutlined,
  AimOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useFormationById } from '@/hooks/formation/useFormations';
import {
  useProfile,
  useInscriptionsByEnseignant,
  useDemanderInscription,
} from '@/hooks/formation/useFormationExtras';
import { useEnseignantById } from '@/hooks/enseignant/useEnseignants';
import { ROLES } from '@/utils/constants/roles';
import { PageLoader } from '@/components/common';
import useAppNotification from '@/hooks/ui/useAppNotification';
import FormationParticipantsPanel from './FormationParticipantsPanel';
import type { Formation } from '@/models/formation';
import type { Id } from '@/models/common';
import '@/styles/pages/fiche-formation.css';

/* Aligné sur l'enum backend PeriodCode (+ formulaires) : P3/P4 n'existent pas,
 * SPRINT/WORKSHOP si (ex. « SPRINT » affichait « — »). */
const PERIOD_OPTIONS = [
  { value: 'P1', label: 'Période 1' },
  { value: 'P2', label: 'Période 2' },
  { value: 'WINTER', label: "Session d'Hiver" },
  { value: 'SUMMER', label: "Session d'Été" },
  { value: 'SPRINT', label: 'Sprint' },
  { value: 'WORKSHOP', label: 'Atelier' },
  { value: 'OTHER', label: 'Autre' },
];

/** Libellé de période : code connu, libellé personnalisé, ou ancien champ. */
export function resolvePeriodLabel(
  periodCode?: string,
  customPeriodLabel?: string,
  periodeFormation?: string,
): string {
  if (periodCode === 'OTHER') return customPeriodLabel || 'Autre';
  return (
    PERIOD_OPTIONS.find((o) => o.value === periodCode)?.label ||
    customPeriodLabel ||
    periodeFormation ||
    '—'
  );
}

/** Libellé de structure : le détail renvoie `up`/`departement`, les listes
 *  `up1`/`departement1` (même forme id/libelle). */
export function resolveStructureLabel(
  primary?: { libelle?: string; nom?: string } | null,
  fallback?: { libelle?: string; nom?: string } | null,
): string {
  return primary?.libelle || primary?.nom || fallback?.libelle || fallback?.nom || '—';
}

/** Pastille colorée, ou simple tiret quand vide (pas de tag vide). */
function InfoTag({ color, value }: { readonly color: string; readonly value: string }) {
  return value === '—' ? <>{value}</> : <Tag color={color}>{value}</Tag>;
}

const { Title, Paragraph, Text } = Typography;

export default function FicheFormation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message: msgApi } = useAppNotification();
  const { data: formation, isLoading: loading, error } = useFormationById(id);
  const { data: profile } = useProfile();
  const role = String(profile?.role ?? '').toLowerCase();
  // Admin / CUP : accès à la liste des participants + statistiques.
  const canViewParticipants =
    role === ROLES.ADMIN.toLowerCase() || role === ROLES.CUP.toLowerCase();

  // ── Inscription contextualisée (D8) ───────────────────────────────────
  const isTeacher =
    role === ROLES.ENSEIGNANT.toLowerCase() || role === ROLES.ANIMATEUR.toLowerCase();
  const identifier = profile?.emailAddress || profile?.email || profile?.id;
  const { data: enseignantSelf } = useEnseignantById(isTeacher ? identifier : undefined);
  const enseignantCode = (enseignantSelf as { id?: Id } | undefined)?.id;
  const { data: myInscriptionsRaw } = useInscriptionsByEnseignant(
    isTeacher ? enseignantCode : undefined,
  );
  const demanderMut = useDemanderInscription();

  const myInscriptions = useMemo(
    () =>
      Array.isArray(myInscriptionsRaw)
        ? (myInscriptionsRaw as Array<{ formationId?: string; etat?: string }>)
        : [],
    [myInscriptionsRaw],
  );
  const myInscriptionForThis = useMemo(
    () =>
      myInscriptions.find((i) => String(i.formationId) === String(id) && i.etat !== 'REJECTED') ??
      null,
    [myInscriptions, id],
  );

  const handleInscription = async () => {
    if (!identifier || !id) return;
    try {
      await demanderMut.mutateAsync({ formationId: id as Id, enseignantId: identifier as Id });
      msgApi.success("Demande d'inscription envoyée !");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      msgApi.error(e?.response?.data?.message || "Échec de la demande d'inscription");
    }
  };

  if (loading) {
    return <PageLoader tip="Chargement de la fiche formation..." />;
  }
  if (error) {
    return (
      <Alert
        type="error"
        message="Erreur"
        description={error?.message || 'Erreur de chargement'}
        showIcon
        className="fiche-error"
      />
    );
  }

  const {
    titreFormation,
    typeFormation,
    dateDebut,
    dateFin,
    chargeHoraireGlobal,
    departement1,
    up1,
    departement,
    up,
    seances = [],
    inscriptionsOuvertes,
    objectifs,
    objectifsPedago,
    prerequis,
    acquis,
    indicateurs,
    evalMethods,
    domaine,
    populationCible,
    periodeFormation,
    periodCode,
    customPeriodLabel,
  } = formation || ({} as Formation);

  const typeColor =
    {
      INTERNE: 'blue',
      EXTERNE: 'purple',
    }[String(typeFormation)?.toUpperCase()] || 'default';

  return (
    <div className="fiche-page">
      {/* Header */}
      <Row justify="space-between" align="middle" className="fiche-header-row">
        <Col>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            className="fiche-back-btn"
          >
            Retour
          </Button>
          <Title level={3} className="fiche-header-title">
            <BookOutlined className="fiche-title-icon" />
            {titreFormation}
          </Title>
        </Col>
        <Col>
          <Space wrap>
            <Tag color={typeColor} className="fiche-type-tag">
              {typeFormation || '—'}
            </Tag>
            <Badge
              status={inscriptionsOuvertes ? 'success' : 'error'}
              text={
                <Tag color={inscriptionsOuvertes ? 'success' : 'error'}>
                  {inscriptionsOuvertes ? 'Inscriptions ouvertes' : 'Inscriptions fermées'}
                </Tag>
              }
            />
            {isTeacher && inscriptionsOuvertes && !myInscriptionForThis && (
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={handleInscription}
                loading={demanderMut.isPending}
              >
                S'inscrire à cette formation
              </Button>
            )}
            {isTeacher && myInscriptionForThis && (
              <Tag
                icon={<CheckCircleOutlined />}
                color={myInscriptionForThis.etat === 'APPROVED' ? 'success' : 'warning'}
                style={{ fontWeight: 600, padding: '4px 12px', borderRadius: 16 }}
              >
                {myInscriptionForThis.etat === 'APPROVED'
                  ? 'Demande approuvée'
                  : 'Demande en attente'}
              </Tag>
            )}
          </Space>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Colonne infos générales */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <InfoCircleOutlined className="fiche-card-icon" />
                <span className="fiche-card-title-text">Informations générales</span>
              </Space>
            }
            className="fiche-card fiche-card-full"
          >
            <Descriptions
              column={1}
              size="middle"
              layout="horizontal"
              styles={{ label: { fontWeight: 600, width: 160 } }}
            >
              <Descriptions.Item
                label={
                  <Space>
                    <CalendarOutlined /> Dates
                  </Space>
                }
              >
                <Text strong>
                  {dayjs(dateDebut).format('DD/MM/YYYY')} → {dayjs(dateFin).format('DD/MM/YYYY')}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space>
                    <CalendarOutlined /> Période
                  </Space>
                }
              >
              {resolvePeriodLabel(periodCode, customPeriodLabel, periodeFormation)}
            </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space>
                    <ClockCircleOutlined /> Durée
                  </Space>
                }
              >
                <Tag color="processing">{chargeHoraireGlobal} heures</Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space>
                    <ApartmentOutlined /> Département
                  </Space>
                }
              >
                <InfoTag
                  color="blue"
                  value={resolveStructureLabel(departement1, departement)}
                />
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space>
                    <TeamOutlined /> UP
                  </Space>
                }
              >
                <InfoTag color="cyan" value={resolveStructureLabel(up1, up)} />
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space>
                    <AimOutlined /> Domaine
                  </Space>
                }
              >
                <InfoTag color="purple" value={domaine || '—'} />
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space>
                    <TeamOutlined /> Public cible
                  </Space>
                }
              >
                {populationCible || '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Colonne présentation */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <FileTextOutlined className="fiche-card-icon" />
                <span className="fiche-card-title-text">Présentation de la formation</span>
              </Space>
            }
            className="fiche-card"
          >
            {objectifs && (
              <>
                <Title level={5} className="fiche-section-title">
                  <AimOutlined className="fiche-section-icon" />
                  Objectifs généraux
                </Title>
                <Paragraph className="fiche-block fiche-block-primary">{objectifs}</Paragraph>
              </>
            )}

            {objectifsPedago && (
              <>
                <Title level={5} className="fiche-section-title">
                  <CheckCircleOutlined className="fiche-section-icon" />
                  Objectifs pédagogiques
                </Title>
                <Paragraph className="fiche-block fiche-block-success">{objectifsPedago}</Paragraph>
              </>
            )}

            {prerequis && (
              <>
                <Title level={5} className="fiche-section-title">
                  <InfoCircleOutlined className="fiche-section-icon" />
                  Prérequis
                </Title>
                <Paragraph className="fiche-block fiche-block-info">{prerequis}</Paragraph>
              </>
            )}

            {acquis && (
              <>
                <Title level={5} className="fiche-section-title">
                  <CheckCircleOutlined className="fiche-section-icon" />
                  Acquis attendus
                </Title>
                <Paragraph className="fiche-block fiche-block-purple">{acquis}</Paragraph>
              </>
            )}

            {evalMethods && (
              <>
                <Title level={5} className="fiche-section-title">
                  <BarChartOutlined className="fiche-section-icon" />
                  Méthodes d&apos;évaluation
                </Title>
                <Paragraph className="fiche-block fiche-block-warning">{evalMethods}</Paragraph>
              </>
            )}

            {indicateurs && (
              <>
                <Title level={5} className="fiche-section-title">
                  <BarChartOutlined className="fiche-section-icon" />
                  Indicateurs de réussite
                </Title>
                <Paragraph className="fiche-block fiche-block-teal">{indicateurs}</Paragraph>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* Participants & statistiques (admin / CUP / D2F) */}
      {canViewParticipants && id && <FormationParticipantsPanel formationId={id} />}

      {/* Timeline des séances */}
      {seances.length > 0 && (
        <Card
          className="fiche-card fiche-seances-card"
          title={
            <Space>
              <CalendarOutlined className="fiche-card-icon" />
              <span className="fiche-card-title-text">
                Programme des séances ({seances.length})
              </span>
            </Space>
          }
        >
          <Timeline
            mode="left"
            items={seances.map((s: (typeof seances)[number], i: number) => ({
              label: (
                <Text type="secondary">
                  {dayjs(s.dateSeance).format('DD/MM/YYYY')}
                  <br />
                  {s.heureDebut?.slice(0, 5)} - {s.heureFin?.slice(0, 5)}
                </Text>
              ),
              children: (
                <div>
                  <Text strong>Séance {i + 1}</Text>
                  {s.titreSeance && (
                    <div>
                      <Text type="secondary">{s.titreSeance}</Text>
                    </div>
                  )}
                  {s.salle && <Tag>{s.salle}</Tag>}
                </div>
              ),
              color: i === 0 ? 'var(--primary-500)' : 'gray',
            }))}
          />
        </Card>
      )}
    </div>
  );
}
