// src/app/page.tsx
"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { produce } from 'immer';
import { AppHeader } from '@/components/geonera/header';
import { PipsInputCard } from '@/components/geonera/pips-input-card';
import { PredictionsTable } from '@/components/geonera/predictions-table';
import { PredictionDetailsPanel, type ActiveDetailsView } from '@/components/geonera/prediction-details-panel';
import { NotificationDisplay } from '@/components/geonera/notification-display';
import type {
  PredictionLogItem,
  CurrencyPair,
  PipsSettings,
  User,
  StatusFilterType,
  SignalFilterType,
  SortConfig,
  SortableColumnKey,
  NotificationMessage,
  DateRangeFilter,
  RefreshIntervalValue,
} from '@/types';
import { 
  DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT, 
  DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT, 
  MAX_PREDICTION_LOGS_CONFIG, 
  MIN_EXPIRATION_SECONDS, 
  MAX_EXPIRATION_SECONDS,
  REFRESH_INTERVAL_OPTIONS,
  DEFAULT_REFRESH_INTERVAL_VALUE,
  DEFAULT_REFRESH_INTERVAL_MS,
} from '@/types';
import { getPipsPredictionAction } from '@/lib/actions';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, CalendarDays, Settings as SettingsIcon, List, PackageCheck, PackageOpen } from 'lucide-react';
import { 
  startOfDay, endOfDay, isValid, format as formatDateFns,
  addMinutes, addHours, addDays, 
  startOfMinute, startOfHour, 
  differenceInMilliseconds 
} from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const MAX_NOTIFICATIONS = 100;


const formatDateToDateTimeLocal = (date: Date | null): string => {
  if (!date || !isValid(date)) return '';
  // Adjust for local timezone for input[type="datetime-local"]
  const tempDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return tempDate.toISOString().slice(0, 16);
};

const calculateDelayUntilNextScheduledRun = (intervalValue: RefreshIntervalValue): number => {
  const now = new Date();
  let nextRunTime: Date;

  const intervalOption = REFRESH_INTERVAL_OPTIONS.find(opt => opt.value === intervalValue);
  if (!intervalOption) {
    console.warn(`GeoneraPage: Unknown interval value ${intervalValue}, defaulting to ${DEFAULT_REFRESH_INTERVAL_MS}ms`);
    return DEFAULT_REFRESH_INTERVAL_MS;
  }

  const unitChar = intervalValue.slice(-1); // 'm', 'h', 'D'
  const amountStr = intervalValue.slice(0, -1);
  const amount = amountStr === '' ? 1 : parseInt(amountStr, 10); // Default to 1 if no number (e.g., 'D' for '1D')

  if (isNaN(amount) || amount <= 0) {
    console.warn(`GeoneraPage: Invalid amount for interval ${intervalValue}, defaulting to ${DEFAULT_REFRESH_INTERVAL_MS}ms`);
    return DEFAULT_REFRESH_INTERVAL_MS;
  }

  switch (unitChar) {
    case 'm':
      nextRunTime = startOfMinute(now); // Start with current minute, 0 seconds, 0 ms
      // Loop until we find a minute that is a multiple of 'amount' AND is strictly in the future
      while (nextRunTime.getMinutes() % amount !== 0 || nextRunTime <= now) {
        nextRunTime = addMinutes(nextRunTime, 1);
        // Ensure we are checking the start of the newly incremented minute
        nextRunTime = startOfMinute(nextRunTime); 
      }
      break;
    case 'h':
      nextRunTime = startOfHour(now); // Start with current hour, 0 minutes, 0 seconds, 0 ms
      // Loop until we find an hour that is a multiple of 'amount' AND is strictly in the future
      while (nextRunTime.getHours() % amount !== 0 || nextRunTime <= now) {
        nextRunTime = addHours(nextRunTime, 1);
        // Ensure we are checking the start of the newly incremented hour
        nextRunTime = startOfHour(nextRunTime);
      }
      break;
    case 'D':
      nextRunTime = startOfDay(now); // Start with today at 00:00:00.000
      // Loop until nextRunTime is strictly in the future AND satisfies the "every X day" logic.
      // For "every X days", if amount is 1, it's every day at 00:00.
      // If amount > 1, it's every X days at 00:00 (e.g., 2D means today, then 2 days later, etc., always at 00:00)
      // The initial nextRunTime is startOfDay(now). If it's already past for today, or not aligned with 'amount', we advance.
      if (amount === 1) { // Every day at 00:00
         if (nextRunTime <= now) { // If current time is past 00:00 today
          nextRunTime = addDays(nextRunTime, 1); // Schedule for 00:00 tomorrow
        }
      } else { // Every X days (where X > 1), aligned with multiples of X from some epoch or simply X days from the last run.
               // A simpler interpretation: the next day at 00:00 which is at least X days from today's 00:00 if today's 00:00 has passed.
               // Or, the next occurrence of a day N*X days from an epoch.
               // Let's use: find the first 00:00 time that is >= startOfDay(now) and (day_of_year_or_epoch % amount == 0)
               // This is too complex. Let's stick to "add 'amount' days until it's in the future".
        while (nextRunTime <= now) {
            nextRunTime = addDays(nextRunTime, amount);
        }
      }
      break;
    default:
      console.warn(`GeoneraPage: Unhandled unit character ${unitChar} in interval ${intervalValue}, defaulting to interval's milliseconds or default.`);
      return intervalOption.milliseconds || DEFAULT_REFRESH_INTERVAL_MS;
  }

  let delay = differenceInMilliseconds(nextRunTime, now);

  // This safeguard should ideally not be hit if the while loops are correct.
  // It handles cases where nextRunTime might be exactly 'now' or calculation errors.
  if (delay <= 0) {
    console.warn(`GeoneraPage: Calculated delay for ${intervalValue} is ${delay}ms. Re-adjusting to next interval.`);
    // Advance to the *next* logical interval from the already calculated `nextRunTime`
    switch (unitChar) {
        case 'm':
            // If 10:02:00 was calculated and delay is <=0, next should be 10:02:00 + amount minutes
            let tempM = addMinutes(startOfMinute(nextRunTime), amount); // Ensure it's from start of minute
            while(tempM.getMinutes() % amount !== 0) { // re-align if simple additon misaligns
                tempM = addMinutes(tempM,1);
                tempM = startOfMinute(tempM);
            }
            nextRunTime = tempM;
            break;
        case 'h':
            let tempH = addHours(startOfHour(nextRunTime), amount);
             while(tempH.getHours() % amount !== 0) {
                tempH = addHours(tempH,1);
                tempH = startOfHour(tempH);
            }
            nextRunTime = tempH;
            break;
        case 'D':
            // If it was Jan 1, 00:00 and delay <=0, next should be Jan 1, 00:00 + amount days
            nextRunTime = addDays(startOfDay(nextRunTime), amount);
            break;
    }
    delay = differenceInMilliseconds(nextRunTime, now);
    
    if (delay <= 0) { // If still non-positive, something is very wrong, use a small default
        console.error(`GeoneraPage: Critical - delay still ${delay}ms after readjustment for ${intervalValue}. Defaulting to 100ms to prevent tight loop.`);
        delay = 100;
    }
  }
  // console.log(`GeoneraPage: Next run for ${intervalValue} at ${formatDateFns(nextRunTime, "yyyy-MM-dd HH:mm:ss XXX")}, delay: ${delay}ms (Now: ${formatDateFns(now, "yyyy-MM-dd HH:mm:ss XXX")})`);
  return delay;
};


