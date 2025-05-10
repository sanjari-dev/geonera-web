// src/app/page.tsx
"use client";

import type { ChangeEvent } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { AppHeader } from '@/components/geonera/header';
import { PipsParameterForm } from '@/components/geonera/pips-parameter-form';
import { PredictionsTable } from '@/components/geonera/predictions-table';
import type { PredictionLogItem, CurrencyPair, PipsTarget, PipsPredictionOutcome } from '@/types';
import { getPipsPredictionAction } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

// Default templates, moved here from PipsParameterForm
const defaultHistoricalDataTemplates: Record<CurrencyPair, string> = {
  "XAU/USD": "Historical data for XAU/USD (last 24h):\n- Price range: $2310 - $2335\n- Key support: $2305\n- Key resistance: $2340\n- Current trend: Mildly bullish on H1 chart.",
  "BTC/USD": "Historical data for BTC/USD (last 24h):\n- Price range: $62,500 - $64,800\n- Key support: $62,000\n- Key resistance: $65,000\n- Volume: Moderate, slight increase in last 4 hours.",
};

const defaultMarketNewsTemplates: Record<CurrencyPair, string> = {
  "XAU/USD": "Recent market news for XAU/USD:\n- US CPI data released: slightly higher than expected.\n- Geopolitical tensions in [Region] remain elevated.\n- Central bank statements: [Bank] maintained a hawkish stance.",
  "BTC/USD": "Recent market news for BTC/USD:\n- Upcoming halving event anticipation.\n- Regulatory news: [Country] considering new crypto framework.\n- ETF inflows/outflows: Net positive inflows reported yesterday.",
};

const PREDICTION_INTERVAL_MS = 60000; // 1 minute

export default function GeoneraPage() {
  const [predictionLogs, setPredictionLogs] = useState<PredictionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState<string>('');

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyPair>("XAU/USD");
  const [pipsTarget, setPipsTarget] = useState<PipsTarget>(10);
  const [historicalData, setHistoricalData] = useState(defaultHistoricalDataTemplates["XAU/USD"]);
  const [marketNews, setMarketNews] = useState(defaultMarketNewsTemplates["XAU/USD"]);
  
  const [uuidAvailable, setUuidAvailable] = useState(false);
  
  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
    import('uuid').then(uuid => {
      if (uuid && uuid.v4) {
        setUuidAvailable(true);
      }
    }).catch(() => {
      console.warn("uuid library not available, using timestamp for IDs.");
    });
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
    setHistoricalData(defaultHistoricalDataTemplates[value]);
    setMarketNews(defaultMarketNewsTemplates[value]);
  }, []);

  const handlePipsChange = useCallback((value: PipsTarget) => {
    setPipsTarget(value);
  }, []);

  const handleHistoricalDataChange = useCallback((value: string) => {
    setHistoricalData(value);
  }, []);

  const handleMarketNewsChange = useCallback((value: string) => {
    setMarketNews(value);
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const performPrediction = async () => {
      if (isLoading) {
        // If already loading, schedule next check without making a call
        timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS);
        return;
      }

      if (!historicalData.trim() || !marketNews.trim() || pipsTarget <= 0) {
        toast({
          title: "Prediction Paused",
          description: "Please ensure all parameters (currency, pips, historical data, market news) are valid to start automatic predictions.",
          variant: "default",
        });
        // Schedule next check, parameters might become valid
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
        historicalDataSnapshot: historicalData,
        marketNewsSnapshot: marketNews,
      };
      setPredictionLogs(prevLogs => [pendingLogItem, ...prevLogs].slice(0, 50)); // Keep last 50 logs

      const result = await getPipsPredictionAction(selectedCurrency, pipsTarget, historicalData, marketNews);
      
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
      timeoutId = setTimeout(performPrediction, PREDICTION_INTERVAL_MS); // Schedule next call
    };

    performPrediction(); // Initial call

    return () => clearTimeout(timeoutId); // Cleanup on unmount or when dependencies change
  }, [selectedCurrency, pipsTarget, historicalData, marketNews, isLoading, toast, generateId]); // remove uuidAvailable if generateId is stable


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-10">
          <PipsParameterForm
            currencyPair={selectedCurrency}
            pipsTarget={pipsTarget}
            historicalData={historicalData}
            marketNews={marketNews}
            onCurrencyChange={handleCurrencyChange}
            onPipsChange={handlePipsChange}
            onHistoricalDataChange={handleHistoricalDataChange}
            onMarketNewsChange={handleMarketNewsChange}
            isLoading={isLoading}
          />
          <PredictionsTable predictions={predictionLogs} />
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
        {currentYear ? `© ${currentYear} Geonera.` : '© Geonera.'} All rights reserved. AI predictions are for informational purposes only and not financial advice. Predictions update automatically every minute if parameters are valid.
      </footer>
    </div>
  );
}
