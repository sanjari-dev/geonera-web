// src/components/geonera/prediction-details-panel.tsx
"use client";

import type { PredictionLogItem, PipsPredictionOutcome, CurrencyPair } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Info, Loader2, Target, TrendingUp, TrendingDown, PauseCircle, HelpCircle, Landmark, LogIn, LogOut, ArrowUpCircle, ArrowDownCircle, BarChart3, Briefcase } from "lucide-react";
import { format } from 'date-fns';
import MarketDataDisplay from '@/components/geonera/market-data-display'; // Import MarketDataDisplay

interface PredictionDetailsPanelProps {
  selectedPrediction: PredictionLogItem | null;
}

const getSignalBadgeVariant = (signal?: PipsPredictionOutcome["tradingSignal"]): VariantProps<typeof Badge>["variant"] => {
  if (!signal) return "secondary";
  switch (signal) {
    case "BUY": return "default";
    case "SELL": return "destructive";
    case "HOLD": return "secondary";
    case "WAIT": return "outline";
    case "N/A": return "secondary";
    default: return "secondary";
  }
};

const SignalIcon: React.FC<{ signal?: PipsPredictionOutcome["tradingSignal"] }> = ({ signal }) => {
  if (!signal) return <HelpCircle className="h-4 w-4" />;
  switch (signal) {
    case "BUY": return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "SELL": return <TrendingDown className="h-4 w-4 text-red-500" />;
    case "HOLD": return <PauseCircle className="h-4 w-4 text-yellow-500" />;
    case "WAIT": return <Clock className="h-4 w-4 text-blue-500" />;
    case "N/A": return <HelpCircle className="h-4 w-4 text-gray-500" />;
    default: return <HelpCircle className="h-4 w-4" />;
  }
};

const StatusIcon: React.FC<{ status: PredictionLogItem["status"] }> = ({ status }) => {
  switch (status) {
    case "PENDING": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case "SUCCESS": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "ERROR": return <AlertCircle className="h-4 w-4 text-red-500" />;
    default: return <Info className="h-4 w-4 text-gray-400" />;
  }
};

export function PredictionDetailsPanel({ selectedPrediction }: PredictionDetailsPanelProps) {
  const ohlcData = selectedPrediction?.predictionOutcome;
  const marketDataAvailable = selectedPrediction && ohlcData && (
    ohlcData.openPrice !== undefined ||
    ohlcData.closePrice !== undefined ||
    ohlcData.highPrice !== undefined ||
    ohlcData.lowPrice !== undefined ||
    ohlcData.volume !== undefined
  );

  return (
    <Card className="shadow-xl h-full grid grid-rows-[12%_88%]">
      <CardHeader className="bg-primary/10 p-2 rounded-t-lg">
        <CardTitle className="text-xl font-semibold text-primary dark:text-foreground whitespace-nowrap">Prediction Details</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {selectedPrediction ? <span className="whitespace-nowrap">{`Details for ${selectedPrediction.currencyPair}`}</span> : "Select a prediction for details."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 flex-grow flex flex-col min-h-0 overflow-y-auto">
        {!selectedPrediction ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
            <Info className="h-12 w-12 mb-3" />
            <p>No prediction selected.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2">
              <Landmark className="h-5 w-5 text-primary" />
              <span className="font-medium whitespace-nowrap">Currency Pair:</span>
              <span className="text-sm whitespace-nowrap">{selectedPrediction.currencyPair}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-medium whitespace-nowrap">PIPS Target:</span>
              <span className="text-sm whitespace-nowrap">{selectedPrediction.pipsTarget.min} - {selectedPrediction.pipsTarget.max}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-medium whitespace-nowrap">Timestamp:</span>
              <span className="text-sm whitespace-nowrap">{format(new Date(selectedPrediction.timestamp), "yyyy-MM-dd HH:mm:ss")}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center h-5 w-5">
                <StatusIcon status={selectedPrediction.status} />
              </div>
              <span className="font-medium whitespace-nowrap">Status:</span>
              <Badge variant={
                selectedPrediction.status === "SUCCESS" ? "default" :
                selectedPrediction.status === "ERROR" ? "destructive" :
                "secondary"
              }>
                {selectedPrediction.status}
              </Badge>
            </div>

            {/* Market Data Display */}
            {marketDataAvailable && ohlcData && (
               <MarketDataDisplay ohlcData={ohlcData} selectedPrediction={selectedPrediction} classHeight={undefined} />
            )}


            {selectedPrediction.expiresAt && (
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <span className="font-medium whitespace-nowrap">Expires At:</span>
                <span className="text-sm whitespace-nowrap">{format(new Date(selectedPrediction.expiresAt), "yyyy-MM-dd HH:mm:ss")}</span>
              </div>
            )}
            
            {selectedPrediction.status === "SUCCESS" && selectedPrediction.predictionOutcome && (
              <>
                <div className="flex items-center space-x-2">
                    <div className="flex items-center justify-center h-5 w-5">
                    <SignalIcon signal={selectedPrediction.predictionOutcome.tradingSignal} />
                    </div>
                  <span className="font-medium whitespace-nowrap">Trading Signal:</span>
                  <Badge variant={getSignalBadgeVariant(selectedPrediction.predictionOutcome.tradingSignal)}>
                    {selectedPrediction.predictionOutcome.tradingSignal}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <span className="font-medium text-primary block">Signal Details:</span>
                  <p className="text-sm bg-muted/50 p-2 rounded">{selectedPrediction.predictionOutcome.signalDetails}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-medium text-primary block">Reasoning:</span>
                  <p className="text-sm bg-muted/50 p-2 rounded">{selectedPrediction.predictionOutcome.reasoning}</p>
                </div>
              </>
            )}

            {selectedPrediction.status === "ERROR" && selectedPrediction.error && (
              <div className="space-y-1">
                <span className="font-medium text-destructive block whitespace-nowrap">Error:</span>
                <p className="text-sm bg-destructive/10 text-destructive p-2 rounded">{selectedPrediction.error}</p>
              </div>
            )}
            
            {selectedPrediction.status === "PENDING" && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="whitespace-nowrap">Awaiting analysis...</span>
                </div>
            )}

          </>
        )}
      </CardContent>
    </Card>
  );
}

// Define VariantProps type locally if not globally available or for clarity
type VariantProps<T extends (...args: any) => any> = Parameters<T>[0] extends undefined ? {} : Parameters<T>[0];
