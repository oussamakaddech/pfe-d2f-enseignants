import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import WhatIfSimulator from '../WhatIfSimulator';
import type { WhatIfResponse } from '@/models/analyse';

const response: WhatIfResponse = {
  enseignant_id: 'ENS001',
  horizon_mois: 6,
  risk_before: { score: 0.7, niveau: 'ELEVE' },
  risk_after: { score: 0.4, niveau: 'MODERE' },
  risk_reduction: 0.3,
  nb_gaps_before: 3,
  nb_gaps_after: 1,
  nb_gaps_resolus: 2,
  details: [
    {
      competence_id: 1,
      niveau_actuel: 2,
      niveau_requis: 4,
      niveau_vise: 4,
      gap_avant: 2,
      gap_apres: 0,
      urgence_apres: 'FAIBLE',
      resolu: true,
    },
  ],
};

const hoisted = vi.hoisted(() => ({ shouldFail: false }));

vi.mock('@/hooks/analyse/useAnalytics', () => {
  return {
    useSimulateWhatIf: () => {
      const [data, setData] = useState<WhatIfResponse | null>(null);
      const [isError, setError] = useState(false);
      const [isPending, setPending] = useState(false);
      const mutateAsync = () => {
        if (hoisted.shouldFail) {
          setError(true);
          return Promise.resolve();
        }
        setPending(true);
        return Promise.resolve().then(() => {
          setData(response);
          setPending(false);
          return response;
        });
      };
      return { mutateAsync, data, isPending, isError };
    },
  };
});

describe('WhatIfSimulator', () => {
  it('renders the simulator title', () => {
    render(<WhatIfSimulator enseignantId="ENS001" />);
    expect(screen.getByText(/Simulation what-if/i)).toBeInTheDocument();
  });

  it('adds and removes action rows', () => {
    const { container } = render(<WhatIfSimulator enseignantId="ENS001" />);
    expect(screen.getAllByText(/Niveau visé/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Ajouter une action/i }));
    expect(screen.getAllByText('Compétence')).toHaveLength(2);
    const deleteButtons = container.querySelectorAll('button.ant-btn-dangerous');
    expect(deleteButtons).toHaveLength(2);
    fireEvent.click(deleteButtons[0]);
    expect(screen.getAllByText('Compétence')).toHaveLength(1);
  });

  it('runs the simulation and displays results', async () => {
    render(<WhatIfSimulator enseignantId="ENS001" />);
    fireEvent.click(screen.getByRole('button', { name: /Simuler l'impact/i }));
    await waitFor(() => expect(screen.getByText('Risque avant')).toBeInTheDocument());
    const hasText = (text: string) =>
      screen.getAllByText((_, el) => !!el && el.textContent === text).length > 0;
    expect(hasText('70%') || hasText('70')).toBe(true);
    expect(hasText('40%') || hasText('40')).toBe(true);
    expect(hasText('30%') || hasText('30')).toBe(true);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText('C1')).toBeInTheDocument();
  });

  it('shows error alert when simulation fails', async () => {
    hoisted.shouldFail = true;
    render(<WhatIfSimulator enseignantId="ENS001" />);
    fireEvent.click(screen.getByRole('button', { name: /Simuler l'impact/i }));
    await waitFor(() => expect(screen.getByText(/La simulation a échoué/i)).toBeInTheDocument());
    hoisted.shouldFail = false;
  });
});
