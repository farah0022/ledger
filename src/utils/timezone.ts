import { useState, useEffect } from 'react';

export interface TimezoneLocationInfo {
  timezone: string;
  cityName: string;
  utcOffset: string;
  formattedDisplay: string;
}

/**
 * Detects the user's current timezone and produces a clean, human-readable city/region name
 */
export function detectUserTimezone(): TimezoneLocationInfo {
  let tz = 'UTC';
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }
  } catch {
    tz = 'UTC';
  }

  // Derive human-friendly city name from IANA timezone (e.g. "America/New_York" -> "New York")
  const parts = tz.split('/');
  const rawCity = parts.length > 1 ? parts[parts.length - 1].replace(/_/g, ' ') : tz;

  // Calculate UTC offset
  let offsetStr = 'UTC';
  try {
    const now = new Date();
    const dStr = now.toLocaleDateString('en-US', { timeZone: tz, timeZoneName: 'short' });
    const match = dStr.split(', ');
    const abbr = match.length > 1 ? match[1] : '';

    const offsetMinutes = -now.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const mins = Math.abs(offsetMinutes) % 60;
    const offsetNum = mins > 0 ? `UTC${sign}${hours}:${String(mins).padStart(2, '0')}` : `UTC${sign}${hours}`;

    offsetStr = abbr ? `${abbr} (${offsetNum})` : offsetNum;
  } catch {
    offsetStr = 'UTC';
  }

  return {
    timezone: tz,
    cityName: rawCity,
    utcOffset: offsetStr,
    formattedDisplay: `${rawCity} · ${offsetStr}`,
  };
}

/**
 * Format a Date object for display in a specific timezone
 */
export function formatTimeInTimezone(
  date: Date = new Date(),
  timezone?: string,
  options?: { showSeconds?: boolean; use24Hour?: boolean }
): string {
  const tz = timezone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');
  try {
    return date.toLocaleTimeString('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      second: options?.showSeconds ? '2-digit' : undefined,
      hour12: !options?.use24Hour,
    });
  } catch {
    return date.toLocaleTimeString();
  }
}

/**
 * Real-time clock hook updating every second
 */
export function useLiveClock(timezone?: string) {
  const [time, setTime] = useState<Date>(new Date());
  const [tzInfo, setTzInfo] = useState<TimezoneLocationInfo>(detectUserTimezone());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timezone) {
      const parts = timezone.split('/');
      const rawCity = parts.length > 1 ? parts[parts.length - 1].replace(/_/g, ' ') : timezone;
      setTzInfo({
        timezone,
        cityName: rawCity,
        utcOffset: detectUserTimezone().utcOffset,
        formattedDisplay: `${rawCity}`,
      });
    } else {
      setTzInfo(detectUserTimezone());
    }
  }, [timezone]);

  const formattedTime = formatTimeInTimezone(time, tzInfo.timezone);
  const formattedTimeWithSeconds = formatTimeInTimezone(time, tzInfo.timezone, { showSeconds: true });

  return {
    currentTime: time,
    formattedTime,
    formattedTimeWithSeconds,
    cityName: tzInfo.cityName,
    utcOffset: tzInfo.utcOffset,
    timezone: tzInfo.timezone,
  };
}
