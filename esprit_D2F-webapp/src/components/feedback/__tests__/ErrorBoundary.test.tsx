import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

function Boom(): never {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>ok content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('ok content')).toBeInTheDocument();
  });

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();
    expect(screen.getAllByText(/kaboom/i).length).toBeGreaterThan(0);
  });

  it('resets the error state via the retry button', () => {
    let shouldThrow = true;
    function Toggle(): JSX.Element {
      if (shouldThrow) throw new Error('kaboom');
      return <div>recovered</div>;
    }
    render(
      <ErrorBoundary>
        <Toggle />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /Réessayer/i }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });
});
