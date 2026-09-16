import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setNavigate, navigate, resetNavigate } from './navigation';

describe('navigation', () => {
  let hrefSetter: ReturnType<typeof vi.fn>;
  let replaceFn: ReturnType<typeof vi.fn>;
  let originalLocation: Location;

  beforeEach(() => {
    resetNavigate();
    hrefSetter = vi.fn();
    replaceFn = vi.fn();
    originalLocation = globalThis.location;
    const fake = {
      replace: replaceFn,
      get href() {
        return '';
      },
      set href(v: string) {
        hrefSetter(v);
      },
    };
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: fake,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: originalLocation,
    });
    resetNavigate();
    vi.restoreAllMocks();
  });

  it('uses the registered navigate function', () => {
    const fn = vi.fn();
    setNavigate(fn);
    navigate('/home', { replace: true });
    expect(fn).toHaveBeenCalledWith('/home', { replace: true });
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  it('falls back to location.href when no navigate registered', () => {
    navigate('/target');
    expect(hrefSetter).toHaveBeenCalledWith('/target');
  });

  it('falls back to location.replace when replace option is set', () => {
    navigate('/target', { replace: true });
    expect(replaceFn).toHaveBeenCalledWith('/target');
  });

  it('falls back to location when navigate throws', () => {
    setNavigate(() => {
      throw new Error('router failed');
    });
    navigate('/x');
    expect(hrefSetter).toHaveBeenCalledWith('/x');
  });

  it('resetNavigate clears the registered function', () => {
    const fn = vi.fn();
    setNavigate(fn);
    resetNavigate();
    navigate('/y');
    expect(fn).not.toHaveBeenCalled();
    expect(hrefSetter).toHaveBeenCalledWith('/y');
  });
});
