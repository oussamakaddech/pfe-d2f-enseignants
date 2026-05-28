interface BesoinCardMetaItem {
  key: string;
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}

interface BesoinCardMetaProps {
  items: BesoinCardMetaItem[];
}

export default function BesoinCardMeta({ items }: BesoinCardMetaProps) {
  const visible = items.filter((i) => i?.value != null);
  if (visible.length === 0) return null;
  return (
    <div className="bf-card__meta">
      {visible.map((it) => (
        <span key={it.key} className="bf-card__meta-chip" title={`${it.label} : ${it.value}`}>
          {it.icon && <span className="bf-card__meta-icon">{it.icon}</span>}
          <span className="bf-card__meta-text">{it.value}</span>
        </span>
      ))}
    </div>
  );
}






