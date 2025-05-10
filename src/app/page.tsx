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


const PREDICTION_INTERVAL_MS = 60000; // 1 minute

export default function GeoneraPage() {
  const [predictionLogs, setPredictionLogs] = useState<PredictionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState<string>('');

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyPair>("XAU/USD");
  const [pipsTarget, setPipsTarget] = useState<PipsTarget>(10);
  
  const [uuidAvailable, setUuidAvailable] = useState(false);
  
  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
    // Check if uuid is available client-side to avoid hydration issues if it's used during SSR
    // For this specific use case (generating IDs on client actions), direct import is fine.
    // However, if uuidv4 were used in initial render logic, this useEffect approach would be better.
    if (typeof window !== 'undefined') {
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
    // Fallback if uuid library is not yet confirmed available (e.g. during initial hydration phase if not careful)
    // or if there was an issue importing it (though PipsParameterForm already uses it directly).
    return Date.now().toString() + Math.random().toString(36).substring(2,7);
  }, [uuidAvailable]);

  const { toast } = useToast();

  const handleCurrencyChange = useCallback((value: CurrencyPair) => {
    setSelectedCurrency(value);
  }, []);

  const handlePipsChange = useCallback((value: PipsTarget) => {
    setPipsTarget(value);
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const performPrediction = async () => {
      if (isLoading) {
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      if (pipsTarget <= 0 || !selectedCurrency) {
        // Do not toast if initially parameters are not set, let the UI guide the user.
        // Only toast if user interaction led to invalid state or if it was previously valid.
        // For simplicity here, we keep the toast but it could be refined.
        if (predictionLogs.length > 0 || pipsTarget <= 0 && selectedCurrency) { // Example: toast if form was touched/used
             toast({
                title: "Prediction Paused",
                description: "Ensure currency and pips target (>0) are set.",
                variant: "default",
             });
        }
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
        setPredictionLogs(prevLogs => 
          prevLogs.map(log => 
            log.id === newLogId ? { ...log, status: "SUCCESS", predictionOutcome: result.data } : log
          )
        );
        toast({
          title: "Prediction Updated",
          description: `AI analysis for ${selectedCurrency} with ${pipsTarget} pips target completed.`,
        });
      }
      setIsLoading(false);
      timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
    };

    performPrediction();

    return () => clearTimeout(timeoutId);
  }, [selectedCurrency, pipsTarget, isLoading, toast, generateId, predictionLogs.length]);


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
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved. AI predictions are for informational purposes only and not financial advice. Predictions update automatically every minute if parameters are valid.
      </footer>
    </div>
  );
}
