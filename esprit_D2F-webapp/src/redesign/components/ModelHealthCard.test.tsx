import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ModelHealthCard from '@/redesign/components/ModelHealthCard';
import type { ModelPerformance, DriftReport } from '@/models/analyse';

const perf: ModelPerformance = {
  gap_model_accuracy: 0.82,
  recommendation_avg_proba: 0.7,
  last_retrained: '2024-01-15T10:00:00Z',
  last_retrain_status: 'OK',
};
const drift: DriftReport = { drift_detected: false };

describe('ModelHealthCard', () => {
  it('affiche le skeleton en loading sans perf', () => {
    const { container } = render(<ModelHealthCard modelPerf={null} drift={null} loading />);
    expect(container.querySelector('.rd-skel-block')).toBeInTheDocument();
  });
  it('calcule un score sain quand tout est bon', () => {
    render(<ModelHealthCard modelPerf={perf} drift={drift} loading={false} />);
    expect(screen.getAllByText('82 %').length).toBeGreaterThan(0);
    expect(screen.getByText('Bon état')).toBeInTheDocument();
    expect(screen.getByText('Non')).toBeInTheDocument();
    expect(screen.getByText(/15\/01\/2024/)).toBeInTheDocument();
  });
  it('affiche une dérive détectée', () => {
    render(
      <ModelHealthCard
        modelPerf={perf}
        drift={{ drift_detected: true, message: 'Dérive!' }}
        loading={false}
      />,
    );
    expect(screen.getByText('Dérive détectée')).toBeInTheDocument();
    expect(screen.getByText('Dérive!')).toBeInTheDocument();
  });
  it('affiche un avertissement de précision faible', () => {
    render(
      <ModelHealthCard
        modelPerf={{ ...perf, gap_model_accuracy: 0.3 }}
        drift={drift}
        loading={false}
      />,
    );
    expect(screen.getByText('Précision faible')).toBeInTheDocument();
  });
  it("applique la pénalité d'entraînement absent", () => {
    const { container } = render(
      <ModelHealthCard
        modelPerf={{ ...perf, last_retrained: null }}
        drift={drift}
        loading={false}
      />,
    );
    expect(container.textContent).toContain('—');
  });
});
