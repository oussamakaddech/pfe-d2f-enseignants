import { describe, it, expect, vi, afterEach } from 'vitest';
import { greeting } from './greeting';

describe('greeting', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const at = (hour: number) => {
    vi.useFakeTimers();
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    vi.setSystemTime(d);
  };

  it('returns Bonjour in the morning', () => {
    at(8);
    expect(greeting()).toEqual({ text: 'Bonjour', emoji: '🌅' });
  });
  it('returns Bon après-midi in the afternoon', () => {
    at(14);
    expect(greeting()).toEqual({ text: 'Bon après-midi', emoji: '☀️' });
  });
  it('returns Bonsoir in the evening', () => {
    at(20);
    expect(greeting()).toEqual({ text: 'Bonsoir', emoji: '🌙' });
  });
  it('boundary at 12 is afternoon', () => {
    at(12);
    expect(greeting().text).toBe('Bon après-midi');
  });
  it('boundary at 18 is evening', () => {
    at(18);
    expect(greeting().text).toBe('Bonsoir');
  });
});
