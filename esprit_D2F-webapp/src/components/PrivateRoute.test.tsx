import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PrivateRoute from './PrivateRoute';
import { AuthContext } from '../context/AuthContext';

// Mock component to render inside PrivateRoute
const ProtectedComponent = () => <div>Protected Content</div>;

describe('PrivateRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render protected component when user is authenticated', () => {
    const mockAuthContext = {
      user: { id: 1, username: 'testuser' },
      isAuthenticated: true,
      loading: false,
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <PrivateRoute>
            <ProtectedComponent />
          </PrivateRoute>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', () => {
    const mockAuthContext = {
      user: null,
      isAuthenticated: false,
      loading: false,
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <PrivateRoute>
            <ProtectedComponent />
          </PrivateRoute>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should show loading state while checking authentication', () => {
    const mockAuthContext = {
      user: null,
      isAuthenticated: false,
      loading: true,
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <PrivateRoute>
            <ProtectedComponent />
          </PrivateRoute>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    // Should show loading indicator or nothing while loading
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should enforce role-based access control', () => {
    const mockAuthContext = {
      user: { id: 1, username: 'testuser', role: 'USER' },
      isAuthenticated: true,
      loading: false,
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <PrivateRoute requiredRole="ADMIN">
            <ProtectedComponent />
          </PrivateRoute>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    // Should not render if user doesn't have required role
    // Behavior depends on implementation
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should allow access with matching role', () => {
    const mockAuthContext = {
      user: { id: 1, username: 'testuser', role: 'ADMIN' },
      isAuthenticated: true,
      loading: false,
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <PrivateRoute requiredRole="ADMIN">
            <ProtectedComponent />
          </PrivateRoute>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should handle multiple allowed roles', () => {
    const mockAuthContext = {
      user: { id: 1, username: 'testuser', role: 'TEACHER' },
      isAuthenticated: true,
      loading: false,
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <PrivateRoute requiredRoles={['ADMIN', 'TEACHER']}>
            <ProtectedComponent />
          </PrivateRoute>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should preserve route state after authentication', () => {
    const mockAuthContext = {
      user: { id: 1, username: 'testuser' },
      isAuthenticated: true,
      loading: false,
    };

    const { rerender } = render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <PrivateRoute>
            <ProtectedComponent />
          </PrivateRoute>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();

    // Component should remain mounted
    rerender(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <PrivateRoute>
            <ProtectedComponent />
          </PrivateRoute>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
