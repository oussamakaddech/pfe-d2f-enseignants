// ═══════════════════════════════════════════════════════════════════════════
// Design system D2F — primitives UI réutilisables.
// ═══════════════════════════════════════════════════════════════════════════
export { default as Skeleton } from "./Skeleton";
export { default as Badge } from "./Badge";
export type { BadgeVariant } from "./Badge";
export { default as KpiCard } from "./KpiCard";
export type { KpiColor } from "./KpiCard";
export { default as InfoCard } from "./InfoCard";
export { default as UserAvatar } from "./UserAvatar";
export { default as ConfirmModal } from "./ConfirmModal";
export { default as EmptyState } from "./EmptyState";
export { default as GlobalSearch } from "./GlobalSearch";

export { useToast } from "@/hooks/useToast";
export type { ToastOptions } from "@/hooks/useToast";
export { useDebouncedValue } from "@/hooks/useDebouncedValue";
