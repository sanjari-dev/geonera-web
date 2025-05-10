// src/app/page.tsx
"use client";

import type { ChangeEvent } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { AppHeader } from '@/components/geonera/header';
import { PipsParameterForm } from '@/components/geonera/pips-parameter-form';
import { PredictionsTable } from '@/components/geonera/predictions-table';
import { PredictionDetailsPanel } from '@/components/geonera/prediction-details-panel';
import { CandlestickDisplay } from '@/components/geonera/candlestick-display';
import { LoginForm } from '@/components/geonera/login-form'; // Import LoginForm
import type { PredictionLogItem, CurrencyPair, PipsTargetRange, User } from '@/types';
import { getPipsPredictionAction } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';


const PREDICTION_INTERVAL_MS = 5000; // 5 seconds
const MIN_EXPIRATION_SECONDS = 10;
const MAX_EXPIRATION_SECONDS = 30;
const MAX_LOG_ITEMS = 50; // Max items in prediction log

export default function GeoneraPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [predictionLogs, setPredictionLogs] = useState<PredictionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState<string>('');

  const [selectedCurrencyPairs, setSelectedCurrencyPairs] = useState<CurrencyPair[]>(["XAU/USD"]);
  const [pipsTarget, setPipsTarget] = useState<PipsTargetRange>({ min: 10, max: 20 });
  
  const [uuidAvailable, setUuidAvailable] = useState(false);
  const [selectedPredictionLog, setSelectedPredictionLog] = useState<PredictionLogItem | null>(null);
  
  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
    // Check if uuidv4 is available (client-side)
    if (typeof window !== 'undefined' && typeof uuidv4 === 'function') {
        setUuidAvailable(true);
    }
  }, []);

  const generateId = useCallback(() => {
    if (uuidAvailable) {
      try {
        return uuidv4();
      } catch (e) {
         // Fallback if uuidv4 fails for some reason, though unlikely
         return Date.now().toString() + Math.random().toString(36).substring(2,7);
      }
    }
    // Server-side or if uuidv4 is not yet available, use a simpler fallback
    return Date.now().toString() + (typeof window !== 'undefined' ? Math.random().toString(36).substring(2,7) : "serverid" + Math.floor(Math.random() * 10000));
  }, [uuidAvailable]);

  const { toast } = useToast();

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    toast({ title: `Welcome, ${user.username}!`, description: "You are now logged in." });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPredictionLogs([]); // Clear logs on logout
    setSelectedPredictionLog(null);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
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
    if (!currentUser) return; // Don't run predictions if not logged in

    let timeoutId: NodeJS.Timeout | undefined = undefined;

    const performPrediction = async () => {
      if (isLoading) {
        if (timeoutId) clearTimeout(timeoutId); 
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      const isPipsTargetInvalid = pipsTarget.min <= 0 || pipsTarget.max <= 0 || pipsTarget.min > pipsTarget.max;
      const noCurrenciesSelected = selectedCurrencyPairs.length === 0;

      if (isPipsTargetInvalid || noCurrenciesSelected) {
        // Determine if a toast should be shown:
        // - Show if logs exist (means predictions were running) OR
        // - Show if pips target is invalid AND some currencies ARE selected OR
        // - Show if no currencies selected AND pips target IS valid
        const shouldShowPausedToast = predictionLogs.length > 0 || (isPipsTargetInvalid && !noCurrenciesSelected) || (noCurrenciesSelected && !isPipsTargetInvalid);
        if (shouldShowPausedToast) {
             toast({
                title: "Prediction Paused",
                description: noCurrenciesSelected ? "Please select at least one currency pair." : "Ensure Min/Max PIPS targets are valid (Min > 0, Max > 0, Min <= Max).",
                variant: "default", // Using default instead of destructive for paused state
             });
        }
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS); 
        return;
      }

      setIsLoading(true);
      
      const newPendingLogs: PredictionLogItem[] = [];
      selectedCurrencyPairs.forEach(currencyPair => {
        const newLogId = generateId(); // Use the memoized generateId
        newPendingLogs.push({
          id: newLogId,
          timestamp: new Date(), 
          currencyPair: currencyPair,
          pipsTarget,
          status: "PENDING",
        });
      });

      // Add new pending logs and ensure the log list doesn't exceed MAX_LOG_ITEMS
      setPredictionLogs(prevLogs => [...newPendingLogs, ...prevLogs].slice(0, MAX_LOG_ITEMS));
      
      // Auto-select the first pending log if nothing is selected
      if (!selectedPredictionLog && newPendingLogs.length > 0) {
        setSelectedPredictionLog(newPendingLogs[0]);
      }

      const predictionPromises = newPendingLogs.map(async (pendingLog) => {
        const result = await getPipsPredictionAction(pendingLog.currencyPair, pendingLog.pipsTarget);
        return { result, pendingLog };
      });

      const results = await Promise.all(predictionPromises);
      
      let successCount = 0;
      let errorCount = 0;
      
      results.forEach(({ result, pendingLog }) => {
        if (result.error) {
          errorCount++;
          setPredictionLogs(prevLogs => 
            prevLogs.map(log => 
              log.id === pendingLog.id ? { ...log, status: "ERROR", error: result.error } : log
            )
          );
          // If the errored log was selected, update its details in the panel
          if (selectedPredictionLog?.id === pendingLog.id) {
              setSelectedPredictionLog(prev => prev ? { ...prev, status: "ERROR", error: result.error } : null);
          }
        } else if (result.data) {
          successCount++;
          const randomExpirationMs = (Math.floor(Math.random() * (MAX_EXPIRATION_SECONDS - MIN_EXPIRATION_SECONDS + 1)) + MIN_EXPIRATION_SECONDS) * 1000;
          const newSuccessfulLog: PredictionLogItem = { 
              ...pendingLog, 
              status: "SUCCESS", 
              predictionOutcome: result.data,
              expiresAt: new Date(Date.now() + randomExpirationMs) 
          };
          
          setPredictionLogs(prevLogs => 
            prevLogs.map(log => 
              log.id === pendingLog.id ? newSuccessfulLog : log
            )
          );
          // If the successful log was selected, or if no log is selected and this is the first currency, update details panel
          if (selectedPredictionLog?.id === pendingLog.id) {
              setSelectedPredictionLog(newSuccessfulLog);
          } else if (!selectedPredictionLog && pendingLog.currencyPair === selectedCurrencyPairs[0]) { // Auto-select first successful if none selected
              setSelectedPredictionLog(newSuccessfulLog);
          }
        }
      });

      if (results.length > 0) {
        let toastTitle = "Predictions Updated";
        let toastDescription = "";
        if (successCount > 0 && errorCount === 0) {
          toastDescription = `${successCount} prediction(s) completed for ${selectedCurrencyPairs.join(', ')}.`;
        } else if (successCount > 0 && errorCount > 0) {
          toastTitle = "Some Predictions Failed";
          toastDescription = `${successCount} succeeded, ${errorCount} failed.`;
        } else if (errorCount > 0 && successCount === 0) {
          toastTitle = "Prediction Errors";
          toastDescription = `${errorCount} prediction(s) failed.`;
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

    // Initial call to start the prediction loop
    if (timeoutId) clearTimeout(timeoutId); // Clear any existing timeout before starting a new one
    timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS); // Start after initial delay or when parameters change

    // Cleanup function to clear the timeout when the component unmounts or dependencies change
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentUser, selectedCurrencyPairs, pipsTarget, toast, generateId, isLoading, predictionLogs.length, selectedPredictionLog]);


  // Prediction expiration useEffect
  useEffect(() => {
    if (!currentUser) return; // Don't run expiration logic if not logged in

    const expirationIntervalId = setInterval(() => {
      const now = new Date(); 
      setPredictionLogs(prevLogs =>
        prevLogs.filter(log => {
          if (log.status !== "SUCCESS" || !log.expiresAt) {
            return true; // Keep non-successful or non-expiring logs
          }
          const isExpired = now > new Date(log.expiresAt);
          if (isExpired && selectedPredictionLog?.id === log.id) {
            // If the selected log expires, try to select the next available non-expired successful log
            const nextAvailableLog = prevLogs.find(p => p.id !== log.id && p.status === "SUCCESS" && p.expiresAt && new Date(p.expiresAt) > now);
            setSelectedPredictionLog(nextAvailableLog || null);
          }
          return !isExpired; // Remove expired logs
        })
      );
    }, 1000); // Check for expirations every second

    return () => clearInterval(expirationIntervalId); // Cleanup interval on unmount
  }, [currentUser, selectedPredictionLog?.id]); // Rerun if current user or selected log changes


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader user={currentUser} onLogout={handleLogout} />
      {currentUser ? (
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
                  predictions={predictionLogs} 
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
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
      <footer className="py-3 text-center text-sm text-muted-foreground border-t border-border">
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved. Predictions are for informational purposes only and not financial advice.
        {currentUser && ` Predictions update automatically every ${PREDICTION_INTERVAL_MS / 1000} seconds if parameters are valid. Active predictions are removed after a variable duration (typically ${MIN_EXPIRATION_SECONDS}-${MAX_EXPIRATION_SECONDS} seconds).`}
      </footer>
    </div>
  );
}
