import { useContext } from 'react';
import { NotificationContext } from '@/context/NotificationContext';
import type { NotificationContextValue } from '@/context/NotificationContext';

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
