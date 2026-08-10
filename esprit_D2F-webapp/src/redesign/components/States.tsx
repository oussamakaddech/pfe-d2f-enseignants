import { Empty } from 'antd';

export function KpiSkeleton({ count = 6 }: { readonly count?: number }) {
  const keys = Array.from({ length: count }, () => crypto.randomUUID());
  return (
    <>
      {keys.map((k) => (
        <div key={k} className="rd-skel rd-skel-kpi" />
      ))}
    </>
  );
}

export function ChartSkeleton({ height = 200 }: { readonly height?: number }) {
  return <div className="rd-skel rd-skel-block" style={{ height }} />;
}

export function ListSkeleton({ rows = 4 }: { readonly rows?: number }) {
  const keys = Array.from({ length: rows }, () => crypto.randomUUID());
  return (
    <div className="rd-list">
      {keys.map((k) => (
        <div
          key={k}
          className="rd-list-item"
          style={{ background: 'transparent', border: 'none', padding: 0 }}
        >
          <div className="rd-skel" style={{ width: 40, height: 40, borderRadius: 12 }} />
          <div style={{ flex: 1 }}>
            <div className="rd-skel rd-skel-line" style={{ width: '70%', marginBottom: 6 }} />
            <div className="rd-skel rd-skel-line" style={{ width: '45%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  description = 'Aucune donnée',
  children,
}: {
  readonly description?: string;
  readonly children?: React.ReactNode;
}) {
  return (
    <div className="rd-empty">
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
      {children}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry?: () => void;
}) {
  return (
    <div className="rd-error">
      <div style={{ fontSize: 22 }}>⚠️</div>
      <div>{message}</div>
      {onRetry && (
        <button className="rd-retry" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}
