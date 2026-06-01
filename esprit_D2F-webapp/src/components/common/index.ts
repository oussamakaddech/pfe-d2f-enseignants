// Theme primitives
export { default as StatCard } from './StatCard';
export { default as StatusBadge } from './StatusBadge';
export { default as RoleBadge } from './RoleBadge';
export { default as AppPageHeader } from './AppPageHeader';
export { default as EmptyState } from './EmptyState';

// D2F Design System primitives
export { default as D2FPageHeader } from './D2FPageHeader';
export { default as D2FDataCard } from './D2FDataCard';
export { default as D2FSection } from './D2FSection';
export { default as D2FStatusPill } from './D2FStatusPill';
export { default as D2FQuickActions } from './D2FQuickActions';
export { default as D2FSearchBar } from './D2FSearchBar';

// UX reusable components
export { default as PageSectionCard } from './PageSectionCard';
export { default as DataToolbar } from './DataToolbar';
export { default as FilterPanel } from './FilterPanel';
export { default as SummaryStatsRow } from './SummaryStatsRow';
export { default as InfoSummaryCard } from './InfoSummaryCard';
export { default as ActionBar } from './ActionBar';
export { default as StickyFormFooter } from './StickyFormFooter';
export { default as FormWizardLayout } from './FormWizardLayout';
export { default as ResponsiveTableWrapper } from './ResponsiveTableWrapper';
export { default as EmptyStateStandard } from './EmptyStateStandard';
export { default as ErrorStateStandard } from './ErrorStateStandard';
export { default as PageLoader } from './PageLoader';

// Provider (re-exported from context for backwards compatibility)
export { default as AuthProvider, AuthContext } from '@/context/AuthContext';

// Backwards-compat re-export of design tokens (preferred path: '@/styles/themes/tokens').
export * from '@/styles/themes/tokens';
