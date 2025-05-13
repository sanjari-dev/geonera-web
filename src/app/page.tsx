// src/app/page.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
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
  REFRESH_INTERVAL_OPTIONS,
  DEFAULT_REFRESH_INTERVAL_VALUE,
  MIN_EXPIRATION_SECONDS,
  // MAX_EXPIRATION_SECONDS, // Default max lifetime for random generation
  MIN_USER_CONFIGURABLE_MAX_LIFETIME_SEC,
  MAX_USER_CONFIGURABLE_MAX_LIFETIME_SEC,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, CalendarDays, Settings as SettingsIcon, List, Smartphone, ClockIcon, AlertTriangle } from 'lucide-react';
import { 
  startOfDay, endOfDay, isValid,
} from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDateToDateTimeLocal, parseDurationStringToSeconds, formatSecondsToDurationString } from '@/lib/datetime-utils';
import { getSortableValue } from '@/lib/table-utils';
import { usePredictionEngine } from '@/hooks/use-prediction-engine';
import { useLogDisplay } from '@/hooks/use-log-display';
import { UnsupportedResolutionMessage } from '@/components/geonera/unsupported-resolution-message';
import { cn } from '@/lib/utils';


const MAX_NOTIFICATIONS = 100;
const MIN_WIDTH = 1400; 
const MIN_HEIGHT = 800;

