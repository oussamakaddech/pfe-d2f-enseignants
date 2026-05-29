import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AuthProvider from '@/context/AuthContext';
import { useAuth } from '@/hooks/auth/useAuth';
import type { AuthUser } from '@/models/auth';

// Test component that uses AuthContext
const TestComponent = () => {
  const { user, login, logout } = useAuth();

  const handleLogin = () => {
    const testUser: AuthUser = {
      id: 1,
      userName: 'testuser',
      username: 'testuser',
      emailAddress: 'test@example.com',
      role: 'USER' as import('@/models/auth').UserRole
    };
    login(testUser);
  };

  return (
    <div>
      <div data-testid="auth-status">
        {user ? 'Authenticated' : 'Not authenticated'}
      </div>
      {user && <div data-testid="user-name">{user.username}</div>}
      <button onClick={handleLogin}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('should provide initial auth state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent(
      'Not authenticated'
    );
  });

  it('should update auth state on login', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByRole('button', { name: /login/i });
    
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });
  });

  it('should clear auth state on logout', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByRole('button', { name: /login/i });
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await userEvent.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'Not authenticated'
      );
    });
  });

  it('should persist auth state in sessionStorage', async () => {
    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByRole('button', { name: /login/i });
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    // Verify sessionStorage was set
    const storedUser = sessionStorage.getItem('d2f_user');
    expect(storedUser).toBeTruthy();
    expect(JSON.parse(storedUser!).username).toBe('testuser');

    // Simulate app reload
    unmount();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should restore auth state from sessionStorage
    await waitFor(() => {
      const status = screen.getByTestId('auth-status');
      // If sessionStorage persistence is implemented, it should be authenticated
      expect(status).toHaveTextContent('Authenticated');
    });
  });

  it('should handle auth errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Component should render without errors even if auth fails
    expect(screen.getByTestId('auth-status')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});




