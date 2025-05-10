// src/app/page.tsx
"use client";

import type { ChangeEvent } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { AppHeader } from '@/components/geonera/header';
import { PipsParameterForm } from '@/components/geonera/pips-parameter-form';
import { PredictionsTable } from '@/components/geonera/predictions-table';
import { PredictionDetailsPanel } from '@/components/geonera/prediction-details-panel';
import { CandlestickDisplay } from '@/components/geonera/candlestick-display'; // New component
import type { PredictionLogItem, CurrencyPair, PipsTargetRange } from '@/types';
import { getPipsPredictionAction } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';


const PREDICTION_INTERVAL_MS = 5000; // 5 seconds
const MIN_EXPIRATION_SECONDS = 10;
const MAX_EXPIRATION_SECONDS = 30;

export default function GeoneraPage() {
  const [predictionLogs, setPredictionLogs] = useState<PredictionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState<string>('');

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyPair>("XAU/USD");
  const [pipsTarget, setPipsTarget] = useState<PipsTargetRange>({ min: 10, max: 20 });
  
  const [uuidAvailable, setUuidAvailable] = useState(false);
  const [selectedPredictionLog, setSelectedPredictionLog] = useState<PredictionLogItem | null>(null);
  
  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
    // Check if uuid is available (client-side)
    if (typeof window !== 'undefined' && typeof uuidv4 === 'function') {
        setUuidAvailable(true);
    }
  }, []);

  const generateId = useCallback(() => {
    if (uuidAvailable) {
      try {
        return uuidv4();
      } catch (e) {
         // Fallback for environments where uuidv4 might fail
         return Date.now().toString() + Math.random().toString(36).substring(2,7);
      }
    }
    // Fallback for SSR or when uuid is not available
    return Date.now().toString() + (typeof window !== 'undefined' ? Math.random().toString(36).substring(2,7) : "serverid" + Math.floor(Math.random() * 10000));
  }, [uuidAvailable]);

  const { toast } = useToast();

  const handleCurrencyChange = useCallback((value: CurrencyPair) => {
    setSelectedCurrency(value);
  }, []);

  const handlePipsChange = useCallback((value: PipsTargetRange) => {
    setPipsTarget(value);
  }, []);

  const handlePredictionSelect = useCallback((log: PredictionLogItem) => {
    setSelectedPredictionLog(log);
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined = undefined;

    const performPrediction = async () => {
      if (isLoading) {
        if (timeoutId) clearTimeout(timeoutId); 
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      const isPipsTargetInvalid = pipsTarget.min <= 0 || pipsTarget.max <= 0 || pipsTarget.min > pipsTarget.max;

      if (isPipsTargetInvalid || !selectedCurrency) {
        const shouldShowPausedToast = predictionLogs.length > 0 || (isPipsTargetInvalid && !!selectedCurrency);
        if (shouldShowPausedToast) {
             toast({
                title: "Prediction Paused",
                description: "Ensure currency is selected and Min/Max PIPS targets are valid (Min > 0, Max > 0, Min <= Max).",
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
        if (selectedPredictionLog?.id === newLogId) {
            setSelectedPredictionLog(prev => prev ? { ...prev, status: "ERROR", error: result.error } : null);
        }
        toast({
          title: "Prediction Error",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.data) {
        const randomExpirationMs = (Math.floor(Math.random() * (MAX_EXPIRATION_SECONDS - MIN_EXPIRATION_SECONDS + 1)) + MIN_EXPIRATION_SECONDS) * 1000;
        const newSuccessfulLog = { 
            ...pendingLogItem, 
            status: "SUCCESS" as const, 
            predictionOutcome: result.data,
            expiresAt: new Date(Date.now() + randomExpirationMs) 
        };
        
        setPredictionLogs(prevLogs => 
          prevLogs.map(log => 
            log.id === newLogId ? newSuccessfulLog : log
          )
        );
        if (selectedPredictionLog?.id === newLogId || !selectedPredictionLog) { // Also select if no prediction is currently selected
            setSelectedPredictionLog(newSuccessfulLog);
        }
        toast({
          title: "Prediction Updated",
          description: `Prediction for ${selectedCurrency} (PIPS ${pipsTarget.min}-${pipsTarget.max}) completed. Expires in ${randomExpirationMs / 1000}s.`,
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
  }, [selectedCurrency, pipsTarget, toast, generateId, isLoading, predictionLogs.length, selectedPredictionLog]); 


  useEffect(() => {
    const expirationIntervalId = setInterval(() => {
      const now = new Date(); 
      setPredictionLogs(prevLogs =>
        prevLogs.filter(log => {
          if (log.status !== "SUCCESS" || !log.expiresAt) {
            return true; 
          }
          const isExpired = now > new Date(log.expiresAt);
          if (isExpired && selectedPredictionLog?.id === log.id) {
            setSelectedPredictionLog(null); // Clear selection if it expires
          }
          return !isExpired;
        })
      );
    }, 1000); 

    return () => clearInterval(expirationIntervalId);
  }, [selectedPredictionLog?.id]); 


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-4">
        <div className="max-w-7xl mx-auto space-y-4"> {/* Increased max-width for 3 columns */}
          <PipsParameterForm
            currencyPair={selectedCurrency}
            pipsTarget={pipsTarget}
            onCurrencyChange={handleCurrencyChange}
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
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved. Predictions are for informational purposes only and not financial advice. Predictions update automatically every {PREDICTION_INTERVAL_MS / 1000} seconds if parameters are valid. Active predictions are removed after a variable duration (typically {MIN_EXPIRATION_SECONDS}-{MAX_EXPIRATION_SECONDS} seconds).
      </footer>
    </div>
  );
}