export default function GeoneraPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);
  const [currentYear, setCurrentYear] = useState<string>('');

  const [selectedCurrencyPairs, setSelectedCurrencyPairs] = useState<CurrencyPair[]>([]);
  const [pipsSettings, setPipsSettings] = useState<PipsSettings>({
    profitPips: { min: 10, max: 20 },
    lossPips: { min: 5, max: 10 },
  });

  // maxPredictionLifetime stores seconds (number)
  const [maxPredictionLifetime, setMaxPredictionLifetime] = useState<number>(MIN_USER_CONFIGURABLE_MAX_LIFETIME_SEC); // Default to 10 minutes (600 seconds)
  // maxPredictionLifetimeInputString stores the "DD HH:mm:ss" string for the input field
  const [maxPredictionLifetimeInputString, setMaxPredictionLifetimeInputString] = useState<string>(
    formatSecondsToDurationString(MIN_USER_CONFIGURABLE_MAX_LIFETIME_SEC) // Initialize with 10 minutes string representation
  );
  const [maxPredictionLifetimeError, setMaxPredictionLifetimeError] = useState<string | null>(null);


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
  
  const [currentTimeForFiltering, setCurrentTimeForFiltering] = useState<Date | null>(null);
  const [displayedActiveLogsCount, setDisplayedActiveLogsCount] = useState<number>(DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT);
  const [displayedExpiredLogsCount, setDisplayedExpiredLogsCount] = useState<number>(DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT);
  const [activeDetailsView, setActiveDetailsView] = useState<ActiveDetailsView>('about');
  const [predictionLogsViewMode, setPredictionLogsViewMode] = useState<'logs' | 'pipsSettings'>('logs');
  const [selectedRefreshIntervalValue, setSelectedRefreshIntervalValue] = useState<RefreshIntervalValue>(DEFAULT_REFRESH_INTERVAL_VALUE);
  const [isResolutionSupported, setIsResolutionSupported] = useState(true);

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

  const latestMaxPredictionLifetimeRef = useRef(maxPredictionLifetime);
    useEffect(() => {
    latestMaxPredictionLifetimeRef.current = maxPredictionLifetime;
  }, [maxPredictionLifetime]);

  useEffect(() => {
    setCurrentTimeForFiltering(new Date());
    setCurrentYear(new Date().getFullYear().toString());
    if (typeof uuidv4 === 'function') {
        setUuidAvailable(true);
    }
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    setDateRangeFilter({ start: todayStart, end: todayEnd });
    // setMaxPredictionLifetimeInputString(formatSecondsToDurationString(maxPredictionLifetime)); // Initial call was here


    const storedUser = localStorage.getItem('geoneraUser');
    if (storedUser) {
        try {
        setCurrentUser(JSON.parse(storedUser));
        } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localStorage.removeItem('geoneraUser');
        }
    }
    setIsAuthCheckComplete(true);

    const checkResolution = () => {
      if (typeof window !== 'undefined') {
        setIsResolutionSupported(window.innerWidth >= MIN_WIDTH && window.innerHeight >= MIN_HEIGHT);
      }
    };
    checkResolution();
    window.addEventListener('resize', checkResolution);
    return () => window.removeEventListener('resize', checkResolution);

  }, []); 
  
  // Separate useEffect for maxPredictionLifetimeInputString initialization and updates
  // This avoids re-running the main useEffect when maxPredictionLifetime changes due to input.
  useEffect(() => {
    setMaxPredictionLifetimeInputString(formatSecondsToDurationString(maxPredictionLifetime));
    // Trigger validation check when maxPredictionLifetime (the source of truth for seconds) changes
    const parsedSeconds = maxPredictionLifetime;
     if (parsedSeconds < MIN_USER_CONFIGURABLE_MAX_LIFETIME_SEC) {
      setMaxPredictionLifetimeError(`Minimum is ${formatSecondsToDurationString(MIN_USER_CONFIGURABLE_MAX_LIFETIME_SEC)} (10 minutes).`);
    } else if (parsedSeconds > MAX_USER_CONFIGURABLE_MAX_LIFETIME_SEC) {
      setMaxPredictionLifetimeError(`Maximum is ${formatSecondsToDurationString(MAX_USER_CONFIGURABLE_MAX_LIFETIME_SEC)} (5 days).`);
    } else {
      setMaxPredictionLifetimeError(null);
    }
  }, [maxPredictionLifetime]);


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

  const { predictionLogs, setPredictionLogs, isLoading } = usePredictionEngine({
    currentUser,
    isAuthCheckComplete,
    currentTimeForFiltering,
    latestSelectedCurrencyPairsRef,
    latestPipsSettingsRef,
    latestSelectedRefreshIntervalValueRef,
    latestMaxPredictionLifetimeRef,
    addNotificationCallback: addNotification,
    generateIdCallback: generateId,
    selectedPredictionLog,
    setSelectedPredictionLog,
    activeDetailsView,
    setActiveDetailsView,
  });
  
  const { 
    displayedSortedActiveLogs, 
    sortedAndLimitedExpiredLogs,
    totalActiveLogsCount,
    totalExpiredLogsCount,
  } = useLogDisplay({
    predictionLogs,
    dateRangeFilter,
    currentTimeForFiltering,
    latestSelectedCurrencyPairsRef,
    activeTableFilterStatus,
    activeTableFilterSignal,
    expiredTableFilterStatus,
    expiredTableFilterSignal,
    sortConfigActive,
    sortConfigExpired,
    displayedActiveLogsCount,
    displayedExpiredLogsCount,
    getSortableValueCallback: getSortableValue,
  });


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

  const handleMaxLifetimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setMaxPredictionLifetimeInputString(inputValue); // Update string state immediately for responsive input
  
    const parsedSeconds = parseDurationStringToSeconds(inputValue);
  
    if (parsedSeconds === null && inputValue.trim() !== "") { // Allow empty to clear, but show error if not empty and unparsable
      setMaxPredictionLifetimeError("Invalid format. Use DD HH:mm:ss or HH:mm:ss or mm:ss or ss.");
    } else if (inputValue.trim() === "") {
        setMaxPredictionLifetimeError(null); // Or set an error "Value cannot be empty" if preferred
        // Optionally set maxPredictionLifetime to a default or MIN_USER_CONFIGURABLE_MAX_LIFETIME_SEC
        setMaxPredictionLifetime(MIN_USER_CONFIGURABLE_MAX_LIFETIME_SEC);
    } else if (parsedSeconds !== null && parsedSeconds < MIN_USER_CONFIGURABLE_MAX_LIFETIME_SEC) {
      setMaxPredictionLifetimeError(`Minimum is ${formatSecondsToDurationString(MIN_USER_CONFIGURABLE_MAX_LIFETIME_SEC)} (10 minutes).`);
    } else if (parsedSeconds !== null && parsedSeconds > MAX_USER_CONFIGURABLE_MAX_LIFETIME_SEC) {
      setMaxPredictionLifetimeError(`Maximum is ${formatSecondsToDurationString(MAX_USER_CONFIGURABLE_MAX_LIFETIME_SEC)} (5 days).`);
    } else if (parsedSeconds !== null) {
      setMaxPredictionLifetimeError(null);
      setMaxPredictionLifetime(parsedSeconds); // Update the actual seconds state
    } else {
       setMaxPredictionLifetimeError(null); // Catch all for empty or other valid states that don't trigger error
    }
  };

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
    if (!currentUser || !isAuthCheckComplete || !currentTimeForFiltering || activeDetailsView !== 'details') {
       if (selectedPredictionLog !== null && activeDetailsView !== 'details') {
           setSelectedPredictionLog(null);
       }
      return;
    }
  
    let newSelectedLogCandidate: PredictionLogItem | null = null;
  
    if (selectedPredictionLog) {
      if (displayedSortedActiveLogs.find(log => log.id === selectedPredictionLog!.id)) {
        newSelectedLogCandidate = displayedSortedActiveLogs.find(log => log.id === selectedPredictionLog!.id)!;
      } else if (sortedAndLimitedExpiredLogs.find(log => log.id === selectedPredictionLog!.id)) {
        newSelectedLogCandidate = sortedAndLimitedExpiredLogs.find(log => log.id === selectedPredictionLog!.id)!;
      }
    }
  
    if (!newSelectedLogCandidate) { 
      if (displayedSortedActiveLogs.length > 0) {
        newSelectedLogCandidate = displayedSortedActiveLogs[0];
      } else if (sortedAndLimitedExpiredLogs.length > 0) {
        newSelectedLogCandidate = sortedAndLimitedExpiredLogs[0];
      }
    }
    
    const currentSelectionString = selectedPredictionLog ? JSON.stringify(selectedPredictionLog) : null;
    const newCandidateString = newSelectedLogCandidate ? JSON.stringify(newSelectedLogCandidate) : null;

    if (currentSelectionString !== newCandidateString) {
         setSelectedPredictionLog(newSelectedLogCandidate ? produce(newSelectedLogCandidate, draft => draft) : null);
    }
  }, [
      currentUser, 
      isAuthCheckComplete, 
      displayedSortedActiveLogs, 
      sortedAndLimitedExpiredLogs, 
      activeDetailsView, 
      currentTimeForFiltering,
      selectedPredictionLog, 
      setSelectedPredictionLog 
    ]);

  const handleSort = (key: SortableColumnKey, tableType: 'active' | 'expired') => {
    const currentSortConfig = tableType === 'active' ? sortConfigActive : sortConfigExpired;
    const setSortConfig = tableType === 'active' ? setSortConfigActive : setSortConfigExpired;

    let direction: 'asc' | 'desc' = 'asc';
    if (key === 'timestamp' || key === 'expiresAt') {
        direction = 'desc';
    }

    if (currentSortConfig && currentSortConfig.key === key) {
      direction = currentSortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ key, direction });
  };

  if (!isAuthCheckComplete || !currentTimeForFiltering) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" aria-label="Loading application"/>
        <p className="text-lg text-muted-foreground">Loading Geonera...</p>
      </div>
    );
  }

  if (!currentUser && isAuthCheckComplete) {
    // router.replace('/login') handled by useEffect above
    return null; 
  }

  if (!isResolutionSupported) {
    return <UnsupportedResolutionMessage minWidth={MIN_WIDTH} minHeight={MIN_HEIGHT} />;
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
                <CardTitle className="text-lg font-semibold text-primary text-center w-full mb-1">
                  {predictionLogsViewMode === 'logs' ? 'Prediction Logs' : 'Settings Prediction Logs'}
                </CardTitle>
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-1"
                          onClick={handlePredictionLogsViewToggle}
                          aria-label={predictionLogsViewMode === 'logs' ? "Open Settings" : "View Prediction Logs"}
                        >
                          {predictionLogsViewMode === 'logs' ? <SettingsIcon className="h-4 w-4 text-primary/80" aria-hidden="true" /> : <List className="h-4 w-4 text-primary/80" aria-hidden="true" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{predictionLogsViewMode === 'logs' ? "Open Settings" : "View Prediction Logs"}</p>
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
                        totalAvailableForDisplay={totalActiveLogsCount} 
                        maxLogs={MAX_PREDICTION_LOGS_CONFIG} 
                      />
                    </div>
                    <div className="flex flex-col min-h-0 overflow-y-auto h-full">
                      <PredictionsTable
                        title="Expired Predictions"
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
                        totalAvailableForDisplay={totalExpiredLogsCount} 
                        maxLogs={MAX_PREDICTION_LOGS_CONFIG} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2 space-y-2"> 
                    <div className="ml-2 shadow-lg shadow-none border-0 bg-transparent">
                      <Label className="text-sm font-medium text-primary mb-1 block">Date Range Filter</Label>
                      <div className="flex items-center justify-start gap-2 flex-wrap">
                        <div className='flex items-center gap-1'>
                          <Label htmlFor="date-filter-start" className="text-xs font-medium flex items-center text-primary">
                              <CalendarDays className="h-3 w-3 mr-1" aria-hidden="true" /> From:
                          </Label>
                          <Input
                              type="datetime-local"
                              id="date-filter-start"
                              aria-label="Filter start date and time"
                              value={formatDateToDateTimeLocal(dateRangeFilter.start)}
                              onChange={(e) => {
                                const newStart = e.target.value ? new Date(e.target.value) : null;
                                if (newStart && isValid(newStart)) {
                                  handleDateRangeChange({ ...dateRangeFilter, start: newStart });
                                } else if (!e.target.value) { 
                                   handleDateRangeChange({ ...dateRangeFilter, start: null });
                                }
                              }}
                              className="h-8 text-xs py-1 w-auto border-primary/30 focus:border-primary"
                            />
                        </div>
                        <div className='flex items-center gap-1'>
                          <Label htmlFor="date-filter-end" className="text-xs font-medium flex items-center text-primary">
                              <CalendarDays className="h-3 w-3 mr-1" aria-hidden="true" /> To:
                          </Label>
                          <Input
                              type="datetime-local"
                              id="date-filter-end"
                              aria-label="Filter end date and time"
                              value={formatDateToDateTimeLocal(dateRangeFilter.end)}
                              onChange={(e) => {
                                const newEnd = e.target.value ? new Date(e.target.value) : null;
                                if (newEnd && isValid(newEnd)) {
                                  handleDateRangeChange({ ...dateRangeFilter, end: newEnd });
                                } else if (!e.target.value) { 
                                  handleDateRangeChange({ ...dateRangeFilter, end: null });
                                }
                              }}
                              className="h-8 text-xs py-1 w-auto border-primary/30 focus:border-primary"
                            />
                        </div>
                      </div>
                    </div>
                    <PipsInputCard
                      pipsSettings={pipsSettings}
                      onPipsSettingsChange={handlePipsSettingsChange}
                      isLoading={isLoading}
                      className="shadow-none border-0 bg-transparent" 
                    />
                     <div className="ml-2 mt-2 shadow-lg shadow-none border-0 bg-transparent">
                        <Label htmlFor="max-prediction-lifetime" className="text-sm font-medium text-primary mb-1 block">
                          <ClockIcon className="h-3.5 w-3.5 mr-1 inline-block" aria-hidden="true" />
                          Max Prediction Lifetime
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text" // Changed from number to text
                            id="max-prediction-lifetime"
                            aria-label="Maximum prediction lifetime in DD HH:mm:ss format"
                            value={maxPredictionLifetimeInputString}
                            onChange={handleMaxLifetimeInputChange}
                            className={cn(
                              "h-8 text-xs py-1 w-auto border-primary/30 focus:border-primary",
                              maxPredictionLifetimeError && "border-destructive"
                            )}
                            placeholder="DD HH:mm:ss"
                          />
                        </div>
                        {maxPredictionLifetimeError && (
                          <p className="text-xs text-destructive mt-1 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {maxPredictionLifetimeError}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Format: DD HH:mm:ss. Valid range: 10 minutes to 5 days.
                          Actual expiration is random between {MIN_EXPIRATION_SECONDS}s and this set maximum.
                        </p>
                      </div>
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
              currentMaxPredictionLifetime={maxPredictionLifetime}
              notifications={notificationsList}
              className="flex-grow min-h-0"
            />
            {currentUser && (
              <NotificationDisplay notification={latestNotificationForDisplay} className="w-full flex-shrink-0" />
            )}
          </div>
        </main>
      )}
      <footer className="py-2 text-center text-sm text-muted-foreground border-t border-border bg-muted">
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved.
        {currentUser && ` Predictions update automatically every ${REFRESH_INTERVAL_OPTIONS.find(opt => opt.value === selectedRefreshIntervalValue)?.label || selectedRefreshIntervalValue} if parameters are valid.`}
      </footer>
    </div>
  );
}



