import { Empty } from "antd";

export function KpiSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rd-skel rd-skel-kpi" />
      ))}
    </>
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return <div className="rd-skel rd-skel-block" style={{ height }} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rd-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rd-list-item" style={{ background: "transparent", border: "none", padding: 0 }}>
          <div className="rd-skel" style={{ width: 40, height: 40, borderRadius: 12 }} />
          <div style={{ flex: 1 }}>
            <div className="rd-skel rd-skel-line" style={{ width: "70%", marginBottom: 6 }} />
            <div className="rd-skel rd-skel-line" style={{ width: "45%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ description = "Aucune donnée", children }: { description?: string; children?: React.ReactNode }) {
  return (
    <div className="rd-empty">
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
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
