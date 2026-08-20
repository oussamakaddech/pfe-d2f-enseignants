import { Tag, Progress, Empty, Spin, Table } from 'antd';
import {
  AimOutlined,
  ApartmentOutlined,
  BookOutlined,
  CheckCircleFilled,
  AlertOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { TeacherScopeAnalysis, SkillGap } from '@/models/analyse/analyticsFeature';

const URGENCE_COLOR: Record<string, string> = {
  CRITIQUE: '#ef4444',
  HAUTE: '#f97316',
  MODEREE: '#f59e0b',
  FAIBLE: '#10b981',
};

function urgenceColor(v: number): string {
  if (v >= 0.75) return 'CRITIQUE';
  if (v >= 0.5) return 'HAUTE';
  if (v >= 0.25) return 'MODEREE';
  return 'FAIBLE';
}

interface Props {
  readonly data: TeacherScopeAnalysis | undefined;
  readonly loading: boolean;
}

/**
 * Panneau « Analyse contextuelle par spécialité / UP / département ».
 * Monte : bloc contexte (grade, specialité, UP, département) + résultats filtrés
 * (gaps + recommandations sur les compétences du périmètre) + indicateurs ML.
 *
 * Affichage (audit visuel) :
 * - Département et Unité pédagogique sur des lignes distinctes (labels
 *   français accentués : « Département » / « Unité pédagogique »).
 * - Pertinence et cible sur des lignes distinctes (jamais concaténées au titre).
 */
export default function TeacherScopePanel({ data, loading }: Readonly<Props>) {
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: 'var(--at-ink3)' }}>
          Chargement de l'analyse contextuelle...
        </div>
      </div>
    );
  }
  if (!data) return <Empty description="Aucune analyse disponible" />;

  const c = data.context;
  const scopeCoverage =
    data.total_competencies_count > 0
      ? Math.round((data.scoped_competencies_count / data.total_competencies_count) * 100)
      : 0;

  return (
    <div className="at-scope-root">
      {/* ── Bloc contexte ──────────────────────────────────────────────── */}
      <div className="at-scope-context">
        <div className="at-scope-row">
          <UserOutlined className="at-scope-icon" />
          <div>
            <div className="at-scope-label">Enseignant</div>
            <div className="at-scope-value">{c.nom_complet}</div>
            <div className="at-scope-sub">{c.mail}</div>
          </div>
        </div>
        <div className="at-scope-row">
          <BookOutlined className="at-scope-icon" />
          <div>
            <div className="at-scope-label">Spécialité</div>
            <div className="at-scope-value">{c.specialite ?? 'Non renseignée'}</div>
            {c.grade ? <div className="at-scope-sub">Grade : {c.grade}</div> : null}
          </div>
        </div>
        <div className="at-scope-row">
          <ApartmentOutlined className="at-scope-icon" />
          <div>
            <div className="at-scope-label">Département</div>
            <div className="at-scope-value">{c.dept_libelle ?? '—'}</div>
            <div className="at-scope-label" style={{ marginTop: 8 }}>
              Unité pédagogique
            </div>
            <div className="at-scope-value">{c.up_libelle ?? '—'}</div>
          </div>
        </div>
        <div className="at-scope-row">
          <AimOutlined className="at-scope-icon" />
          <div>
            <div className="at-scope-label">Périmètre analysé</div>
            <div className="at-scope-value">
              {data.scoped_competencies_count} compétences analysées sur{' '}
              {data.total_competencies_count} accessibles
            </div>
            <Progress
              percent={scopeCoverage}
              size="small"
              showInfo={false}
              strokeColor={data.scope.is_global ? '#8c8c8c' : '#10b981'}
              style={{ marginTop: 4 }}
            />
            {data.scope.is_global ? (
              <Tag color="default" style={{ marginTop: 6 }}>
                Périmètre global
              </Tag>
            ) : (
              <Tag color="success" icon={<CheckCircleFilled />} style={{ marginTop: 6 }}>
                {data.scope.label}
              </Tag>
            )}
          </div>
        </div>
      </div>

      {/* ── Gaps ──────────────────────────────────────────────────────── */}
      <div className="at-scope-section">
        <div className="at-scope-section-head">
          <AlertOutlined /> Gaps sur le périmètre ({data.gaps.length})
        </div>
        {data.gaps.length === 0 ? (
          <Empty description="Aucun gap sur le périmètre" />
        ) : (
          <Table<SkillGap>
            size="small"
            rowKey={(g) => `gap-${g.competence_id}`}
            pagination={false}
            dataSource={data.gaps}
            columns={[
              {
                title: 'Compétence',
                dataIndex: 'competence_nom',
                key: 'nom',
                render: (nom: string, g) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>{nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--at-ink3)' }}>{g.competence_code}</div>
                  </div>
                ),
              },
              {
                title: 'Gap',
                dataIndex: 'gap_score',
                key: 'gap',
                width: 90,
                render: (v: number) => (
                  <span style={{ fontWeight: 600, color: URGENCE_COLOR[urgenceColor(v)] }}>
                    {Math.round(v * 100)}%
                  </span>
                ),
              },
              {
                title: 'Urgence',
                dataIndex: 'niveau_urgence',
                key: 'urgence',
                width: 90,
                render: (u: string) => <Tag color={URGENCE_COLOR[u]}>{u}</Tag>,
              },
              {
                title: 'Tendance',
                dataIndex: 'en_regression',
                key: 'trend',
                width: 90,
                render: (decl: boolean) =>
                  decl ? <Tag color="error">Régression</Tag> : <Tag>Stable</Tag>,
              },
            ]}
          />
        )}
      </div>

      {/* ── Recommandations ────────────────────────────────────────────── */}
      <div className="at-scope-section">
        <div className="at-scope-section-head">
          <ThunderboltOutlined /> Formations ciblées ({data.recommendations.length})
        </div>
        {data.recommendations.length === 0 ? (
          <Empty description="Aucune recommandation pour ce périmètre" />
        ) : (
          <div className="at-scope-reco">
            {data.recommendations.map((r) => (
              <div key={`rec-${r.formation_id}-${r.competence_id}`} className="at-scope-reco-card">
                <div className="at-scope-reco-title-block">
                  <span className="at-scope-reco-title">{r.formation_titre}</span>
                  <div className="at-scope-reco-tags" style={{ marginTop: 4 }}>
                    <Tag color="blue" style={{ margin: 0 }}>
                      Pertinence : {Math.round((r.score_pertinence ?? 0) * 100)}/100
                    </Tag>
                  </div>
                  {r.competence_nom ? (
                    <div className="at-scope-reco-target" style={{ marginTop: 4, fontSize: 12 }}>
                      Cible : {r.competence_nom}
                    </div>
                  ) : null}
                </div>
                {r.justification ? (
                  <div className="at-scope-reco-justif">{r.justification}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
