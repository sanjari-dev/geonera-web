// src/lib/datetime-utils.ts
import { 
  startOfDay, endOfDay, isValid,
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
