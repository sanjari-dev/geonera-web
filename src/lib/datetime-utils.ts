// src/lib/datetime-utils.ts
import { 
  startOfDay, isValid,
  addMinutes, addHours, addDays, 
  startOfMinute, startOfHour, 
  differenceInMilliseconds 
} from 'date-fns';
import type { RefreshIntervalValue } from '@/types';
import { REFRESH_INTERVAL_OPTIONS, DEFAULT_REFRESH_INTERVAL_MS } from '@/types';

export const formatDateToDateTimeLocal = (date: Date | null): string => {
  if (!date || !isValid(date)) return '';
  // Adjust for local timezone for input[type="datetime-local"]
  const tempDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return tempDate.toISOString().slice(0, 16);
};

export const calculateDelayUntilNextScheduledRun = (intervalValue: RefreshIntervalValue): number => {
  const now = new Date(); // This will be client-side new Date()
  let nextRunTime: Date;

  const intervalOption = REFRESH_INTERVAL_OPTIONS.find(opt => opt.value === intervalValue);
  if (!intervalOption) {
    console.warn(`DatetimeUtils: Unknown interval value ${intervalValue}, defaulting to ${DEFAULT_REFRESH_INTERVAL_MS}ms`);
    return DEFAULT_REFRESH_INTERVAL_MS;
  }

  const unitChar = intervalValue.slice(-1); // 'm', 'h', 'D'
  const amountStr = intervalValue.slice(0, -1);
  const amount = amountStr === '' ? 1 : parseInt(amountStr, 10); // Default to 1 if no number (e.g., 'D' for '1D')

  if (isNaN(amount) || amount <= 0) {
    console.warn(`DatetimeUtils: Invalid amount for interval ${intervalValue}, defaulting to ${DEFAULT_REFRESH_INTERVAL_MS}ms`);
    return DEFAULT_REFRESH_INTERVAL_MS;
  }

  switch (unitChar) {
    case 'm':
      nextRunTime = startOfMinute(now); 
      while (nextRunTime.getMinutes() % amount !== 0 || nextRunTime <= now) {
        nextRunTime = addMinutes(nextRunTime, 1);
        nextRunTime = startOfMinute(nextRunTime); 
      }
      break;
    case 'h':
      nextRunTime = startOfHour(now); 
      while (nextRunTime.getHours() % amount !== 0 || nextRunTime <= now) {
        nextRunTime = addHours(nextRunTime, 1);
        nextRunTime = startOfHour(nextRunTime);
      }
      break;
    case 'D':
      nextRunTime = startOfDay(now); 
      if (amount === 1) { 
         if (nextRunTime <= now) { 
          nextRunTime = addDays(nextRunTime, 1); 
        }
      } else { 
        let baseDay = startOfDay(now);
        while(baseDay <= now) { 
            baseDay = addDays(baseDay, amount); 
        }
        nextRunTime = baseDay;
      }
      break;
    default:
      console.warn(`DatetimeUtils: Unhandled unit character ${unitChar} in interval ${intervalValue}, defaulting to interval's milliseconds or default.`);
      return intervalOption.milliseconds || DEFAULT_REFRESH_INTERVAL_MS;
  }

  let delay = differenceInMilliseconds(nextRunTime, now);

  if (delay <= 0) {
    let subsequentRunTime = nextRunTime;
    switch (unitChar) {
        case 'm':
            subsequentRunTime = addMinutes(startOfMinute(subsequentRunTime), amount); 
            while(subsequentRunTime.getMinutes() % amount !== 0) { 
                subsequentRunTime = addMinutes(subsequentRunTime,1);
                subsequentRunTime = startOfMinute(subsequentRunTime);
            }
            break;
        case 'h':
            subsequentRunTime = addHours(startOfHour(subsequentRunTime), amount);
             while(subsequentRunTime.getHours() % amount !== 0) {
                subsequentRunTime = addHours(subsequentRunTime,1);
                subsequentRunTime = startOfHour(subsequentRunTime);
            }
            break;
        case 'D':
            subsequentRunTime = addDays(startOfDay(subsequentRunTime), amount);
            break;
    }
    delay = differenceInMilliseconds(subsequentRunTime, now);
    
    if (delay <= 0) { 
        console.error(`DatetimeUtils: Critical - delay still ${delay}ms after readjustment for ${intervalValue}. Defaulting to 100ms to prevent tight loop.`);
        delay = 100; // Prevent tight loop
    }
  }
  return delay;
};


/**
 * Parses a duration string in "DD HH:mm:ss" format to total seconds.
 * @param durationString The string to parse.
 * @returns Total seconds, or null if parsing fails.
 */
export function parseDurationStringToSeconds(durationString: string): number | null {
  const regex = /^(\d{1,2})\s(\d{2}):(\d{2}):(\d{2})$/; // DD HH:mm:ss
  const match = durationString.match(regex);

  if (!match) {
    // Try parsing "HH:mm:ss" if DD is missing
    const shortRegex = /^(\d{2}):(\d{2}):(\d{2})$/; // HH:mm:ss
    const shortMatch = durationString.match(shortRegex);
    if (shortMatch) {
        const [, hoursStr, minutesStr, secondsStr] = shortMatch;
        const hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);
        const seconds = parseInt(secondsStr, 10);

        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
            return null;
        }
        return (hours * 3600) + (minutes * 60) + seconds;
    }
    // Try parsing "mm:ss"
    const veryShortRegex = /^(\d{2}):(\d{2})$/; // mm:ss
    const veryShortMatch = durationString.match(veryShortRegex);
    if (veryShortMatch) {
        const [, minutesStr, secondsStr] = veryShortMatch;
        const minutes = parseInt(minutesStr, 10);
        const seconds = parseInt(secondsStr, 10);
         if (minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
            return null;
        }
        return (minutes * 60) + seconds;
    }
    // Try parsing just "ss"
    const secondsOnlyRegex = /^(\d{1,5})$/; // up to 5 digits for seconds
    const secondsOnlyMatch = durationString.match(secondsOnlyRegex);
    if (secondsOnlyMatch) {
        const [, secondsStr] = secondsOnlyMatch;
        const seconds = parseInt(secondsStr, 10);
        if (seconds < 0) return null;
        return seconds;
    }
    return null;
  }

  const [, daysStr, hoursStr, minutesStr, secondsStr] = match;
  const days = parseInt(daysStr, 10);
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  const seconds = parseInt(secondsStr, 10);

  if (
    days < 0 || days > 99 || // Assuming max 99 days
    hours < 0 || hours > 23 ||
    minutes < 0 || minutes > 59 ||
    seconds < 0 || seconds > 59
  ) {
    return null; // Invalid range for H, M, or S
  }

  return (days * 24 * 60 * 60) + (hours * 3600) + (minutes * 60) + seconds;
}


/**
 * Formats total seconds into a "DD HH:mm:ss" string.
 * @param totalSeconds The total seconds to format.
 * @returns A string in "DD HH:mm:ss" format.
 */
export function formatSecondsToDurationString(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return "00 00:00:00";
  }

  const days = Math.floor(totalSeconds / (24 * 3600));
  let remainingSeconds = totalSeconds % (24 * 3600);

  const hours = Math.floor(remainingSeconds / 3600);
  remainingSeconds %= 3600;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const pad = (num: number) => String(num).padStart(2, '0');

  return `${pad(days)} ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
