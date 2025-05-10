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
        if (predictionLogs.length > 0 || (pipsTarget <= 0 && selectedCurrency)) { 
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
            log.id === newLogId ? { 
              ...log, 
              status: "SUCCESS", 
              predictionOutcome: result.data,
              expiresAt: new Date(Date.now() + EXPIRATION_DURATION_MS) // Set expiration time for successful prediction
            } : log
          )
        );
        toast({
          title: "Prediction Updated",
          description: `Prediction analysis for ${selectedCurrency} with ${pipsTarget} pips target completed.`,
        });
      }
      setIsLoading(false);
      timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
    };

    performPrediction();

    return () => clearTimeout(timeoutId);
  }, [selectedCurrency, pipsTarget, isLoading, toast, generateId, predictionLogs.length]);


  useEffect(() => {
    const expirationIntervalId = setInterval(() => {
      setPredictionLogs(prevLogs =>
        prevLogs.map(log => {
          if (log.status === "SUCCESS" && log.expiresAt && new Date() > new Date(log.expiresAt)) {
            return { ...log, status: "EXPIRED" };
          }
          return log;
        })
      );
    }, 1000); // Check for expired predictions every second

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
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved. Predictions are for informational purposes only and not financial advice. Predictions update automatically every 5 seconds if parameters are valid. Active predictions expire after ${EXPIRATION_DURATION_MS / 1000} seconds.
      </footer>
    </div>
  );
}
