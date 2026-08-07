import { memo, useState, type ReactNode } from 'react';
import { Modal, Typography } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

const { Text } = Typography;

interface ConfirmModalProps {
  readonly open: boolean;
  readonly title?: string;
  /** Nom de l'entité concernée — toujours l'afficher pour une suppression. */
  readonly entityName?: string;
  readonly description?: ReactNode;
  /** Défaut : « Confirmer la suppression » (bouton rouge). */
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  /** false pour une action non destructive (bouton primaire au lieu de rouge). */
  readonly danger?: boolean;
  readonly onConfirm: () => void | Promise<void>;
  readonly onCancel: () => void;
}

/**
 * Modale de confirmation — OBLIGATOIRE pour toute action destructive
 * (suppression, désactivation). Jamais de DELETE sans cette confirmation.
 *
 *   <ConfirmModal
 *     open={!!toDelete}
 *     entityName={toDelete?.nom}
 *     onConfirm={() => remove(toDelete.id)}
 *     onCancel={() => setToDelete(null)}
 *   />
 */
const ConfirmModal = memo(function ConfirmModal({
  open,
  title = 'Confirmer la suppression',
  entityName,
  description,
  confirmLabel = 'Confirmer la suppression',
  cancelLabel = 'Annuler',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleOk = async () => {
    try {
      setSubmitting(true);
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <ExclamationCircleFilled
            style={{ color: danger ? 'var(--color-danger)' : 'var(--color-warning)' }}
          />
          {title}
        </span>
      }
      okText={confirmLabel}
      cancelText={cancelLabel}
      okButtonProps={{ danger, type: 'primary', loading: submitting }}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={submitting}
      destroyOnHidden
      centered
    >
      {description ?? (
        <Text>
          Cette action est irréversible
          {entityName ? (
            <>
              {' : '}
              <Text strong>« {entityName} »</Text> sera définitivement supprimé(e).
            </>
          ) : (
            '.'
          )}
        </Text>
      )}
    </Modal>
  );
});

export default ConfirmModal;
