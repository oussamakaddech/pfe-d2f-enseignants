import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ParticipantsTable from '../ParticipantsTable';

describe('ParticipantsTable', () => {
  it('ne rend rien sans participants', () => {
    const { container } = render(<ParticipantsTable value="" onRemove={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('affiche les colonnes Participant, Email et Téléphone', () => {
    render(
      <ParticipantsTable
        value={'Ben Ali Sarra <sarra@esprit.tn> (tél: +21620123456)\nDoe John'}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText('Participant')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Téléphone')).toBeInTheDocument();
    expect(screen.getByText('Ben Ali Sarra')).toBeInTheDocument();
    expect(screen.getByText('sarra@esprit.tn')).toBeInTheDocument();
    expect(screen.getByText('+21620123456')).toBeInTheDocument();
    expect(screen.getByText('Doe John')).toBeInTheDocument();
  });

  it('appelle onRemove avec le bon index', () => {
    const onRemove = vi.fn();
    render(
      <ParticipantsTable value={'Alice <a@esprit.tn>\nBob <b@esprit.tn>'} onRemove={onRemove} />,
    );
    const buttons = screen.getAllByRole('button', { name: /Retirer/ });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]);
    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
