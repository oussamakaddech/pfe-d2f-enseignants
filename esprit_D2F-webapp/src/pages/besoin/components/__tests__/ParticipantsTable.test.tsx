import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ParticipantsTable from '../ParticipantsTable';

describe('ParticipantsTable', () => {
  it('affiche le bouton Ajouter même sans participants', () => {
    render(
      <ParticipantsTable value="" onAdd={vi.fn()} onEdit={vi.fn()} onRemove={vi.fn()} />,
    );
    expect(screen.getByText('Ajouter un participant')).toBeInTheDocument();
    expect(screen.getByText(/Aucun participant/)).toBeInTheDocument();
  });

  it('affiche les colonnes Nom, Email et Téléphone', () => {
    render(
      <ParticipantsTable
        value={'Ben Ali Sarra <sarra@esprit.tn> (tél: +21620123456)\nDoe John'}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText('Nom complet')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Téléphone')).toBeInTheDocument();
    expect(screen.getByText('Ben Ali Sarra')).toBeInTheDocument();
    expect(screen.getByText('sarra@esprit.tn')).toBeInTheDocument();
    expect(screen.getByText('+21620123456')).toBeInTheDocument();
    expect(screen.getByText('Doe John')).toBeInTheDocument();
  });

  it('appelle onRemove avec le bon index via le popconfirm', () => {
    const onRemove = vi.fn();
    render(
      <ParticipantsTable
        value={'Alice <a@esprit.tn>\nBob <b@esprit.tn>'}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onRemove={onRemove}
      />,
    );
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons).toHaveLength(2);
    fireEvent.click(deleteButtons[1]);
    const confirmButton = screen.getByRole('button', { name: /Retirer/i });
    fireEvent.click(confirmButton);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('affiche le bouton Ajouter un participant', () => {
    render(
      <ParticipantsTable value="" onAdd={vi.fn()} onEdit={vi.fn()} onRemove={vi.fn()} />,
    );
    expect(screen.getByText('Ajouter un participant')).toBeInTheDocument();
  });
});
