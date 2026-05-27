import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { isAxiosError } from 'axios';
import { createApiClient } from "@/utils/helpers/httpClient";
import { navigate } from "@/utils/helpers/navigation";

const notifyMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
}));

vi.mock('axios', async () => {
  const actual = await vi.importActual('axios') as any;
  return {
    ...actual,
    default: {
      create: vi.fn(() => ({
        interceptors: {
          response: { use: vi.fn() },
        },
        get: vi.fn(),
        post: vi.fn(),
      })),
      isAxiosError: vi.fn(),
    },
    isAxiosError: vi.fn(),
  };
});

vi.mock('@/utils/helpers/navigation', () => ({
  navigate: vi.fn(),
}));

vi.mock('@/utils/helpers/notifications', () => ({
  notify: notifyMocks,
}));

describe('httpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('creates an api client with withCredentials', () => {
    const api = createApiClient('http://base.url');
    expect(axios.create).toHaveBeenCalledWith({ baseURL: 'http://base.url', withCredentials: true });
    expect(api.interceptors.response.use).toHaveBeenCalled();
    expect(typeof (api as any).isAxiosError).toBe('function');
  });

  it('isAxiosError helper works', () => {
    const api = createApiClient();
    (isAxiosError as any).mockReturnValue(true);
    expect((api as any).isAxiosError({})).toBe(true);
  });

  it('response interceptor handles 401 by dispatching event', async () => {
    const api = createApiClient();
    const responseErrorHandler = (api.interceptors.response.use as any).mock.calls[0][1];
    
    // Mock location to not be on login page
    Object.defineProperty(window, 'location', {
      value: { pathname: '/home/profile', replace: vi.fn(), href: '' },
      writable: true,
      configurable: true,
    });
    
    const error = { response: { status: 401 }, config: { url: 'http://other' } };
    
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    await expect(responseErrorHandler(error)).rejects.toEqual(error);
    
    expect(dispatchEventSpy).toHaveBeenCalled();
    const event = dispatchEventSpy.mock.calls[0][0] as Event;
    expect(event.type).toBe('auth:loggedOut');
    
    // It should also navigate to login if not already on login
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('throttles repeated network error toasts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T10:00:00Z'));

    const api = createApiClient();
    const responseErrorHandler = (api.interceptors.response.use as any).mock.calls[0][1];

    await expect(responseErrorHandler({ config: { url: '/foo' } })).rejects.toEqual({ config: { url: '/foo' } });
    expect(notifyMocks.error).toHaveBeenCalledTimes(1);

    await expect(responseErrorHandler({ config: { url: '/bar' } })).rejects.toEqual({ config: { url: '/bar' } });
    expect(notifyMocks.error).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-05-27T10:00:11Z'));
    await expect(responseErrorHandler({ config: { url: '/baz' } })).rejects.toEqual({ config: { url: '/baz' } });
    expect(notifyMocks.error).toHaveBeenCalledTimes(2);
  });
});




