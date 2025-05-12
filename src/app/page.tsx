// src/app/page.tsx
"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { produce } from 'immer';
import { AppHeader } from '@/components/geonera/header';
import { PairSelectorCard } from '@/components/geonera/pair-selector-card';
import { PipsInputCard } from '@/components/geonera/pips-input-card';
import { PredictionsTable } from '@/components/geonera/predictions-table';
import { PredictionDetailsPanel } from '@/components/geonera/prediction-details-panel';
import { PredictionFilterControls } from '@/components/geonera/prediction-filter-controls';
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
} from '@/types';
import { DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT, DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT } from '@/types'; // Import new constant
import { getPipsPredictionAction } from '@/lib/actions';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, CalendarDays } from 'lucide-react';
import { startOfDay, endOfDay, isValid, format as formatDateFns } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


const PREDICTION_INTERVAL_MS = 30000; // 30 seconds
const MIN_EXPIRATION_SECONDS = 10;
const MAX_EXPIRATION_SECONDS = 75;
const MAX_PREDICTION_LOGS = 500;


const formatDateToDateTimeLocal = (date: Date | null): string => {
  if (!date || !isValid(date)) return '';
  return formatDateFns(date, "yyyy-MM-dd'T'HH:mm:ss");
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
  const [latestNotification, setLatestNotification] = useState<NotificationMessage | null>(null);

  // Global Filtering State (Show Expired, Date Range)
  const [showExpired, setShowExpired] = useState(true); // Default to true
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>({ 
    start: typeof window !== 'undefined' ? startOfDay(new Date()) : null, 
    end: typeof window !== 'undefined' ? endOfDay(new Date()) : null 
  });
  
  // Per-table Filtering State (Status, Signal)
  const [activeTableFilterStatus, setActiveTableFilterStatus] = useState<StatusFilterType>("ALL");
  const [activeTableFilterSignal, setActiveTableFilterSignal] = useState<SignalFilterType>("ALL");
  const [expiredTableFilterStatus, setExpiredTableFilterStatus] = useState<StatusFilterType>("ALL");
  const [expiredTableFilterSignal, setExpiredTableFilterSignal] = useState<SignalFilterType>("ALL");

  // Sorting State
  const [sortConfigActive, setSortConfigActive] = useState<SortConfig>({ key: 'timestamp', direction: 'asc' });
  const [sortConfigExpired, setSortConfigExpired] = useState<SortConfig>({ key: 'timestamp', direction: 'desc' });
  
  const [currentTimeForFiltering, setCurrentTimeForFiltering] = useState(new Date());
  const [displayedActiveLogsCount, setDisplayedActiveLogsCount] = useState<number>(DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT);
  const [displayedExpiredLogsCount, setDisplayedExpiredLogsCount] = useState<number>(DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT);


  const router = useRouter();

  const latestSelectedCurrencyPairsRef = useRef(selectedCurrencyPairs);
  useEffect(() => {
    latestSelectedCurrencyPairsRef.current = selectedCurrencyPairs;
  }, [selectedCurrencyPairs]);

  const latestPipsSettingsRef = useRef(pipsSettings);
  useEffect(() => {
    latestPipsSettingsRef.current = pipsSettings;
  }, [pipsSettings]);


  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
    if (typeof window !== 'undefined' && typeof uuidv4 === 'function') {
        setUuidAvailable(true);
    }
     if (typeof window !== 'undefined') {
        setDateRangeFilter({ start: startOfDay(new Date()), end: endOfDay(new Date()) });
        const storedUser = localStorage.getItem('geoneraUser');
        if (storedUser) {
            try {
            setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
            console.error("Failed to parse user from localStorage", e);
            localStorage.removeItem('geoneraUser');
            // router.replace('/login'); // Redirect if parsing fails and user is not set
            }
        }
        // else {
        //     router.replace('/login'); // Redirect if no user in localStorage
        // }
    }
    setIsAuthCheckComplete(true);
  }, [router]); // Added router to dependency array

  useEffect(() => {
    if (isAuthCheckComplete && !currentUser) {
      // No redirection here, page will render in logged-out state
    }
  }, [currentUser, isAuthCheckComplete, router]);

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTimeForFiltering(new Date());
    }, 1000); // Update 'now' every second for filtering
    return () => clearInterval(timerId);
  }, []);


  const generateId = useCallback(() => {
    if (uuidAvailable) {
      try {
        return uuidv4();
      } catch (e) {
         // Fallback if uuidv4 is not available or throws an error
         return Date.now().toString() + Math.random().toString(36).substring(2,7);
      }
    }
    // Fallback for server-side or if uuidv4 is not available
    return Date.now().toString() + (typeof window !== 'undefined' ? Math.random().toString(36).substring(2,7) : "serverid" + Math.floor(Math.random() * 10000));
  }, [uuidAvailable]);


  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('geoneraUser');
    }
    setCurrentUser(null);
    setPredictionLogs([]); // Clear logs on logout
    setSelectedPredictionLog(null); // Clear selected log
    setSelectedCurrencyPairs([]); // Clear selected pairs
    setLatestNotification({ title: "Logged Out", description: "You have been successfully logged out.", variant: 'default', timestamp: new Date() });
    // No router.push('/login') here, user stays on '/' but sees logged-out state
  };

  const handleSelectedCurrencyPairsChange = useCallback((value: CurrencyPair[]) => {
    setSelectedCurrencyPairs(value);
  }, []);

  const handlePipsSettingsChange = useCallback((value: PipsSettings) => {
    setPipsSettings(value);
  }, []);

  const handlePredictionSelect = useCallback((log: PredictionLogItem) => {
    // Find the log from the current state to ensure we're working with the most up-to-date version
    const logFromState = predictionLogs.find(l => l.id === log.id);
     if (logFromState) {
      setSelectedPredictionLog(produce(logFromState, draft => draft)); // Use immer for safe state update
    } else {
      // This case should ideally not happen if log is from current predictionLogs
      // But as a fallback, use the passed log directly (though it might be stale if logs updated rapidly)
      setSelectedPredictionLog(produce(log, draft => draft));
    }
  }, [predictionLogs]); // Depend on predictionLogs to get the latest version of the log

  const handleDateRangeChange = useCallback((newRange: DateRangeFilter) => {
    setDateRangeFilter(newRange);
  }, []);

  // Prediction generation useEffect
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) return; // Only run if logged in and auth check complete

    let timeoutId: NodeJS.Timeout | undefined = undefined;

    const performPrediction = async () => {
      if (isLoading) { // Prevent multiple simultaneous fetches
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current;
      const currentPipsSettings = latestPipsSettingsRef.current;

      // Validation for PIPS settings
      const { profitPips, lossPips } = currentPipsSettings;
      const isPipsSettingsInvalid =
        profitPips.min <= 0 || profitPips.max <= 0 || profitPips.min > profitPips.max ||
        lossPips.min <= 0 || lossPips.max <= 0 || lossPips.min > lossPips.max;

      const noCurrenciesSelected = currentSelectedPairs.length === 0;

      if (noCurrenciesSelected) {
        // setLatestNotification({ title: "No Currency Pairs Selected", description: "Please select at least one currency pair to start predictions.", variant: 'default', timestamp: new Date() });
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      if (isPipsSettingsInvalid) {
        // Only show this notification if currencies are selected but pips are invalid
        if (currentSelectedPairs.length > 0) {
            setLatestNotification({
                title: "Prediction Paused",
                description: "Ensure Min/Max PIPS for profit & loss are valid (Min > 0, Max > 0, Min <= Max). Predictions update automatically if parameters are valid.",
                variant: "default", // Changed from destructive to default/info
                timestamp: new Date(),
             });
        }
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }


      setIsLoading(true);

      // Generate multiple pending logs for each selected currency pair
      const newPendingLogs: PredictionLogItem[] = [];
      currentSelectedPairs.forEach(currencyPair => {
        const numPredictionsForPair = Math.floor(Math.random() * 10) + 1; // 1 to 10 predictions
        for (let i = 0; i < numPredictionsForPair; i++) {
          const newLogId = generateId();
          newPendingLogs.push({
            id: newLogId,
            timestamp: new Date(),
            currencyPair: currencyPair,
            pipsSettings: currentPipsSettings, // Use the latest pips settings
            status: "PENDING",
            // expiresAt will be set upon successful prediction
          });
        }
      });

      if (newPendingLogs.length === 0) { // Should not happen if currencies are selected
        setIsLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      // Add all new pending logs to the state
      setPredictionLogs(produce(draft => {
        newPendingLogs.forEach(log => {
          draft.push(log); // Add to the end
        });
        // Enforce MAX_PREDICTION_LOGS by removing oldest if exceeded
        if (draft.length > MAX_PREDICTION_LOGS) {
          draft.splice(0, draft.length - MAX_PREDICTION_LOGS);
        }
      }));

      // Process predictions for all new pending logs
      const predictionPromises = newPendingLogs.map(async (pendingLog) => {
        const result = await getPipsPredictionAction(pendingLog.currencyPair, pendingLog.pipsSettings);
        return { result, pendingLog }; // Return both result and the original pendingLog for context
      });


      const results = await Promise.all(predictionPromises);

      let successCount = 0;
      let errorCount = 0;

      setPredictionLogs(produce(draft => {
        const activePairsAfterAsync = latestSelectedCurrencyPairsRef.current; // Get the most current selected pairs

        results.forEach(({ result, pendingLog }) => {
          const logIndex = draft.findIndex(log => log.id === pendingLog.id);
          if (logIndex === -1) {
            // Log might have been removed by another process (e.g., cleanup or exceeding max logs)
            return;
          }

          // Check if the currency pair for this log is still selected
          if (!activePairsAfterAsync.includes(pendingLog.currencyPair)) {
              // If pair is no longer selected, remove this specific log
              // Also, if this log was the selected one for details view, clear it
              if (selectedPredictionLog && selectedPredictionLog.id === pendingLog.id) {
                setSelectedPredictionLog(null);
              }
              draft.splice(logIndex, 1);
              return; // Skip further processing for this log
          }

          let logToUpdate = draft[logIndex]; // This is a draft proxy

          if (result.error) {
            errorCount++;
            logToUpdate.status = "ERROR";
            logToUpdate.error = result.error;
          } else if (result.data) {
            successCount++;
            // Assign a random expiration time between MIN_EXPIRATION_SECONDS and MAX_EXPIRATION_SECONDS
            const randomExpirationSeconds = Math.floor(Math.random() * (MAX_EXPIRATION_SECONDS - MIN_EXPIRATION_SECONDS + 1)) + MIN_EXPIRATION_SECONDS;
            const randomExpirationMs = randomExpirationSeconds * 1000;
            Object.assign(logToUpdate, { status: "SUCCESS", predictionOutcome: result.data, expiresAt: new Date(Date.now() + randomExpirationMs) });
          }
        });
        // Re-apply max logs enforcement after updates, in case some were removed and new ones pushed the total over
        if (draft.length > MAX_PREDICTION_LOGS) {
          const removedCount = draft.length - MAX_PREDICTION_LOGS;
          const removedItems = draft.splice(0, removedCount); // Remove oldest logs

          // Check if the selected log was among the removed items
          if (selectedPredictionLog && removedItems.find(item => item.id === selectedPredictionLog.id)) {
            setSelectedPredictionLog(null);
          }
        }
      }));

      // Notification logic based on results
      if (results.length > 0 && (successCount > 0 || errorCount > 0)) {
        let toastTitle = "Predictions Updated";
        let toastDescription = "";
        const relevantPairs = latestSelectedCurrencyPairsRef.current.join(', '); // Show pairs involved

        if (successCount > 0 && errorCount === 0) {
          toastDescription = `${successCount} prediction(s) completed for ${relevantPairs}.`;
        } else if (successCount > 0 && errorCount > 0) {
          toastTitle = "Some Predictions Failed";
          toastDescription = `${successCount} succeeded, ${errorCount} failed for ${relevantPairs}.`;
        } else if (errorCount > 0 && successCount === 0) {
          toastTitle = "Prediction Errors";
          toastDescription = `${errorCount} prediction(s) failed for ${relevantPairs}.`;
        }
        // Only show notification if there are selected pairs and a meaningful description
        if (toastDescription && latestSelectedCurrencyPairsRef.current.length > 0) {
          setLatestNotification({
            title: toastTitle,
            description: toastDescription,
            variant: errorCount > 0 && successCount === 0 ? "destructive" : (successCount > 0 ? "success" : "default"),
            timestamp: new Date(),
          });
        }
      }

      setIsLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
    };

    // Initial call
    if (timeoutId) clearTimeout(timeoutId); // Clear existing timeout before setting a new one
    timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);

    // Cleanup function
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isAuthCheckComplete, generateId, isLoading, selectedPredictionLog]); // Removed selectedCurrencyPairs and pipsSettings from deps to rely on refs


  // Effect for cleaning up logs whose currency pairs are no longer selected
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) return;

    const cleanupIntervalId = setInterval(() => {
      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current; // Get the most current selected pairs

      setPredictionLogs(produce(draft => {
        let didChange = false;
        for (let i = draft.length - 1; i >= 0; i--) {
          const log = draft[i];
          let removeLog = false;

          // If a log's currency pair is no longer in the selected list, mark for removal
          // This applies to logs of any status (PENDING, SUCCESS, ERROR)
          if (!currentSelectedPairs.includes(log.currencyPair) && (log.status === "PENDING" || log.status === "SUCCESS" || log.status === "ERROR")) {
            removeLog = true;
          }

          // No need to explicitly handle expired logs here, as the main performPrediction loop now sets expiresAt
          // and the filtering logic for active/expired tables handles display.
          // This cleanup focuses on logs for deselected pairs.

          if (removeLog) {
            // If the log to be removed is currently selected for details view, clear the selection
            if (selectedPredictionLog && selectedPredictionLog.id === log.id) {
              setSelectedPredictionLog(null);
            }
            draft.splice(i, 1);
            didChange = true;
          }
        }
        if (!didChange) return undefined; // Immer optimization: if no changes, return undefined
      }));
    }, 1000); // Run cleanup every second

    return () => clearInterval(cleanupIntervalId);
  }, [currentUser, isAuthCheckComplete, selectedPredictionLog]); // Removed selectedCurrencyPairs from deps to rely on refs



  // Memoized filtering and sorting logic
  const getSortableValue = useCallback((log: PredictionLogItem, key: SortableColumnKey): string | number | Date | undefined => {
    switch (key) {
      case 'status': return log.status;
      case 'timestamp': return log.timestamp;
      case 'currencyPair': return log.currencyPair;
      case 'profitPipsMin': return log.pipsSettings.profitPips.min;
      case 'profitPipsMax': return log.pipsSettings.profitPips.max;
      case 'lossPipsMin': return log.pipsSettings.lossPips.min;
      case 'lossPipsMax': return log.pipsSettings.lossPips.max;
      case 'tradingSignal': return log.predictionOutcome?.tradingSignal;
      case 'expiresAt': return log.expiresAt;
      default: return undefined;
    }
  }, []);

  const baseFilteredLogs = useMemo(() => {
    return predictionLogs.filter(log => {
      // Always filter by selected currency pairs first
      if (!latestSelectedCurrencyPairsRef.current.includes(log.currencyPair)) return false;
      // Date range filtering
      const logTimestamp = new Date(log.timestamp); 
      if (dateRangeFilter.start && isValid(dateRangeFilter.start) && logTimestamp < dateRangeFilter.start) return false;
      if (dateRangeFilter.end && isValid(dateRangeFilter.end) && logTimestamp > dateRangeFilter.end) return false;
      
      return true;
    });
  }, [predictionLogs, dateRangeFilter]); // latestSelectedCurrencyPairsRef is stable

  const potentialActiveLogs = useMemo(() => {
    return baseFilteredLogs.filter(log => !log.expiresAt || new Date(log.expiresAt) > currentTimeForFiltering);
  }, [baseFilteredLogs, currentTimeForFiltering]);
  
  const potentialExpiredLogs = useMemo(() => {
    return baseFilteredLogs.filter(log => log.expiresAt && new Date(log.expiresAt) <= currentTimeForFiltering);
  }, [baseFilteredLogs, currentTimeForFiltering]);

  const activeLogs = useMemo(() => {
    return potentialActiveLogs.filter(log => {
      if (activeTableFilterStatus !== "ALL" && log.status !== activeTableFilterStatus) return false;
      if (activeTableFilterSignal !== "ALL" && (!log.predictionOutcome || log.predictionOutcome.tradingSignal !== activeTableFilterSignal)) return false;
      return true;
    });
  }, [potentialActiveLogs, activeTableFilterStatus, activeTableFilterSignal]);
  
  // For expired logs, we first filter then sort then slice
  const fullyFilteredExpiredLogs = useMemo(() => {
    if (!showExpired) return [];
    return potentialExpiredLogs.filter(log => {
      if (expiredTableFilterStatus !== "ALL" && log.status !== expiredTableFilterStatus) return false;
      if (expiredTableFilterSignal !== "ALL" && (!log.predictionOutcome || log.predictionOutcome.tradingSignal !== expiredTableFilterSignal)) return false;
      return true;
    });
  }, [potentialExpiredLogs, expiredTableFilterStatus, expiredTableFilterSignal, showExpired]);


  const sortLogs = useCallback((logs: PredictionLogItem[], config: SortConfig) => {
    return [...logs].sort((a, b) => {
      const valA = getSortableValue(a, config.key);
      const valB = getSortableValue(b, config.key);

      if (valA === undefined && valB === undefined) return 0;
      if (valA === undefined) return config.direction === 'asc' ? 1 : -1; 
      if (valB === undefined) return config.direction === 'asc' ? -1 : 1; 

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (valA instanceof Date && valB instanceof Date) {
        comparison = valA.getTime() - valB.getTime();
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }
      return config.direction === 'asc' ? comparison : -comparison;
    });
  }, [getSortableValue]);

  const sortedActiveLogsData = useMemo(() => sortLogs(activeLogs, sortConfigActive), [activeLogs, sortConfigActive, sortLogs]);
  const displayedSortedActiveLogs = useMemo(() => sortedActiveLogsData.slice(0, displayedActiveLogsCount), [sortedActiveLogsData, displayedActiveLogsCount]);
  
  const sortedAndLimitedExpiredLogs = useMemo(() => {
    const sorted = sortLogs(fullyFilteredExpiredLogs, sortConfigExpired);
    return sorted.slice(0, displayedExpiredLogsCount);
  }, [fullyFilteredExpiredLogs, sortConfigExpired, displayedExpiredLogsCount, sortLogs]);


  // Effect to auto-select a prediction if none is selected and logs are available
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) {
      if (selectedPredictionLog !== null) setSelectedPredictionLog(null);
      return;
    }
  
    let newSelectedLogCandidate: PredictionLogItem | null = null;
  
    const combinedSortedLogsForSelection = [...displayedSortedActiveLogs, ...(showExpired ? sortedAndLimitedExpiredLogs : [])];
  
    if (combinedSortedLogsForSelection.length > 0) {
      const currentSelectionStillEligible = selectedPredictionLog && combinedSortedLogsForSelection.find(log => log.id === selectedPredictionLog.id);
  
      if (currentSelectionStillEligible) {
        newSelectedLogCandidate = produce(combinedSortedLogsForSelection.find(log => log.id === selectedPredictionLog!.id)!, draft => draft);
      } else {
        newSelectedLogCandidate = produce(combinedSortedLogsForSelection[0], draft => draft);
      }
    }
  
    if (selectedPredictionLog?.id !== newSelectedLogCandidate?.id ||
        (selectedPredictionLog && newSelectedLogCandidate && JSON.stringify(selectedPredictionLog) !== JSON.stringify(newSelectedLogCandidate)) || 
        (!selectedPredictionLog && newSelectedLogCandidate) || (selectedPredictionLog && !newSelectedLogCandidate)
       ) {
      setSelectedPredictionLog(newSelectedLogCandidate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isAuthCheckComplete, displayedSortedActiveLogs, sortedAndLimitedExpiredLogs, showExpired]); // `selectedPredictionLog` removed from deps to avoid loop, but it's used for comparison.

  const handleSort = (key: SortableColumnKey, tableType: 'active' | 'expired') => {
    const setSortConfig = tableType === 'active' ? setSortConfigActive : setSortConfigExpired;

    setSortConfig(prevConfig => {
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'asc' ? 'desc' : 'asc' };
      }
      const defaultDirection = (key === 'timestamp' || key === 'expiresAt') ? 'desc' : 'asc';
      return { key, direction: defaultDirection };
    });
  };


  if (!isAuthCheckComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading Geonera...</p>
      </div>
    );
  }

  if (!currentUser && isAuthCheckComplete) {
    // Render simplified page for logged-out users
  }
  const finalSelectedPredictionForChildren = selectedPredictionLog ? produce(selectedPredictionLog, draft => draft) : null;


  return (
    <div className="h-screen grid grid-rows-[auto_auto_1fr_auto] bg-background text-foreground">
      <AppHeader user={currentUser} onLogout={handleLogout} />

      {currentUser && ( 
        <div className="w-full px-2 py-1 grid grid-cols-[1.5fr_3fr_2fr_2fr] gap-1"> {/* Adjusted grid for new layout */}
          <PairSelectorCard
            selectedCurrencyPairs={selectedCurrencyPairs}
            onSelectedCurrencyPairsChange={handleSelectedCurrencyPairsChange}
            isLoading={isLoading}
            className="col-span-1" // Pair selector
          />
          <PipsInputCard
            pipsSettings={pipsSettings}
            onPipsSettingsChange={handlePipsSettingsChange}
            isLoading={isLoading}
            className="col-span-1" // Pips input
          />
          <PredictionFilterControls // This now only handles 'Show Expired'
            showExpired={showExpired}
            onShowExpiredChange={setShowExpired}
            className="col-span-1" // Filter controls
          />
          <NotificationDisplay notification={latestNotification} className="col-span-1" />
        </div>
      )}
      {!currentUser && isAuthCheckComplete && (
        <div className="p-4 text-center text-muted-foreground">
          Please log in to view and manage Forex predictions.
        </div>
      )}

      {currentUser && ( 
        <main className="w-full px-2 py-1 grid grid-cols-1 md:grid-cols-3 gap-1 overflow-hidden">
          <div className="md:col-span-2 flex flex-col min-h-0"> 
            <Card className="shadow-xl h-full flex flex-col">
              <CardHeader className="bg-primary/10 p-2 rounded-t-lg flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-primary">
                  Prediction Logs
                </CardTitle>
                <div className="flex items-center gap-1">
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
                        } else if (!e.target.value) {
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
                        } else if (!e.target.value) {
                          handleDateRangeChange({ ...dateRangeFilter, end: null });
                        }
                      }}
                      className="h-7 text-xs py-1 w-auto border-primary/30 focus:border-primary"
                      aria-label="Filter end date and time"
                    />
                </div>
              </CardHeader>
              <CardContent className="p-1 flex-grow grid grid-cols-1 md:grid-cols-2 gap-1 overflow-hidden">
                <div className="flex flex-col min-h-0 overflow-y-auto h-full">
                  <PredictionsTable
                    title="Active Predictions"
                    predictions={displayedSortedActiveLogs}
                    onRowClick={handlePredictionSelect}
                    selectedPredictionId={finalSelectedPredictionForChildren?.id}
                    maxLogs={MAX_PREDICTION_LOGS} // Global storage limit
                    sortConfig={sortConfigActive}
                    onSort={(key) => handleSort(key, 'active')}
                    filterStatus={activeTableFilterStatus}
                    onFilterStatusChange={setActiveTableFilterStatus}
                    filterSignal={activeTableFilterSignal}
                    onFilterSignalChange={setActiveTableFilterSignal}
                    displayLimit={displayedActiveLogsCount}
                    onDisplayLimitChange={setDisplayedActiveLogsCount}
                    totalAvailableForDisplay={activeLogs.length}
                  />
                </div>
                <div className="flex flex-col min-h-0 overflow-y-auto h-full">
                  <PredictionsTable
                    title="Expired Predictions"
                    predictions={sortedAndLimitedExpiredLogs}
                    onRowClick={handlePredictionSelect}
                    selectedPredictionId={finalSelectedPredictionForChildren?.id}
                    maxLogs={MAX_PREDICTION_LOGS} // Global storage limit
                    sortConfig={sortConfigExpired}
                    onSort={(key) => handleSort(key, 'expired')}
                    filterStatus={expiredTableFilterStatus}
                    onFilterStatusChange={setExpiredTableFilterStatus}
                    filterSignal={expiredTableFilterSignal}
                    onFilterSignalChange={setExpiredTableFilterSignal}
                    displayLimit={displayedExpiredLogsCount}
                    onDisplayLimitChange={setDisplayedExpiredLogsCount}
                    totalAvailableForDisplay={fullyFilteredExpiredLogs.length}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-1 flex flex-col min-h-0"> 
            <PredictionDetailsPanel selectedPrediction={finalSelectedPredictionForChildren} maxPredictionLogs={MAX_PREDICTION_LOGS} />
          </div>
        </main>
      )}
      <footer className="py-2 text-center text-sm text-muted-foreground border-t border-border bg-muted">
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved.
        {currentUser && " Predictions update automatically every 30 seconds if parameters are valid."}
      </footer>
    </div>
  );
}
