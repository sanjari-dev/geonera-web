// src/app/page.tsx
"use client";

import type { ChangeEvent } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
const MAX_EXPIRATION_SECONDS = 30;
const MAX_LOG_ITEMS = 50; // Max items in prediction log

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
  };

  const handleSelectedCurrencyPairsChange = useCallback((value: CurrencyPair[]) => {
    setSelectedCurrencyPairs(value);
  }, []);

  const handlePipsChange = useCallback((value: PipsTargetRange) => {
    setPipsTarget(value);
  }, []);

  const handlePredictionSelect = useCallback((log: PredictionLogItem) => {
    // This logic ensures that a clicked log from the table (which is already filtered) can be selected.
    // The table only shows logs for currently selected pairs or all if no pairs are selected (though this case is handled by logsForTable being empty).
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

      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current; // Use the latest value
      const isPipsTargetInvalid = pipsTarget.min <= 0 || pipsTarget.max <= 0 || pipsTarget.min > pipsTarget.max;
      const noCurrenciesSelected = currentSelectedPairs.length === 0;

      if (isPipsTargetInvalid || noCurrenciesSelected) {
        const shouldShowPausedToast = predictionLogs.some(log => currentSelectedPairs.includes(log.currencyPair)) || (isPipsTargetInvalid && !noCurrenciesSelected) || (noCurrenciesSelected && !isPipsTargetInvalid && predictionLogs.length === 0);
        if (shouldShowPausedToast) {
             toast({
                title: "Prediction Paused",
                description: noCurrenciesSelected ? "Please select at least one currency pair." : "Ensure Min/Max PIPS targets are valid (Min > 0, Max > 0, Min <= Max).",
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

      setPredictionLogs(prevLogs => [...newPendingLogs, ...prevLogs].slice(0, MAX_LOG_ITEMS));
      
      if ((!selectedPredictionLog || !currentSelectedPairs.includes(selectedPredictionLog.currencyPair)) && newPendingLogs.length > 0) {
        const firstNewLogForAnySelectedPair = newPendingLogs.find(log => currentSelectedPairs.includes(log.currencyPair));
        if (firstNewLogForAnySelectedPair) {
            setSelectedPredictionLog(firstNewLogForAnySelectedPair);
        } else if (newPendingLogs.length > 0) { 
            setSelectedPredictionLog(newPendingLogs[0]);
        }
      }

      const predictionPromises = newPendingLogs.map(async (pendingLog) => {
        const result = await getPipsPredictionAction(pendingLog.currencyPair, pendingLog.pipsTarget);
        return { result, pendingLog };
      });

      const results = await Promise.all(predictionPromises);
      
      let successCount = 0;
      let errorCount = 0;
      
      setPredictionLogs(prevLogs => {
        let updatedLogs = [...prevLogs]; 
        const trulySelectedPairs = latestSelectedCurrencyPairsRef.current; // Get latest selection again for processing results

        results.forEach(({ result, pendingLog }) => {
          // If the pair for this log is NO LONGER in the *globally current* selection, remove it.
          if (!trulySelectedPairs.includes(pendingLog.currencyPair)) {
            updatedLogs = updatedLogs.filter(log => log.id !== pendingLog.id);
            // If this was the selectedPredictionLog, it needs to be cleared.
            // This will be handled by the dedicated useEffect for selectedPredictionLog.
            if (selectedPredictionLog?.id === pendingLog.id) {
                setSelectedPredictionLog(null); // Proactively clear if it's removed
            }
            return; 
          }

          const logIndex = updatedLogs.findIndex(log => log.id === pendingLog.id);
          if (logIndex === -1) {
            // This can happen if the log was already removed (e.g., by another concurrent update or expiration)
            // or if it was filtered out due to pair deselection just before this update.
            console.warn(`Pending log with id ${pendingLog.id} for ${pendingLog.currencyPair} not found for update.`);
            return; 
          }

          let logToUpdateOrBecomeSelected = updatedLogs[logIndex];

          if (result.error) {
            errorCount++;
            const erroredLog = { ...updatedLogs[logIndex], status: "ERROR" as PredictionStatus, error: result.error };
            updatedLogs[logIndex] = erroredLog;
            logToUpdateOrBecomeSelected = erroredLog;
          } else if (result.data) {
            successCount++;
            const randomExpirationMs = (Math.floor(Math.random() * (MAX_EXPIRATION_SECONDS - MIN_EXPIRATION_SECONDS + 1)) + MIN_EXPIRATION_SECONDS) * 1000;
            const newSuccessfulLog: PredictionLogItem = { 
                ...pendingLog, 
                status: "SUCCESS", 
                predictionOutcome: result.data,
                expiresAt: new Date(Date.now() + randomExpirationMs) 
            };
            updatedLogs[logIndex] = newSuccessfulLog;
            logToUpdateOrBecomeSelected = newSuccessfulLog;
          }
          
          // Update selectedPredictionLog using the latest set of selected pairs (`trulySelectedPairs`)
          if (selectedPredictionLog?.id === pendingLog.id) {
              setSelectedPredictionLog(logToUpdateOrBecomeSelected);
          } else if ((!selectedPredictionLog || !trulySelectedPairs.includes(selectedPredictionLog.currencyPair)) && 
                     trulySelectedPairs.includes(pendingLog.currencyPair)) {
              // If no log is selected OR current selected log's pair is deselected,
              // AND this log's pair IS selected, consider making it the selected log.
              // Prioritize the first of the truly selected pairs if multiple are updated.
              if (pendingLog.currencyPair === trulySelectedPairs[0] || trulySelectedPairs.length === 1) {
                 setSelectedPredictionLog(logToUpdateOrBecomeSelected);
              }
          }
        });
        return updatedLogs; 
      });

      if (results.length > 0 && (successCount > 0 || errorCount > 0)) {
        let toastTitle = "Predictions Updated";
        let toastDescription = "";
        const relevantPairs = trulySelectedPairs.join(', '); // Use trulySelectedPairs for toast

        if (successCount > 0 && errorCount === 0) {
          toastDescription = `${successCount} prediction(s) completed for ${relevantPairs}.`;
        } else if (successCount > 0 && errorCount > 0) {
          toastTitle = "Some Predictions Failed";
          toastDescription = `${successCount} succeeded, ${errorCount} failed for ${relevantPairs}.`;
        } else if (errorCount > 0 && successCount === 0) {
          toastTitle = "Prediction Errors";
          toastDescription = `${errorCount} prediction(s) failed for ${relevantPairs}.`;
        }
        if (toastDescription) {
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
  }, [currentUser, pipsTarget, toast, generateId, isLoading, predictionLogs, selectedPredictionLog]); // Added predictionLogs and selectedPredictionLog because they are read in performPrediction for selection logic


  // Prediction expiration useEffect
  useEffect(() => {
    if (!currentUser) return; 

    const expirationIntervalId = setInterval(() => {
      const now = new Date(); 
      let didAnyExpireOrGetFilteredOut = false;
      const currentSelectedPairs = latestSelectedCurrencyPairsRef.current;

      setPredictionLogs(prevLogs => {
        const newLogs = prevLogs.filter(log => {
          // Also remove PENDING logs for pairs that are no longer selected
          if (log.status === "PENDING" && !currentSelectedPairs.includes(log.currencyPair)) {
            didAnyExpireOrGetFilteredOut = true;
            if (selectedPredictionLog?.id === log.id) {
              setSelectedPredictionLog(null);
            }
            return false; // Remove this log
          }

          if (log.status !== "SUCCESS" || !log.expiresAt) {
            return true; 
          }
          const isExpired = now > new Date(log.expiresAt);
          if (isExpired) {
            didAnyExpireOrGetFilteredOut = true;
            if (selectedPredictionLog?.id === log.id) {
              setSelectedPredictionLog(null); 
            }
          }
          return !isExpired; 
        });
        return newLogs;
      });
      
      if (didAnyExpireOrGetFilteredOut && !selectedPredictionLog && currentSelectedPairs.length > 0) {
         setPredictionLogs(currentLogs => { // Reading currentLogs here
           const firstAvailableForSelectedPairs = currentLogs.find(log => 
             currentSelectedPairs.includes(log.currencyPair) && 
             log.status === "SUCCESS" && 
             log.expiresAt && 
             new Date(log.expiresAt) > now
           );
           if (firstAvailableForSelectedPairs) {
             setSelectedPredictionLog(firstAvailableForSelectedPairs);
           }
           return currentLogs;
        });
      }
    }, 1000); 

    return () => clearInterval(expirationIntervalId); 
  }, [currentUser, selectedPredictionLog]); // Removed predictionLogs and selectedCurrencyPairs from deps to avoid frequent reruns of this interval setup. Ref access is fine.

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
      setSelectedPredictionLog(nextValidLog || null);
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
        setSelectedPredictionLog(firstLogForSelectedPairs);
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
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader user={null} onLogout={handleLogout} />
        <main className="flex-grow container mx-auto px-4 py-4 flex items-center justify-center">
          <div className="text-center">
            <Brain className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome to Geonera</h2>
            <p className="text-muted-foreground mb-6">Please log in to access AI-powered Forex predictions and analysis tools.</p>
          </div>
        </main>
        <footer className="py-3 text-center text-sm text-muted-foreground border-t border-border">
          {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved.
        </footer>
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
            selectedCurrencyPairs={selectedCurrencyPairs} // Pass state for controlled component
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

