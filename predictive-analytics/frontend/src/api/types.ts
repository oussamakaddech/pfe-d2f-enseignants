export type DataQualityStatus =
  | "COMPLETE"
  | "DATA_INCOMPLETE"
  | "MISSING_COMPETENCIES"
  | "STALE"
  | "NO_DATA";

export type GapType =
  | "LEVEL_DEFICIT"
  | "STALE_ASSESSMENT"
  | "INCOMPLETE_PROFILE"
  | "MISSING_ASSIGNMENT"
  | "MISSING_PREREQUISITE"
  | "TRAINING_COVERAGE_GAP";

export type GapSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RecommendationPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Explainability {
  rule_id: string;
  rule_label: string;
  formula: string;
  human_readable: string;
  evidence: GapEvidence[];
}

export interface GapEvidence {
  kind?: string;
  detail?: string;
  level?: number;
  weight?: number;
  [key: string]: unknown;
}

export interface GapDiagnostic {
  teacher_id: string;
  domain_id: string;
  competency_id: string;
  sub_competency_id: string;
  knowledge_id: string;
  knowledge_code: string;
  knowledge_name: string;
  knowledge_type: "THEORETICAL" | "PRACTICAL";
  current_level: number | null;
  required_level: number | null;
  gap_level: number;
  gap_type: GapType;
  severity: GapSeverity;
  evidence: GapEvidence[];
  explainability: Explainability | null;
  data_quality_status: DataQualityStatus;
  detected_at: string | null;
}

export interface GapAggregate {
  teacher_id: string;
  level: "DOMAIN" | "COMPETENCY" | "SUB_COMPETENCY";
  ref_id: string;
  ref_code: string;
  ref_name: string;
  parent_ref_id: string;
  gap_level: number;
  severity: GapSeverity;
  gap_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  data_quality_status: DataQualityStatus;
}

export interface TeacherGapAnalysis {
  teacher_id: string;
  gaps: GapDiagnostic[];
  aggregates: GapAggregate[];
  data_quality_status: DataQualityStatus;
  detected_at: string | null;
  has_competency_records: boolean;
  warnings: string[];
}

export interface Recommendation {
  training_id: string;
  title: string;
  recommendation_score: number;
  priority: RecommendationPriority;
  target_gap_ids: string[];
  target_competencies: string[];
  expected_level_progression: Record<string, number>;
  prerequisite_status: string;
  estimated_duration_hours: number;
  available_from: string | null;
  reason_codes: string[];
  human_readable_explanation: string;
  alternatives: string[];
  data_quality_status: DataQualityStatus;
  score_breakdown: Record<string, number>;
}

export interface ExcludedTraining {
  training_id: string;
  reason: string;
  detail?: string;
}

export interface RecommendationResult {
  teacher_id: string;
  recommendations: Recommendation[];
  excluded_trainings: ExcludedTraining[];
  no_eligible_reason: string | null;
}

export interface LearningPathStep {
  training_id: string;
  title: string;
  position: number;
  score: number;
  priority: RecommendationPriority;
  is_blocking: boolean;
  blocked_by: string[];
  target_gap_ids: string[];
  estimated_duration_hours: number;
  available_from: string | null;
  status: "PLANNED" | "BLOCKED" | "FUTURE_SUGGESTION";
}

export interface LearningPath {
  teacher_id: string;
  steps: LearningPathStep[];
  total_duration_hours: number;
  cycles_detected: string[][];
  blocking_steps: LearningPathStep[];
  optional_steps: LearningPathStep[];
  future_suggestions: LearningPathStep[];
}

export interface RiskFactor {
  code: string;
  label: string;
  weight: number;
  contribution: number;
  detail: string;
}

export interface RiskProfile {
  teacher_id: string;
  risk_score: number;
  risk_level: string;
  factors: RiskFactor[];
  ml_stagnation_probability: number | null;
  model_version: string | null;
}

export interface QualityMetric {
  name: string;
  status: DataQualityStatus;
  score: number;
  detail: string;
}

export interface TeacherDataQualityReport {
  teacher_id: string;
  overall_status: DataQualityStatus;
  overall_score: number;
  metrics: QualityMetric[];
  missing_competency_ids: string[];
  stale_assessment_ids: string[];
}

export interface GlobalKpis {
  total_teachers: number;
  teachers_with_data: number;
  teachers_at_risk: number;
  avg_risk_score: number;
  total_open_gaps: number;
  critical_gaps: number;
  open_needs: number;
  enrollment_rate: number;
  completion_rate: number;
}

export interface RiskRow {
  teacher_id: string;
  department_code: string;
  risk_score: number;
  risk_level: string;
  top_gap: string;
  gap_count: number;
}

export interface HeatmapCell {
  department_code: string;
  domain_id: string;
  gap_count: number;
  max_severity: GapSeverity;
  weighted_severity: number;
}

export interface TrainingDemandRow {
  training_id: string;
  title: string;
  demand_count: number;
  avg_relevance: number;
  target_domains: string[];
}

export interface MlScoreResponse {
  teacher_id: string;
  target: string;
  score: number;
  status: "OK" | "INSUFFICIENT_HISTORICAL_DATA" | "MODEL_UNAVAILABLE";
  explanation: string;
  feature_contributions: Record<string, number>;
  model_version: string;
  trained_at: string;
  scored_at: string;
}

export interface ApiEnvelope<T> {
  data: T | null;
  meta: Record<string, unknown>;
  errors: ApiError[];
}

export interface ApiError {
  code: string;
  message: string;
  details: unknown[];
}

export interface HeatmapResponse {
  cells: HeatmapCell[];
  count: number;
}

export interface AtRiskResponse {
  rows: RiskRow[];
  count: number;
}

export interface TrainingDemandResponse {
  rows: TrainingDemandRow[];
  count: number;
}
