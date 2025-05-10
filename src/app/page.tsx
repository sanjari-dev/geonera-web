// src/app/page.tsx
"use client";

import { useState, useCallback, useEffect } from 'react';
import { AppHeader } from '@/components/geonera/header';
import { PipsParameterForm } from '@/components/geonera/pips-parameter-form';
import { PredictionsTable } from '@/components/geonera/predictions-table';
import type { PredictionLogItem, CurrencyPair, PipsTarget, PipsPredictionOutcome } from '@/types';
import { getPipsPredictionAction } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

export default function GeoneraPage() {
  const [predictionLogs, setPredictionLogs] = useState<PredictionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState<string>('');

  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
  }, []);
  
  // Attempt to load uuid, if it fails, set a flag or use a simpler ID generator
  const [uuidAvailable, setUuidAvailable] = useState(false);
  useEffect(() => {
    import('uuid').then(uuid => {
      if (uuid && uuid.v4) {
        setUuidAvailable(true);
      }
    }).catch(() => {
      console.warn("uuid library not available, using timestamp for IDs.");
    });
  }, []);

  const generateId = () => {
    if (uuidAvailable) {
      try {
        return uuidv4();
      } catch (e) {
        // Fallback in case dynamic import is tricky or uuidv4 fails
         return Date.now().toString() + Math.random().toString(36).substring(2,7);
      }
    }
    return Date.now().toString() + Math.random().toString(36).substring(2,7);
  };


  const { toast } = useToast();

  const handleGeneratePrediction = useCallback(async (
    currencyPair: CurrencyPair,
    pipsTarget: PipsTarget,
    historicalData: string,
    marketNews: string
  ) => {
    setIsLoading(true);
    const newLogId = generateId();

    const pendingLogItem: PredictionLogItem = {
      id: newLogId,
      timestamp: new Date(),
      currencyPair,
      pipsTarget,
      status: "PENDING",
      historicalDataSnapshot: historicalData, // Storing for context, if needed
      marketNewsSnapshot: marketNews,
    };

    setPredictionLogs(prevLogs => [pendingLogItem, ...prevLogs]);

    const result = await getPipsPredictionAction(currencyPair, pipsTarget, historicalData, marketNews);
    
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
        title: "Prediction Generated",
        description: `AI analysis for ${currencyPair} at ${pipsTarget} pips target is complete.`,
      });
    }
    setIsLoading(false);
  }, [toast, uuidAvailable]); // Added uuidAvailable to dependencies

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-10">
          <PipsParameterForm 
            onGeneratePrediction={handleGeneratePrediction}
            isLoading={isLoading}
            defaultCurrency="XAU/USD"
            defaultPipsTarget={10}
          />
          <PredictionsTable predictions={predictionLogs} />
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved. AI predictions are for informational purposes only and not financial advice.
      </footer>
    </div>
  );
}
