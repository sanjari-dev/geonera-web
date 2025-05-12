// src/app/page.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
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
import { getPipsPredictionAction } from '@/lib/actions';
import { v4 as uuidv4 } from 'uuid';
import { Loader2 } from 'lucide-react';
import { startOfDay, endOfDay } from 'date-fns';


const PREDICTION_INTERVAL_MS = 30000; // 30 seconds
const MIN_EXPIRATION_SECONDS = 10;
const MAX_EXPIRATION_SECONDS = 75; 
const MAX_PREDICTION_LOGS = 500; 

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

  // Filtering and Sorting State
  const [filterStatus, setFilterStatus] = useState<StatusFilterType>("ALL");
  const [filterSignal, setFilterSignal] = useState<SignalFilterType>("ALL");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'asc' });
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>({ start: startOfDay(new Date()), end: endOfDay(new Date()) });
  const [showExpired, setShowExpired] = useState(false);


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

    let userFromStorage: User | null = null;
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('geoneraUser');
      if (storedUser) {
        try {
          userFromStorage = JSON.parse(storedUser);
          setCurrentUser(userFromStorage);
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


  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('geoneraUser');
    }
    setCurrentUser(null);
    setPredictionLogs([]); 
    setSelectedPredictionLog(null); 
    setSelectedCurrencyPairs([]); 
    setLatestNotification({ title: "Logged Out", description: "You have been successfully logged out.", variant: 'default', timestamp: new Date() });
    // router.push('/login'); // Commented out to prevent redirect if user is already on login page or if we want to stay on page
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
  }, [predictionLogs]); 

  const handleDateRangeChange = useCallback((newRange: DateRangeFilter) => {
    setDateRangeFilter(newRange);
  }, []);

  // Prediction generation useEffect
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) return; 

    let timeoutId: NodeJS.Timeout | undefined = undefined;

    const performPrediction = async () => {
      if (isLoading) { 
        if (timeoutId) clearTimeout(timeoutId); 
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS); 
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
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }
      
      if (isPipsSettingsInvalid) {
        if (currentSelectedPairs.length > 0) { 
            setLatestNotification({
                title: "Prediction Paused",
                description: "Ensure Min/Max PIPS for profit & loss are valid (Min > 0, Max > 0, Min <= Max). Predictions update automatically if parameters are valid.",
                variant: "default",
                timestamp: new Date(), 
             });
        }
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
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
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      setPredictionLogs(produce(draft => {
        newPendingLogs.forEach(log => {
          draft.push(log); 
        });
        if (draft.length > MAX_PREDICTION_LOGS) {
          draft.splice(0, draft.length - MAX_PREDICTION_LOGS);
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
        if (draft.length > MAX_PREDICTION_LOGS) {
          const removedCount = draft.length - MAX_PREDICTION_LOGS;
          const removedItems = draft.splice(0, removedCount);
          
          if (selectedPredictionLog && removedItems.find(item => item.id === selectedPredictionLog.id)) {
            setSelectedPredictionLog(null);
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

    if (timeoutId) clearTimeout(timeoutId); 
    timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS); 

    return () => {
      if (timeoutId) clearTimeout(timeoutId); 
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isAuthCheckComplete, generateId, isLoading, selectedPredictionLog]); 


  
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
            }
            draft.splice(i, 1);
            didChange = true;
          }
        }
        if (!didChange) return undefined; 
      }));
    }, 1000); 

    return () => clearInterval(cleanupIntervalId); 
  }, [currentUser, isAuthCheckComplete, selectedPredictionLog]); 


  
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) {
      if (selectedPredictionLog !== null) setSelectedPredictionLog(null);
      return;
    }
  
    const currentSelectedPairs = latestSelectedCurrencyPairsRef.current;
    let newSelectedLogCandidate: PredictionLogItem | null = null;
    const now = new Date();
  
    if (currentSelectedPairs.length > 0 && predictionLogs.length > 0) {
      const eligibleLogs = predictionLogs 
        .filter(log => {
          if(!currentSelectedPairs.includes(log.currencyPair)) return false;
          if(filterStatus !== "ALL" && log.status !== filterStatus) return false;
          if(filterSignal !== "ALL" && (!log.predictionOutcome || log.predictionOutcome.tradingSignal !== filterSignal)) return false;
          
          const logTimestamp = new Date(log.timestamp);
          if (dateRangeFilter.start && logTimestamp < dateRangeFilter.start) return false;
          if (dateRangeFilter.end && logTimestamp > dateRangeFilter.end) return false;

          // Handle showExpired filter
          if (!showExpired && log.status === "SUCCESS" && log.expiresAt && new Date(log.expiresAt) <= now) {
            return false; // Hide expired if showExpired is false
          }

          return true;
        })
        .sort((a, b) => { 
            const valA = getSortableValue(a, sortConfig.key);
            const valB = getSortableValue(b, sortConfig.key);

            if (valA === undefined && valB === undefined) return 0;
            if (valA === undefined) return sortConfig.direction === 'asc' ? 1 : -1; 
            if (valB === undefined) return sortConfig.direction === 'asc' ? -1 : 1; 
            
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
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
  
      if (eligibleLogs.length > 0) {
        const currentSelectionStillEligible = selectedPredictionLog && eligibleLogs.find(log => log.id === selectedPredictionLog.id);
  
        if (currentSelectionStillEligible) {
          newSelectedLogCandidate = produce(eligibleLogs.find(log => log.id === selectedPredictionLog!.id)!, draft => draft);
        } else {
          newSelectedLogCandidate = produce(eligibleLogs[0], draft => draft);
        }
      }
    } 
    
    if (selectedPredictionLog?.id !== newSelectedLogCandidate?.id || 
        (selectedPredictionLog && newSelectedLogCandidate && JSON.stringify(selectedPredictionLog) !== JSON.stringify(newSelectedLogCandidate)) ||
        (!selectedPredictionLog && newSelectedLogCandidate) || (selectedPredictionLog && !newSelectedLogCandidate)
       ) {
      setSelectedPredictionLog(newSelectedLogCandidate);
    }
  }, [currentUser, isAuthCheckComplete, predictionLogs, selectedPredictionLog, filterStatus, filterSignal, sortConfig, dateRangeFilter, showExpired]);

  const handleSort = (key: SortableColumnKey) => {
    setSortConfig(prevConfig => {
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'asc' ? 'desc' : 'asc' };
      }
      const defaultDirection = (key === 'timestamp' || key === 'expiresAt') ? 'desc' : 'asc';
      return { key, direction: defaultDirection };
    });
  };

  const getSortableValue = (log: PredictionLogItem, key: SortableColumnKey): string | number | Date | undefined => {
    switch (key) {
      case 'status':
        return log.status;
      case 'timestamp':
        return log.timestamp;
      case 'currencyPair':
        return log.currencyPair;
      case 'profitPipsMin': 
        return log.pipsSettings.profitPips.min;
      case 'lossPipsMin':
        return log.pipsSettings.lossPips.min;
      case 'tradingSignal':
        return log.predictionOutcome?.tradingSignal;
      case 'expiresAt':
        return log.expiresAt; 
      default:
        return undefined;
    }
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
    // This useEffect will handle the redirect if router is available
    // No immediate render change here, rely on useEffect for redirection
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }
  if (!currentUser) { 
    // Should ideally be handled by the redirect, but as a fallback
    return null; // Or a minimal "Please login" message if redirect fails
  }
  
  const nowForFilter = new Date();
  const logsForTable = predictionLogs
    .filter(log => {
      if (!latestSelectedCurrencyPairsRef.current.includes(log.currencyPair)) return false;
      if (filterStatus !== "ALL" && log.status !== filterStatus) return false;
      if (filterSignal !== "ALL" && (!log.predictionOutcome || log.predictionOutcome.tradingSignal !== filterSignal)) return false;
      
      const logTimestamp = new Date(log.timestamp);
      if (dateRangeFilter.start && logTimestamp < dateRangeFilter.start) return false;
      if (dateRangeFilter.end && logTimestamp > dateRangeFilter.end) return false;

      if (!showExpired && log.status === "SUCCESS" && log.expiresAt && new Date(log.expiresAt) <= nowForFilter) {
        return false; 
      }
      
      return true;
    });
  
  const finalSelectedPredictionForChildren = selectedPredictionLog ? produce(selectedPredictionLog, draft => draft) : null;


  return (
    <div className="h-screen grid grid-rows-[auto_auto_1fr_auto] bg-background text-foreground">
      <AppHeader user={currentUser} onLogout={handleLogout} />
      
      <div className="w-full px-2 py-1 grid grid-cols-[3fr_5fr_4fr] gap-1">
        <PairSelectorCard
          selectedCurrencyPairs={selectedCurrencyPairs}
          onSelectedCurrencyPairsChange={handleSelectedCurrencyPairsChange}
          isLoading={isLoading}
          className="col-span-1"
        />
        <PipsInputCard
          pipsSettings={pipsSettings}
          onPipsSettingsChange={handlePipsSettingsChange}
          isLoading={isLoading}
          className="col-span-1"
        />
        <PredictionFilterControls
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          filterSignal={filterSignal}
          onFilterSignalChange={setFilterSignal}
          showExpired={showExpired}
          onShowExpiredChange={setShowExpired}
          className="col-span-1"
        />
      </div>
      
      <main className="w-full px-2 py-1 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-1 overflow-hidden">
        <div className="flex flex-col min-h-0 overflow-y-auto h-full">
          <PredictionsTable
            predictions={logsForTable} 
            onRowClick={handlePredictionSelect}
            selectedPredictionId={finalSelectedPredictionForChildren?.id}
            maxLogs={MAX_PREDICTION_LOGS}
            sortConfig={sortConfig}
            onSort={handleSort}
            dateRangeFilter={dateRangeFilter}
            onDateRangeChange={handleDateRangeChange}
            showExpired={showExpired}
          />
        </div>
        <div className="flex flex-col min-h-0 grid grid-rows-[4fr_1fr] gap-1"> 
          <PredictionDetailsPanel selectedPrediction={finalSelectedPredictionForChildren} maxPredictionLogs={MAX_PREDICTION_LOGS} />
          <NotificationDisplay notification={latestNotification} className="col-span-1" />
        </div>
      </main>
      <footer className="py-2 text-center text-sm text-muted-foreground border-t border-border bg-muted">
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved. Predictions update automatically every 30 seconds if parameters are valid.
      </footer>
    </div>
  );
}

