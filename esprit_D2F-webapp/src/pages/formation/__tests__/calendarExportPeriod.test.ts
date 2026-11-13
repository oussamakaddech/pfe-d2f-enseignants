import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import {
  CALENDAR_EXPORT_DEFAULT_END,
  CALENDAR_EXPORT_DEFAULT_START,
  exportFileName,
  exportPayload,
  exportPeriod,
  exportPeriodLabel,
} from '../calendarExportPeriod';

describe('calendarExportPeriod', () => {
  it('retombe sur toutes les dates quand aucune période n’est choisie', () => {
    expect(exportPeriod(null)).toEqual({
      start: CALENDAR_EXPORT_DEFAULT_START,
      end: CALENDAR_EXPORT_DEFAULT_END,
    });
    expect(exportPeriod(undefined)).toEqual({
      start: CALENDAR_EXPORT_DEFAULT_START,
      end: CALENDAR_EXPORT_DEFAULT_END,
    });
  });

  it('convertit la période choisie au format attendu par le back (yyyy-MM-dd)', () => {
    const range = [dayjs('2026-03-01'), dayjs('2026-06-30')] as const;
    expect(exportPeriod(range)).toEqual({ start: '2026-03-01', end: '2026-06-30' });
  });

  it('ignore une période incomplète plutôt que de tronquer l’intervalle', () => {
    const incomplete = [dayjs('2026-03-01'), null] as unknown as readonly [
      ReturnType<typeof dayjs>,
      ReturnType<typeof dayjs>,
    ];
    expect(exportPeriod(incomplete)).toEqual({
      start: CALENDAR_EXPORT_DEFAULT_START,
      end: CALENDAR_EXPORT_DEFAULT_END,
    });
  });

  it('compose le payload avec la période, l’UP et le département', () => {
    const range = [dayjs('2026-03-01'), dayjs('2026-06-30')] as const;
    expect(exportPayload(range, { up: 'UP_GC', departement: 'DEPT_GC' })).toEqual({
      start: '2026-03-01',
      end: '2026-06-30',
      up: 'UP_GC',
      departement: 'DEPT_GC',
    });
  });

  it('omet les filtres UP / département non renseignés', () => {
    expect(exportPayload(null, { up: null, departement: '  ' })).toEqual({
      start: CALENDAR_EXPORT_DEFAULT_START,
      end: CALENDAR_EXPORT_DEFAULT_END,
    });
  });

  it('compose le nom de fichier avec la période et le périmètre', () => {
    const range = [dayjs('2026-03-01'), dayjs('2026-06-30')] as const;
    expect(exportFileName(range, '2026-11-13')).toBe(
      'calendrier_formations_2026-03-01_2026-06-30_2026-11-13.xlsx',
    );
    expect(exportFileName(range, '2026-11-13', { up: 'UP_GC' })).toBe(
      'calendrier_formations_2026-03-01_2026-06-30_UP_GC_2026-11-13.xlsx',
    );
    expect(exportFileName(null, '2026-11-13')).toBe('calendrier_formations_2026-11-13.xlsx');
  });

  it('étiquette la période et le périmètre pour le message de succès', () => {
    const range = [dayjs('2026-03-01'), dayjs('2026-06-30')] as const;
    expect(exportPeriodLabel(range)).toBe(' (du 01/03/2026 au 30/06/2026)');
    expect(exportPeriodLabel(range, { up: 'UP_GC', departement: 'DEPT_GC' })).toBe(
      ' (du 01/03/2026 au 30/06/2026 · UP : UP_GC · Département : DEPT_GC)',
    );
    expect(exportPeriodLabel(null)).toBe('');
  });
});
