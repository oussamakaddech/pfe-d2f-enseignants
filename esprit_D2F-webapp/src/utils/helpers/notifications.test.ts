import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerMessageApi, notify } from './notifications';

describe('notifications', () => {
  const api = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing before an api is registered (no throw)', () => {
    expect(() => notify.success('x')).not.toThrow();
  });

  it('forwards calls to the registered api', () => {
    registerMessageApi(api);
    notify.success('ok');
    notify.error('bad');
    notify.warning('warn');
    notify.info('info');
    expect(api.success).toHaveBeenCalledWith('ok');
    expect(api.error).toHaveBeenCalledWith('bad');
    expect(api.warning).toHaveBeenCalledWith('warn');
    expect(api.info).toHaveBeenCalledWith('info');
  });
});
