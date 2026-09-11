interface BesoinStatusBadgeProps {
  approved: boolean;
  status?: string | null;
}

const STATUS_TONE: Record<string, string> = {
  SUBMITTED: 'pending',
  CUP_APPROVED: 'progress',
  DEPARTMENT_APPROVED: 'progress',
  ADMIN_APPROVED: 'approved',
  FORMATION_CREATED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'rejected',
};

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'Soumis',
  CUP_APPROVED: 'Validé CUP',
  DEPARTMENT_APPROVED: 'Validé département',
  ADMIN_APPROVED: 'Validé admin',
  FORMATION_CREATED: 'Formation créée',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulé',
};

export default function BesoinStatusBadge({ approved, status }: Readonly<BesoinStatusBadgeProps>) {
  const tone = status ? (STATUS_TONE[status] ?? 'pending') : approved ? 'approved' : 'pending';
  const label = status ? (STATUS_LABEL[status] ?? status) : approved ? 'Approuvé' : 'En attente';
  return (
    <span className={`bf-status bf-status--${tone}`}>
      <span className="bf-status__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
