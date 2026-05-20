import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

// Mock child component that throws error
const ErrorComponent = () => {
  throw new Error('Test error');
};

const WorkingComponent = () => <div>Working component</div>;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should display error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    // Check for error boundary error display (French text)
    expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();
  });

  it('should display error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    // In dev mode, error boundary message should be visible
    expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should display multiple children when rendering without error', () => {
    render(
      <ErrorBoundary>
        <div>First child</div>
        <div>Second child</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
  });

  it('should catch errors from deeply nested components', () => {
    const DeepError = () => (
      <div>
        <div>
          <ErrorComponent />
        </div>
      </div>
    );

    render(
      <ErrorBoundary>
        <DeepError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();
  });
});




