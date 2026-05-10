import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosHeaders, isAxiosError } from 'axios';
import { createApiClient } from '../httpClient';

vi.mock('axios', async () => {
  const actual = await vi.importActual('axios') as any;
  return {
    ...actual,
    default: {
      create: vi.fn(() => ({
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
        get: vi.fn(),
        post: vi.fn(),
      })),
      isAxiosError: vi.fn(),
    },
    isAxiosError: vi.fn(),
    AxiosHeaders: actual.AxiosHeaders,
  };
});

vi.mock('../navigation', () => ({
  navigate: vi.fn(),
}));

describe('httpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('creates an api client with interceptors', () => {
    const api = createApiClient('http://base.url');
    expect(axios.create).toHaveBeenCalledWith({ baseURL: 'http://base.url' });
    expect(api.interceptors.request.use).toHaveBeenCalled();
    expect(api.interceptors.response.use).toHaveBeenCalled();
    expect(typeof (api as any).isAxiosError).toBe('function');
  });

  it('isAxiosError helper works', () => {
    const api = createApiClient();
    (isAxiosError as any).mockReturnValue(true);
    expect((api as any).isAxiosError({})).toBe(true);
  });

  it('request interceptor attaches token if valid', async () => {
    const api = createApiClient();
    const requestHandler = (api.interceptors.request.use as any).mock.calls[0][0];
    
    // Valid token (exp in future)
    const future = Math.floor(Date.now() / 1000) + 3600;
    const token = `a.${btoa(JSON.stringify({ exp: future }))}.c`;
    localStorage.setItem('authToken', token);

    const config = { headers: new AxiosHeaders() };
    const out = await requestHandler(config);
    expect(out.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('request interceptor rejects expired token', async () => {
    const api = createApiClient();
    const requestHandler = (api.interceptors.request.use as any).mock.calls[0][0];
    
    // Expired token
    const token = `a.${btoa(JSON.stringify({ exp: 123 }))}.c`;
    localStorage.setItem('authToken', token);

    const config = { headers: new AxiosHeaders() };
    await expect(requestHandler(config)).rejects.toThrow('Token expired');
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('response interceptor handles 401', async () => {
    const api = createApiClient();
    const responseErrorHandler = (api.interceptors.response.use as any).mock.calls[0][1];
    
    const error = { response: { status: 401 }, config: { url: 'http://other' } };
    localStorage.setItem('authToken', 'test');

    await expect(responseErrorHandler(error)).rejects.toEqual(error);
    expect(localStorage.getItem('authToken')).toBeNull();
  });
});
