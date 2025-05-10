// src/components/geonera/prediction-details-panel.tsx
"use client";

import type { PredictionLogItem, PipsPredictionOutcome } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Info, Loader2, Tag, Target, TrendingUp, TrendingDown, PauseCircle, HelpCircle, LogIn, LogOut, ArrowUpCircle, ArrowDownCircle, BarChart3, Landmark } from "lucide-react";
import { format } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';

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

const formatPrice = (price?: number, currencyPair?: CurrencyPair) => {
    if (price === undefined || price === null) return "N/A";
    const fractionDigits = currencyPair === "BTC/USD" ? 0 : 2;
    return price.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
};

const formatVolume = (volume?: number) => {
    if (volume === undefined || volume === null) return "N/A";
    return volume.toLocaleString();
}


export function PredictionDetailsPanel({ selectedPrediction }: PredictionDetailsPanelProps) {
  return (
    <Card className="shadow-xl h-full">
      <CardHeader className="bg-secondary/30 p-4 rounded-t-lg">
        <CardTitle className="text-xl font-semibold text-primary">Prediction Details</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {selectedPrediction ? `Details for ${selectedPrediction.currencyPair}` : "Select a prediction from the log to view its details."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[360px]"> {/* Adjusted height */}
          <div className="p-4 space-y-3">
            {!selectedPrediction ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
                <Info className="h-12 w-12 mb-3" />
                <p>No prediction selected.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  <span className="font-medium">Currency Pair:</span>
                  <span>{selectedPrediction.currencyPair}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="font-medium">PIPS Target:</span>
                  <span>{selectedPrediction.pipsTarget.min} - {selectedPrediction.pipsTarget.max}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="font-medium">Timestamp:</span>
                  <span className="text-sm">{format(new Date(selectedPrediction.timestamp), "yyyy-MM-dd HH:mm:ss")}</span>
                </div>
                 <div className="flex items-center space-x-2">
                  <div className="flex items-center justify-center h-5 w-5">
                    <StatusIcon status={selectedPrediction.status} />
                  </div>
                  <span className="font-medium">Status:</span>
                  <Badge variant={
                    selectedPrediction.status === "SUCCESS" ? "default" :
                    selectedPrediction.status === "ERROR" ? "destructive" :
                    "secondary"
                  }>
                    {selectedPrediction.status}
                  </Badge>
                </div>

                {selectedPrediction.status === "SUCCESS" && selectedPrediction.predictionOutcome && (
                  <>
                    <div className="flex items-center space-x-2">
                       <div className="flex items-center justify-center h-5 w-5">
                        <SignalIcon signal={selectedPrediction.predictionOutcome.tradingSignal} />
                       </div>
                      <span className="font-medium">Trading Signal:</span>
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
                    
                    {/* New Price and Volume Details */}
                    { (selectedPrediction.predictionOutcome.openPrice !== undefined ||
                        selectedPrediction.predictionOutcome.closePrice !== undefined ||
                        selectedPrediction.predictionOutcome.highPrice !== undefined ||
                        selectedPrediction.predictionOutcome.lowPrice !== undefined ||
                        selectedPrediction.predictionOutcome.volume !== undefined) && (
                    <div className="pt-2 border-t mt-3 space-y-2">
                        <h4 className="text-md font-semibold text-primary mb-1">Market Data</h4>
                        {selectedPrediction.predictionOutcome.openPrice !== undefined && (
                        <div className="flex items-center space-x-2">
                            <LogIn className="h-5 w-5 text-primary opacity-80" />
                            <span className="font-medium">Open Price:</span>
                            <span>{formatPrice(selectedPrediction.predictionOutcome.openPrice, selectedPrediction.currencyPair)}</span>
                        </div>
                        )}
                        {selectedPrediction.predictionOutcome.closePrice !== undefined && (
                        <div className="flex items-center space-x-2">
                            <LogOut className="h-5 w-5 text-primary opacity-80" />
                            <span className="font-medium">Close Price:</span>
                            <span>{formatPrice(selectedPrediction.predictionOutcome.closePrice, selectedPrediction.currencyPair)}</span>
                        </div>
                        )}
                        {selectedPrediction.predictionOutcome.highPrice !== undefined && (
                        <div className="flex items-center space-x-2">
                            <ArrowUpCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium">High Price:</span>
                            <span>{formatPrice(selectedPrediction.predictionOutcome.highPrice, selectedPrediction.currencyPair)}</span>
                        </div>
                        )}
                        {selectedPrediction.predictionOutcome.lowPrice !== undefined && (
                        <div className="flex items-center space-x-2">
                            <ArrowDownCircle className="h-5 w-5 text-red-600" />
                            <span className="font-medium">Low Price:</span>
                            <span>{formatPrice(selectedPrediction.predictionOutcome.lowPrice, selectedPrediction.currencyPair)}</span>
                        </div>
                        )}
                        {selectedPrediction.predictionOutcome.volume !== undefined && (
                        <div className="flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5 text-primary opacity-80" />
                            <span className="font-medium">Volume:</span>
                            <span>{formatVolume(selectedPrediction.predictionOutcome.volume)}</span>
                        </div>
                        )}
                    </div>
                    )}
                  </>
                )}

                {selectedPrediction.status === "ERROR" && selectedPrediction.error && (
                  <div className="space-y-1">
                    <span className="font-medium text-destructive block">Error:</span>
                    <p className="text-sm bg-destructive/10 text-destructive p-2 rounded">{selectedPrediction.error}</p>
                  </div>
                )}
                
                {selectedPrediction.status === "PENDING" && (
                   <div className="flex items-center space-x-2 text-muted-foreground">
                     <Loader2 className="h-4 w-4 animate-spin" />
                     <span>Awaiting analysis...</span>
                   </div>
                )}

                {selectedPrediction.expiresAt && (
                  <div className="flex items-center space-x-2 pt-2 border-t mt-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">Expires At:</span>
                    <span className="text-sm">{format(new Date(selectedPrediction.expiresAt), "yyyy-MM-dd HH:mm:ss")}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Define VariantProps type locally if not globally available or for clarity
type VariantProps<T extends (...args: any) => any> = Parameters<T>[0] extends undefined ? {} : Parameters<T>[0];
