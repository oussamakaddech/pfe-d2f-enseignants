import { useEffect, useState } from 'react';
import { Modal, Input, Typography, Alert } from 'antd';

const { Text } = Typography;
const { TextArea } = Input;

interface BesoinRejectModalProps {
  open: boolean;
  title?: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * Modale de refus d'un besoin : motif obligatoire (transmis au demandeur
 * via notification backend). Utilisée par BesoinCard et BesoinTable.
 */
export default function BesoinRejectModal({
  open,
  title,
  loading = false,
  onConfirm,
  onCancel,
}: Readonly<BesoinRejectModalProps>) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  const valid = reason.trim().length >= 5;

  return (
    <Modal
      title="Refuser ce besoin ?"
      open={open}
      onCancel={onCancel}
      onOk={() => {
        setTouched(true);
        if (valid) onConfirm(reason.trim());
      }}
      okText="Refuser"
      cancelText="Annuler"
      okButtonProps={{ danger: true, loading, disabled: touched && !valid }}
      destroyOnHidden
    >
      {title && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {title}
        </Text>
      )}
      <TextArea
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motif du refus (min. 5 caractères) — ex. Budget non disponible pour cette période"
        maxLength={1000}
        showCount
      />
      {touched && !valid && (
        <Alert
          type="error"
          showIcon
          style={{ marginTop: 12 }}
          message="Un motif d'au moins 5 caractères est obligatoire."
        />
      )}
    </Modal>
  );
}
