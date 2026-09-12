import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  SendOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { AnimatorProposalService } from '@/services/formation';
import { notify } from '@/utils/helpers/notifications';
import type { AnimatorProposal, AnimatorRole, ProposalStatus } from '@/models/animatorProposal';

const { Text } = Typography;
const { Option } = Select;

/** Couleurs des statuts (parité workflow backend). */
const STATUS_COLORS: Record<ProposalStatus, string> = {
  PROPOSED: 'blue',
  PENDING_VALIDATION: 'orange',
  ACCEPTED_BY_TRAINER: 'cyan',
  REJECTED_BY_TRAINER: 'default',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'default',
  EXPIRED: 'default',
};

const STATUS_LABELS: Record<ProposalStatus, string> = {
  PROPOSED: 'Proposé',
  PENDING_VALIDATION: 'En attente de validation',
  ACCEPTED_BY_TRAINER: 'Accepté par l\u2019animateur',
  REJECTED_BY_TRAINER: 'Refusé par l\u2019animateur',
  APPROVED: 'Validé',
  REJECTED: 'Refusé',
  CANCELLED: 'Retiré',
  EXPIRED: 'Expiré',
};

const ROLE_LABELS: Record<AnimatorRole, string> = {
  LEAD_TRAINER: 'Lead Trainer',
  CO_TRAINER: 'Co-Trainer',
  FACILITATOR: 'Facilitateur',
};

export interface AnimatorProposalsPanelProps {
  formationId: number;
  /** L'utilisateur peut se proposer (ENSEIGNANT / ANIMATEUR). */
  canSelfPropose: boolean;
  /** L'utilisateur valide les propositions (CUP / CHEF_DEPARTEMENT / ADMIN). */
  canValidate: boolean;
  /** L'utilisateur propose des animateurs (CUP / ADMIN / CHEF_DEPARTEMENT). */
  canManage: boolean;
}

/**
 * Panneau du workflow d'animation d'une formation :
 * - auto-proposition (bouton « Se proposer comme animateur ») ;
 * - propositions en attente avec Valider / Refuser (responsables) ;
 * - propositions reçues avec Accepter / Refuser / Retirer.
 *
 * RÈGLE : l'interface ne remplace jamais les contrôles backend — le serveur
 * revalide périmètre, doublons, compétences et conflits horaires.
 */
