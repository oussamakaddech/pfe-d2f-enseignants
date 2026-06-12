import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Form,
  Select,
  Button,
  Alert,
  Descriptions,
  Tag,
  Space,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  TeamOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  SendOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  BookOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { PageHero, PageLoader, EmptyStateStandard } from "@/components/common";
import { useProfile, useFormationsAccessibles, useInscriptionsByEnseignant, useDemanderInscription } from "@/hooks/formation/useFormationExtras";
import { useEnseignantById } from "@/hooks/enseignant/useEnseignants";
import useAppNotification from "@/hooks/ui/useAppNotification";
import type { Id } from "@/models/common";

const { Text } = Typography;

interface AccessibleFormation {
  idFormation?: Id;
  titreFormation?: string;
  typeFormation?: string;
  dateDebut?: string;
  dateFin?: string;
  chargeHoraireGlobal?: number;
  up?: { libelle?: string };
  departement?: { libelle?: string };
}

interface ExistingSummary {
  id?: Id;
  formationId?: string;
  titreFormation?: string;
  dateDebut?: string;
  dateFin?: string;
  etat?: string;
}

interface EnseignantData {
  id?: Id;
  [key: string]: unknown;
}

/** Deux plages [aStart,aEnd] et [bStart,bEnd] se chevauchent-elles ? (dates incluses) */
function rangesOverlap(aStart?: string, aEnd?: string, bStart?: string, bEnd?: string): boolean {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  const as = dayjs(aStart);
  const ae = dayjs(aEnd);
  const bs = dayjs(bStart);
  const be = dayjs(bEnd);
  if (!as.isValid() || !ae.isValid() || !bs.isValid() || !be.isValid()) return false;
  return !as.isAfter(be) && !ae.isBefore(bs);
}

function fmt(date?: string): string {
  if (!date) return "—";
  const d = dayjs(date);
  return d.isValid() ? d.format("DD/MM/YYYY") : "—";
}

