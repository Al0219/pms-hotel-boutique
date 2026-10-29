const propertyFormatters = new Map<string,Intl.DateTimeFormat>();
/** IANA property calendar, independent of the phone timezone. Invalid metadata fails closed. */
export function propertyDateTimeParts(instantMs: number, timezone: string): Record<string, string> | null {
  try {
    let formatter=propertyFormatters.get(timezone);
    if(!formatter){formatter=new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });propertyFormatters.set(timezone,formatter);}
    return Object.fromEntries(formatter.formatToParts(instantMs).map(part => [part.type, part.value]));
  } catch { return null; }
}
export function propertyCalendarDate(instantMs: number, timezone: string): string | null {
  const p = propertyDateTimeParts(instantMs, timezone);
  return p ? `${p.year}-${p.month}-${p.day}` : null;
}
/** Resolve a property wall time to UTC, including seasonal offsets; reject nonexistent wall times. */
export function propertyDateTimeMs(date: string, time: string, timezone: string): number | null {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let instant = wall;
  for (let i = 0; i < 4; i++) {
    const p = propertyDateTimeParts(instant, timezone);
    if (!p) return null;
    const actual = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
    if (actual === wall) return instant;
    instant += wall - actual;
  }
  return null;
}
