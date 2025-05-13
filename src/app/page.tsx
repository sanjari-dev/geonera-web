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
} from '@/types';
import { getPipsPredictionAction } from '@/lib/actions';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, CalendarDays, Settings as SettingsIcon, List, PackageCheck, PackageOpen } from 'lucide-react'; // Filter icon removed as it's used internally in PredictionsTable
import { startOfDay, endOfDay, isValid, format as formatDateFns } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const MAX_NOTIFICATIONS = 100;


const formatDateToDateTimeLocal = (date: Date | null): string => {
  if (!date || !isValid(date)) return '';
  const tempDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return tempDate.toISOString().slice(0, 16);
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
      const currentIntervalOption = REFRESH_INTERVAL_OPTIONS.find(opt => opt.value === latestSelectedRefreshIntervalValueRef.current);
      const currentPredictionIntervalMs = currentIntervalOption ? currentIntervalOption.milliseconds : 60000; // Default to 1 minute


      if (isLoading) { 
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, currentPredictionIntervalMs);
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
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, currentPredictionIntervalMs);
        return;
      }

      if (isPipsSettingsInvalid) {
        if (currentSelectedPairs.length > 0) {
            addNotification({
                title: "Prediction Paused",
                description: "Ensure Min/Max PIPS for profit & loss are valid (Min > 0, Max > 0, Min <= Max). Predictions update automatically if parameters are valid.",
                variant: "default", 
             });
        }
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, currentPredictionIntervalMs);
        return;
      }


      setIsLoading(true);

      const newPendingLogs: PredictionLogItem[] = [];
      currentSelectedPairs.forEach(currencyPair => {
        const numPredictionsForPair = Math.floor(Math.random() * 10) + 1; 
        for (let i = 0; i < numPredictionsForPair; i++) {
          const newLogId = generateId();
          newPendingLogs.push({
            id: newLogId,
            timestamp: new Date(),
            currencyPair: currencyPair,
            pipsSettings: currentPipsSettings, 
            status: "PENDING",
          });
        }
      });

      if (newPendingLogs.length === 0) { 
        setIsLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, currentPredictionIntervalMs);
        return;
      }

      setPredictionLogs(produce(draft => {
        newPendingLogs.forEach(log => {
          draft.push(log); 
        });
        if (draft.length > MAX_PREDICTION_LOGS_CONFIG) {
          draft.splice(0, draft.length - MAX_PREDICTION_LOGS_CONFIG);
        }
      }));

      const predictionPromises = newPendingLogs.map(async (pendingLog) => {
        const result = await getPipsPredictionAction(pendingLog.currencyPair, pendingLog.pipsSettings);
        return { result, pendingLog }; 
      });


      const results = await Promise.all(predictionPromises);

      let successCount = 0;
      let errorCount = 0;

      setPredictionLogs(produce(draft => {
        const activePairsAfterAsync = latestSelectedCurrencyPairsRef.current; 

        results.forEach(({ result, pendingLog }) => {
          const logIndex = draft.findIndex(log => log.id === pendingLog.id);
          if (logIndex === -1) {
            return;
          }

          if (!activePairsAfterAsync.includes(pendingLog.currencyPair)) {
              if (selectedPredictionLog && selectedPredictionLog.id === pendingLog.id) {
                setSelectedPredictionLog(null);
                if (activeDetailsView === 'details') setActiveDetailsView('about');
              }
              draft.splice(logIndex, 1);
              return; 
          }

          let logToUpdate = draft[logIndex]; 

          if (result.error) {
            errorCount++;
            logToUpdate.status = "ERROR";
            logToUpdate.error = result.error;
          } else if (result.data) {
            successCount++;
            const randomExpirationSeconds = Math.floor(Math.random() * (MAX_EXPIRATION_SECONDS - MIN_EXPIRATION_SECONDS + 1)) + MIN_EXPIRATION_SECONDS;
            const randomExpirationMs = randomExpirationSeconds * 1000;
            Object.assign(logToUpdate, { status: "SUCCESS", predictionOutcome: result.data, expiresAt: new Date(Date.now() + randomExpirationMs) });
          }
        });
        if (draft.length > MAX_PREDICTION_LOGS_CONFIG) {
          const removedCount = draft.length - MAX_PREDICTION_LOGS_CONFIG;
          const removedItems = draft.splice(0, removedCount); 

          if (selectedPredictionLog && removedItems.find(item => item.id === selectedPredictionLog.id)) {
            setSelectedPredictionLog(null);
             if (activeDetailsView === 'details') setActiveDetailsView('about');
          }
        }
      }));

      if (results.length > 0 && (successCount > 0 || errorCount > 0)) {
        let toastTitle = "Predictions Updated";
        let toastDescription = "";
        const relevantPairs = latestSelectedCurrencyPairsRef.current.join(', '); 

        if (successCount > 0 && errorCount === 0) {
          toastDescription = `${successCount} prediction(s) completed for ${relevantPairs}.`;
        } else if (successCount > 0 && errorCount > 0) {
          toastTitle = "Some Predictions Failed";
          toastDescription = `${successCount} succeeded, ${errorCount} failed for ${relevantPairs}.`;
        } else if (errorCount > 0 && successCount === 0) {
          toastTitle = "Prediction Errors";
          toastDescription = `${errorCount} prediction(s) failed for ${relevantPairs}.`;
        }
        if (toastDescription && latestSelectedCurrencyPairsRef.current.length > 0) {
          addNotification({
            title: toastTitle,
            description: toastDescription,
            variant: errorCount > 0 && successCount === 0 ? "destructive" : (successCount > 0 ? "success" : "default"),
          });
        }
      }

      setIsLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(performPrediction, currentPredictionIntervalMs);
    };
    
    const initialIntervalOption = REFRESH_INTERVAL_OPTIONS.find(opt => opt.value === latestSelectedRefreshIntervalValueRef.current);
    const initialPredictionIntervalMs = initialIntervalOption ? initialIntervalOption.milliseconds : 60000; // Default to 1 minute


    if (timeoutId) clearTimeout(timeoutId); 
    timeoutId = setTimeout(performPrediction, initialPredictionIntervalMs);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isAuthCheckComplete, generateId, addNotification, activeDetailsView, selectedRefreshIntervalValue]); 

  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) return;

    const cleanupIntervalId = setInterval(() => {
      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current; 

      setPredictionLogs(produce(draft => {
        let didChange = false;
        for (let i = draft.length - 1; i >= 0; i--) {
          const log = draft[i];
          let removeLog = false;

          if (!currentSelectedPairs.includes(log.currencyPair) && (log.status === "PENDING" || log.status === "SUCCESS" || log.status === "ERROR")) {
            removeLog = true;
          }

          if (removeLog) {
            if (selectedPredictionLog && selectedPredictionLog.id === log.id) {
              setSelectedPredictionLog(null);
              if (activeDetailsView === 'details') setActiveDetailsView('about');
            }
            draft.splice(i, 1);
            didChange = true;
          }
        }
        if (!didChange) return undefined; 
      }));
    }, 1000); 

    return () => clearInterval(cleanupIntervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isAuthCheckComplete, selectedPredictionLog, activeDetailsView]); 


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
    return predictionLogs.filter(log => {
      if (!latestSelectedCurrencyPairsRef.current.includes(log.currencyPair)) return false;
      const logTimestamp = new Date(log.timestamp); 
      if (dateRangeFilter.start && isValid(dateRangeFilter.start) && logTimestamp < dateRangeFilter.start) return false;
      if (dateRangeFilter.end && isValid(dateRangeFilter.end) && logTimestamp > dateRangeFilter.end) return false;
      
      return true;
    });
  }, [predictionLogs, dateRangeFilter]); 

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
    const sorted = sortLogs(fullyFilteredExpiredExpiredLogs, sortConfigExpired);
    return sorted.slice(0, displayedExpiredLogsCount);
  }, [fullyFilteredExpiredExpiredLogs, sortConfigExpired, displayedExpiredLogsCount, sortLogs]);


  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete || activeDetailsView !== 'details') {
       if (selectedPredictionLog !== null && activeDetailsView !== 'details') {
           setSelectedPredictionLog(null);
       }
      return;
    }
  
    let newSelectedLogCandidate: PredictionLogItem | null = null;
    const combinedSortedLogsForSelection = [...displayedSortedActiveLogs, ...sortedAndLimitedExpiredLogs];
  
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
  }, [currentUser, isAuthCheckComplete, displayedSortedActiveLogs, sortedAndLimitedExpiredLogs, activeDetailsView]); 

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
    // Handled by useEffect redirecting to /login
    return null; 
  }
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

      {!currentUser && isAuthCheckComplete && (
        <div className="p-4 text-center text-muted-foreground">
          Please log in to view and manage Forex predictions.
        </div>
      )}

      {currentUser && ( 
        <main className="w-full px-2 py-1 grid grid-cols-1 md:grid-cols-3 gap-1 overflow-hidden">
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
                    <div className="flex flex-col min-h-0 overflow-y-auto h-full">
                      <PredictionsTable
                        title="Active Predictions"
                        titleIcon={<PackageCheck className="h-4 w-4 mr-1.5" />}
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
                        totalAvailableForDisplay={activeLogs.length}
                        maxLogs={MAX_PREDICTION_LOGS_CONFIG}
                      />
                    </div>
                    <div className="flex flex-col min-h-0 overflow-y-auto h-full">
                      <PredictionsTable
                        title="Expired Predictions"
                        titleIcon={<PackageOpen className="h-4 w-4 mr-1.5" />}
                        predictions={sortedAndLimitedExpiredLogs}
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
                        totalAvailableForDisplay={fullyFilteredExpiredExpiredLogs.length}
                        maxLogs={MAX_PREDICTION_LOGS_CONFIG}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4"> {/* Add padding for PipsInputCard view */}
                    <PipsInputCard
                      pipsSettings={pipsSettings}
                      onPipsSettingsChange={handlePipsSettingsChange}
                      isLoading={isLoading}
                      className="shadow-none border-0 bg-transparent" 
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-1 flex flex-col min-h-0 gap-1"> 
            <PredictionDetailsPanel 
              activeView={activeDetailsView}
              onActiveViewChange={handleActiveDetailsViewChange}
              selectedPrediction={finalSelectedPredictionForChildren} 
              maxPredictionLogs={MAX_PREDICTION_LOGS_CONFIG}
              notifications={notificationsList}
            />
            {currentUser && (
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