export default function InscriptionForm() {
  const [form] = Form.useForm<{ formationId: Id }>();
  const navigate = useNavigate();
  const { message } = useAppNotification();

  const [submittedId, setSubmittedId] = useState<Id | null>(null);

  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  // Identifiant fonctionnel : on privilégie l'email (utilisé par le backend pour
  // résoudre l'enseignant), puis l'id utilisateur en dernier recours.
  const identifier = profile?.emailAddress || profile?.email || profile?.id;

  // Fiche enseignant : permet de récupérer le code métier (E-xxxxx) pour
  // le pré-contrôle de chevauchement. Si l'enseignant n'est pas résolu,
  // le pré-contrôle est désactivé (le backend reste la source de vérité).
  const { data: enseignant } = useEnseignantById(identifier);
  const enseignantCode = (enseignant as EnseignantData | undefined)?.id;

  const { data: accessiblesRaw, isLoading: accLoading } = useFormationsAccessibles(identifier);
  const { data: existingRaw } = useInscriptionsByEnseignant(enseignantCode);
  const { mutateAsync: demander, isPending } = useDemanderInscription();

  const accessibles = useMemo(
    () => (Array.isArray(accessiblesRaw) ? (accessiblesRaw as AccessibleFormation[]) : []),
    [accessiblesRaw],
  );
  const existing = useMemo(
    () => (Array.isArray(existingRaw) ? (existingRaw as ExistingSummary[]) : []),
    [existingRaw],
  );

  const selectedId = Form.useWatch("formationId", form);
  const selected = useMemo(
    () => accessibles.find((f) => String(f.idFormation) === String(selectedId)),
    [accessibles, selectedId],
  );

  // Formations déjà demandées (PENDING ou APPROVED) — sert à la fois à
  // désactiver les options correspondantes dans le Select et à informer l'utilisateur.
  const alreadyRequested = useMemo(() => {
    const map = new Map<string, { titre?: string; etat?: string }>();
    existing.forEach((e) => {
      if (e.formationId && e.etat && e.etat !== "REJECTED") {
        map.set(String(e.formationId), { titre: e.titreFormation, etat: e.etat });
      }
    });
    return map;
  }, [existing]);

  // Pré-contrôle de chevauchement (informatif) : le backend reste la source de vérité.
  const conflicts = useMemo(() => {
    if (!selected) return [];
    return existing.filter(
      (e) =>
        String(e.formationId) !== String(selected.idFormation) &&
        rangesOverlap(selected.dateDebut, selected.dateFin, e.dateDebut, e.dateFin),
    );
  }, [selected, existing]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (!identifier) {
      message.error("Profil enseignant introuvable : impossible de s'inscrire.");
      return;
    }
    try {
      await demander({ formationId: values.formationId, enseignantId: identifier as Id });
      setSubmittedId(values.formationId);
      message.success("Demande d'inscription envoyée avec succès !");
      form.resetFields();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e?.response?.data?.message || "Échec de la demande d'inscription");
    }
  };

  if (profileLoading) {
    return <PageLoader tip="Chargement de votre profil..." />;
  }
  if (profileError || !identifier) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <PageHero
          tone="danger"
          icon={<SendOutlined />}
          title="S'inscrire à une formation"
          subtitle="Choisissez une formation ouverte aux inscriptions et envoyez votre demande."
        />
        <Alert
          type="error"
          showIcon
          message="Profil enseignant introuvable"
          description="Impossible de récupérer votre profil. Veuillez vous reconnecter ou contacter l'administrateur."
          action={
            <Button size="small" type="primary" onClick={() => navigate("/login")}>
              Se reconnecter
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <PageHero
        tone="brand"
        icon={<SendOutlined />}
        title="S'inscrire à une formation"
        subtitle="Choisissez une formation ouverte aux inscriptions et envoyez votre demande."
        actions={
          <Button icon={<BookOutlined />} onClick={() => navigate("/home/ListeFormation")}>
            Voir le catalogue
          </Button>
        }
      />

      <Card style={{ borderRadius: 12 }}>
        {submittedId && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 20 }}
            message="Demande envoyée"
            description="Votre demande a été transmise. Vous pouvez suivre son statut dans « Mes Inscriptions »."
            action={
              <Button size="small" type="link" onClick={() => navigate("/home/ListeFormation")}>
                Mes Inscriptions
              </Button>
            }
            closable
            onClose={() => setSubmittedId(null)}
          />
        )}

        {alreadyRequested.size > 0 && (
          <Alert
            type="info"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 20 }}
            message={`Vous avez déjà ${alreadyRequested.size} demande${alreadyRequested.size === 1 ? "" : "s"} en cours ou approuvée${alreadyRequested.size === 1 ? "" : "s"}`}
            description="Les formations concernées sont désactivées dans la liste ci-dessous. Vous pouvez suivre leur statut dans « Mes Inscriptions »."
            action={
              <Button size="small" type="link" onClick={() => navigate("/home/MesInscriptions")}>
                Voir mes inscriptions
              </Button>
            }
          />
        )}

        {!accLoading && accessibles.length === 0 ? (
          <EmptyStateStandard
            title="Aucune formation disponible"
            description="Aucune formation n'est ouverte aux inscriptions pour le moment. Revenez plus tard ou contactez votre responsable formation."
          />
        ) : (
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="formationId"
              label="Formation"
              rules={[{ required: true, message: "Veuillez sélectionner une formation" }]}
            >
              <Select
                placeholder="Sélectionner une formation"
                loading={accLoading}
                showSearch
                optionFilterProp="label"
                options={accessibles.map((f) => {
                  const requested = alreadyRequested.get(String(f.idFormation));
                  const baseLabel = `${f.titreFormation ?? "Formation"} (${fmt(f.dateDebut)} → ${fmt(f.dateFin)})`;
                  const statusWord = requested?.etat === "APPROVED" ? "approuvée" : "en attente";
                  return {
                    value: f.idFormation as Id,
                    label: requested
                      ? `${baseLabel} — déjà demandée (${statusWord})`
                      : baseLabel,
                    disabled: !!requested,
                  };
                })}
              />
            </Form.Item>

            {selected && (
              <Descriptions
                bordered
                size="small"
                column={1}
                style={{ marginBottom: 20 }}
                styles={{ label: { width: 180, fontWeight: 600 } }}
              >
                <Descriptions.Item label="Titre">{selected.titreFormation || "—"}</Descriptions.Item>
                <Descriptions.Item label="Type">
                  <Tag color="blue">{selected.typeFormation || "—"}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={<><CalendarOutlined /> Période</>}>
                  {fmt(selected.dateDebut)} → {fmt(selected.dateFin)}
                </Descriptions.Item>
                <Descriptions.Item label={<><ClockCircleOutlined /> Charge horaire</>}>
                  {selected.chargeHoraireGlobal == null ? "—" : `${selected.chargeHoraireGlobal} h`}
                </Descriptions.Item>
                <Descriptions.Item label={<><TeamOutlined /> UP</>}>
                  {selected.up?.libelle || "—"}
                </Descriptions.Item>
                <Descriptions.Item label={<><ApartmentOutlined /> Département</>}>
                  {selected.departement?.libelle || "—"}
                </Descriptions.Item>
              </Descriptions>
            )}

            {conflicts.length > 0 && (
              <Alert
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                style={{ marginBottom: 20 }}
                message="Chevauchement de dates détecté"
                description={
                  <div>
                    <Text>Cette formation chevauche une (ou plusieurs) inscription(s) existante(s) :</Text>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {conflicts.map((c) => (
                        <li key={String(c.formationId)}>
                          <strong>{c.titreFormation || `Formation #${c.formationId}`}</strong>{" "}
                          ({fmt(c.dateDebut)} → {fmt(c.dateFin)})
                        </li>
                      ))}
                    </ul>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      La demande sera refusée par le système si le conflit est confirmé.
                    </Text>
                  </div>
                }
              />
            )}

            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                loading={isPending}
                disabled={!selectedId}
              >
                Envoyer la demande
              </Button>
              <Button onClick={() => form.resetFields()}>Annuler</Button>
            </Space>
          </Form>
        )}
      </Card>
    </div>
  );
}
