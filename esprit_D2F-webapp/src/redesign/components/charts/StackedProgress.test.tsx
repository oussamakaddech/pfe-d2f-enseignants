import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import StackedProgress from '@/redesign/components/charts/StackedProgress';

describe('StackedProgress', () => {
  it('affiche un message vide sans items', () => {
    render(<StackedProgress items={[]} />);
    expect(screen.getByText('Aucune donnée')).toBeInTheDocument();
  });
  it('affiche le label, le total et les segments', () => {
    render(
      <StackedProgress
        items={[
          {
            label: 'Info',
            segments: [
              { label: 'Critique', value: 9, color: '#ef4444' },
              { label: 'Faible', value: 1, color: '#10b981' },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText(/Critique 90%/)).toBeInTheDocument();
    expect(screen.getByText(/Faible 10%/)).toBeInTheDocument();
  });
  it('ignore un item à total 0', () => {
    const { container } = render(
      <StackedProgress
        items={[{ label: 'Vide', segments: [{ label: 'A', value: 0, color: '#000' }] }]}
      />,
    );
    expect(container.querySelectorAll('.sp-row')).toHaveLength(0);
  });

  it('utilise le total explicite fourni', () => {
    render(
      <StackedProgress
        items={[
          {
            label: 'T',
            total: 100,
            segments: [
              { label: 'A', value: 25, color: '#000' },
              { label: 'B', value: 25, color: '#111' },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText(/A 25%/)).toBeInTheDocument();
    expect(screen.getByText(/B 25%/)).toBeInTheDocument();
  });

  it('rend plusieurs items et segments multiples', () => {
    render(
      <StackedProgress
        items={[
          {
            label: 'Un',
            segments: [
              { label: 'P', value: 1, color: '#aaa' },
              { label: 'Q', value: 1, color: '#bbb' },
            ],
          },
          {
            label: 'Deux',
            segments: [
              { label: 'R', value: 3, color: '#ccc' },
              { label: 'S', value: 1, color: '#ddd' },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText('Un')).toBeInTheDocument();
    expect(screen.getByText('Deux')).toBeInTheDocument();
    expect(screen.getByText(/P 50%/)).toBeInTheDocument();
    expect(screen.getByText(/S 25%/)).toBeInTheDocument();
  });

  it('applique la hauteur personnalisée', () => {
    const { container } = render(
      <StackedProgress
        height={42}
        items={[{ label: 'H', segments: [{ label: 'A', value: 1, color: '#000' }] }]}
      />,
    );
    expect(container.querySelector('.sp-track')?.getAttribute('style')).toContain('height: 42px');
  });

  it('met en surbrillance un segment au survol et retire au départ', () => {
    render(
      <StackedProgress
        items={[
          {
            label: 'H',
            segments: [
              { label: 'A', value: 1, color: '#000' },
              { label: 'B', value: 1, color: '#111' },
            ],
          },
        ]}
      />,
    );
    const segA = screen.getByTitle('A: 1 (50%)');
    fireEvent.mouseEnter(segA);
    expect(segA.getAttribute('style')).toContain('brightness(1.1)');
    fireEvent.mouseLeave(segA);
    expect(screen.getByTitle('A: 1 (50%)').getAttribute('style')).not.toContain('brightness(1.1)');
  });

  it('affiche le titre de segment avec pourcentage arrondi', () => {
    render(
      <StackedProgress
        items={[
          {
            label: 'H',
            segments: [
              { label: 'A', value: 1, color: '#000' },
              { label: 'B', value: 2, color: '#111' },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByTitle('B: 2 (67%)')).toBeInTheDocument();
    expect(screen.getByTitle('A: 1 (33%)')).toBeInTheDocument();
  });
});
