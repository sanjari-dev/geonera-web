// src/app/page.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { produce } from 'immer';
import { AppHeader } from '@/components/geonera/header';
import { PipsParameterForm } from '@/components/geonera/pips-parameter-form';
import { PredictionsTable } from '@/components/geonera/predictions-table';
import { PredictionDetailsPanel } from '@/components/geonera/prediction-details-panel';
import { PredictionFilterControls } from '@/components/geonera/prediction-filter-controls';
import { NotificationDisplay } from '@/components/geonera/notification-display';
import type {
  PredictionLogItem,
  CurrencyPair,
  PipsTargetRange,
  User,
  StatusFilterType,
  SignalFilterType,
  SortConfig,
  SortableColumnKey,
  NotificationMessage
} from '@/types';
import { getPipsPredictionAction } from '@/lib/actions';
import { v4 as uuidv4 } from 'uuid';
import { Loader2 } from 'lucide-react';


const PREDICTION_INTERVAL_MS = 5000; // 5 seconds
const MIN_EXPIRATION_SECONDS = 10;
const MAX_EXPIRATION_SECONDS = 604800; // 7 days in seconds (7 * 24 * 60 * 60)
const MAX_PREDICTION_LOGS = 1500; // Maximum number of prediction logs to keep

export default function GeoneraPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);
  const [predictionLogs, setPredictionLogs] = useState<PredictionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState<string>('');

  const [selectedCurrencyPairs, setSelectedCurrencyPairs] = useState<CurrencyPair[]>([]);
  const [pipsTarget, setPipsTarget] = useState<PipsTargetRange>({ min: 10, max: 20 });

  const [uuidAvailable, setUuidAvailable] = useState(false);
  const [selectedPredictionLog, setSelectedPredictionLog] = useState<PredictionLogItem | null>(null);
  const [latestNotification, setLatestNotification] = useState<NotificationMessage | null>(null);

  // Filtering and Sorting State
  const [filterStatus, setFilterStatus] = useState<StatusFilterType>("ALL");
  const [filterSignal, setFilterSignal] = useState<SignalFilterType>("ALL");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'asc' });

  const router = useRouter();

  const latestSelectedCurrencyPairsRef = useRef(selectedCurrencyPairs);
  useEffect(() => {
    latestSelectedCurrencyPairsRef.current = selectedCurrencyPairs;
  }, [selectedCurrencyPairs]);

  const latestPipsTargetRef = useRef(pipsTarget);
  useEffect(() => {
    latestPipsTargetRef.current = pipsTarget;
  }, [pipsTarget]);


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
          localStorage.removeItem('geoneraUser'); // Clear corrupted data
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
    router.push('/login');
  };

  const handleSelectedCurrencyPairsChange = useCallback((value: CurrencyPair[]) => {
    setSelectedCurrencyPairs(value);
  }, []);

  const handlePipsChange = useCallback((value: PipsTargetRange) => {
    setPipsTarget(value);
  }, []);

  const handlePredictionSelect = useCallback((log: PredictionLogItem) => {
    const logFromState = predictionLogs.find(l => l.id === log.id);
     if (logFromState) {
      setSelectedPredictionLog(produce(logFromState, draft => draft)); 
    } else {
      setSelectedPredictionLog(produce(log, draft => draft)); 
    }
  }, [predictionLogs]); 

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
      const currentPipsTarget = latestPipsTargetRef.current;
      const isPipsTargetInvalid = currentPipsTarget.min <= 0 || currentPipsTarget.max <= 0 || currentPipsTarget.min > currentPipsTarget.max;
      const noCurrenciesSelected = currentSelectedPairs.length === 0;

      if (noCurrenciesSelected) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }
      
      if (isPipsTargetInvalid) {
        if (currentSelectedPairs.length > 0) { 
            setLatestNotification({
                title: "Prediction Paused",
                description: "Ensure Min/Max PIPS targets are valid (Min > 0, Max > 0, Min <= Max). Predictions update automatically if parameters are valid.",
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
        const numPredictionsForPair = Math.floor(Math.random() * 10) + 1; // 1 to 10 predictions
        for (let i = 0; i < numPredictionsForPair; i++) {
          const newLogId = generateId();
          newPendingLogs.push({
            id: newLogId,
            timestamp: new Date(),
            currencyPair: currencyPair,
            pipsTarget: currentPipsTarget, 
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
        const result = await getPipsPredictionAction(pendingLog.currencyPair, pendingLog.pipsTarget);
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
          // Check if the selectedPredictionLog was among the removed items
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
  }, [currentUser, isAuthCheckComplete, generateId, isLoading, selectedPredictionLog]); // Added selectedPredictionLog


  // Prediction deselected pair cleanup useEffect (Expiration is now handled by MAX_PREDICTION_LOGS pruning or tabs)
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) return;

    const cleanupIntervalId = setInterval(() => {
      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current; 

      setPredictionLogs(produce(draft => {
        let didChange = false;
        for (let i = draft.length - 1; i >= 0; i--) {
          const log = draft[i];
          let removeLog = false;

          // Remove if currency pair is no longer selected
          if (!currentSelectedPairs.includes(log.currencyPair) && (log.status === "PENDING" || log.status === "SUCCESS" || log.status === "ERROR")) {
            removeLog = true;
          }
          
          if (removeLog) {
            // If selectedPredictionLog is being removed, clear it.
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
  }, [currentUser, isAuthCheckComplete, selectedPredictionLog]); // Added selectedPredictionLog


  // Effect to synchronize selectedPredictionLog with predictionLogs and selectedCurrencyPairs
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) {
      if (selectedPredictionLog !== null) setSelectedPredictionLog(null);
      return;
    }
  
    const currentSelectedPairs = latestSelectedCurrencyPairsRef.current;
    let newSelectedLogCandidate: PredictionLogItem | null = null;
  
    if (currentSelectedPairs.length > 0 && predictionLogs.length > 0) {
      const eligibleLogs = predictionLogs // Consider all logs initially for selection logic
        .filter(log =>
          currentSelectedPairs.includes(log.currencyPair) && // Must be for a selected pair
          (filterStatus === "ALL" || log.status === filterStatus) &&
          (filterSignal === "ALL" || (log.predictionOutcome && log.predictionOutcome.tradingSignal === filterSignal)) &&
          // Additional check: if the "Active" tab is notionally selected, only pick from active logs.
          // This is a simplification; tab state is in PredictionsTable. We pick from any valid log.
          // The table will handle showing it in the right tab.
          // We prioritize non-expired, then pending/error, then expired if nothing else.
          true 
        )
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
          // If current selection is still valid and in the filtered/sorted list, keep it.
          // Ensure we get the latest version from the eligibleLogs in case its data updated.
          newSelectedLogCandidate = produce(eligibleLogs.find(log => log.id === selectedPredictionLog!.id)!, draft => draft);
        } else {
          // If current selection is no longer valid (e.g., filtered out, or pair deselected), pick the first from eligible.
          newSelectedLogCandidate = produce(eligibleLogs[0], draft => draft);
        }
      }
    } 
    
    // Only update if the candidate is different or if the content of the log itself has changed
    if (selectedPredictionLog?.id !== newSelectedLogCandidate?.id || 
        (selectedPredictionLog && newSelectedLogCandidate && JSON.stringify(selectedPredictionLog) !== JSON.stringify(newSelectedLogCandidate)) ||
        (!selectedPredictionLog && newSelectedLogCandidate) || (selectedPredictionLog && !newSelectedLogCandidate)
       ) {
      setSelectedPredictionLog(newSelectedLogCandidate);
    }
  }, [currentUser, isAuthCheckComplete, predictionLogs, selectedPredictionLog, filterStatus, filterSignal, sortConfig]);

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
      case 'pipsTargetMin': 
        return log.pipsTarget.min;
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
      // If auth check is complete and still no user, redirect logic is handled by an earlier useEffect.
      // This return is a fallback while redirection is in progress or if it fails.
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Redirecting to login...</p>
        </div>
      );
  }
  if (!currentUser) { // Handles the case where currentUser is null before auth check completes (initial render)
    return null; // Or a minimal loading state, as redirection will occur once auth check completes
  }


  // Pass all logs to the table; table will handle filtering for tabs
  const logsForTable = predictionLogs
    .filter(log => latestSelectedCurrencyPairsRef.current.includes(log.currencyPair)) 
    .filter(log => filterStatus === "ALL" || log.status === filterStatus) 
    .filter(log => filterSignal === "ALL" || (log.predictionOutcome && log.predictionOutcome.tradingSignal === filterSignal));
    // Sorting will be handled within the table component or by its internal tab logic if needed for active/expired separately
  
  const finalSelectedPredictionForChildren = selectedPredictionLog ? produce(selectedPredictionLog, draft => draft) : null;


  return (
    <div className="h-screen grid grid-rows-[auto_auto_1fr_auto] bg-background text-foreground">
      <AppHeader user={currentUser} onLogout={handleLogout} />
      
      <div className="w-full px-2 py-1 grid grid-cols-1 md:grid-cols-3 gap-1">
        <PipsParameterForm
          selectedCurrencyPairs={selectedCurrencyPairs}
          pipsTarget={pipsTarget}
          onSelectedCurrencyPairsChange={handleSelectedCurrencyPairsChange}
          onPipsChange={handlePipsChange}
          isLoading={isLoading}
        />
        <PredictionFilterControls
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          filterSignal={filterSignal}
          onFilterSignalChange={setFilterSignal}
        />
        <NotificationDisplay notification={latestNotification} />
      </div>
      
      <main className="w-full px-2 py-1 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-1 overflow-hidden">
        <div className="flex flex-col min-h-0 overflow-y-auto h-full">
          <PredictionsTable
            predictions={logsForTable} // Pass all relevant logs
            onRowClick={handlePredictionSelect}
            selectedPredictionId={finalSelectedPredictionForChildren?.id}
            maxLogs={MAX_PREDICTION_LOGS}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        </div>
        <div className="flex flex-col min-h-0"> 
          <PredictionDetailsPanel selectedPrediction={finalSelectedPredictionForChildren} />
        </div>
      </main>
      <footer className="py-2 text-center text-sm text-muted-foreground border-t border-border bg-muted">
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved. Predictions are for informational purposes only and not financial advice. Predictions update automatically every 5 seconds if parameters are valid.
      </footer>
    </div>
  );
}
