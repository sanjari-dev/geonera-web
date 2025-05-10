// src/app/page.tsx
"use client";

import type { ChangeEvent } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/geonera/header';
import { PipsParameterForm } from '@/components/geonera/pips-parameter-form';
import { PredictionsTable } from '@/components/geonera/predictions-table';
import { PredictionDetailsPanel } from '@/components/geonera/prediction-details-panel';
import { CandlestickDisplay } from '@/components/geonera/candlestick-display';
import type { PredictionLogItem, CurrencyPair, PipsTargetRange, User } from '@/types';
import { getPipsPredictionAction } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { Loader2 } from 'lucide-react';


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

  const [selectedCurrencyPairs, setSelectedCurrencyPairs] = useState<CurrencyPair[]>(["XAU/USD"]);
  const [pipsTarget, setPipsTarget] = useState<PipsTargetRange>({ min: 10, max: 20 });
  
  const [uuidAvailable, setUuidAvailable] = useState(false);
  const [selectedPredictionLog, setSelectedPredictionLog] = useState<PredictionLogItem | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();

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
          router.replace('/login');
        }
      } else {
        router.replace('/login');
      }
      setIsAuthCheckComplete(true);
    }
  }, [router]);


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

      const isPipsTargetInvalid = pipsTarget.min <= 0 || pipsTarget.max <= 0 || pipsTarget.min > pipsTarget.max;
      const noCurrenciesSelected = selectedCurrencyPairs.length === 0;

      if (isPipsTargetInvalid || noCurrenciesSelected) {
        const shouldShowPausedToast = predictionLogs.length > 0 || (isPipsTargetInvalid && !noCurrenciesSelected) || (noCurrenciesSelected && !isPipsTargetInvalid);
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
      selectedCurrencyPairs.forEach(currencyPair => {
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
          if (selectedPredictionLog?.id === pendingLog.id) {
              setSelectedPredictionLog(newSuccessfulLog);
          } else if (!selectedPredictionLog && pendingLog.currencyPair === selectedCurrencyPairs[0]) { 
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

    if (timeoutId) clearTimeout(timeoutId); 
    timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS); 

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentUser, selectedCurrencyPairs, pipsTarget, toast, generateId, isLoading, predictionLogs.length, selectedPredictionLog]);


  // Prediction expiration useEffect
  useEffect(() => {
    if (!currentUser) return; 

    const expirationIntervalId = setInterval(() => {
      const now = new Date(); 
      setPredictionLogs(prevLogs =>
        prevLogs.filter(log => {
          if (log.status !== "SUCCESS" || !log.expiresAt) {
            return true; 
          }
          const isExpired = now > new Date(log.expiresAt);
          if (isExpired && selectedPredictionLog?.id === log.id) {
            const nextAvailableLog = prevLogs.find(p => p.id !== log.id && p.status === "SUCCESS" && p.expiresAt && new Date(p.expiresAt) > now);
            setSelectedPredictionLog(nextAvailableLog || null);
          }
          return !isExpired; 
        })
      );
    }, 1000); 

    return () => clearInterval(expirationIntervalId); 
  }, [currentUser, selectedPredictionLog?.id]); 


  if (!isAuthCheckComplete || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading Geonera...</p>
      </div>
    );
  }

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
      <footer className="py-3 text-center text-sm text-muted-foreground border-t border-border">
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved. Predictions are for informational purposes only and not financial advice.
        {currentUser && ` Predictions update automatically every ${PREDICTION_INTERVAL_MS / 1000} seconds if parameters are valid. Active predictions are removed after a variable duration (typically ${MIN_EXPIRATION_SECONDS}-${MAX_EXPIRATION_SECONDS} seconds).`}
      </footer>
    </div>
  );
}
