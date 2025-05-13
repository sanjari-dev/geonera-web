// src/hooks/use-prediction-engine.ts
import {useState, useEffect, MutableRefObject, Dispatch, SetStateAction} from 'react';
import { produce } from 'immer';
import type {
  PredictionLogItem,
  CurrencyPair,
  PipsSettings,
  User,
  NotificationMessage,
  RefreshIntervalValue,
  ActiveDetailsView,
} from '@/types';
import {
  MAX_PREDICTION_LOGS_CONFIG,
  MIN_EXPIRATION_SECONDS,
  // A dynamic ref value will replace MAX_EXPIRATION_SECONDS
} from '@/types';
import { getPipsPredictionAction } from '@/lib/actions';
import { calculateDelayUntilNextScheduledRun } from '@/lib/datetime-utils';

interface UsePredictionEngineProps {
  currentUser: User | null;
  isAuthCheckComplete: boolean;
  currentTimeForFiltering: Date | null;
  latestSelectedCurrencyPairsRef: MutableRefObject<CurrencyPair[]>;
  latestPipsSettingsRef: MutableRefObject<PipsSettings>;
  latestSelectedRefreshIntervalValueRef: MutableRefObject<RefreshIntervalValue>;
  latestMaxPredictionLifetimeRef: MutableRefObject<number>; // Added
  addNotificationCallback: (notification: Omit<NotificationMessage, 'timestamp' | 'id'>) => void;
  generateIdCallback: () => string;
  selectedPredictionLog: PredictionLogItem | null;
  setSelectedPredictionLog: Dispatch<SetStateAction<PredictionLogItem | null>>;
  activeDetailsView: ActiveDetailsView;
  setActiveDetailsView: Dispatch<SetStateAction<ActiveDetailsView>>;
}

export function usePredictionEngine({
  currentUser,
  isAuthCheckComplete,
  currentTimeForFiltering,
  latestSelectedCurrencyPairsRef,
  latestPipsSettingsRef,
  latestSelectedRefreshIntervalValueRef,
  latestMaxPredictionLifetimeRef, // Added
  addNotificationCallback,
  generateIdCallback,
  selectedPredictionLog,
  setSelectedPredictionLog,
  activeDetailsView,
  setActiveDetailsView,
}: UsePredictionEngineProps) {
  const [predictionLogs, setPredictionLogs] = useState<PredictionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete || !currentTimeForFiltering) return;

    let timeoutId: NodeJS.Timeout | undefined = undefined;

    const performPrediction = async () => {
      if (isLoading) {
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
        const delay = calculateDelayUntilNextScheduledRun(latestSelectedRefreshIntervalValueRef.current);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, delay);
        return;
      }

      if (isPipsSettingsInvalid) {
        if (currentSelectedPairs.length > 0) {
            addNotificationCallback({
                title: "Prediction Paused",
                description: "Ensure Min/Max PIPS for profit & loss are valid (Min > 0, Max > 0, Min <= Max). Predictions update automatically if parameters are valid.",
                variant: "default",
             });
        }
        const delay = calculateDelayUntilNextScheduledRun(latestSelectedRefreshIntervalValueRef.current);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, delay);
        return;
      }

      setIsLoading(true);
      const newPendingLogs: PredictionLogItem[] = [];
      currentSelectedPairs.forEach(currencyPair => {
        const numPredictionsForPair = Math.floor(Math.random() * 10) + 1;
        for (let i = 0; i < numPredictionsForPair; i++) {
          const newLogId = generateIdCallback();
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
        const delay = calculateDelayUntilNextScheduledRun(latestSelectedRefreshIntervalValueRef.current);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, delay);
        return;
      }

      setPredictionLogs(produce(draft => {
        newPendingLogs.forEach(log => { draft.push(log); });
        draft.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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
          if (logIndex === -1) return;

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
            const currentMinLifetime = MIN_EXPIRATION_SECONDS;
            const currentMaxLifetime = latestMaxPredictionLifetimeRef.current;
            const effectiveMaxLifetime = Math.max(currentMinLifetime, currentMaxLifetime);
            const randomExpirationSeconds = Math.floor(Math.random() * (effectiveMaxLifetime - currentMinLifetime + 1)) + currentMinLifetime;
            const randomExpirationMs = randomExpirationSeconds * 1000;
            Object.assign(logToUpdate, { status: "SUCCESS", predictionOutcome: result.data, expiresAt: new Date(Date.now() + randomExpirationMs) });
          }
        });
        draft.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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
          addNotificationCallback({
            title: toastTitle,
            description: toastDescription,
            variant: errorCount > 0 && successCount === 0 ? "destructive" : (successCount > 0 ? "success" : "default"),
          });
        }
      }

      setIsLoading(false);
      const nextDelay = calculateDelayUntilNextScheduledRun(latestSelectedRefreshIntervalValueRef.current);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(performPrediction, nextDelay);
    };
    
    const initialDelay = calculateDelayUntilNextScheduledRun(latestSelectedRefreshIntervalValueRef.current);
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(performPrediction, initialDelay);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    currentUser, 
    isAuthCheckComplete, 
    isLoading, 
    currentTimeForFiltering,
    latestSelectedCurrencyPairsRef,
    latestPipsSettingsRef,
    latestSelectedRefreshIntervalValueRef,
    latestMaxPredictionLifetimeRef, // Added
    addNotificationCallback,
    generateIdCallback,
    selectedPredictionLog, 
    setSelectedPredictionLog, 
    activeDetailsView, 
    setActiveDetailsView,
]);

  // Per-second cleanup effect for deselected pairs (moved from page.tsx)
  useEffect(() => {
    if (!currentUser || !isAuthCheckComplete || !currentTimeForFiltering) return;

    const cleanupIntervalId = setInterval(() => {
      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current;
      const now = currentTimeForFiltering;

      setPredictionLogs(produce(draft => {
        let didChange = false;
        for (let i = draft.length - 1; i >= 0; i--) {
          const log = draft[i];
          let removeLog = false;

          if (!currentSelectedPairs.includes(log.currencyPair) && 
              (log.status === "PENDING" || log.status === "ERROR" || (log.status === "SUCCESS" && (!log.expiresAt || new Date(log.expiresAt) > now)))) {
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
  }, [
      currentUser, 
      isAuthCheckComplete, 
      currentTimeForFiltering, 
      latestSelectedCurrencyPairsRef, 
      selectedPredictionLog, 
      setSelectedPredictionLog, 
      activeDetailsView, 
      setActiveDetailsView
    ]);


  return { predictionLogs, setPredictionLogs, isLoading };
}
