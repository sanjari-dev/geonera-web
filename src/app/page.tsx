// src/app/page.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { produce } from 'immer';
import { AppHeader } from '@/components/geonera/header';
import { PipsParameterForm } from '@/components/geonera/pips-parameter-form';
import { PredictionsTable } from '@/components/geonera/predictions-table';
import { PredictionDetailsPanel } from '@/components/geonera/prediction-details-panel';
import { CandlestickDisplay } from '@/components/geonera/candlestick-display';
import { PredictionFilterControls } from '@/components/geonera/prediction-filter-controls';
import type {
  PredictionLogItem,
  CurrencyPair,
  PipsTargetRange,
  User,
  StatusFilterType,
  SignalFilterType,
  SortConfig,
  SortableColumnKey
} from '@/types';
import { getPipsPredictionAction } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
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

  // Filtering and Sorting State
  const [filterStatus, setFilterStatus] = useState<StatusFilterType>("ALL");
  const [filterSignal, setFilterSignal] = useState<SignalFilterType>("ALL");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'asc' });

  const router = useRouter();
  const { toast } = useToast();

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

    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('geoneraUser');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setCurrentUser(parsedUser);
        } catch (e) {
          console.error("Failed to parse user from localStorage", e);
          localStorage.removeItem('geoneraUser'); // Clear corrupted data
        }
      }
      setIsAuthCheckComplete(true); 
    } else {
      // For SSR or environments where window is not defined initially
      setIsAuthCheckComplete(true); // Still mark as complete, redirection logic will handle if !currentUser
    }
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
         // Fallback for rare uuidv4 error or if it becomes unavailable after initial check
         return Date.now().toString() + Math.random().toString(36).substring(2,7);
      }
    }
    // Fallback if uuidv4 was never available (e.g., during SSR for some reason, though 'use client' should prevent this specific fallback path for generateId)
    return Date.now().toString() + (typeof window !== 'undefined' ? Math.random().toString(36).substring(2,7) : "serverid" + Math.floor(Math.random() * 10000));
  }, [uuidAvailable]);


  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('geoneraUser');
    }
    setCurrentUser(null);
    setPredictionLogs([]); // Clear logs on logout
    setSelectedPredictionLog(null); // Clear selected prediction
    setSelectedCurrencyPairs([]); // Clear selected pairs
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    // No need to router.push('/login') here if the useEffect for redirection handles it
  };

  const handleSelectedCurrencyPairsChange = useCallback((value: CurrencyPair[]) => {
    setSelectedCurrencyPairs(value);
  }, []);

  const handlePipsChange = useCallback((value: PipsTargetRange) => {
    setPipsTarget(value);
  }, []);

  const handlePredictionSelect = useCallback((log: PredictionLogItem) => {
    // Ensure we use the latest version of the log item from the state if it exists
    // This prevents issues if the log item was updated in the background
    const logFromState = predictionLogs.find(l => l.id === log.id);
     if (logFromState) {
      setSelectedPredictionLog(produce(logFromState, draft => draft)); // Use produce for immutable update
    } else {
      // If somehow not found (e.g., race condition or clicked before state update), use the passed log
      setSelectedPredictionLog(produce(log, draft => draft)); // Use produce for immutable update
    }
  }, [predictionLogs]); // Depend on predictionLogs to get the latest version

  // Prediction generation useEffect
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) return; // Only run if logged in and auth check is done

    let timeoutId: NodeJS.Timeout | undefined = undefined;

    const performPrediction = async () => {
      if (isLoading) { // Prevent multiple simultaneous fetches
        if (timeoutId) clearTimeout(timeoutId); // Clear existing timeout if any
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS); // Reschedule
        return;
      }

      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current;
      const currentPipsTarget = latestPipsTargetRef.current;
      const isPipsTargetInvalid = currentPipsTarget.min <= 0 || currentPipsTarget.max <= 0 || currentPipsTarget.min > currentPipsTarget.max;
      const noCurrenciesSelected = currentSelectedPairs.length === 0;

      if (noCurrenciesSelected) {
        // If no currencies are selected, don't fetch, just reschedule
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }
      
      if (isPipsTargetInvalid) {
        // If pips target is invalid but currencies are selected, show a toast and reschedule
        if (currentSelectedPairs.length > 0) { // Only toast if pairs are selected
             toast({
                title: "Prediction Paused",
                description: "Ensure Min/Max PIPS targets are valid (Min > 0, Max > 0, Min <= Max).",
                variant: "default", // Or "warning" if you have one
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
            pipsTarget: currentPipsTarget, // Use the pips target at the moment of creation
            status: "PENDING",
            // predictionOutcome, error, expiresAt will be filled later
          });
        }
      });
      
      if (newPendingLogs.length === 0) {
        setIsLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      // Add all pending logs to the main log immediately
      setPredictionLogs(produce(draft => {
        newPendingLogs.forEach(log => {
          draft.push(log); // Add to the end for chronological order
        });
        // Trim if over max logs, removing from the beginning (oldest)
        if (draft.length > MAX_PREDICTION_LOGS) {
          draft.splice(0, draft.length - MAX_PREDICTION_LOGS);
        }
      }));
      
      // Asynchronously fetch predictions for all new pending logs
      const predictionPromises = newPendingLogs.map(async (pendingLog) => {
        const result = await getPipsPredictionAction(pendingLog.currencyPair, pendingLog.pipsTarget);
        return { result, pendingLog }; // Return both for easier mapping later
      });


      const results = await Promise.all(predictionPromises);

      let successCount = 0;
      let errorCount = 0;
      
      // Update the logs with the results
      setPredictionLogs(produce(draft => {
        const activePairsAfterAsync = latestSelectedCurrencyPairsRef.current; // Get the latest selected pairs

        results.forEach(({ result, pendingLog }) => {
          const logIndex = draft.findIndex(log => log.id === pendingLog.id);
          if (logIndex === -1) {
            // Log might have been removed (e.g., by deselection or expiration logic elsewhere if aggressive)
            return;
          }

          // Check if the currency pair for this log is still selected
          // If not, remove this PENDING log
          if (!activePairsAfterAsync.includes(pendingLog.currencyPair)) {
              draft.splice(logIndex, 1);
              return; // Skip further processing for this log
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
            // Update existing log item
            Object.assign(logToUpdate, { status: "SUCCESS", predictionOutcome: result.data, expiresAt: new Date(Date.now() + randomExpirationMs) });
          }
          // No change if neither error nor data (should not happen with current mock logic)
        });
        // Trim again if somehow new logs were added concurrently, though unlikely with current logic
        if (draft.length > MAX_PREDICTION_LOGS) {
          draft.splice(0, draft.length - MAX_PREDICTION_LOGS);
        }
      }));

      // Toast notification based on results
      if (results.length > 0 && (successCount > 0 || errorCount > 0)) {
        let toastTitle = "Predictions Updated";
        let toastDescription = "";
        const relevantPairs = latestSelectedCurrencyPairsRef.current.join(', '); // Use current pairs for toast

        if (successCount > 0 && errorCount === 0) {
          toastDescription = `${successCount} prediction(s) completed for ${relevantPairs}.`;
        } else if (successCount > 0 && errorCount > 0) {
          toastTitle = "Some Predictions Failed";
          toastDescription = `${successCount} succeeded, ${errorCount} failed for ${relevantPairs}.`;
        } else if (errorCount > 0 && successCount === 0) {
          toastTitle = "Prediction Errors";
          toastDescription = `${errorCount} prediction(s) failed for ${relevantPairs}.`;
        }
        // Only show toast if there were active selected pairs when the process started
        if (toastDescription && latestSelectedCurrencyPairsRef.current.length > 0) {
          toast({
            title: toastTitle,
            description: toastDescription,
            variant: errorCount > 0 && successCount === 0 ? "destructive" : "default",
          });
        }
      }

      setIsLoading(false);
      if (timeoutId) clearTimeout(timeoutId); // Clear previous timeout
      timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS); // Reschedule next prediction
    };

    if (timeoutId) clearTimeout(timeoutId); // Clear any existing timeout before starting a new one
    timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS); // Initial call

    return () => {
      if (timeoutId) clearTimeout(timeoutId); // Cleanup on unmount
    };
  }, [currentUser, isAuthCheckComplete, toast, generateId, isLoading]); // isLoading in deps to avoid race


  // Prediction expiration and deselected pair cleanup useEffect
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) return;

    const expirationIntervalId = setInterval(() => {
      const now = new Date();
      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current; // Use ref for latest value

      setPredictionLogs(produce(draft => {
        let didChange = false;
        for (let i = draft.length - 1; i >= 0; i--) {
          const log = draft[i];
          let removeLog = false;

          // Condition 1: Log's currency pair is no longer selected (applies to PENDING, SUCCESS, ERROR)
          if (!currentSelectedPairs.includes(log.currencyPair) && (log.status === "PENDING" || log.status === "SUCCESS" || log.status === "ERROR")) {
            removeLog = true;
          }

          // Condition 2: Log is SUCCESS and has expired
          if (log.status === "SUCCESS" && log.expiresAt && now > new Date(log.expiresAt)) {
            removeLog = true;
          }
          
          if (removeLog) {
            draft.splice(i, 1);
            didChange = true;
          }
        }
        // If no changes were made, return undefined to prevent re-render by Immer
        if (!didChange) return undefined; 
      }));
    }, 1000); // Check every second

    return () => clearInterval(expirationIntervalId); // Cleanup on unmount
  }, [currentUser, isAuthCheckComplete]); // No other dependencies, uses refs for dynamic values


  // Effect to synchronize selectedPredictionLog with predictionLogs and selectedCurrencyPairs
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) {
      if (selectedPredictionLog !== null) setSelectedPredictionLog(null);
      return;
    }
  
    const currentSelectedPairs = latestSelectedCurrencyPairsRef.current;
    let newSelectedLogCandidate: PredictionLogItem | null = null;
  
    if (currentSelectedPairs.length > 0 && predictionLogs.length > 0) {
      // Filter logs based on current selected pairs, filters, and validity
      const eligibleLogs = predictionLogs
        .filter(log =>
          currentSelectedPairs.includes(log.currencyPair) &&
          // Ensure log is not expired (if SUCCESS and has expiresAt)
          !(log.status === "SUCCESS" && log.expiresAt && new Date(log.expiresAt) < new Date()) &&
          // Apply status and signal filters
          (filterStatus === "ALL" || log.status === filterStatus) &&
          (filterSignal === "ALL" || (log.predictionOutcome && log.predictionOutcome.tradingSignal === filterSignal))
        )
        .sort((a, b) => { // Use current sortConfig
           if (!sortConfig) return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(); // Default sort if none
            const valA = getSortableValue(a, sortConfig.key);
            const valB = getSortableValue(b, sortConfig.key);

            // Handle undefined values by pushing them to the end or beginning based on direction
            if (valA === undefined && valB === undefined) return 0;
            if (valA === undefined) return sortConfig.direction === 'asc' ? 1 : -1; // Undefined comes last in asc
            if (valB === undefined) return sortConfig.direction === 'asc' ? -1 : 1; // Undefined comes last in asc
            
            let comparison = 0;
            if (typeof valA === 'number' && typeof valB === 'number') {
              comparison = valA - valB;
            } else if (valA instanceof Date && valB instanceof Date) {
              comparison = valA.getTime() - valB.getTime();
            } else if (typeof valA === 'string' && typeof valB === 'string') {
              comparison = valA.localeCompare(valB);
            } else {
              // Fallback for mixed types or other types, convert to string for comparison
              comparison = String(valA).localeCompare(String(valB));
            }
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
  
      if (eligibleLogs.length > 0) {
        // Check if the current selectedPredictionLog is still in the eligible (sorted and filtered) list
        const currentSelectionStillEligible = selectedPredictionLog && eligibleLogs.find(log => log.id === selectedPredictionLog.id);
  
        if (currentSelectionStillEligible) {
          // If current selection is still valid, keep it (or rather, use the version from eligibleLogs to reflect any updates)
          newSelectedLogCandidate = produce(currentSelectionStillEligible, draft => draft);
        } else {
          // If current selection is no longer valid (or no selection), pick the first from the *sorted and filtered* list
          newSelectedLogCandidate = produce(eligibleLogs[0], draft => draft);
        }
      }
    } // If no eligible logs, newSelectedLogCandidate remains null
    
    // Only update if the candidate is different from the current selected log
    // This avoids unnecessary re-renders if the selected log itself or its ID hasn't changed.
    // A deep comparison might be too much if logs update frequently; an ID check is often sufficient.
    // Adding a JSON.stringify check for content changes if ID remains same but content might differ.
    if (selectedPredictionLog?.id !== newSelectedLogCandidate?.id || 
        (selectedPredictionLog && newSelectedLogCandidate && JSON.stringify(selectedPredictionLog) !== JSON.stringify(newSelectedLogCandidate)) ||
        (!selectedPredictionLog && newSelectedLogCandidate) || (selectedPredictionLog && !newSelectedLogCandidate)
       ) {
      setSelectedPredictionLog(newSelectedLogCandidate);
    }
  }, [currentUser, isAuthCheckComplete, predictionLogs, selectedPredictionLog, filterStatus, filterSignal, sortConfig]);


  const handleSort = (key: SortableColumnKey) => {
    setSortConfig(prevConfig => {
      // If same key, toggle direction
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'asc' ? 'desc' : 'asc' };
      }
      // Default direction for new sort key (e.g., timestamp desc, others asc)
      const defaultDirection = (key === 'timestamp' || key === 'expiresAt') ? 'desc' : 'asc';
      return { key, direction: defaultDirection };
    });
  };

  // Helper function to get sortable values from a log item
  const getSortableValue = (log: PredictionLogItem, key: SortableColumnKey): string | number | Date | undefined => {
    switch (key) {
      case 'status':
        return log.status;
      case 'timestamp':
        return log.timestamp;
      case 'currencyPair':
        return log.currencyPair;
      case 'pipsTargetMin': // Sorting by min pips of the target range
        return log.pipsTarget.min;
      case 'tradingSignal':
        return log.predictionOutcome?.tradingSignal;
      case 'expiresAt':
        return log.expiresAt; // Could be undefined if not SUCCESS
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

  if (!currentUser) {
    // This should ideally not be reached if the redirection useEffect works correctly
    // but as a fallback, show a loading/redirecting message.
    // The redirection is handled by the useEffect: `if (isAuthCheckComplete && !currentUser) { router.replace('/login'); }`
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Redirecting to login...</p>
        </div>
    );
  }

  // Filter and sort logs for the table display
  const logsForTable = currentUser && latestSelectedCurrencyPairsRef.current.length > 0
    ? predictionLogs
        .filter(log => latestSelectedCurrencyPairsRef.current.includes(log.currencyPair)) // Filter by selected currency pairs
        .filter(log => filterStatus === "ALL" || log.status === filterStatus) // Filter by status
        .filter(log => filterSignal === "ALL" || (log.predictionOutcome && log.predictionOutcome.tradingSignal === filterSignal)) // Filter by signal
        .sort((a, b) => {
            if (!sortConfig) return 0; // No sort config, no sort
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
              comparison = String(valA).localeCompare(String(valB)); // Fallback for mixed/other types
            }
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        })
    : [];
  
  // Ensure the selectedPredictionLog passed to children is a fresh, non-proxied object if it's not null
  const finalSelectedPredictionForChildren = selectedPredictionLog ? produce(selectedPredictionLog, draft => draft) : null;


  return (
    <div className="h-screen grid grid-rows-[auto_1fr_auto] bg-background">
      <AppHeader user={currentUser} onLogout={handleLogout} />
      <main className="w-screen px-2 py-1 grid grid-cols-1 md:grid-cols-1 gap-1 overflow-hidden">
        <div className="w-full grid grid-cols-1 gap-1 h-full min-h-0 grid-rows-[auto_1fr]"> {/* Changed to auto for top row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
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
          </div>
          {/* Bottom row: Candlestick, Table, Details Panel */}
          <div className="grid grid-cols-1 md:grid-cols-[minmax(theme(spacing.64),1fr)_auto_theme(spacing.80)] gap-1 overflow-hidden">
            {/* Candlestick Display - takes available space, min-width defined by theme.spacing.64 */}
            <div className="flex flex-col min-h-0 overflow-hidden">
              <CandlestickDisplay selectedPrediction={finalSelectedPredictionForChildren} />
            </div>
            {/* Predictions Table - auto width based on content, with max-width constraint, scrollable */}
            <div className="max-w-max flex flex-col min-h-0 overflow-y-auto h-full">
              <PredictionsTable
                predictions={logsForTable}
                onRowClick={handlePredictionSelect}
                selectedPredictionId={finalSelectedPredictionForChildren?.id}
                maxLogs={MAX_PREDICTION_LOGS}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </div>
            {/* Prediction Details Panel - fixed width based on theme.spacing.80 */}
            <div className="flex flex-col min-h-0">
              <PredictionDetailsPanel selectedPrediction={finalSelectedPredictionForChildren} />
            </div>
          </div>
        </div>
      </main>
      <footer className="py-2 text-center text-sm text-muted-foreground border-t border-border bg-muted">
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved.
      </footer>
    </div>
  );
}

