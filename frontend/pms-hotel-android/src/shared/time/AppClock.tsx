import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

export const appClockModes = [
  'SYSTEM',
  'BEFORE_CHECKIN',
  'CHECKIN_DAY',
  'IN_STAY',
  'CHECKOUT_DAY',
  'CHECKOUT_CUTOFF',
  'AFTER_STAY',
  'CUSTOM',
] as const;

export type AppClockMode = (typeof appClockModes)[number];
export type AppClockPresetMode = Exclude<AppClockMode, 'SYSTEM' | 'CUSTOM'>;

interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export const appClockPresetParts: Readonly<Record<AppClockPresetMode, LocalDateTimeParts>> = {
  BEFORE_CHECKIN: { year: 2026, month: 8, day: 27, hour: 10, minute: 0 },
  CHECKIN_DAY: { year: 2026, month: 8, day: 28, hour: 10, minute: 0 },
  IN_STAY: { year: 2026, month: 9, day: 11, hour: 10, minute: 0 },
  CHECKOUT_DAY: { year: 2026, month: 9, day: 18, hour: 9, minute: 0 },
  CHECKOUT_CUTOFF: { year: 2026, month: 9, day: 18, hour: 11, minute: 31 },
  AFTER_STAY: { year: 2026, month: 9, day: 19, hour: 10, minute: 0 },
};

function createLocalDate(parts: LocalDateTimeParts): Date {
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
}

export function getAppClockPresetDate(mode: AppClockPresetMode): Date {
  return createLocalDate(appClockPresetParts[mode]);
}

export interface AppClock {
  mode: AppClockMode;
  customDate: Date;
  getNow: () => Date;
  nowMs: () => number;
  setMode: (mode: AppClockMode) => void;
  setCustomDate: (date: Date) => void;
}

export interface AppClockProviderProps extends PropsWithChildren {
  initialMode?: AppClockMode;
  initialCustomDate?: Date;
}

const fallbackSystemClock: AppClock = {
  mode: 'SYSTEM',
  customDate: new Date(),
  getNow: () => new Date(),
  nowMs: () => Date.now(),
  setMode: () => undefined,
  setCustomDate: () => undefined,
};

const AppClockContext = createContext<AppClock | null>(null);

/** Central app clock. Fixed modes always use local calendar constructors, never UTC parsing. */
export function AppClockProvider({ children, initialCustomDate, initialMode = 'SYSTEM' }: AppClockProviderProps) {
  const [mode, setMode] = useState<AppClockMode>(initialMode);
  const [customTimeMs, setCustomTimeMs] = useState(() => {
    const initial = initialCustomDate?.getTime();
    return initial !== undefined && Number.isFinite(initial) ? initial : Date.now();
  });

  const setCustomDate = useCallback((date: Date) => {
    const nextTimeMs = date.getTime();
    if (!Number.isFinite(nextTimeMs)) return;
    setCustomTimeMs(nextTimeMs);
    setMode('CUSTOM');
  }, []);

  const getNow = useCallback(() => {
    if (mode === 'SYSTEM') return new Date();
    if (mode === 'CUSTOM') return new Date(customTimeMs);
    return getAppClockPresetDate(mode);
  }, [customTimeMs, mode]);
  const nowMs = useCallback(() => getNow().getTime(), [getNow]);

  const value = useMemo<AppClock>(() => ({
    mode,
    customDate: new Date(customTimeMs),
    getNow,
    nowMs,
    setMode,
    setCustomDate,
  }), [customTimeMs, getNow, mode, nowMs, setCustomDate]);

  return <AppClockContext.Provider value={value}>{children}</AppClockContext.Provider>;
}

/** Falls back to the system clock so isolated components keep working outside the app root. */
export function useAppClock(): AppClock {
  return useContext(AppClockContext) ?? fallbackSystemClock;
}
