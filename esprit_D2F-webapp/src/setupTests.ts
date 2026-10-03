import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// La CI exécute ~190 fichiers en parallèle : les animations antd et le
// rendu jsdom peuvent dépasser le timeout par défaut (1000 ms) de waitFor.
configure({ asyncUtilTimeout: 10000 });

if (!globalThis.matchMedia) {
  globalThis.matchMedia = ((query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as typeof ResizeObserver;
}

if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '0px';
    readonly thresholds = [];

    constructor(_callback: IntersectionObserverCallback) {}

    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as typeof IntersectionObserver;
}
