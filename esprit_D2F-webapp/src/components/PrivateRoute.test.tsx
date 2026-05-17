import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PrivateRoute from './PrivateRoute';
import { AuthContext } from '../context/AuthContext';
import type { AuthContextValue } from '../models/auth';

// Mock component to render inside PrivateRoute via Outlet
const ProtectedComponent = () => <div>Protected Content</div>;
const LoginPage = () => <div>Login Page</div>;

describe('PrivateRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow access when authenticated', () => {
    const mockAuthContext: AuthContextValue = {
      user: { 
        id: 1, 
        username: 'testuser',
        userName: 'testuser',
        emailAddress: 'test@example.com',
        role: 'USER'
      },
      login: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<ProtectedComponent />} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should render protected component when authenticated', () => {
    const mockAuthContext: AuthContextValue = {
      user: {
        id: 1,
        username: 'testuser',
        userName: 'testuser',
        emailAddress: 'test@example.com',
        role: 'USER'
      },
      login: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<ProtectedComponent />} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', () => {
    const mockAuthContext: AuthContextValue = {
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<ProtectedComponent />} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    // When not authenticated, should redirect to login
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should handle auth context null gracefully', () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={undefined}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<ProtectedComponent />} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    // Should redirect to login when auth context is null/undefined
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
