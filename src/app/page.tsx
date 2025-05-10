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
// const EXPIRATION_DURATION_MS = 15000; // Predictions expire after 15 seconds - REMOVED FOR RANDOMIZATION
const MIN_EXPIRATION_SECONDS = 10;
const MAX_EXPIRATION_SECONDS = 30;

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
    if (uuidAvailable) {
      try {
        return uuidv4();
      } catch (e) {
         return Date.now().toString() + Math.random().toString(36).substring(2,7);
      }
    }
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
        if (timeoutId) clearTimeout(timeoutId); 
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      if (pipsTarget <= 0 || !selectedCurrency) {
        const shouldShowPausedToast = predictionLogs.length > 0 || (pipsTarget <= 0 && !!selectedCurrency);
        if (shouldShowPausedToast) {
             toast({
                title: "Prediction Paused",
                description: "Ensure currency and a pips target greater than 0 are set to resume predictions.",
                variant: "default",
             });
        }
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS); 
        return;
      }

      setIsLoading(true);
      const newLogId = generateId(); 

      const pendingLogItem: PredictionLogItem = {
        id: newLogId,
        timestamp: new Date(), 
        currencyPair: selectedCurrency,
        pipsTarget,
        status: "PENDING",
      };
      setPredictionLogs(prevLogs => [pendingLogItem, ...prevLogs].slice(0, 50)); 

      const result = await getPipsPredictionAction(selectedCurrency, pipsTarget);
      

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
        // Calculate random expiration duration for this specific prediction
        const randomExpirationMs = (Math.floor(Math.random() * (MAX_EXPIRATION_SECONDS - MIN_EXPIRATION_SECONDS + 1)) + MIN_EXPIRATION_SECONDS) * 1000;
        
        setPredictionLogs(prevLogs => 
          prevLogs.map(log => 
            log.id === newLogId ? { 
              ...log, 
              status: "SUCCESS", 
              predictionOutcome: result.data,
              expiresAt: new Date(Date.now() + randomExpirationMs) 
            } : log
          )
        );
        toast({
          title: "Prediction Updated",
          description: `Prediction for ${selectedCurrency} (${pipsTarget} pips) completed. Expires in ${randomExpirationMs / 1000}s.`,
        });
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
  }, [selectedCurrency, pipsTarget, toast, generateId, isLoading, predictionLogs.length]); 


  useEffect(() => {
    const expirationIntervalId = setInterval(() => {
      const now = new Date(); 
      setPredictionLogs(prevLogs =>
        prevLogs.filter(log => {
          if (log.status !== "SUCCESS" || !log.expiresAt) {
            return true; 
          }
          const isExpired = now > new Date(log.expiresAt);
          return !isExpired;
        })
      );
    }, 1000); 

    return () => clearInterval(expirationIntervalId);
  }, []); 


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
            isLoading={isLoading} 
          />
          <PredictionsTable predictions={predictionLogs} />
        </div>
      </main>
      <footer className="py-3 text-center text-sm text-muted-foreground border-t border-border">
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved. Predictions are for informational purposes only and not financial advice. Predictions update automatically every {PREDICTION_INTERVAL_MS / 1000} seconds if parameters are valid. Active predictions are removed after a variable duration (typically {MIN_EXPIRATION_SECONDS}-{MAX_EXPIRATION_SECONDS} seconds).
      </footer>
    </div>
  );
}