export function AnimatorProposalsPanel({
  formationId,
  canSelfPropose,
  canValidate,
  canManage,
}: Readonly<AnimatorProposalsPanelProps>) {
  const [proposals, setProposals] = useState<AnimatorProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selfModalOpen, setSelfModalOpen] = useState(false);
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selfForm] = Form.useForm();
  const [managerForm] = Form.useForm();

  const loadProposals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AnimatorProposalService.getFormationProposals(formationId);
      setProposals(data);
    } catch {
      notify.error('Impossible de charger les propositions d\u2019animation.');
    } finally {
      setLoading(false);
    }
  }, [formationId]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  const submitSelfProposal = useCallback(
    async (values: { role: AnimatorRole; motivation: string }) => {
      try {
        await AnimatorProposalService.createSelfProposal(formationId, values);
        notify.success('Votre proposition a été enregistrée — elle est en attente de validation.');
        setSelfModalOpen(false);
        selfForm.resetFields();
        await loadProposals();
      } catch (error: unknown) {
        notify.error(extractErrorMessage(error, 'La proposition a été refusée par le serveur.'));
      }
    },
    [formationId, loadProposals, selfForm],
  );

  const submitManagerProposal = useCallback(
    async (values: { proposerId: string; role: AnimatorRole; motivation?: string }) => {
      try {
        await AnimatorProposalService.createManagerProposal(formationId, {
          proposerId: values.proposerId,
          proposerType: 'TEACHER',
          role: values.role,
          motivation: values.motivation,
        });
        notify.success('Proposition envoyée à l\u2019enseignant.');
        setManagerModalOpen(false);
        managerForm.resetFields();
        await loadProposals();
      } catch (error: unknown) {
        notify.error(extractErrorMessage(error, 'La proposition a été refusée par le serveur.'));
      }
    },
    [formationId, loadProposals, managerForm],
  );

  const respondProposal = useCallback(
    async (proposalId: number, action: 'accept' | 'reject' | 'withdraw' | 'approve' | 'manager-reject') => {
      setBusyId(proposalId);
      try {
        if (action === 'accept') {
          await AnimatorProposalService.acceptProposal(proposalId);
          notify.success('Proposition acceptée.');
        } else if (action === 'reject') {
          await AnimatorProposalService.rejectProposal(proposalId, 'Non disponible.');
          notify.success('Proposition refusée.');
        } else if (action === 'withdraw') {
          await AnimatorProposalService.withdrawProposal(proposalId);
          notify.success('Proposition retirée.');
        } else if (action === 'approve') {
          await AnimatorProposalService.approveProposal(proposalId);
          notify.success('Proposition validée — affectation créée et invitation envoyée.');
        } else {
          await AnimatorProposalService.managerRejectProposal(proposalId, 'Motifs insuffisants.');
          notify.success('Proposition refusée.');
        }
        await loadProposals();
      } catch (error: unknown) {
        notify.error(extractErrorMessage(error, 'Action refusée par le serveur.'));
      } finally {
        setBusyId(null);
      }
    },
    [loadProposals],
  );

  const columns = useMemo(
    () => [
      {
        title: 'Enseignant',
        key: 'proposer',
        render: (_: unknown, p: AnimatorProposal) =>
          `${p.proposerPrenom ?? ''} ${p.proposerNom ?? ''}`.trim() || p.proposerId,
      },
      { title: 'Rôle', key: 'role', render: (_: unknown, p: AnimatorProposal) => ROLE_LABELS[p.role] },
      {
        title: 'Type',
        key: 'type',
        render: (_: unknown, p: AnimatorProposal) =>
          p.proposalType === 'SELF_PROPOSAL' ? (
            <Tag icon={<UserOutlined />} color="purple">
              Auto-proposition
            </Tag>
          ) : (
            <Tag icon={<UserAddOutlined />} color="geekblue">
              Proposition responsable
            </Tag>
          ),
      },
      {
        title: 'Statut',
        key: 'status',
        render: (_: unknown, p: AnimatorProposal) => (
          <Tag color={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</Tag>
        ),
      },
      {
        title: 'Motivation',
        key: 'motivation',
        ellipsis: true,
        render: (_: unknown, p: AnimatorProposal) => p.motivation ?? '—',
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: unknown, p: AnimatorProposal) => (
          <Space size={4}>
            {p.canRespond && p.proposalType === 'MANAGER_PROPOSAL' && (
              <>
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={busyId === p.id}
                  onClick={() => void respondProposal(p.id, 'accept')}
                >
                  Accepter
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  loading={busyId === p.id}
                  onClick={() => void respondProposal(p.id, 'reject')}
                >
                  Refuser
                </Button>
              </>
            )}
            {p.canValidate && (
              <>
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={busyId === p.id}
                  onClick={() => void respondProposal(p.id, 'approve')}
                >
                  Valider
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  loading={busyId === p.id}
                  onClick={() => void respondProposal(p.id, 'manager-reject')}
                >
                  Refuser
                </Button>
              </>
            )}
            {p.canWithdraw && (
              <Button
                size="small"
                icon={<CloseOutlined />}
                loading={busyId === p.id}
                onClick={() => void respondProposal(p.id, 'withdraw')}
              >
                Retirer
              </Button>
            )}
          </Space>
        ),
      },
    ],
    [busyId, respondProposal],
  );

  return (
    <Card
      title="Animation de la formation"
      extra={
        <Space>
          {canSelfPropose && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setSelfModalOpen(true)}
            >
              Se proposer comme animateur
            </Button>
          )}
          {canManage && (
            <Button icon={<SendOutlined />} onClick={() => setManagerModalOpen(true)}>
              Proposer un animateur
            </Button>
          )}
        </Space>
      }
    >
      {proposals.length === 0 && !loading ? (
        <Empty description="Aucune proposition d\u2019animation pour cette formation." />
      ) : (
        <Table
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={proposals}
          columns={columns}
          pagination={false}
        />
      )}

      <Modal
        title="Se proposer comme animateur"
        open={selfModalOpen}
        onCancel={() => setSelfModalOpen(false)}
        onOk={() => {
          // submit() déclenche la validation ; les erreurs sont affichées
          // par le formulaire (pas de promesse à attendre ici).
          Promise.resolve(selfForm.submit()).catch(() => undefined);
        }}
        okText="Envoyer la proposition"
        cancelText="Annuler"
      >
        <Text type="secondary">
          Votre proposition sera en attente de validation par un responsable (CUP, chef de
          département ou administrateur). Aucune affectation n\u2019est créée automatiquement.
        </Text>
        <Form form={selfForm} layout="vertical" onFinish={submitSelfProposal}>
          <Form.Item
            name="role"
            label="Rôle souhaité"
            rules={[{ required: true, message: 'Le rôle est obligatoire.' }]}
          >
            <Select placeholder="Rôle">
              <Option value="LEAD_TRAINER">Lead Trainer</Option>
              <Option value="CO_TRAINER">Co-Trainer</Option>
              <Option value="FACILITATOR">Facilitateur</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="motivation"
            label="Motivation"
            rules={[
              { required: true, message: 'La motivation est obligatoire.' },
              { min: 10, message: 'Au moins 10 caractères.' },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Je possède une expertise avancée dans cette compétence…"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Proposer un animateur"
        open={managerModalOpen}
        onCancel={() => setManagerModalOpen(false)}
        onOk={() => {
          // submit() déclenche la validation ; les erreurs sont affichées
          // par le formulaire (pas de promesse à attendre ici).
          Promise.resolve(managerForm.submit()).catch(() => undefined);
        }}
        okText="Envoyer la proposition"
        cancelText="Annuler"
      >
        <Form form={managerForm} layout="vertical" onFinish={submitManagerProposal}>
          <Form.Item
            name="proposerId"
            label="Identifiant de l\u2019enseignant (ex. E00001)"
            rules={[{ required: true, message: 'L\u2019identifiant est obligatoire.' }]}
          >
            <Input placeholder="E00001" />
          </Form.Item>
          <Form.Item
            name="role"
            label="Rôle proposé"
            rules={[{ required: true, message: 'Le rôle est obligatoire.' }]}
          >
            <Select placeholder="Rôle">
              <Option value="LEAD_TRAINER">Lead Trainer</Option>
              <Option value="CO_TRAINER">Co-Trainer</Option>
              <Option value="FACILITATOR">Facilitateur</Option>
            </Select>
          </Form.Item>
          <Form.Item name="motivation" label="Motivation (facultatif)">
            <Input.TextArea rows={3} placeholder="Expertise en Machine Learning…" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

/** Extrait le message d'erreur serveur (409/422/403) sinon message générique. */
function extractErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }
  return fallback;
}

export default AnimatorProposalsPanel;
