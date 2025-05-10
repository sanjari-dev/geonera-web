// src/app/page.tsx
"use client";

import type { ChangeEvent } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { produce } from 'immer';
import { AppHeader } from '@/components/geonera/header';
import { PipsParameterForm } from '@/components/geonera/pips-parameter-form';
import { PredictionsTable } from '@/components/geonera/predictions-table';
import { PredictionDetailsPanel } from '@/components/geonera/prediction-details-panel';
import { CandlestickDisplay } from '@/components/geonera/candlestick-display';
import type { PredictionLogItem, CurrencyPair, PipsTargetRange, User, PredictionStatus } from '@/types';
import { getPipsPredictionAction } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { Loader2, Brain } from 'lucide-react';


const PREDICTION_INTERVAL_MS = 5000; // 5 seconds
const MIN_EXPIRATION_SECONDS = 10;
const MAX_EXPIRATION_SECONDS = 180;
const MAX_LOG_ITEMS = 250; // Max items in prediction log

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
          localStorage.removeItem('geoneraUser');
        }
      }
      setIsAuthCheckComplete(true);
    }
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


  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('geoneraUser');
    }
    setCurrentUser(null);
    setPredictionLogs([]);
    setSelectedPredictionLog(null);
    setSelectedCurrencyPairs([]);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/login');
  };

  const handleSelectedCurrencyPairsChange = useCallback((value: CurrencyPair[]) => {
    setSelectedCurrencyPairs(value);
  }, []);

  const handlePipsChange = useCallback((value: PipsTargetRange) => {
    setPipsTarget(value);
  }, []);

  const handlePredictionSelect = useCallback((log: PredictionLogItem) => {
    // Ensure we are setting a shallow copy from the current logs, or the clicked log itself if it's from UI.
    // If log is directly from predictionLogs state, spreading it is a good practice.
    const logFromState = predictionLogs.find(l => l.id === log.id);
    if (logFromState) {
      setSelectedPredictionLog({ ...logFromState });
    } else {
      // If the log clicked isn't in the current full list (should not happen ideally),
      // just use the passed log but spread it to be safe.
      setSelectedPredictionLog({ ...log });
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

      if (isPipsTargetInvalid || noCurrenciesSelected) {
        const shouldShowPausedToast = predictionLogs.some(log => currentSelectedPairs.includes(log.currencyPair)) || (isPipsTargetInvalid && !noCurrenciesSelected) || (noCurrenciesSelected && !isPipsTargetInvalid && predictionLogs.length === 0);
        
        if (currentSelectedPairs.length > 0 && isPipsTargetInvalid) {
             toast({
                title: "Prediction Paused",
                description: "Ensure Min/Max PIPS targets are valid (Min > 0, Max > 0, Min <= Max).",
                variant: "default",
             });
        } else if (noCurrenciesSelected && (predictionLogs.length > 0 || (isAuthCheckComplete && currentUser))) {
             toast({
                title: "Prediction Paused",
                description: "Please select at least one currency pair.",
                variant: "default",
             });
        }
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      setIsLoading(true);

      const newPendingLogs: PredictionLogItem[] = [];
      currentSelectedPairs.forEach(currencyPair => {
        const newLogId = generateId();
        newPendingLogs.push({
          id: newLogId,
          timestamp: new Date(),
          currencyPair: currencyPair,
          pipsTarget: currentPipsTarget,
          status: "PENDING",
        });
      });
      
      if (newPendingLogs.length === 0) {
        setIsLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      setPredictionLogs(produce(draft => {
        newPendingLogs.forEach(log => {
          draft.unshift(log);
        });
        if (draft.length > MAX_LOG_ITEMS) {
          draft.splice(MAX_LOG_ITEMS);
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
        const activePairsAfterAsync = latestSelectedCurrencyPairsRef.current; // Re-check active pairs

        results.forEach(({ result, pendingLog }) => {
          const logIndex = draft.findIndex(log => log.id === pendingLog.id);
          if (logIndex === -1) {
            return;
          }

          if (!activePairsAfterAsync.includes(pendingLog.currencyPair)) {
              draft.splice(logIndex, 1);
              // No need to update selectedPredictionLog here, the sync effect will handle it
              return;
          }

          let logToUpdate = draft[logIndex];

          if (result.error) {
            errorCount++;
            logToUpdate.status = "ERROR";
            logToUpdate.error = result.error;
          } else if (result.data) {
            successCount++;
            const randomExpirationMs = (Math.floor(Math.random() * (MAX_EXPIRATION_SECONDS - MIN_EXPIRATION_SECONDS + 1)) + MIN_EXPIRATION_SECONDS) * 1000;
            Object.assign(logToUpdate, { status: "SUCCESS", predictionOutcome: result.data, expiresAt: new Date(Date.now() + randomExpirationMs) });
          }
          // selectedPredictionLog will be updated by the dedicated sync effect
        });
        if (draft.length > MAX_LOG_ITEMS) {
           draft.splice(MAX_LOG_ITEMS);
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
          toast({
            title: toastTitle,
            description: toastDescription,
            variant: errorCount > 0 && successCount === 0 ? "destructive" : "default",
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
  }, [currentUser, isAuthCheckComplete, toast, generateId, isLoading, predictionLogs.length]); // Removed pipsTarget, selectedCurrencyPairs to rely on refs


  // Prediction expiration and deselected pair cleanup useEffect
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) return;

    const expirationIntervalId = setInterval(() => {
      const now = new Date();
      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current;

      setPredictionLogs(produce(draft => {
        let updated = false;
        for (let i = draft.length - 1; i >= 0; i--) {
          const log = draft[i];

          // Remove pending or successful logs if currency pair is deselected
          if (!currentSelectedPairs.includes(log.currencyPair) && (log.status === "PENDING" || log.status === "SUCCESS")) {
            draft.splice(i, 1);
            updated = true;
            continue;
          }

          // Remove expired successful logs
          if (log.status === "SUCCESS" && log.expiresAt && now > new Date(log.expiresAt)) {
            draft.splice(i, 1);
            updated = true;
          }
        }
      }));
    }, 1000);

    return () => clearInterval(expirationIntervalId);
  }, [currentUser, isAuthCheckComplete]);

  // Effect to synchronize selectedPredictionLog with predictionLogs and selectedCurrencyPairs
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete) {
      if (selectedPredictionLog !== null) {
        setSelectedPredictionLog(null);
      }
      return;
    }
  
    const currentSelectedPairs = selectedCurrencyPairs; // Use state directly for this effect
    let newSelectedCandidate: PredictionLogItem | undefined = undefined;
  
    if (selectedPredictionLog) {
      // Check if the current selectedPredictionLog is still valid
      const logInCurrentList = predictionLogs.find(log => log.id === selectedPredictionLog.id);
      if (logInCurrentList && currentSelectedPairs.includes(logInCurrentList.currencyPair)) {
        // If it exists and its currency pair is still selected, it's a candidate.
        // We must use the object from the current predictionLogs to avoid stale proxies.
        newSelectedCandidate = logInCurrentList;
      }
    }
  
    // If no valid current selection, or if the current selection might be stale (e.g. status update)
    // try to find the "best" available log from the current list for selected pairs.
    if (!newSelectedCandidate && currentSelectedPairs.length > 0) {
      newSelectedCandidate =
        predictionLogs.find(log =>
          currentSelectedPairs.includes(log.currencyPair) &&
          log.status === "SUCCESS" &&
          log.expiresAt && new Date(log.expiresAt) > new Date()
        ) ||
        predictionLogs.find(log =>
          currentSelectedPairs.includes(log.currencyPair) &&
          log.status === "PENDING"
        ) ||
        predictionLogs.find(log => // Fallback to any log for selected pairs
            currentSelectedPairs.includes(log.currencyPair)
        );
    }
  
    // Update selectedPredictionLog state
    // Create a new shallow copy ({ ... }) to ensure a fresh object reference for props
    // and to break potential Immer proxy chains.
    if (newSelectedCandidate) {
      // Only update if ID is different OR if it's the same ID but we want to ensure fresh object
      if (selectedPredictionLog?.id !== newSelectedCandidate.id || selectedPredictionLog === null) {
        setSelectedPredictionLog({ ...newSelectedCandidate });
      } else if (selectedPredictionLog?.id === newSelectedCandidate.id) {
        // If IDs are the same, ensure the object instance is truly from the latest `predictionLogs`
        // by re-setting it with a spread. This handles cases where the log item's content might have changed.
        setSelectedPredictionLog({ ...newSelectedCandidate });
      }
    } else { // No valid candidate found
      if (selectedPredictionLog !== null) {
        setSelectedPredictionLog(null);
      }
    }
  
  }, [currentUser, isAuthCheckComplete, predictionLogs, selectedCurrencyPairs]); // selectedPredictionLog removed from deps
  


  if (!isAuthCheckComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading Geonera...</p>
      </div>
    );
  }

  if (!currentUser) {
    if (typeof window !== 'undefined') {
        router.replace('/login');
    }
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Redirecting to login...</p>
        </div>
    );
  }

  const logsForTable = currentUser && selectedCurrencyPairs.length > 0
    ? predictionLogs.filter(log => selectedCurrencyPairs.includes(log.currencyPair))
    : [];
  
  // Ensure selectedPredictionLog passed to children is a fresh copy if it exists
  const currentSelectedLogForDisplay = selectedPredictionLog 
    ? (predictionLogs.find(l => l.id === selectedPredictionLog.id) || null) 
    : null;
  const finalSelectedPredictionForChildren = currentSelectedLogForDisplay ? { ...currentSelectedLogForDisplay } : null;


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader user={currentUser} onLogout={handleLogout} />
      <main className="flex-grow container mx-auto px-4 py-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <PipsParameterForm
            selectedCurrencyPairs={selectedCurrencyPairs}
            pipsTarget={pipsTarget}
            onSelectedCurrencyPairsChange={handleSelectedCurrencyPairsChange}
            onPipsChange={handlePipsChange}
            isLoading={isLoading}
          />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <CandlestickDisplay selectedPrediction={finalSelectedPredictionForChildren} />
            </div>
            <div className="md:col-span-2">
              <PredictionsTable
                predictions={logsForTable}
                onRowClick={handlePredictionSelect}
                selectedPredictionId={finalSelectedPredictionForChildren?.id}
              />
            </div>
            <div className="md:col-span-1">
              <PredictionDetailsPanel selectedPrediction={finalSelectedPredictionForChildren} />
            </div>
          </div>
        </div>
      </main>
      <footer className="py-3 text-center text-sm text-muted-foreground border-t border-border">
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved. Predictions are for informational purposes only and not financial advice.
        {` Predictions update automatically every ${PREDICTION_INTERVAL_MS / 1000} seconds if parameters are valid. Active predictions are removed after a variable duration (typically ${MIN_EXPIRATION_SECONDS}-${MAX_EXPIRATION_SECONDS} seconds).`}
      </footer>
    </div>
  );
}

