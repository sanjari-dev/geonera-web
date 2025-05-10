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

  // Ref to store the latest selectedCurrencyPairs for use in closures
  const latestSelectedCurrencyPairsRef = useRef(selectedCurrencyPairs);
  useEffect(() => {
    latestSelectedCurrencyPairsRef.current = selectedCurrencyPairs;
  }, [selectedCurrencyPairs]);


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
    setSelectedCurrencyPairs([]); // Also reset selected pairs on logout
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/login'); // Redirect to login page on logout
  };

  const handleSelectedCurrencyPairsChange = useCallback((value: CurrencyPair[]) => {
    setSelectedCurrencyPairs(value);
  }, []);

  const handlePipsChange = useCallback((value: PipsTargetRange) => {
    setPipsTarget(value);
  }, []);

  const handlePredictionSelect = useCallback((log: PredictionLogItem) => {
    setSelectedPredictionLog(log);
  }, []);

  // Prediction generation useEffect
  useEffect(() => {
    if (!currentUser) return;

    let timeoutId: NodeJS.Timeout | undefined = undefined;

    const performPrediction = async () => {
      if (isLoading) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current;
      const isPipsTargetInvalid = pipsTarget.min <= 0 || pipsTarget.max <= 0 || pipsTarget.min > pipsTarget.max;
      const noCurrenciesSelected = currentSelectedPairs.length === 0;

      if (isPipsTargetInvalid || noCurrenciesSelected) {
        const shouldShowPausedToast = predictionLogs.some(log => currentSelectedPairs.includes(log.currencyPair)) || (isPipsTargetInvalid && !noCurrenciesSelected) || (noCurrenciesSelected && !isPipsTargetInvalid && predictionLogs.length === 0);
        if (shouldShowPausedToast && currentSelectedPairs.length > 0) { 
             toast({
                title: "Prediction Paused",
                description: "Ensure Min/Max PIPS targets are valid (Min > 0, Max > 0, Min <= Max).",
                variant: "default",
             });
        } else if (noCurrenciesSelected && (predictionLogs.length > 0 || isPipsTargetInvalid)) { 
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
          pipsTarget,
          status: "PENDING",
        });
      });

      const predictionPromises = newPendingLogs.map(async (pendingLog) => {
        const result = await getPipsPredictionAction(pendingLog.currencyPair, pendingLog.pipsTarget);
        return { result, pendingLog };
      });

      // Update state with pending logs using Immer
      setPredictionLogs(produce(draft => {
        newPendingLogs.forEach(log => {
          draft.unshift(log);
        });
        if (draft.length > MAX_LOG_ITEMS) {
          draft.splice(MAX_LOG_ITEMS);
        }
      }));

      // Select the first new pending log if no relevant log is selected
      if ((!selectedPredictionLog || !currentSelectedPairs.includes(selectedPredictionLog.currencyPair)) && newPendingLogs.length > 0) {
         setSelectedPredictionLog({...newPendingLogs[0]});
      }

      const results = await Promise.all(predictionPromises);

      let successCount = 0;
      let errorCount = 0;
      const trulySelectedPairsAfterAsync = latestSelectedCurrencyPairsRef.current; // Re-read ref before updating state

      // Update state with results using Immer
      setPredictionLogs(produce(draft => {
        results.forEach(({ result, pendingLog }) => {
          const logIndex = draft.findIndex(log => log.id === pendingLog.id);
          if (logIndex === -1) {
            console.warn(`Pending log with id ${pendingLog.id} for ${pendingLog.currencyPair} not found for update.`);
            return;
          }

          // If currency pair was deselected while prediction was in progress, remove the log
          if (!trulySelectedPairsAfterAsync.includes(pendingLog.currencyPair)) {
              draft.splice(logIndex, 1);
              if (selectedPredictionLog?.id === pendingLog.id) {
                  setSelectedPredictionLog(null);
              }
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

          if (selectedPredictionLog?.id === pendingLog.id) {
              setSelectedPredictionLog(logToUpdate ? {...logToUpdate} : null);
          } else if ((!selectedPredictionLog || !trulySelectedPairsAfterAsync.includes(selectedPredictionLog.currencyPair)) &&
                     trulySelectedPairsAfterAsync.includes(pendingLog.currencyPair)) {
              if (pendingLog.currencyPair === trulySelectedPairsAfterAsync[0] || trulySelectedPairsAfterAsync.length === 1) {
                 setSelectedPredictionLog(logToUpdate ? {...logToUpdate} : null);
              }
          }
        });
        if (draft.length > MAX_LOG_ITEMS) {
           draft.splice(MAX_LOG_ITEMS); // Ensure max items is maintained after updates
        }
      }));

      if (results.length > 0 && (successCount > 0 || errorCount > 0)) {
        let toastTitle = "Predictions Updated";
        let toastDescription = "";
        const relevantPairs = trulySelectedPairsAfterAsync.join(', ');

        if (successCount > 0 && errorCount === 0) {
          toastDescription = `${successCount} prediction(s) completed for ${relevantPairs}.`;
        } else if (successCount > 0 && errorCount > 0) {
          toastTitle = "Some Predictions Failed";
          toastDescription = `${successCount} succeeded, ${errorCount} failed for ${relevantPairs}.`;
        } else if (errorCount > 0 && successCount === 0) {
          toastTitle = "Prediction Errors";
          toastDescription = `${errorCount} prediction(s) failed for ${relevantPairs}.`;
        }
        if (toastDescription && trulySelectedPairsAfterAsync.length > 0) { // Only show toast if pairs were actually processed
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
  }, [currentUser, pipsTarget, toast, generateId, isLoading]);


  // Prediction expiration useEffect
  useEffect(() => {
    if (!currentUser) return;

    const expirationIntervalId = setInterval(() => {
      const now = new Date();
      let didAnyExpireOrGetFilteredOut = false;
      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current;

      setPredictionLogs(produce(draft => {
        for (let i = draft.length - 1; i >= 0; i--) {
          const log = draft[i];

          // Remove pending logs if currency pair is deselected
          if (log.status === "PENDING" && !currentSelectedPairs.includes(log.currencyPair)) {
            didAnyExpireOrGetFilteredOut = true;
            if (selectedPredictionLog?.id === log.id) {
              setSelectedPredictionLog(null);
            }
            draft.splice(i, 1);
            continue;
          }

          // Remove expired successful logs
          if (log.status === "SUCCESS" && log.expiresAt && now > new Date(log.expiresAt)) {
            didAnyExpireOrGetFilteredOut = true;
            if (selectedPredictionLog?.id === log.id) {
              setSelectedPredictionLog(null);
            }
            draft.splice(i, 1);
          }
        }
      }));

      if (didAnyExpireOrGetFilteredOut && !selectedPredictionLog && currentSelectedPairs.length > 0) {
         setPredictionLogs(currentLogs => {
           const firstAvailableForSelectedPairs = currentLogs.find(log =>
             currentSelectedPairs.includes(log.currencyPair) &&
             log.status === "SUCCESS" &&
             log.expiresAt &&
             new Date(log.expiresAt) > now
           );
           if (firstAvailableForSelectedPairs) {
             setSelectedPredictionLog({...firstAvailableForSelectedPairs});
           }
           return currentLogs;
        });
      }
    }, 1000);

    return () => clearInterval(expirationIntervalId);
  }, [currentUser, selectedPredictionLog]);

  // Effect to reset selectedPredictionLog if its currency pair is deselected or if no log is selected
  useEffect(() => {
    if (!currentUser) return;
    const currentSelectedPairs = latestSelectedCurrencyPairsRef.current;

    if (selectedPredictionLog && !currentSelectedPairs.includes(selectedPredictionLog.currencyPair)) {
      const nextValidLog = predictionLogs.find(log =>
        currentSelectedPairs.includes(log.currencyPair) &&
        log.status === "SUCCESS" &&
        log.expiresAt && new Date(log.expiresAt) > new Date()
      ) || predictionLogs.find(log =>
        currentSelectedPairs.includes(log.currencyPair) &&
        log.status === "PENDING"
      );
      setSelectedPredictionLog(nextValidLog ? {...nextValidLog} : null);
    } else if (!selectedPredictionLog && currentSelectedPairs.length > 0) {
      const firstLogForSelectedPairs = predictionLogs.find(log =>
        currentSelectedPairs.includes(log.currencyPair) &&
        log.status === "SUCCESS" &&
        log.expiresAt && new Date(log.expiresAt) > new Date()
      ) || predictionLogs.find(log =>
        currentSelectedPairs.includes(log.currencyPair) &&
        log.status === "PENDING"
      );
      if (firstLogForSelectedPairs) {
        setSelectedPredictionLog({...firstLogForSelectedPairs});
      }
    }
  }, [currentUser, selectedCurrencyPairs, selectedPredictionLog, predictionLogs]);


  if (!isAuthCheckComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading Geonera...</p>
      </div>
    );
  }

  if (!currentUser) {
     // Redirect to login if not authenticated and check is complete
    if (typeof window !== 'undefined') { // Ensure this runs only on client
        router.replace('/login');
    }
    return ( // Render minimal loading/redirecting UI
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Redirecting to login...</p>
        </div>
    );
  }

  const logsForTable = latestSelectedCurrencyPairsRef.current.length > 0
    ? predictionLogs.filter(log => latestSelectedCurrencyPairsRef.current.includes(log.currencyPair))
    : [];

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
              <CandlestickDisplay selectedPrediction={selectedPredictionLog} />
            </div>
            <div className="md:col-span-2">
              <PredictionsTable
                predictions={logsForTable}
                onRowClick={handlePredictionSelect}
                selectedPredictionId={selectedPredictionLog?.id}
              />
            </div>
            <div className="md:col-span-1">
              <PredictionDetailsPanel selectedPrediction={selectedPredictionLog} />
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
