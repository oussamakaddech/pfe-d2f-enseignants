import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import AuthProvider from '@/context/AuthContext';
import { useAuth } from '@/hooks/auth/useAuth';
import { refreshToken as refreshTokenApi, logout as logoutApi } from '@/services/auth/AuthService';

vi.mock('@/services/auth/AuthService', () => ({
  refreshToken: vi.fn(),
  logout: vi.fn(() => Promise.resolve()),
}));

const Capture = ({ onCtx }: { onCtx: (c: unknown) => void }) => {
  onCtx(useAuth());
  return null;
};

const renderWithCapture = () => {
  const ref: { current: unknown } = { current: null };
  const utils = render(
    <AuthProvider>
      <Capture
        onCtx={(c) => {
          ref.current = c;
        }}
      />
    </AuthProvider>,
  );
  return {
    utils,
    getCtx: () => ref.current as { user: unknown; login: (u: unknown) => void; logout: () => void },
  };
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    (refreshTokenApi as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 1,
      username: 'u',
      role: 'ENSEIGNANT',
      email: 'e',
      expiresIn: 100,
    });
  });

  it('provides null user initially when nothing stored', async () => {
    const { getCtx } = renderWithCapture();
    await act(async () => {});
    expect(getCtx().user).toBeNull();
  });

  it('login sets the user and persists to sessionStorage', async () => {
    (refreshTokenApi as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 9,
      username: 'x',
      role: 'ADMIN',
      email: 'e',
      expiresIn: 100,
    });
    const { getCtx } = renderWithCapture();
    await act(async () => {
      getCtx().login({ userId: 9, username: 'x', role: 'ADMIN' } as never);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(getCtx().user).toMatchObject({ username: 'x' });
    expect(sessionStorage.getItem('d2f_user')).toContain('x');
  });

  it('logout clears the user and sessionStorage and calls logoutApi', async () => {
    const { getCtx } = renderWithCapture();
    await act(async () => {
      getCtx().login({ userId: 9, username: 'x', role: 'ADMIN' } as never);
    });
    await act(async () => {
      getCtx().logout();
    });
    expect(getCtx().user).toBeNull();
    expect(sessionStorage.getItem('d2f_user')).toBeNull();
    expect(logoutApi).toHaveBeenCalled();
  });

  it('logout clears user even when logoutApi rejects', async () => {
    (logoutApi as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('net'));
    const { getCtx } = renderWithCapture();
    await act(async () => {
      getCtx().login({ userId: 1, username: 'a', role: 'ENSEIGNANT' } as never);
    });
    await act(async () => {
      getCtx().logout();
    });
    expect(getCtx().user).toBeNull();
  });

  it('doRefresh updates the user on success', async () => {
    (refreshTokenApi as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 1,
      username: 'refreshed',
      role: 'ENSEIGNANT',
      email: 'e',
      expiresIn: 100,
    });
    const { getCtx } = renderWithCapture();
    await act(async () => {
      getCtx().login({ userId: 1, username: 'a', role: 'ENSEIGNANT' } as never);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect((getCtx().user as { username: string }).username).toBe('refreshed');
  });

  it('useAuth throws outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<NoProvider />)).toThrow(/useAuth must be used within an AuthProvider/);
    spy.mockRestore();
  });
});

function NoProvider() {
  useAuth();
  return null;
}
