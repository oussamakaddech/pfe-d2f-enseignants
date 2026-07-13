import type { UnifiedRiskTeacher } from "@/redesign/contract";
import { initialsFromName } from "@/redesign/format";
import { RiskBadge } from "./Risk";

function avatarColor(seed: string): string {
  const palette = ["#b51200", "#7c3aed", "#0891b2", "#2563eb", "#059669", "#d97706", "#db2777"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export default function PriorityTeacherCard({ teacher }: { teacher: UnifiedRiskTeacher }) {
  return (
    <div className="rd-pteach">
      <div className="rd-avatar sm" style={{ background: avatarColor(teacher.id || teacher.name) }}>
        {initialsFromName(teacher.name, "?")}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pt-name">{teacher.name}</div>
        <div className="pt-meta">
          {teacher.department ?? "—"}
          {teacher.criticalGaps > 0 ? ` · ${teacher.criticalGaps} écarts critiques` : ""}
        </div>
        {teacher.signals.length > 0 && (
          <div className="pt-signals">
            {teacher.signals.slice(0, 3).map((s, i) => (
              <span key={i} className="rd-signal">{s}</span>
            ))}
          </div>
        )}
      </div>
      <RiskBadge score={teacher.riskScore} size="sm" />
    </div>
  );
}
