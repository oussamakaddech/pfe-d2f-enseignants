import '@testing-library/jest-dom/vitest';

if (!globalThis.matchMedia) {
  globalThis.matchMedia = ((query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList)) as typeof window.matchMedia;
}
