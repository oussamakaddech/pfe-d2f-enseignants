import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import NotificationCenter from '../NotificationCenter';
import type { AppNotification, ConnectionStatus, NotificationContextValue } from '@/models/notification';

vi.mock('@/hooks/notification', () => ({
  useNotifications: vi.fn(),
}));

vi.mock('../NotificationItem', () => ({
  default: ({ notification }: { notification: AppNotification }) => (
    <div className="notif-item">item:{notification.title}</div>
  ),
}));

import { useNotifications } from '@/hooks/notification';

const notif: AppNotification = {
  id: 'N1', type: 'FORMATION', severity: 'info', title: 'Nouvelle formation',
  message: 'msg', read: false, createdAt: new Date().toISOString(),
};

const base: NotificationContextValue = {
  notifications: [notif],
  unreadCount: 1,
  status: 'open' as ConnectionStatus,
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  remove: vi.fn(),
  clearAll: vi.fn(),
  addNotification: vi.fn(),
};

function setup(overrides: Partial<NotificationContextValue> = {}) {
  vi.mocked(useNotifications).mockReturnValue({ ...base, ...overrides } as NotificationContextValue);
  return render(
    <BrowserRouter>
      <NotificationCenter />
    </BrowserRouter>
  );
}

describe('NotificationCenter', () => {
  it('renders the bell trigger with unread badge', () => {
    setup();
    expect(screen.getByRole('button', { name: /Notifications/i })).toBeInTheDocument();
  });

  it('shows notifications after opening the popover', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('item:Nouvelle formation')).toBeInTheDocument();
  });

  it('calls markAllAsRead when the read-all button is clicked', async () => {
    const markAllAsRead = vi.fn();
    setup({ markAllAsRead });
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    const header = await screen.findByText('Notifications');
    const btn = header.closest('.notif-panel__header')!.querySelector('button:not(.ant-btn-dangerous)')!;
    fireEvent.click(btn);
    expect(markAllAsRead).toHaveBeenCalled();
  });

  it('calls clearAll when the clear button is clicked', async () => {
    const clearAll = vi.fn();
    setup({ clearAll });
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    const header = await screen.findByText('Notifications');
    const btn = header.closest('.notif-panel__header')!.querySelector('button.ant-btn-dangerous')!;
    fireEvent.click(btn);
    expect(clearAll).toHaveBeenCalled();
  });

  it('filters to unread when the unread segmented option is selected', () => {
    const read: AppNotification = { ...notif, id: 'N2', title: 'Déjà lue', read: true };
    setup({ notifications: [notif, read], unreadCount: 1 });
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    expect(screen.getByText('item:Nouvelle formation')).toBeInTheDocument();
    expect(screen.getByText('item:Déjà lue')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Non lues/i }));
    expect(screen.getByText('item:Nouvelle formation')).toBeInTheDocument();
    expect(screen.queryByText('item:Déjà lue')).not.toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    setup({ notifications: [], unreadCount: 0 });
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    expect(screen.getByText(/Aucune notification/i)).toBeInTheDocument();
  });
});
