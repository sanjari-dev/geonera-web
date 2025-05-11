// src/components/geonera/prediction-details-panel.tsx
"use client";

import type { PredictionLogItem, PipsPredictionOutcome } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Info, Loader2, Target, TrendingUp, TrendingDown, PauseCircle, HelpCircle, Landmark, LogIn, LogOut, ArrowUpCircle, ArrowDownCircle, BarChart3, Briefcase } from "lucide-react";
import { format as formatDateFns } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { VariantProps } from 'class-variance-authority';

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

const formatPrice = (price?: number, currencyPair?: PredictionLogItem["currencyPair"]) => {
  if (price === undefined || price === null) return "N/A";
  const fractionDigits = currencyPair === "BTC/USD" ? 0 : (currencyPair === "USD/JPY" ? 3 : 2); // Simplified, adjust as needed
  return price.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
};

const formatVolume = (volume?: number) => {
  if (volume === undefined || volume === null) return "N/A";
  return volume.toLocaleString();
};


export function PredictionDetailsPanel({ selectedPrediction }: PredictionDetailsPanelProps) {
  const marketOhlcData = selectedPrediction?.predictionOutcome;
  const marketDataAvailable = selectedPrediction && marketOhlcData && (
    marketOhlcData.openPrice !== undefined ||
    marketOhlcData.closePrice !== undefined ||
    marketOhlcData.highPrice !== undefined ||
    marketOhlcData.lowPrice !== undefined ||
    marketOhlcData.volume !== undefined
  );

  return (
    <Card className="shadow-xl h-full grid grid-rows-[auto_1fr]" aria-labelledby="prediction-details-title">
      <CardHeader className="bg-primary/10 p-3 rounded-t-lg">
        <CardTitle id="prediction-details-title" className="text-xl font-semibold text-primary dark:text-foreground whitespace-nowrap">Prediction Details</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {selectedPrediction ? <span className="whitespace-nowrap">{`Details for ${selectedPrediction.currencyPair}`}</span> : "Select a prediction for details."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 flex-grow flex flex-col min-h-0">
        {!selectedPrediction ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10" role="status" aria-live="polite">
            <Info className="h-12 w-12 mb-3" aria-hidden="true" />
            <p>No prediction selected.</p>
            <p className="text-xs text-center">Click on a row in the Prediction Log to see its details here.</p>
          </div>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="space-y-3 pr-2">
              <div className="flex items-center space-x-2">
                <Landmark className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                <span className="font-medium whitespace-nowrap">Currency Pair:</span>
                <span className="text-sm whitespace-nowrap">{selectedPrediction.currencyPair}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                <span className="font-medium whitespace-nowrap">PIPS Target:</span>
                <span className="text-sm whitespace-nowrap">{selectedPrediction.pipsTarget.min} - {selectedPrediction.pipsTarget.max}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                <span className="font-medium whitespace-nowrap">Timestamp:</span>
                <span className="text-sm whitespace-nowrap">{formatDateFns(new Date(selectedPrediction.timestamp), "yyyy-MM-dd HH:mm:ss XXX")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center h-5 w-5 flex-shrink-0" aria-hidden="true">
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

              {marketDataAvailable && marketOhlcData && (
                <div className="space-y-2 pt-2 mt-2 border-t border-border">
                  <div className="flex items-center space-x-2">
                     <Briefcase className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                     <span className="font-semibold text-primary whitespace-nowrap">Market Data:</span>
                  </div>
                  <div className="pl-3 space-y-1">
                    {marketOhlcData.openPrice !== undefined && (
                      <div className="flex items-center space-x-2">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center" aria-hidden="true">
                           <LogIn className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium whitespace-nowrap text-sm">Open:</span>
                        <span className="text-sm whitespace-nowrap">
                           {formatPrice(marketOhlcData.openPrice, selectedPrediction.currencyPair)}
                        </span>
                      </div>
                    )}
                    {marketOhlcData.highPrice !== undefined && (
                      <div className="flex items-center space-x-2">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center" aria-hidden="true">
                          <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium whitespace-nowrap text-sm">High:</span>
                        <span className="text-sm whitespace-nowrap">
                          {formatPrice(marketOhlcData.highPrice, selectedPrediction.currencyPair)}
                        </span>
                      </div>
                    )}
                    {marketOhlcData.lowPrice !== undefined && (
                       <div className="flex items-center space-x-2">
                         <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center" aria-hidden="true">
                           <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
                         </div>
                         <span className="font-medium whitespace-nowrap text-sm">Low:</span>
                         <span className="text-sm whitespace-nowrap">
                           {formatPrice(marketOhlcData.lowPrice, selectedPrediction.currencyPair)}
                         </span>
                       </div>
                    )}
                    {marketOhlcData.closePrice !== undefined && (
                       <div className="flex items-center space-x-2">
                         <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center" aria-hidden="true">
                           <LogOut className="h-4 w-4 text-muted-foreground" />
                         </div>
                         <span className="font-medium whitespace-nowrap text-sm">Close:</span>
                         <span className="text-sm whitespace-nowrap">
                            {formatPrice(marketOhlcData.closePrice, selectedPrediction.currencyPair)}
                         </span>
                       </div>
                    )}
                    {marketOhlcData.volume !== undefined && (
                       <div className="flex items-center space-x-2">
                         <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center" aria-hidden="true">
                           <BarChart3 className="h-4 w-4 text-muted-foreground" />
                         </div>
                         <span className="font-medium whitespace-nowrap text-sm">Volume:</span>
                         <span className="text-sm whitespace-nowrap">
                           {formatVolume(marketOhlcData.volume)}
                         </span>
                       </div>
                    )}
                  </div>
                </div>
              )}


              {selectedPrediction.expiresAt && (
                <div className="flex items-center space-x-2 pt-2 mt-2 border-t border-border">
                  <Clock className="h-5 w-5 text-orange-500 flex-shrink-0" aria-hidden="true" />
                  <span className="font-medium whitespace-nowrap">Expires At:</span>
                  <span className="text-sm whitespace-nowrap">{formatDateFns(new Date(selectedPrediction.expiresAt), "yyyy-MM-dd HH:mm:ss XXX")}</span>
                </div>
              )}
              
              {selectedPrediction.status === "SUCCESS" && selectedPrediction.predictionOutcome && (
                <>
                  <div className="flex items-center space-x-2 pt-2 mt-2 border-t border-border">
                      <div className="flex items-center justify-center h-5 w-5 flex-shrink-0" aria-hidden="true">
                      <SignalIcon signal={selectedPrediction.predictionOutcome.tradingSignal} />
                      </div>
                    <span className="font-medium whitespace-nowrap">Trading Signal:</span>
                    <Badge variant={getSignalBadgeVariant(selectedPrediction.predictionOutcome.tradingSignal)}>
                      {selectedPrediction.predictionOutcome.tradingSignal}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-primary block whitespace-nowrap">Signal Details:</span>
                    <p className="text-sm bg-muted/50 p-2 rounded">{selectedPrediction.predictionOutcome.signalDetails}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-primary block whitespace-nowrap">Reasoning:</span>
                    <p className="text-sm bg-muted/50 p-2 rounded">{selectedPrediction.predictionOutcome.reasoning}</p>
                  </div>
                </>
              )}

              {selectedPrediction.status === "ERROR" && selectedPrediction.error && (
                <div className="space-y-1 pt-2 mt-2 border-t border-border">
                  <span className="font-medium text-destructive block whitespace-nowrap">Error:</span>
                  <p className="text-sm bg-destructive/10 text-destructive p-2 rounded">{selectedPrediction.error}</p>
                </div>
              )}
              
              {selectedPrediction.status === "PENDING" && (
                  <div className="flex items-center space-x-2 text-muted-foreground pt-2 mt-2 border-t border-border" role="status" aria-live="polite">
                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">Awaiting analysis...</span>
                  </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Define VariantProps type locally if not globally available or for clarity
type VariantProps<T extends (...args: any) => any> = Parameters<T>[0] extends undefined ? {} : Parameters<T>[0];