export default function GeoneraPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);
  const [predictionLogs, setPredictionLogs] = useState<PredictionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState<string>('');

  const [selectedCurrencyPairs, setSelectedCurrencyPairs] = useState<CurrencyPair[]>([]);
  const [pipsSettings, setPipsSettings] = useState<PipsSettings>({
    profitPips: { min: 10, max: 20 },
    lossPips: { min: 5, max: 10 },
  });

  const [uuidAvailable, setUuidAvailable] = useState(false);
  const [selectedPredictionLog, setSelectedPredictionLog] = useState<PredictionLogItem | null>(null);
  const [notificationsList, setNotificationsList] = useState<NotificationMessage[]>([]);
  
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>({ 
    start: null, 
    end: null 
  });
  
  const [activeTableFilterStatus, setActiveTableFilterStatus] = useState<StatusFilterType>("ALL");
  const [activeTableFilterSignal, setActiveTableFilterSignal] = useState<SignalFilterType>("ALL");
  const [expiredTableFilterStatus, setExpiredTableFilterStatus] = useState<StatusFilterType>("ALL");
  const [expiredTableFilterSignal, setExpiredTableFilterSignal] = useState<SignalFilterType>("ALL");

  const [sortConfigActive, setSortConfigActive] = useState<SortConfig>({ key: 'timestamp', direction: 'asc' });
  const [sortConfigExpired, setSortConfigExpired] = useState<SortConfig>({ key: 'timestamp', direction: 'desc' });
  
  const [currentTimeForFiltering, setCurrentTimeForFiltering] = useState(new Date());
  const [displayedActiveLogsCount, setDisplayedActiveLogsCount] = useState<number>(DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT);
  const [displayedExpiredLogsCount, setDisplayedExpiredLogsCount] = useState<number>(DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT);
  const [activeDetailsView, setActiveDetailsView] = useState<ActiveDetailsView>('about');
  const [predictionLogsViewMode, setPredictionLogsViewMode] = useState<'logs' | 'pipsSettings'>('logs');
  const [selectedRefreshIntervalValue, setSelectedRefreshIntervalValue] = useState<RefreshIntervalValue>(DEFAULT_REFRESH_INTERVAL_VALUE);


  const router = useRouter();

  const latestSelectedCurrencyPairsRef = useRef(selectedCurrencyPairs);
  useEffect(() => {
    latestSelectedCurrencyPairsRef.current = selectedCurrencyPairs;
  }, [selectedCurrencyPairs]);

  const latestPipsSettingsRef = useRef(pipsSettings);
  useEffect(() => {
    latestPipsSettingsRef.current = pipsSettings;
  }, [pipsSettings]);

  const latestSelectedRefreshIntervalValueRef = useRef(selectedRefreshIntervalValue);
  useEffect(() => {
    latestSelectedRefreshIntervalValueRef.current = selectedRefreshIntervalValue;
  }, [selectedRefreshIntervalValue]);


  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
    if (typeof window !== 'undefined' && typeof uuidv4 === 'function') {
        setUuidAvailable(true);
    }
     if (typeof window !== 'undefined') {
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        setDateRangeFilter({ start: todayStart, end: todayEnd });

        const storedUser = localStorage.getItem('geoneraUser');
        if (storedUser) {
            try {
            setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
            console.error("Failed to parse user from localStorage", e);
            localStorage.removeItem('geoneraUser');
            }
        }
    }
    setIsAuthCheckComplete(true);
  }, []); 

  useEffect(() => {
    if (isAuthCheckComplete && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, isAuthCheckComplete, router]);

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTimeForFiltering(new Date());
    }, 1000); 
    return () => clearInterval(timerId);
  }, []);


  const generateId = useCallback(() => {
    if (uuidAvailable) {
      try {
        return uuidv4();
      } catch (e) {
         return Date.now().toString() + Math.random().toString(36).substring(2,7);
      }
    }
    return Date.now().toString() + (typeof window !== 'undefined' ? Math.random().toString(36).substring(2,7) : "serverid" + Math.floor(Math.random() * 10000));
  }, [uuidAvailable]);

  const addNotification = useCallback((notification: Omit<NotificationMessage, 'timestamp' | 'id'>) => {
    setNotificationsList(prevNotifications => {
      const newNotificationWithMessageId = { ...notification, timestamp: new Date(), id: generateId() };
      const updatedNotifications = [newNotificationWithMessageId, ...prevNotifications];
      if (updatedNotifications.length > MAX_NOTIFICATIONS) {
        return updatedNotifications.slice(0, MAX_NOTIFICATIONS);
      }
      return updatedNotifications;
    });
  }, [generateId]);


  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('geoneraUser');
    }
    setCurrentUser(null);
    setPredictionLogs([]); 
    setSelectedPredictionLog(null); 
    setSelectedCurrencyPairs([]); 
    setActiveDetailsView('about');
    addNotification({ title: "Logged Out", description: "You have been successfully logged out.", variant: 'default' });
  };

  const handleSelectedCurrencyPairsChange = useCallback((value: CurrencyPair[]) => {
    setSelectedCurrencyPairs(value);
  }, []);

  const handlePipsSettingsChange = useCallback((value: PipsSettings) => {
    setPipsSettings(value);
  }, []);

  const handlePredictionSelect = useCallback((log: PredictionLogItem) => {
    const logFromState = predictionLogs.find(l => l.id === log.id);
     if (logFromState) {
      setSelectedPredictionLog(produce(logFromState, draft => draft)); 
    } else {
      // This case should ideally not happen if selection is always from existing logs
      setSelectedPredictionLog(produce(log, draft => draft));
    }
    setActiveDetailsView('details');
  }, [predictionLogs]); 

  const handleActiveDetailsViewChange = useCallback((view: ActiveDetailsView) => {
    setActiveDetailsView(view);
    if (view === 'about' || view === 'notifications') {
      setSelectedPredictionLog(null);
    }
  }, []);


  const handleDateRangeChange = useCallback((newRange: DateRangeFilter) => {
    setDateRangeFilter(newRange);
  }, []);

  const handlePredictionLogsViewToggle = () => {
    setPredictionLogsViewMode(prev => prev === 'logs' ? 'pipsSettings' : 'logs');
  };

  const handleRefreshIntervalChange = useCallback((value: RefreshIntervalValue) => {
    setSelectedRefreshIntervalValue(value);
  }, []);

  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) return; 

    let timeoutId: NodeJS.Timeout | undefined = undefined;

    const performPrediction = async () => {
      if (isLoading) { 
        // If already loading, reschedule for the next valid slot without making a new request yet
        const delay = calculateDelayUntilNextScheduledRun(latestSelectedRefreshIntervalValueRef.current);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, delay);
        return;
      }

      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current;
      const currentPipsSettings = latestPipsSettingsRef.current;

      const { profitPips, lossPips } = currentPipsSettings;
      const isPipsSettingsInvalid =
        profitPips.min <= 0 || profitPips.max <= 0 || profitPips.min > profitPips.max ||
        lossPips.min <= 0 || lossPips.max <= 0 || lossPips.min > lossPips.max;

      const noCurrenciesSelected = currentSelectedPairs.length === 0;

      if (noCurrenciesSelected) {
        // If no currencies are selected, just wait for the next interval
        const delay = calculateDelayUntilNextScheduledRun(latestSelectedRefreshIntervalValueRef.current);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, delay);
        return;
      }

      if (isPipsSettingsInvalid) {
        if (currentSelectedPairs.length > 0) { // Only notify if pairs are selected but settings are bad
            addNotification({
                title: "Prediction Paused",
                description: "Ensure Min/Max PIPS for profit & loss are valid (Min > 0, Max > 0, Min <= Max). Predictions update automatically if parameters are valid.",
                variant: "default", // Or "warning" if such variant is styled
             });
        }
        // Still schedule the next check, in case settings become valid
        const delay = calculateDelayUntilNextScheduledRun(latestSelectedRefreshIntervalValueRef.current);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, delay);
        return;
      }


      setIsLoading(true);

      const newPendingLogs: PredictionLogItem[] = [];
      currentSelectedPairs.forEach(currencyPair => {
        // For each selected currency pair, generate a random number of predictions (1 to 10)
        const numPredictionsForPair = Math.floor(Math.random() * 10) + 1; // 1 to 10 predictions
        for (let i = 0; i < numPredictionsForPair; i++) {
          const newLogId = generateId();
          newPendingLogs.push({
            id: newLogId,
            timestamp: new Date(),
            currencyPair: currencyPair,
            pipsSettings: currentPipsSettings, // Use the current global pips settings
            status: "PENDING",
          });
        }
      });

      // If, after potential filtering, no new logs are to be added (e.g. if numPredictionsForPair was 0, though it's 1-10)
      if (newPendingLogs.length === 0) { 
        setIsLoading(false);
        const delay = calculateDelayUntilNextScheduledRun(latestSelectedRefreshIntervalValueRef.current);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, delay);
        return;
      }

      setPredictionLogs(produce(draft => {
        newPendingLogs.forEach(log => {
          draft.push(log); // Add new pending logs
        });
        // Cap total logs
        if (draft.length > MAX_PREDICTION_LOGS_CONFIG) {
          draft.splice(0, draft.length - MAX_PREDICTION_LOGS_CONFIG);
        }
      }));

      // Simulate fetching predictions for all new pending logs
      // The actual action 'getPipsPredictionAction' generates mock data.
      const predictionPromises = newPendingLogs.map(async (pendingLog) => {
        // Pass the specific currencyPair and currentPipsSettings for this prediction
        const result = await getPipsPredictionAction(pendingLog.currencyPair, pendingLog.pipsSettings);
        return { result, pendingLog }; // Return both to associate result with its origin
      });


      // Wait for all prediction "fetches" to complete
      const results = await Promise.all(predictionPromises);

      let successCount = 0;
      let errorCount = 0;

      setPredictionLogs(produce(draft => {
        // Get the most up-to-date selected pairs *after* the async operations
        const activePairsAfterAsync = latestSelectedCurrencyPairsRef.current; 

        results.forEach(({ result, pendingLog }) => {
          const logIndex = draft.findIndex(log => log.id === pendingLog.id);
          if (logIndex === -1) {
            // Log might have been removed by another process (e.g., cleanup if pair deselected)
            return;
          }

          // If the currency pair for this log is no longer selected, remove the pending log
          if (!activePairsAfterAsync.includes(pendingLog.currencyPair)) {
              if (selectedPredictionLog && selectedPredictionLog.id === pendingLog.id) {
                setSelectedPredictionLog(null);
                // Optionally reset view if current details were for this removed log
                if (activeDetailsView === 'details') setActiveDetailsView('about');
              }
              draft.splice(logIndex, 1);
              return; // Skip further processing for this log
          }

          let logToUpdate = draft[logIndex]; // This is a Immer draft object

          if (result.error) {
            errorCount++;
            logToUpdate.status = "ERROR";
            logToUpdate.error = result.error;
          } else if (result.data) {
            successCount++;
            const randomExpirationSeconds = Math.floor(Math.random() * (MAX_EXPIRATION_SECONDS - MIN_EXPIRATION_SECONDS + 1)) + MIN_EXPIRATION_SECONDS;
            const randomExpirationMs = randomExpirationSeconds * 1000;
            // Update the log item directly
            Object.assign(logToUpdate, { status: "SUCCESS", predictionOutcome: result.data, expiresAt: new Date(Date.now() + randomExpirationMs) });
          }
          // else: if no data and no error, it remains PENDING (or handle as appropriate)
        });
        // Re-apply MAX_PREDICTION_LOGS_CONFIG cap after updates/removals
        if (draft.length > MAX_PREDICTION_LOGS_CONFIG) {
          const removedCount = draft.length - MAX_PREDICTION_LOGS_CONFIG;
          const removedItems = draft.splice(0, removedCount); // Remove oldest logs

          // If the currently selected detail view was for a log that got capped, clear it
          if (selectedPredictionLog && removedItems.find(item => item.id === selectedPredictionLog.id)) {
            setSelectedPredictionLog(null);
             if (activeDetailsView === 'details') setActiveDetailsView('about');
          }
        }
      }));

      // Notify user about the outcome of the batch
      if (results.length > 0 && (successCount > 0 || errorCount > 0)) {
        let toastTitle = "Predictions Updated";
        let toastDescription = "";
        const relevantPairs = latestSelectedCurrencyPairsRef.current.join(', '); // Pairs that were targeted

        if (successCount > 0 && errorCount === 0) {
          toastDescription = `${successCount} prediction(s) completed for ${relevantPairs}.`;
        } else if (successCount > 0 && errorCount > 0) {
          toastTitle = "Some Predictions Failed";
          toastDescription = `${successCount} succeeded, ${errorCount} failed for ${relevantPairs}.`;
        } else if (errorCount > 0 && successCount === 0) {
          toastTitle = "Prediction Errors";
          toastDescription = `${errorCount} prediction(s) failed for ${relevantPairs}.`;
        }
        // Only show notification if there was something to report for *currently selected* pairs
        if (toastDescription && latestSelectedCurrencyPairsRef.current.length > 0) {
          addNotification({
            title: toastTitle,
            description: toastDescription,
            variant: errorCount > 0 && successCount === 0 ? "destructive" : (successCount > 0 ? "success" : "default"),
          });
        }
      }

      setIsLoading(false);
      // Schedule the next run
      const nextDelay = calculateDelayUntilNextScheduledRun(latestSelectedRefreshIntervalValueRef.current);
      if (timeoutId) clearTimeout(timeoutId); // Should be clear, but good practice
      timeoutId = setTimeout(performPrediction, nextDelay);
    };
    
    // Initial scheduling when component mounts or dependencies change
    const initialDelay = calculateDelayUntilNextScheduledRun(latestSelectedRefreshIntervalValueRef.current);
    if (timeoutId) clearTimeout(timeoutId); // Clear any existing timer before setting a new one
    timeoutId = setTimeout(performPrediction, initialDelay);

    return () => {
      if (timeoutId) clearTimeout(timeoutId); // Cleanup on unmount or re-run
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isAuthCheckComplete, generateId, addNotification, activeDetailsView, selectedRefreshIntervalValue]); // Dependencies that should re-trigger scheduling

  // Effect for cleaning up logs whose currency pairs are no longer selected (non-expired logs)
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) return;

    const cleanupIntervalId = setInterval(() => {
      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current; // Use ref for up-to-date value

      setPredictionLogs(produce(draft => {
        let didChange = false;
        for (let i = draft.length - 1; i >= 0; i--) {
          const log = draft[i];
          let removeLog = false;

          // Condition 1: Log's currency pair is no longer in the selected list
          // Only remove if it's not yet expired (SUCCESS logs without expiresAt or PENDING/ERROR)
          // Expired logs should persist regardless of current pair selection for historical view.
          if (!currentSelectedPairs.includes(log.currencyPair) && 
              (log.status === "PENDING" || log.status === "ERROR" || (log.status === "SUCCESS" && (!log.expiresAt || new Date(log.expiresAt) > new Date())))) {
            removeLog = true;
          }

          if (removeLog) {
            // If the log being removed is the one currently selected for details, clear the details view
            if (selectedPredictionLog && selectedPredictionLog.id === log.id) {
              setSelectedPredictionLog(null);
              if (activeDetailsView === 'details') setActiveDetailsView('about'); // Or some other default view
            }
            draft.splice(i, 1);
            didChange = true;
          }
        }
        if (!didChange) return undefined; // Immer optimization: if no changes, return undefined
      }));
    }, 1000); // Run cleanup every second (adjust as needed)

    return () => clearInterval(cleanupIntervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isAuthCheckComplete, selectedPredictionLog, activeDetailsView]); // Dependencies for the cleanup effect


  const getSortableValue = useCallback((log: PredictionLogItem, key: SortableColumnKey): string | number | Date | undefined => {
    switch (key) {
      case 'status': return log.status;
      case 'timestamp': return log.timestamp;
      case 'currencyPair': return log.currencyPair;
      case 'profitPipsMax': return log.pipsSettings.profitPips.max;
      case 'lossPipsMax': return log.pipsSettings.lossPips.max;
      case 'tradingSignal': return log.predictionOutcome?.tradingSignal;
      case 'expiresAt': return log.expiresAt;
      default: return undefined;
    }
  }, []);

  const baseFilteredLogs = useMemo(() => {
    // Filter by selected currency pairs first.
    // Then filter by date range.
    return predictionLogs.filter(log => {
      if (!latestSelectedCurrencyPairsRef.current.includes(log.currencyPair)) return false; // Filter by currently selected pairs
      
      const logTimestamp = new Date(log.timestamp); // Ensure it's a Date object
      if (dateRangeFilter.start && isValid(dateRangeFilter.start) && logTimestamp < dateRangeFilter.start) return false;
      if (dateRangeFilter.end && isValid(dateRangeFilter.end) && logTimestamp > dateRangeFilter.end) return false;
      
      return true;
    });
  }, [predictionLogs, dateRangeFilter]); // latestSelectedCurrencyPairsRef is a ref, its change won't trigger re-memo, but predictionLogs will.

  // Separate logs into potentially active and potentially expired based on current time
  const potentialActiveLogs = useMemo(() => {
    return baseFilteredLogs.filter(log => !log.expiresAt || new Date(log.expiresAt) > currentTimeForFiltering);
  }, [baseFilteredLogs, currentTimeForFiltering]);
  
  const potentialExpiredLogs = useMemo(() => {
    return baseFilteredLogs.filter(log => log.expiresAt && new Date(log.expiresAt) <= currentTimeForFiltering);
  }, [baseFilteredLogs, currentTimeForFiltering]);

  // Apply status and signal filters to active logs
  const activeLogs = useMemo(() => {
    return potentialActiveLogs.filter(log => {
      if (activeTableFilterStatus !== "ALL" && log.status !== activeTableFilterStatus) return false;
      if (activeTableFilterSignal !== "ALL" && (!log.predictionOutcome || log.predictionOutcome.tradingSignal !== activeTableFilterSignal)) return false;
      return true;
    });
  }, [potentialActiveLogs, activeTableFilterStatus, activeTableFilterSignal]);
  
  // Apply status and signal filters to expired logs
  const fullyFilteredExpiredExpiredLogs = useMemo(() => {
    return potentialExpiredLogs.filter(log => {
      if (expiredTableFilterStatus !== "ALL" && log.status !== expiredTableFilterStatus) return false;
      if (expiredTableFilterSignal !== "ALL" && (!log.predictionOutcome || log.predictionOutcome.tradingSignal !== expiredTableFilterSignal)) return false;
      return true;
    });
  }, [potentialExpiredLogs, expiredTableFilterStatus, expiredTableFilterSignal]);


  const sortLogs = useCallback((logs: PredictionLogItem[], config: SortConfig) => {
    return [...logs].sort((a, b) => {
      const valA = getSortableValue(a, config.key);
      const valB = getSortableValue(b, config.key);

      if (valA === undefined && valB === undefined) return 0;
      if (valA === undefined) return config.direction === 'asc' ? 1 : -1; // Sort undefined values to the end
      if (valB === undefined) return config.direction === 'asc' ? -1 : 1; // Sort undefined values to the end

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (valA instanceof Date && valB instanceof Date) {
        comparison = valA.getTime() - valB.getTime();
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else {
        // Fallback for mixed types or other types: compare as strings
        comparison = String(valA).localeCompare(String(valB));
      }
      return config.direction === 'asc' ? comparison : -comparison;
    });
  }, [getSortableValue]);

  // Sort active logs and limit display
  const sortedActiveLogsData = useMemo(() => sortLogs(activeLogs, sortConfigActive), [activeLogs, sortConfigActive, sortLogs]);
  const displayedSortedActiveLogs = useMemo(() => sortedActiveLogsData.slice(0, displayedActiveLogsCount), [sortedActiveLogsData, displayedActiveLogsCount]);
  
  // Sort expired logs and limit display
  const sortedAndLimitedExpiredLogs = useMemo(() => {
    const sorted = sortLogs(fullyFilteredExpiredExpiredLogs, sortConfigExpired);
    return sorted.slice(0, displayedExpiredLogsCount);
  }, [fullyFilteredExpiredExpiredLogs, sortConfigExpired, displayedExpiredLogsCount, sortLogs]);


  // Effect to auto-select a prediction log for the details panel
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete || activeDetailsView !== 'details') {
       // If view is not 'details', ensure no prediction is selected, or if user logs out.
       if (selectedPredictionLog !== null && activeDetailsView !== 'details') {
           setSelectedPredictionLog(null);
       }
      return;
    }
  
    let newSelectedLogCandidate: PredictionLogItem | null = null;
  
    // Priority:
    // 1. If a log is already selected and still in the (newly filtered/sorted) displayed active logs, keep it.
    // 2. Else, if still in displayed expired logs, keep it.
    // 3. Else, pick the first from displayed active logs.
    // 4. Else, pick the first from displayed expired logs.
    // 5. Else, null.
  
    if (selectedPredictionLog) {
      if (displayedSortedActiveLogs.find(log => log.id === selectedPredictionLog!.id)) {
        newSelectedLogCandidate = displayedSortedActiveLogs.find(log => log.id === selectedPredictionLog!.id)!;
      } else if (sortedAndLimitedExpiredLogs.find(log => log.id === selectedPredictionLog!.id)) {
        newSelectedLogCandidate = sortedAndLimitedExpiredLogs.find(log => log.id === selectedPredictionLog!.id)!;
      }
    }
  
    if (!newSelectedLogCandidate) { // If current selection is no longer valid or no selection existed
      if (displayedSortedActiveLogs.length > 0) {
        newSelectedLogCandidate = displayedSortedActiveLogs[0];
      } else if (sortedAndLimitedExpiredLogs.length > 0) {
        newSelectedLogCandidate = sortedAndLimitedExpiredLogs[0];
      }
    }
    
    // Update selectedPredictionLog only if it has actually changed to avoid unnecessary re-renders
    // This includes content change of the same ID, or ID change, or from/to null
    const currentSelectionString = selectedPredictionLog ? JSON.stringify(selectedPredictionLog) : null;
    const newCandidateString = newSelectedLogCandidate ? JSON.stringify(newSelectedLogCandidate) : null;

    if (currentSelectionString !== newCandidateString) {
         setSelectedPredictionLog(newSelectedLogCandidate ? produce(newSelectedLogCandidate, draft => draft) : null);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isAuthCheckComplete, displayedSortedActiveLogs, sortedAndLimitedExpiredLogs, activeDetailsView]); // Not including selectedPredictionLog itself to avoid loop, but changes to displayed logs will trigger.

  const handleSort = (key: SortableColumnKey, tableType: 'active' | 'expired') => {
    const currentSortConfig = tableType === 'active' ? sortConfigActive : sortConfigExpired;
    const setSortConfig = tableType === 'active' ? setSortConfigActive : setSortConfigExpired;

    let direction: 'asc' | 'desc' = 'asc';
    // Default sort directions for specific columns
    if (key === 'timestamp' || key === 'expiresAt') {
        direction = 'desc'; // Newer items first for time-based columns
    }

    if (currentSortConfig && currentSortConfig.key === key) {
      // If same key, toggle direction
      direction = currentSortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    // Otherwise, set new key with its default or toggled direction
    setSortConfig({ key, direction });
  };


  if (!isAuthCheckComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading Geonera...</p>
      </div>
    );
  }

  // Redirect is handled by useEffect, this return is for when redirect hasn't happened yet
  if (!currentUser && isAuthCheckComplete) {
    // This part of the UI should not be rendered if user is null and auth check is complete,
    // as the useEffect hook would have initiated a redirect to /login.
    // However, to prevent potential flashes of content or errors,
    // we can return null or a minimal loading/redirecting message.
    return null; 
  }
  // Ensure that finalSelectedPredictionForChildren is a fresh, non-proxy object if it exists
  const finalSelectedPredictionForChildren = selectedPredictionLog ? produce(selectedPredictionLog, draft => draft) : null;
  const latestNotificationForDisplay = notificationsList.length > 0 ? notificationsList[0] : null;


  return (
    <div className="h-screen grid grid-rows-[auto_1fr_auto] bg-background text-foreground">
      <AppHeader 
        user={currentUser} 
        onLogout={handleLogout}
        selectedCurrencyPairs={selectedCurrencyPairs} 
        onSelectedCurrencyPairsChange={handleSelectedCurrencyPairsChange} 
        isLoading={isLoading}
        selectedRefreshInterval={selectedRefreshIntervalValue}
        onRefreshIntervalChange={handleRefreshIntervalChange}
      />

      {/* This message is for the case where user somehow lands here without being redirected by useEffect. */}
      {!currentUser && isAuthCheckComplete && (
        <div className="p-4 text-center text-muted-foreground">
          Please log in to view and manage Forex predictions.
        </div>
      )}

      {currentUser && ( // Only render main content if user is logged in
        <main className="w-full px-2 py-1 grid grid-cols-1 md:grid-cols-3 gap-1 overflow-hidden">
          {/* Prediction Logs Section (Left, 2/3 width on md) */}
          <div className="md:col-span-2 flex flex-col min-h-0"> 
            <Card className="shadow-xl h-full flex flex-col">
              <CardHeader className="bg-primary/10 p-2 rounded-t-lg flex flex-col items-center relative">
                {/* Centered Title */}
                <CardTitle className="text-lg font-semibold text-primary text-center w-full mb-1">
                  {predictionLogsViewMode === 'logs' ? 'Prediction Logs' : 'PIPS Settings'}
                </CardTitle>
                
                {/* Date Filter (only shows in 'logs' mode, centered below title) */}
                {predictionLogsViewMode === 'logs' && (
                  <div className="flex items-center justify-center gap-1 w-full">
                    <Label htmlFor="date-filter-start" className="text-xs font-medium flex items-center text-primary">
                        <CalendarDays className="h-3 w-3 mr-1" /> From:
                    </Label>
                    <Input
                        type="datetime-local"
                        id="date-filter-start"
                        value={formatDateToDateTimeLocal(dateRangeFilter.start)}
                        onChange={(e) => {
                          const newStart = e.target.value ? new Date(e.target.value) : null;
                          if (newStart && isValid(newStart)) {
                            handleDateRangeChange({ ...dateRangeFilter, start: newStart });
                          } else if (!e.target.value) { // Handle empty input
                             handleDateRangeChange({ ...dateRangeFilter, start: null });
                          }
                        }}
                        className="h-7 text-xs py-1 w-auto border-primary/30 focus:border-primary"
                        aria-label="Filter start date and time"
                      />
                    <Label htmlFor="date-filter-end" className="text-xs font-medium flex items-center text-primary">
                        <CalendarDays className="h-3 w-3 mr-1" /> To:
                    </Label>
                    <Input
                        type="datetime-local"
                        id="date-filter-end"
                        value={formatDateToDateTimeLocal(dateRangeFilter.end)}
                        onChange={(e) => {
                          const newEnd = e.target.value ? new Date(e.target.value) : null;
                          if (newEnd && isValid(newEnd)) {
                            handleDateRangeChange({ ...dateRangeFilter, end: newEnd });
                          } else if (!e.target.value) { // Handle empty input
                            handleDateRangeChange({ ...dateRangeFilter, end: null });
                          }
                        }}
                        className="h-7 text-xs py-1 w-auto border-primary/30 focus:border-primary"
                        aria-label="Filter end date and time"
                      />
                  </div>
                )}

                {/* PIPS Settings Toggle Button (Absolutely Positioned on the Right) */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-1"
                          onClick={handlePredictionLogsViewToggle}
                          aria-label={predictionLogsViewMode === 'logs' ? "Open PIPS Settings" : "View Prediction Logs"}
                        >
                          {predictionLogsViewMode === 'logs' ? <SettingsIcon className="h-4 w-4 text-primary/80" /> : <List className="h-4 w-4 text-primary/80" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{predictionLogsViewMode === 'logs' ? "Open PIPS Settings" : "View Prediction Logs"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="p-1 flex-grow overflow-auto">
                {predictionLogsViewMode === 'logs' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 h-full">
                    {/* Active Predictions Table */}
                    <div className="flex flex-col min-h-0 overflow-y-auto h-full">
                      <PredictionsTable
                        title="Active Predictions"
                        titleIcon={<PackageCheck className="h-4 w-4 mr-1.5" />} // Icon for Active table
                        predictions={displayedSortedActiveLogs}
                        onRowClick={handlePredictionSelect}
                        selectedPredictionId={finalSelectedPredictionForChildren?.id}
                        sortConfig={sortConfigActive}
                        onSort={(key) => handleSort(key, 'active')}
                        filterStatus={activeTableFilterStatus}
                        onFilterStatusChange={setActiveTableFilterStatus}
                        filterSignal={activeTableFilterSignal}
                        onFilterSignalChange={setActiveTableFilterSignal}
                        displayLimit={displayedActiveLogsCount}
                        onDisplayLimitChange={setDisplayedActiveLogsCount}
                        totalAvailableForDisplay={activeLogs.length} // Total matching active filters
                        maxLogs={MAX_PREDICTION_LOGS_CONFIG} // System-wide cap for context
                      />
                    </div>
                    {/* Expired Predictions Table */}
                    <div className="flex flex-col min-h-0 overflow-y-auto h-full">
                      <PredictionsTable
                        title="Expired Predictions"
                        titleIcon={<PackageOpen className="h-4 w-4 mr-1.5" />} // Icon for Expired table
                        predictions={sortedAndLimitedExpiredLogs} // Already sorted and limited
                        onRowClick={handlePredictionSelect}
                        selectedPredictionId={finalSelectedPredictionForChildren?.id}
                        sortConfig={sortConfigExpired}
                        onSort={(key) => handleSort(key, 'expired')}
                        filterStatus={expiredTableFilterStatus}
                        onFilterStatusChange={setExpiredTableFilterStatus}
                        filterSignal={expiredTableFilterSignal}
                        onFilterSignalChange={setExpiredTableFilterSignal}
                        displayLimit={displayedExpiredLogsCount}
                        onDisplayLimitChange={setDisplayedExpiredLogsCount}
                        totalAvailableForDisplay={fullyFilteredExpiredExpiredLogs.length} // Total matching expired filters
                        maxLogs={MAX_PREDICTION_LOGS_CONFIG} // System-wide cap for context
                      />
                    </div>
                  </div>
                ) : (
                  // PIPS Input Card View
                  <div className="p-4"> {/* Add padding for PipsInputCard view */}
                    <PipsInputCard
                      pipsSettings={pipsSettings}
                      onPipsSettingsChange={handlePipsSettingsChange}
                      isLoading={isLoading}
                      className="shadow-none border-0 bg-transparent" // Blend with parent card
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Details and Notifications Section (Right, 1/3 width on md) */}
          <div className="md:col-span-1 flex flex-col min-h-0 gap-1"> 
            {/* Prediction Details / About / Notifications Panel */}
            <PredictionDetailsPanel 
              activeView={activeDetailsView}
              onActiveViewChange={handleActiveDetailsViewChange}
              selectedPrediction={finalSelectedPredictionForChildren} 
              maxPredictionLogs={MAX_PREDICTION_LOGS_CONFIG}
              notifications={notificationsList}
            />
            {/* Latest Notification Display (conditionally rendered) */}
            {currentUser && ( // This ensures it doesn't try to render if user is null during logout transition
              <NotificationDisplay notification={latestNotificationForDisplay} className="w-full flex-shrink-0" />
            )}
          </div>
        </main>
      )}
      <footer className="py-2 text-center text-sm text-muted-foreground border-t border-border bg-muted">
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved.
        {currentUser && ` Predictions update automatically every ${REFRESH_INTERVAL_OPTIONS.find(opt => opt.value === selectedRefreshIntervalValue)?.label || selectedRefreshIntervalValue} (min. 1 min) if parameters are valid.`}
      </footer>
    </div>
  );
}


