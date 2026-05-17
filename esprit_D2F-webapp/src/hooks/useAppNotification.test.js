import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from 'antd';
import React from 'react';
import useAppNotification from './useAppNotification';

describe('useAppNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Mock wrapper that provides App context
  const wrapper = ({ children }) => React.createElement(App, {}, children);

  it('should return message, notification, and modal objects', () => {
    const { result } = renderHook(() => useAppNotification(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('message');
    expect(result.current).toHaveProperty('notification');
    expect(result.current).toHaveProperty('modal');
  });

  it('should provide message methods', () => {
    const { result } = renderHook(() => useAppNotification(), { wrapper });

    expect(result.current.message).toBeDefined();
    expect(typeof result.current.message.success).toBe('function');
    expect(typeof result.current.message.error).toBe('function');
    expect(typeof result.current.message.warning).toBe('function');
    expect(typeof result.current.message.info).toBe('function');
  });

  it('should provide notification methods', () => {
    const { result } = renderHook(() => useAppNotification(), { wrapper });

    expect(result.current.notification).toBeDefined();
    expect(typeof result.current.notification.success).toBe('function');
    expect(typeof result.current.notification.error).toBe('function');
    expect(typeof result.current.notification.warning).toBe('function');
    expect(typeof result.current.notification.info).toBe('function');
  });

  it('should provide modal methods', () => {
    const { result } = renderHook(() => useAppNotification(), { wrapper });

    expect(result.current.modal).toBeDefined();
    expect(typeof result.current.modal.confirm).toBe('function');
    expect(typeof result.current.modal.info).toBe('function');
    expect(typeof result.current.modal.success).toBe('function');
    expect(typeof result.current.modal.error).toBe('function');
  });

  it('should handle message calls without errors', () => {
    const { result } = renderHook(() => useAppNotification(), { wrapper });

    expect(() => {
      result.current.message.success('Test success');
      result.current.message.error('Test error');
      result.current.message.warning('Test warning');
      result.current.message.info('Test info');
    }).not.toThrow();
  });

  it('should handle notification calls without errors', () => {
    const { result } = renderHook(() => useAppNotification(), { wrapper });

    expect(() => {
      result.current.notification.success({ message: 'Test' });
      result.current.notification.error({ message: 'Test' });
      result.current.notification.warning({ message: 'Test' });
      result.current.notification.info({ message: 'Test' });
    }).not.toThrow();
  });

  it('should handle modal calls without errors', () => {
    const { result } = renderHook(() => useAppNotification(), { wrapper });

    expect(() => {
      result.current.modal.info({ title: 'Test', content: 'Test' });
      result.current.modal.success({ title: 'Test', content: 'Test' });
      result.current.modal.error({ title: 'Test', content: 'Test' });
    }).not.toThrow();
  });
});
