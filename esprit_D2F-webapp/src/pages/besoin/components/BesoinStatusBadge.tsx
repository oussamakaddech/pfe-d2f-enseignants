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

function resolveTone(status: string | null | undefined, approved: boolean): string {
  if (status) {
    return STATUS_TONE[status] ?? 'pending';
  }
  return approved ? 'approved' : 'pending';
}

function resolveLabel(status: string | null | undefined, approved: boolean): string {
  if (status) {
    return STATUS_LABEL[status] ?? status;
  }
  return approved ? 'Approuvé' : 'En attente';
}

export default function BesoinStatusBadge({ approved, status }: Readonly<BesoinStatusBadgeProps>) {
  const tone = resolveTone(status, approved);
  const label = resolveLabel(status, approved);
  return (
    <span className={`bf-status bf-status--${tone}`}>
      <span className="bf-status__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
