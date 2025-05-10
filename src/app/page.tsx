// src/app/page.tsx
"use client";

import type { ChangeEvent } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { AppHeader } from '@/components/geonera/header';
import { PipsParameterForm } from '@/components/geonera/pips-parameter-form';
import { PredictionsTable } from '@/components/geonera/predictions-table';
import type { PredictionLogItem, CurrencyPair, PipsTarget } from '@/types';
import { getPipsPredictionAction } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';


const PREDICTION_INTERVAL_MS = 5000; // 5 seconds
const EXPIRATION_DURATION_MS = 15000; // Predictions expire after 15 seconds

export default function GeoneraPage() {
  const [predictionLogs, setPredictionLogs] = useState<PredictionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState<string>('');

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyPair>("XAU/USD");
  const [pipsTarget, setPipsTarget] = useState<PipsTarget>(10);
  
  const [uuidAvailable, setUuidAvailable] = useState(false);
  
  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
    // Check if window is defined to ensure uuidv4 can be used safely on client if needed
    // and to avoid hydration errors with direct usage of Math.random as fallback.
    if (typeof window !== 'undefined') {
        setUuidAvailable(true);
    }
  }, []);

  const generateId = useCallback(() => {
    // This function will run on the client after hydration,
    // so `uuidAvailable` will be true if client-side.
    if (uuidAvailable) {
      try {
        return uuidv4();
      } catch (e) {
         // Fallback if uuidv4 somehow fails, though unlikely if uuidAvailable is true.
         // Using client-side Math.random here is fine as it's post-hydration.
         return Date.now().toString() + Math.random().toString(36).substring(2,7);
      }
    }
    // Fallback for initial server render or if uuidv4 is not available.
    // This part might still cause hydration mismatch if it differs from client's first generation.
    // However, IDs are primarily for client-side list keys.
    // A truly robust solution for SSR ID generation would involve a different strategy,
    // but for this use case, client-side generation post-mount is preferred.
    // For now, let's ensure this fallback is consistent or defer ID generation to client.
    // Given `uuidAvailable` check, the primary path is client-side uuidv4.
    // The fallback below will mostly be for SSR and initial render before uuidAvailable is true.
    // To avoid hydration mismatch on ID, it's best if IDs are generated only on client post-mount.
    // Let's adjust so that initial logs (if any from SSR, though not the case here) might not have UUIDs
    // or we ensure `generateId` is only called client-side post-mount.
    // Since `pendingLogItem` is created client-side in `performPrediction`, this should be fine.
    return Date.now().toString() + (typeof window !== 'undefined' ? Math.random().toString(36).substring(2,7) : "serverid");
  }, [uuidAvailable]);

  const { toast } = useToast();

  const handleCurrencyChange = useCallback((value: CurrencyPair) => {
    setSelectedCurrency(value);
  }, []);

  const handlePipsChange = useCallback((value: PipsTarget) => {
    setPipsTarget(value);
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined = undefined;

    const performPrediction = async () => {
      if (isLoading) {
        // If already loading, schedule the next check and return.
        // This prevents multiple concurrent predictions.
        if (timeoutId) clearTimeout(timeoutId); // Clear previous timeout if any
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      if (pipsTarget <= 0 || !selectedCurrency) {
        // Condition to pause prediction if parameters are invalid
        // Show toast only if there were previous logs or if trying to predict with invalid pips
        const shouldShowPausedToast = predictionLogs.length > 0 || (pipsTarget <= 0 && !!selectedCurrency);
        if (shouldShowPausedToast) {
             toast({
                title: "Prediction Paused",
                description: "Ensure currency and a pips target greater than 0 are set to resume predictions.",
                variant: "default",
             });
        }
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS); // Still sets timeout to re-check later
        return;
      }

      setIsLoading(true);
      const newLogId = generateId(); // generateId is called on client

      const pendingLogItem: PredictionLogItem = {
        id: newLogId,
        timestamp: new Date(), // new Date() is fine here, called on client after hydration
        currencyPair: selectedCurrency,
        pipsTarget,
        status: "PENDING",
      };
      setPredictionLogs(prevLogs => [pendingLogItem, ...prevLogs].slice(0, 50)); 

      const result = await getPipsPredictionAction(selectedCurrency, pipsTarget);
      
      // Ensure component is still mounted or relevant before setting state
      // This is a good practice for async operations, though less critical here
      // as the timeout cleanup handles unmounting.

      if (result.error) {
        setPredictionLogs(prevLogs => 
          prevLogs.map(log => 
            log.id === newLogId ? { ...log, status: "ERROR", error: result.error } : log
          )
        );
        toast({
          title: "Prediction Error",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.data) {
        setPredictionLogs(prevLogs => 
          prevLogs.map(log => 
            log.id === newLogId ? { 
              ...log, 
              status: "SUCCESS", 
              predictionOutcome: result.data,
              expiresAt: new Date(Date.now() + EXPIRATION_DURATION_MS) 
            } : log
          )
        );
        toast({
          title: "Prediction Updated",
          description: `Prediction for ${selectedCurrency} (${pipsTarget} pips) completed.`,
        });
      }
      setIsLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
    };

    // Initial call to start the prediction loop
    // Clear any existing timeout before starting a new one, esp. if params change
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS); // Start after initial delay or immediately
    // performPrediction(); // Alternative: call immediately on param change then set interval

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  // Dependencies: selectedCurrency, pipsTarget trigger re-evaluation.
  // toast and generateId are stable due to useCallback.
  // isLoading and predictionLogs.length were removed to prevent unwanted effect re-runs.
  // PREDICTION_INTERVAL_MS can be added if it's dynamic, but it's a const here.
  }, [selectedCurrency, pipsTarget, toast, generateId]); 


  useEffect(() => {
    const expirationIntervalId = setInterval(() => {
      const now = new Date(); // Client-side Date
      setPredictionLogs(prevLogs =>
        prevLogs.filter(log => {
          if (log.status !== "SUCCESS" || !log.expiresAt) {
            return true; 
          }
          const isExpired = now > new Date(log.expiresAt);
          // if (isExpired) {
          //    toast({ title: "Prediction Expired", description: `Prediction for ${log.currencyPair} (${log.pipsTarget} pips) has expired and was removed.`});
          // }
          return !isExpired;
        })
      );
    }, 1000); // Check for expired predictions every second

    return () => clearInterval(expirationIntervalId);
  }, []); // No dependencies, runs once on mount


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <PipsParameterForm
            currencyPair={selectedCurrency}
            pipsTarget={pipsTarget}
            onCurrencyChange={handleCurrencyChange}
            onPipsChange={handlePipsChange}
            isLoading={isLoading} // Pass isLoading to disable form while prediction is in progress
          />
          <PredictionsTable predictions={predictionLogs} />
        </div>
      </main>
      <footer className="py-3 text-center text-sm text-muted-foreground border-t border-border">
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved. Predictions are for informational purposes only and not financial advice. Predictions update automatically every {PREDICTION_INTERVAL_MS / 1000} seconds if parameters are valid. Active predictions are removed after {EXPIRATION_DURATION_MS / 1000} seconds.
      </footer>
    </div>
  );
}

